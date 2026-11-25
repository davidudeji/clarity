interface GeminiResponse {
  text?: string;
  error?: string;
}

export interface GeminiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatConversation {
  id: string;
  documentId: string | null;
  title: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface PersistedChatMessage extends GeminiChatMessage {
  id: string;
  status: 'pending' | 'streaming' | 'complete' | 'failed' | 'interrupted' | 'cancelled';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

async function readJsonResponse<T>(response: Response, serviceName: string): Promise<T & { error?: string }> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const hint = response.status === 404
      ? ' Restart the app with npm run dev so the API routes are up to date.'
      : '';
    throw new Error(`${serviceName} returned a non-JSON response (HTTP ${response.status}).${hint}`);
  }
  try {
    return await response.json() as T & { error?: string };
  } catch {
    throw new Error(`${serviceName} returned invalid JSON.`);
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await readJsonResponse<T>(response, 'Chat service');
  if (!response.ok) {
    throw new Error(result.error || `Request failed with status ${response.status}.`);
  }
  return result;
}

export async function listChatConversations(documentId: string): Promise<ChatConversation[]> {
  const result = await requestJson<{ conversations: ChatConversation[] }>(
    `/api/v1/conversations?documentId=${encodeURIComponent(documentId)}`,
  );
  return result.conversations;
}

export async function createChatConversation(documentId: string): Promise<ChatConversation> {
  const result = await requestJson<{ conversation: ChatConversation }>('/api/v1/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId }),
  });
  return result.conversation;
}

export async function getChatMessages(conversationId: string): Promise<PersistedChatMessage[]> {
  const result = await requestJson<{ messages: PersistedChatMessage[] }>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
  return result.messages;
}

export async function stopChatGeneration(conversationId: string): Promise<void> {
  await requestJson<{ status: string }>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/stop`,
    { method: 'POST' },
  );
}

export async function streamPersistentChat(
  conversationId: string,
  documentName: string,
  documentContext: string,
  question: string,
  onStart: (messageId: string) => void,
  onText: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/v1/conversations/${encodeURIComponent(conversationId)}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentName, documentContext, question }),
    signal,
  });
  if (!response.ok) {
    const result = await readJsonResponse<GeminiResponse>(response, 'Chat service');
    throw new Error(result.error || `Chat request failed with status ${response.status}.`);
  }
  if (!response.body) throw new Error('Your browser does not support streaming chat responses.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedText = false;
  let responseStatus: 'done' | 'cancelled' | 'error' | null = null;
  let streamError: string | null = null;

  function readEvent(event: string) {
    const lines = event.split(/\r?\n/);
    const eventType = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
    const data = lines.filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart()).join('\n');
    if (!data || data === '[DONE]') return;

    let payload: { type?: string; content?: string; messageId?: string; error?: string };
    try {
      payload = JSON.parse(data) as typeof payload;
    } catch {
      throw new Error('Chat stream returned invalid data.');
    }

    if (eventType === 'start' && payload.messageId) onStart(payload.messageId);
    if (eventType === 'delta' && payload.content) {
      onText(payload.content);
      receivedText = true;
    }
    if (eventType === 'done') responseStatus = 'done';
    if (eventType === 'cancelled') responseStatus = 'cancelled';
    if (eventType === 'error') {
      responseStatus = 'error';
      streamError = payload.error || 'Chat request failed.';
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      events.forEach(readEvent);
      if (done) break;
    }
    if (buffer.trim()) readEvent(buffer);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  if (responseStatus === 'error') throw new Error(streamError || 'Chat request failed.');
  if (!receivedText && responseStatus !== 'cancelled') {
    throw new Error('Gemini finished without returning a response.');
  }
}

async function requestGemini(path: string, body: Record<string, unknown>): Promise<string> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await readJsonResponse<GeminiResponse>(response, 'Gemini service');
  if (!response.ok) {
    throw new Error(result.error || `Gemini request failed with status ${response.status}.`);
  }
  if (!result.text) {
    throw new Error('Gemini returned an empty response.');
  }
  return result.text;
}

export function explainWithGemini(quote: string, userQuestion: string): Promise<string> {
  return requestGemini('/api/ai/explain', { quote, userQuestion });
}

export function researchWithGemini(question: string, sourceQuote: string): Promise<string> {
  return requestGemini('/api/ai/research', { question, sourceQuote });
}

export function chatWithGemini(
  documentName: string,
  documentContext: string,
  messages: GeminiChatMessage[],
): Promise<string> {
  return requestGemini('/api/ai/chat', { documentName, documentContext, messages });
}

export async function streamChatWithGemini(
  documentName: string,
  documentContext: string,
  messages: GeminiChatMessage[],
  onText: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentName, documentContext, messages }),
    signal,
  });

  if (!response.ok) {
    const result = await readJsonResponse<GeminiResponse>(response, 'Chat service');
    throw new Error(result.error || `Chat request failed with status ${response.status}.`);
  }
  if (!response.body) throw new Error('Your browser does not support streaming chat responses.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedText = false;

  function readEvent(event: string) {
    const lines = event.split(/\r?\n/);
    const eventType = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') return;

    let payload: { text?: string; error?: string };
    try {
      payload = JSON.parse(data) as { text?: string; error?: string };
    } catch {
      throw new Error('Chat stream returned invalid data.');
    }

    if (eventType === 'error' || payload.error) {
      throw new Error(payload.error || 'Chat request failed.');
    }
    if (payload.text) {
      onText(payload.text);
      receivedText = true;
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      events.forEach(readEvent);
      if (done) break;
    }
    if (buffer.trim()) readEvent(buffer);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  if (!receivedText) throw new Error('Gemini finished without returning a response.');
}
