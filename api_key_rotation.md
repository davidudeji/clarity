# CLARITY — GEMINI API KEY ROTATION & AUTOMATIC FALLBACK SPECIFICATION

**File:** `spec.md`  
**Module:** AI Infrastructure  
**Priority:** High  
**Runtime:** Node.js 20+  
**Language:** JavaScript ES Modules  
**SDK:** `@google/genai`  
**Objective:** Reliable Gemini API access with automatic fallback, quota monitoring, error handling and centralized key management.

---

# 1. OBJECTIVE

Implement a centralized Gemini API key management system that automatically switches to an alternative configured API key when the active key becomes unavailable due to quota exhaustion or rate limiting.

Clarity uses Gemini for:

- Document embeddings.
- AI chat.
- Document summarization.
- Concept extraction.
- Passage explanations.
- Flashcard generation.
- Quiz generation.
- Research assistance.

All these operations must use the same centralized Gemini infrastructure.

The application must not initialize independent Gemini API clients in individual controllers or feature services.

### Core requirement

When a Gemini request fails because the active key has exhausted its available quota, Clarity must:

1. Identify the failure.
2. Determine whether it is eligible for fallback.
3. Temporarily mark the affected key as unavailable.
4. Select another eligible key.
5. Retry the original operation.
6. Return the successful result without requiring user intervention.
7. Log the fallback event without exposing credentials.

If every configured key is unavailable, return a meaningful error to the frontend.

**Important:** Multiple API keys belonging to the same Google Cloud project may share quota limits. Key rotation must not be treated as a way to bypass Google's quotas or usage restrictions. Fallback capacity should come from independently authorized projects or quota allocations.

---

# 2. TECHNOLOGY REQUIREMENTS

| Component                | Technology                  |
| ------------------------ | --------------------------- |
| Runtime                  | Node.js 20+                 |
| Language                 | JavaScript ES Modules       |
| AI SDK                   | `@google/genai`             |
| Environment              | `dotenv`                    |
| Configuration validation | Zod                         |
| Logging                  | Existing application logger |
| Persistent state         | SQLite, if needed           |
| API framework            | Existing Express backend    |

Do not introduce Python.

Do not introduce a second AI provider.

Do not expose Gemini credentials to the frontend.

Do not duplicate Gemini configuration across application services.

---

# 3. ENVIRONMENT CONFIGURATION

## 3.1 Required `.env` structure

Support multiple Gemini API keys.

```env
# ==========================================
# GEMINI API KEY CONFIGURATION
# ==========================================

GEMINI_API_KEY=your_primary_api_key

GEMINI_API_KEY_2=your_secondary_api_key

GEMINI_API_KEY_3=your_third_api_key

GEMINI_API_KEY_4=your_fourth_api_key

# ==========================================
# GEMINI MODELS
# ==========================================

```
