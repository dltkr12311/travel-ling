import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TripData } from "../types";

let supabase: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string) => {
  if (!url || !key) return false;
  try {
    supabase = createClient(url, key);
    return true;
  } catch (e) {
    console.error("Supabase init failed", e);
    return false;
  }
};

export const getSupabase = () => supabase;

export const fetchTrip = async (tripId: string): Promise<TripData | null> => {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('trips')
    .select('data')
    .eq('id', tripId)
    .single();

  if (error) {
    console.error("Error fetching trip:", error);
    return null;
  }

  return data?.data as TripData;
};

export const saveTrip = async (tripId: string, tripData: TripData) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('trips')
    .upsert({ id: tripId, data: tripData });

  if (error) {
    console.error("Error saving trip:", error);
  }
};

export const subscribeToTrip = (tripId: string, callback: (newData: TripData) => void) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`trip_${tripId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
      (payload) => {
        if (payload.new && payload.new.data) {
            callback(payload.new.data as TripData);
        }
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
};
