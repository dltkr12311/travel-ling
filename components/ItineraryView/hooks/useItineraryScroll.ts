import React, { useEffect } from 'react';
import { ItineraryItem } from '../../../types';

export const useItineraryScroll = (
  items: ItineraryItem[],
  setActiveId: (id: string | null) => void,
  itemRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>,
  mapInstance: React.MutableRefObject<any>,
  smoothPanTo: (lat: number, lng: number, duration?: number) => void
) => {
  useEffect(() => {
    const listContainer = document.getElementById('list-container');
    if (!listContainer) return;

    let ticking = false;
    let lastActiveId: string | null = null;

    const findClosestItem = () => {
      const containerRect = listContainer.getBoundingClientRect();
      const targetY = containerRect.top + containerRect.height * 0.4;

      if (listContainer.scrollTop < 10 && items.length > 0) {
        return items[0].id;
      }

      let closestItem: { id: string; distance: number } | null = null;

      Object.entries(itemRefs.current).forEach(([id, el]) => {
        if (!el) return;

        const rect = (el as HTMLDivElement).getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenterY - targetY);

        if (
          rect.bottom > containerRect.top &&
          rect.top < containerRect.bottom
        ) {
          if (!closestItem || distance < closestItem.distance) {
            closestItem = { id, distance };
          }
        }
      });

      return closestItem?.id || null;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const closestId = findClosestItem();

          if (closestId && closestId !== lastActiveId) {
            lastActiveId = closestId;
            setActiveId(closestId);

            const item = items.find(i => i.id === closestId);
            if (
              item?.lat &&
              item?.lng &&
              mapInstance.current &&
              window.kakao?.maps
            ) {
              const currentLevel = mapInstance.current.getLevel();
              if (currentLevel > 4) {
                mapInstance.current.setLevel(4, { animate: true });
              }
              smoothPanTo(item.lat, item.lng, 400);
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();

    listContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      listContainer.removeEventListener('scroll', handleScroll);
    };
  }, [items, setActiveId, itemRefs, mapInstance, smoothPanTo]);
};
