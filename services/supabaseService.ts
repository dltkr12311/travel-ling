import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TripData } from '../types';

let supabase: SupabaseClient | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Initialize Supabase client
 */
export const initSupabase = (config: SupabaseConfig): boolean => {
  if (!config.url || !config.anonKey) return false;

  try {
    supabase = createClient(config.url, config.anonKey);
    return true;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return false;
  }
};

/**
 * Check if Supabase is connected and working
 */
export const checkSupabaseHealth = async (
  url: string,
  anonKey: string
): Promise<boolean> => {
  if (!url || !anonKey) return false;

  try {
    const testClient = createClient(url, anonKey);
    // Try a simple query to verify connection
    const { error } = await testClient.from('trips').select('id').limit(1);

    // If table doesn't exist, that's okay - we'll create it
    // We just want to verify the connection works
    if (error && !error.message.includes('does not exist')) {
      console.error('Supabase health check failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return false;
  }
};

/**
 * Fetch a trip by ID
 */
export const fetchTrip = async (tripId: string): Promise<TripData | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    if (error) {
      console.error('Failed to fetch trip:', error);
      return null;
    }

    return data?.data as TripData;
  } catch (error) {
    console.error('Failed to fetch trip:', error);
    return null;
  }
};

/**
 * Save/Update a trip
 */
export const saveTrip = async (
  tripId: string,
  tripData: TripData
): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('trips').upsert(
      {
        id: tripId,
        data: tripData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Failed to save trip:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to save trip:', error);
    return false;
  }
};

/**
 * Create a new trip and return its ID
 */
export const createTrip = async (
  tripData: TripData
): Promise<string | null> => {
  if (!supabase) return null;

  const id = Math.random().toString(36).substring(2, 10);

  try {
    const { error } = await supabase.from('trips').insert({
      id,
      data: tripData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to create trip:', error);
      return null;
    }

    return id;
  } catch (error) {
    console.error('Failed to create trip:', error);
    return null;
  }
};

/**
 * Get Supabase client instance
 */
export const getSupabaseClient = (): SupabaseClient | null => supabase;
