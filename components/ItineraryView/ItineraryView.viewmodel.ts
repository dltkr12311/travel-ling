import { useRef, useState } from 'react';
import { getCoordsFromAddress } from '../../services/kakaoPlaceService';
import { ItineraryItem, PlaceSearchResult } from '../../types';
import { useItineraryMap } from './hooks/useItineraryMap';
import { useItineraryScroll } from './hooks/useItineraryScroll';
import { useItinerarySearch } from './hooks/useItinerarySearch';
import { ItineraryViewProps } from './ItineraryView.types';

declare global {
  interface Window {
    kakao: any;
  }
}

export const useItineraryViewModel = (props: ItineraryViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<ItineraryItem>>({
    type: 'activity',
    time: '12:00',
  });

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    clearSearch,
  } = useItinerarySearch();

  const { mapContainerRef, mapInstance, smoothPanTo } = useItineraryMap(
    props.items,
    activeId,
    itemRefs
  );

  useItineraryScroll(
    props.items,
    setActiveId,
    itemRefs,
    mapInstance,
    smoothPanTo
  );

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setNewItem({
      ...newItem,
      title: place.name,
      location: place.address,
      type: place.type,
      lat: place.lat,
      lng: place.lng,
      notes: place.description,
    });
    setSearchQuery(place.name);
    setSearchResults([]);
  };

  const handleAdd = async () => {
    if (newItem.title) {
      let lat = newItem.lat;
      let lng = newItem.lng;
      let location = newItem.location || newItem.title;

      if (!lat || !lng) {
        const coords = await getCoordsFromAddress(newItem.title);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          lat = 38.207;
          lng = 128.5918;
        }
      }

      props.onAddItem({
        id: Date.now().toString(),
        time: newItem.time || '12:00',
        title: newItem.title,
        location,
        type: newItem.type as any,
        notes: newItem.notes || '',
        lat,
        lng,
      });

      setIsAdding(false);
      setNewItem({ type: 'activity', time: '12:00' });
      clearSearch();
    }
  };

  const handleEdit = async () => {
    if (!editingItem || !newItem.title) return;

    let lat = newItem.lat;
    let lng = newItem.lng;
    let location = newItem.location || newItem.title;

    if (!lat || !lng) {
      const coords = await getCoordsFromAddress(newItem.title);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        lat = editingItem.lat || 38.207;
        lng = editingItem.lng || 128.5918;
      }
    }

    props.onEditItem(editingItem.id, {
      time: newItem.time || '12:00',
      title: newItem.title,
      location,
      type: newItem.type as any,
      notes: newItem.notes || '',
      lat,
      lng,
    });

    setEditingItem(null);
    setNewItem({ type: 'activity', time: '12:00' });
    clearSearch();
  };

  const handleStartEdit = (item: ItineraryItem) => {
    setEditingItem(item);
    setNewItem({
      title: item.title,
      location: item.location,
      time: item.time,
      type: item.type,
      notes: item.notes,
      lat: item.lat,
      lng: item.lng,
    });
    setSearchQuery(item.title);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setIsAdding(false);
    setNewItem({ type: 'activity', time: '12:00' });
    clearSearch();
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _items = [...props.items];
    const draggedItemContent = _items.splice(dragItem.current, 1)[0];
    _items.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    props.onReorder(_items);
  };

  const handleItemClick = (item: ItineraryItem) => {
    setActiveId(item.id);
    if (item.lat && item.lng && mapInstance.current) {
      const moveLatLon = new window.kakao.maps.LatLng(item.lat, item.lng);
      mapInstance.current.setCenter(moveLatLon);
      mapInstance.current.setLevel(3);
    }
  };

  return {
    // State
    isAdding,
    setIsAdding,
    editingItem,
    activeId,
    setActiveId,
    newItem,
    setNewItem,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    dragItem,
    dragOverItem,
    itemRefs,
    mapContainerRef,
    mapInstance,
    // Handlers
    handleSelectPlace,
    handleAdd,
    handleEdit,
    handleStartEdit,
    handleCancelEdit,
    handleSort,
    handleItemClick,
  };
};
