import { TripData } from "../types";

interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
}

let apiConfig: ApiConfig | null = null;

const sanitizeBaseUrl = (url: string) => url.replace(/\/$/, '');

const resolveBaseUrl = () => {
  if (apiConfig?.baseUrl) return apiConfig.baseUrl;
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  return envUrl ? sanitizeBaseUrl(envUrl) : '';
};

const buildHeaders = (apiKey?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const resolvedKey = apiKey ?? apiConfig?.apiKey;
  if (resolvedKey) {
    headers['Authorization'] = `Bearer ${resolvedKey}`;
  }
  return headers;
};

export const initApi = (baseUrl: string, apiKey?: string) => {
  if (!baseUrl) return false;
  apiConfig = {
    baseUrl: sanitizeBaseUrl(baseUrl),
    apiKey,
  };
  return true;
};

export const fetchTrip = async (tripId: string): Promise<TripData | null> => {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/trips/${tripId}`, { headers: buildHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data as TripData;
  } catch (error) {
    console.error('Failed to fetch trip', error);
    return null;
  }
};

export const saveTrip = async (tripId: string, tripData: TripData) => {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return;

  try {
    await fetch(`${baseUrl}/trips/${tripId}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify({ data: tripData }),
    });
  } catch (error) {
    console.error('Failed to save trip', error);
  }
};

export const createTrip = async (tripData: TripData) => {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/trips`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ data: tripData }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.id as string;
  } catch (error) {
    console.error('Failed to create trip', error);
    return null;
  }
};

export const checkHealth = async (baseUrl: string, apiKey?: string) => {
  if (!baseUrl) return false;
  const target = sanitizeBaseUrl(baseUrl);
  try {
    const res = await fetch(`${target}/health`, { headers: buildHeaders(apiKey) });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data?.status === 'ok';
  } catch (error) {
    console.error('Health check failed', error);
    return false;
  }
};
