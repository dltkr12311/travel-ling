import { Expense, ItineraryItem, Person } from '../../types';

export interface AIPlannerProps {
  people: Person[];
  budget: number;
  expenses: Expense[];
  itineraryCount: number;
  onAddItinerary: (item: ItineraryItem) => void;
  onAddExpense: (expense: Expense) => void;
  onSetBudget: (amount: number) => void;
  onAddPerson: (name: string) => void;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isMapResult?: boolean;
  mapLinks?: Array<{ title: string; uri: string }>;
}
