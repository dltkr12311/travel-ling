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
  profilePic?: string; // 프로필 사진 URL (선택)
  joinedAt?: string; // 참여 날짜
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

export interface GroupChatMessage {
  id: string;
  userId: string; // 'ai' for AI messages
  userName: string;
  text: string;
  timestamp: string;
  type: 'text' | 'system' | 'expense' | 'itinerary'; // 메시지 타입
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
  messages?: GroupChatMessage[]; // 그룹 채팅 메시지
  currentUserId?: string; // 현재 사용자 ID
}