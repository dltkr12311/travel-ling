import { ItineraryItem, PlaceSearchResult } from '../../types';

export interface ItineraryViewProps {
  items: ItineraryItem[];
  onAddItem: (item: ItineraryItem) => void;
  onEditItem: (id: string, updates: Partial<ItineraryItem>) => void;
  onRemoveItem: (id: string) => void;
  onReorder: (items: ItineraryItem[]) => void;
}

export interface ItineraryViewState {
  isAdding: boolean;
  editingItem: ItineraryItem | null;
  activeId: string | null;
  newItem: Partial<ItineraryItem>;
  searchQuery: string;
  searchResults: PlaceSearchResult[];
  isSearching: boolean;
}
