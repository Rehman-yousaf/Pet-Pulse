/**
 * Google Places API — nearby vets search.
 */

import Constants from 'expo-constants';

const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

function getApiKey(): string | null {
  const extra = Constants.expoConfig?.extra as { GOOGLE_MAPS_API_KEY?: string } | undefined;
  return extra?.GOOGLE_MAPS_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
}

export interface VetPlace {
  id: string;
  name: string;
  vicinity: string;
  rating?: number;
  latitude: number;
  longitude: number;
}

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  geometry?: { location?: { lat: number; lng: number } };
}

/**
 * Fetches nearby veterinary places (veterinary_care) for the given coordinates.
 */
export async function searchNearbyVets(
  latitude: number,
  longitude: number
): Promise<VetPlace[]> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'Google Maps API key not configured. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.'
    );
  }

  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: '5000',
    type: 'veterinary_care',
    key: apiKey,
  });

  const res = await fetch(`${PLACES_URL}?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Places API error (${res.status})`);
  }

  const data = (await res.json()) as {
    status: string;
    results?: PlaceResult[];
    error_message?: string;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Places API status: ${data.status}`);
  }

  const results = data.results ?? [];
  return results.map((r) => ({
    id: r.place_id,
    name: r.name ?? 'Vet',
    vicinity: r.vicinity ?? '',
    rating: r.rating,
    latitude: r.geometry?.location?.lat ?? latitude,
    longitude: r.geometry?.location?.lng ?? longitude,
  }));
}
