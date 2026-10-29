/**
 * PetBot chat via Groq (OpenAI-compatible).
 * Key: EXPO_PUBLIC_GROQ_API_KEY in .env (inlined by Expo at bundle time).
 */

import Constants from 'expo-constants';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'qwen/qwen3.8-27b';

export interface PetContext {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  diet?: string;
  medicalHistory?: string[];
  recentLogs?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isEmergency?: boolean;
}

function getApiKey(): string | null {
  const extra = Constants.expoConfig?.extra as { GROQ_API_KEY?: string } | undefined;
  const key = process.env.EXPO_PUBLIC_GROQ_API_KEY || extra?.GROQ_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

function buildSystemPrompt(petContext: PetContext): string {
  const logs = petContext.recentLogs?.length ? petContext.recentLogs.join('; ') : 'None logged';
  const history = petContext.medicalHistory?.length
    ? petContext.medicalHistory.join('; ')
    : 'None recorded';

  return `
You are "Dr. PawPulse", an expert AI Virtual Veterinary Assistant inside the PetPulse app.

CURRENT SELECTED PET PROFILE:
- Name: ${petContext.name}
- Species/Type: ${petContext.type}
- Breed: ${petContext.breed}
- Age: ${petContext.age} years old
- Weight: ${petContext.weight} kg
- Dietary Plan: ${petContext.diet || 'Standard diet'}
- Medical history: ${history}
- Recent Health Notes/Logs: ${logs}

STRICT RESPONSE RULES:
1. NO REPETITIVE GREETINGS: Do NOT begin or end answers with generic greetings like "Hello! I am Dr. PawPulse..." or any introduction of yourself. Answer the user's question directly and concisely. Never append a second message that reintroduces yourself.
2. TOPIC LOCKING: Only answer questions related to pets, animals, and veterinary care. If asked about an unrelated non-pet topic, decline politely in one sentence and do not add a greeting.
3. PERSONALIZATION: Use ${petContext.name}'s species (${petContext.type}), breed (${petContext.breed}), age (${petContext.age} yrs), and weight (${petContext.weight} kg) when they change the advice.
4. NO RAW MARKDOWN: Write plain sentences. Do not use asterisks, hashtags, or Markdown syntax.
5. EMERGENCY DETECTOR: If high-risk toxic substances (grapes, raisins, chocolate, xylitol, lilies, onions) or life-threatening symptoms are mentioned, lead immediately with this exact plain-text alert: "🚨 URGENT VET EMERGENCY WARNING". Then tell the owner to contact an emergency vet and give brief steps for the trip. Do not add a greeting after the warning.
`.trim();
}

/** Drop a canned self-introduction appended after a real answer. */
export function stripUnwantedGreeting(content: string): string {
  const marker = content.search(
    /hello!?\s+i am dr\.?\s*pawpulse|i am dr\.?\s*pawpulse,\s*your virtual vet/i
  );
  if (marker <= 0) return content.trim();
  const answer = content.slice(0, marker).trim();
  return answer || content.trim();
}

export const askGrokVetAssistant = async (
  userMessage: string,
  petContext: PetContext,
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Groq API key is missing in environment variables.');
  }

  const formattedHistory = chatHistory.slice(-6).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const messages = [
    { role: 'system', content: buildSystemPrompt(petContext) },
    ...formattedHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    const raw = await response.text();
    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string } | string;
      message?: string;
    } = {};
    if (raw) {
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        data = { error: raw.slice(0, 200) };
      }
    }

    if (!response.ok) {
      const apiMessage =
        (typeof data.error === 'string' ? data.error : data.error?.message) ||
        data.message ||
        `Groq API error (${response.status})`;
      const rejectedKey = /api key|unauthorized/i.test(apiMessage);
      if (response.status === 401 || rejectedKey) {
        const authError = new Error(apiMessage);
        authError.name = 'GrokAuthError';
        throw authError;
      }
      throw new Error(apiMessage);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) return stripUnwantedGreeting(content);
    throw new Error('Invalid response structure from Grok API');
  } catch (error) {
    if (error instanceof Error && error.name === 'GrokAuthError') {
      throw error;
    }
    return `I'm having trouble connecting to my knowledge base right now. If ${petContext.name} is in distress, please contact your nearest local vet immediately!`;
  }
};

export function replyLooksUrgent(content: string): boolean {
  return content.includes('🚨 URGENT VET EMERGENCY') || content.includes('URGENT VET EMERGENCY');
}
