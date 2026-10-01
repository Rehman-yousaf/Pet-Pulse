/**
 * Groq API integration for PetBot chat.
 * Uses OpenAI-compatible chat completions endpoint.
 */

import Constants from 'expo-constants';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Production model: Llama 3.1 8B (replaces deprecated llama3-8b-8192)
const MODEL = 'llama-3.1-8b-instant';
const SYSTEM_PROMPT = `You are PetBot, a professional veterinary assistant.
You ONLY answer questions related to:
- Dogs
- Cats
- Birds
- Fish
- Rabbits
- Pet health
- Pet diet
- Pet medication
- Vaccinations
- Vet advice

If a question is unrelated to pets, politely refuse and say:
"I can only assist with pet-related questions."`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function getApiKey(): string | null {
  const extra = Constants.expoConfig?.extra as { GROQ_API_KEY?: string } | undefined;
  return extra?.GROQ_API_KEY ?? process.env.EXPO_PUBLIC_GROQ_API_KEY ?? null;
}

/**
 * Sends messages to Groq and returns the assistant reply content.
 * Prepends system prompt to messages.
 */
export async function sendMessageToGroq(messages: ChatMessage[]): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Groq API key not configured. Set EXPO_PUBLIC_GROQ_API_KEY in your environment.');
  }

  const body = {
    model: MODEL,
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: 1024,
    temperature: 0.7,
  };

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const raw = await res.text();

  if (!res.ok) {
    let errMsg = `Groq API error (${res.status})`;
    if (isJson && raw) {
      try {
        const json = JSON.parse(raw) as { error?: { message?: string } };
        if (json.error?.message) errMsg = json.error.message;
      } catch {
        if (raw) errMsg = raw.slice(0, 200);
      }
    } else if (raw) errMsg = raw.slice(0, 200);
    throw new Error(errMsg);
  }

  if (!raw) throw new Error('No reply from Groq.');

  const data = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (content != null) return content;

  throw new Error('No reply from Groq.');
}
