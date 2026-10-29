/**
 * Groq safety check for a food item against the selected pet.
 */

import Constants from 'expo-constants';
import type { PetContext } from '@/src/services/grokService';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.3-70b-versatile and llama-3.1-8b-instant are not on this Groq account.
// qwen/qwen3.8-27b is, and it accepts JSON mode.
const MODELS = ['qwen/qwen3.8-27b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

export interface SnackSafetyResult {
  status: 'SAFE' | 'CAUTION' | 'TOXIC';
  safetyScore: number;
  title: string;
  toxicIngredients: string[];
  summary: string;
  portionGuide: string;
  caloricImpact: string;
}

function getApiKey(): string | null {
  const extra = Constants.expoConfig?.extra as { GROQ_API_KEY?: string } | undefined;
  const key = process.env.EXPO_PUBLIC_GROQ_API_KEY || extra?.GROQ_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

function asResult(value: unknown): SnackSafetyResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Groq returned JSON that is not a safety result');
  }
  const raw = value as Partial<SnackSafetyResult> & { status?: string };
  const statusText = String(raw.status || '').toUpperCase();
  const status = statusText === 'SAFE' || statusText === 'TOXIC' || statusText === 'CAUTION' ? statusText : null;
  if (!status) throw new Error(`Groq status was "${raw.status ?? ''}"`);
  const score = Number(raw.safetyScore);
  return {
    status,
    safetyScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : status,
    toxicIngredients: Array.isArray(raw.toxicIngredients)
      ? raw.toxicIngredients.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    portionGuide: typeof raw.portionGuide === 'string' ? raw.portionGuide.trim() : '',
    caloricImpact: typeof raw.caloricImpact === 'string' ? raw.caloricImpact.trim() : '',
  };
}

function parseContent(rawContent: string): SnackSafetyResult {
  const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Groq reply did not contain JSON');
  }
  return asResult(JSON.parse(cleaned.slice(start, end + 1)));
}

function modelMissing(status: number, message: string): boolean {
  return status === 404 || /model .* does not exist|decommissioned|not found/i.test(message);
}

export async function analyzeSnackSafetyWithGroq(
  foodName: string,
  ingredients: string,
  petContext: PetContext
): Promise<SnackSafetyResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('[SafeSnacker] GROQ key missing from EXPO_PUBLIC_GROQ_API_KEY');
    throw new Error('GROQ API Key is missing');
  }

  const prompt = `
You are a veterinary toxicologist analyzing food for a pet.

PET DETAILS:
- Name: ${petContext.name}
- Type/Species: ${petContext.type}
- Breed: ${petContext.breed}
- Weight: ${petContext.weight} kg

FOOD ITEM:
- Name: ${foodName}
- Ingredients/Context: ${ingredients || 'Standard human/pet food'}

CRITICAL INSTRUCTIONS:
Evaluate if this food is safe for ${petContext.name}.
You MUST return ONLY a raw JSON object (no markdown, no backticks) with these exact keys:
{
  "status": "SAFE" or "CAUTION" or "TOXIC",
  "safetyScore": <number 0-100>,
  "title": "<short verdict>",
  "toxicIngredients": ["<ingredient>"],
  "summary": "<2 sentences for ${petContext.name}>",
  "portionGuide": "<portion for a ${petContext.weight}kg ${petContext.type}>",
  "caloricImpact": "<calorie comment>"
}
Use uppercase status values.
`.trim();

  console.log('[SafeSnacker] Groq request', { foodName, pet: petContext.name, weight: petContext.weight });

  let lastError = 'Groq request failed';
  for (const model of MODELS) {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      }),
    });

    const rawText = await response.text();
    console.log('[SafeSnacker] Groq response', model, response.status, rawText.slice(0, 400));

    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    } = {};
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch {
      lastError = `Groq returned non-JSON (${response.status})`;
      continue;
    }

    if (!response.ok) {
      const message = data.error?.message || `Groq API returned status ${response.status}`;
      if (modelMissing(response.status, message)) {
        console.log('[SafeSnacker] skipping model', model, message);
        lastError = message;
        continue;
      }
      throw new Error(message);
    }

    const rawContent = data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      lastError = `Empty response from ${model}`;
      continue;
    }
    try {
      const parsed = parseContent(rawContent);
      console.log('[SafeSnacker] parsed', parsed.status, parsed.safetyScore, parsed.title);
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Could not parse Groq JSON';
      console.log('[SafeSnacker] parse failed', model, lastError);
    }
  }

  throw new Error(lastError);
}
