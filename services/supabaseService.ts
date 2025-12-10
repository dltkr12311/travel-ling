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

/**
 * Save user profile to Supabase
 *
 * Required Supabase table schema:
 * CREATE TABLE user_profiles (
 *   trip_id TEXT NOT NULL,
 *   user_id TEXT NOT NULL,
 *   display_id TEXT,
 *   name TEXT NOT NULL,
 *   profile_pic TEXT NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   PRIMARY KEY (trip_id, user_id)
 * );
 * CREATE INDEX idx_user_profiles_display_id ON user_profiles(trip_id, display_id);
 */
export const saveUserProfile = async (
  tripId: string,
  userId: string,
  name: string,
  profilePic: string,
  displayId?: string
): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('user_profiles').upsert(
      {
        trip_id: tripId,
        user_id: userId,
        display_id: displayId || null,
        name,
        profile_pic: profilePic,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'trip_id,user_id' }
    );

    if (error) {
      console.error('Failed to save user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to save user profile:', error);
    return false;
  }
};

/**
 * Get user profile from Supabase by user ID
 */
export const getUserProfile = async (
  tripId: string,
  userId: string
): Promise<{ name: string; profilePic: string; userId: string } | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('name, profile_pic, user_id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      name: data.name,
      profilePic: data.profile_pic,
      userId: data.user_id,
    };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
};

/**
 * Find user profile by display ID (사용자가 입력한 아이디) in a trip
 */
export const findUserProfileByDisplayId = async (
  tripId: string,
  displayId: string
): Promise<{ userId: string; name: string; profilePic: string } | null> => {
  if (!supabase || !displayId) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, name, profile_pic')
      .eq('trip_id', tripId)
      .eq('display_id', displayId.trim())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      name: data.name,
      profilePic: data.profile_pic,
    };
  } catch (error) {
    console.error('Failed to find user profile by display ID:', error);
    return null;
  }
};

/**
 * Get all user profiles for a trip
 */
export const getAllTripProfiles = async (
  tripId: string
): Promise<Array<{ userId: string; name: string; profilePic: string }>> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, name, profile_pic')
      .eq('trip_id', tripId);

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      userId: item.user_id,
      name: item.name,
      profilePic: item.profile_pic,
    }));
  } catch (error) {
    console.error('Failed to get trip profiles:', error);
    return [];
  }
};
