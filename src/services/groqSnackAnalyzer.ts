/**
 * Groq safety check for a food item against the selected pet.
 * Uses the model available on this project's Groq key.
 */

import Constants from 'expo-constants';
import type { PetContext } from '@/src/services/grokService';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'qwen/qwen3.8-27b';

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

function fallback(petName: string): SnackSafetyResult {
  return {
    status: 'CAUTION',
    safetyScore: 50,
    title: 'Analysis Unavailable',
    toxicIngredients: [],
    summary: `Unable to complete a real-time safety evaluation for ${petName}. Please consult your vet before feeding this snack.`,
    portionGuide: 'Do not feed until verified.',
    caloricImpact: 'Unknown',
  };
}

function asResult(value: unknown, petName: string): SnackSafetyResult {
  if (!value || typeof value !== 'object') return fallback(petName);
  const raw = value as Partial<SnackSafetyResult>;
  const status = raw.status === 'SAFE' || raw.status === 'TOXIC' || raw.status === 'CAUTION' ? raw.status : 'CAUTION';
  const score = Number(raw.safetyScore);
  return {
    status,
    safetyScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Safety check',
    toxicIngredients: Array.isArray(raw.toxicIngredients)
      ? raw.toxicIngredients.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    summary: typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : fallback(petName).summary,
    portionGuide:
      typeof raw.portionGuide === 'string' && raw.portionGuide.trim()
        ? raw.portionGuide.trim()
        : 'Ask your vet before offering a portion.',
    caloricImpact:
      typeof raw.caloricImpact === 'string' && raw.caloricImpact.trim() ? raw.caloricImpact.trim() : 'Unknown',
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() || trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in Groq reply');
  return JSON.parse(body.slice(start, end + 1));
}

export async function analyzeSnackSafetyWithGroq(
  foodName: string,
  ingredients: string,
  petContext: PetContext
): Promise<SnackSafetyResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GROQ API Key is missing in environment variables.');
  }

  const systemPrompt = `
You are an expert veterinary toxicologist and animal nutritionist for the PetPulse app.

TARGET PET PROFILE:
- Name: ${petContext.name}
- Species/Type: ${petContext.type}
- Breed: ${petContext.breed}
- Weight: ${petContext.weight} kg

FOOD ITEM TO EVALUATE:
- Item Name: ${foodName}
- Ingredients/Description: ${ingredients}

TASK:
Analyze if this food is safe for ${petContext.name} (${petContext.breed}, ${petContext.weight}kg).
Return ONLY a strictly valid JSON object matching this schema:
{
  "status": "SAFE" | "CAUTION" | "TOXIC",
  "safetyScore": <number from 0 to 100>,
  "title": "<Short punchy title verdict>",
  "toxicIngredients": ["<ingredient1>"],
  "summary": "<2-sentence explanation tailored specifically to ${petContext.name}>",
  "portionGuide": "<Recommended portion for a ${petContext.weight}kg ${petContext.type}>",
  "caloricImpact": "<Brief calorie impact>"
}
Do not include markdown or any text outside the JSON object.
`.trim();

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message || `Groq error (${response.status})`);
    }

    const rawContent = data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) throw new Error('Invalid response structure from GROQ API');
    return asResult(extractJson(rawContent), petContext.name);
  } catch {
    return fallback(petContext.name);
  }
}
