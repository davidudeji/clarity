interface GeminiResponse {
  text?: string;
  error?: string;
}

export interface GeminiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function requestGemini(path: string, body: Record<string, unknown>): Promise<string> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json() as GeminiResponse;
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
