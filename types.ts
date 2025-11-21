export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  location: string;
  type: 'food' | 'activity' | 'hotel' | 'travel';
  lat?: number; // Optional for map simulation
  lng?: number; // Optional for map simulation
  notes?: string;
}

export interface Person {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  payerId: string;
  amount: number;
  description: string;
  date: string;
}

export interface WeatherInfo {
  tempHigh: number;
  tempLow: number;
  sunriseTime: string;
  condition: string;
  windSpeed: string;
  hikingAdvice: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isMapResult?: boolean;
  mapLinks?: { uri: string; title: string }[];
}

export interface PlaceSearchResult {
  name: string;
  address: string;
  type: 'food' | 'activity' | 'hotel' | 'travel';
  lat: number;
  lng: number;
  description: string;
}

export interface TripData {
  itinerary: ItineraryItem[];
  expenses: Expense[];
  people: Person[];
  budget: number;
}