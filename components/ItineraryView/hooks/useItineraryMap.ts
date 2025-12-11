import React, { useEffect, useRef } from 'react';
import { ItineraryItem } from '../../../types';

declare global {
  interface Window {
    kakao: any;
  }
}

export const useItineraryMap = (
  items: ItineraryItem[],
  activeId: string | null,
  itemRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
) => {
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // 부드러운 지도 이동 애니메이션
  const smoothPanTo = (
    targetLat: number,
    targetLng: number,
    duration = 500
  ) => {
    if (!mapInstance.current || !window.kakao?.maps) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startCenter = mapInstance.current.getCenter();
    const startLat = startCenter.getLat();
    const startLng = startCenter.getLng();

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentLat = startLat + (targetLat - startLat) * eased;
      const currentLng = startLng + (targetLng - startLng) * eased;

      const newCenter = new window.kakao.maps.LatLng(currentLat, currentLng);
      mapInstance.current.setCenter(newCenter);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Initialize Kakao Map
  useEffect(() => {
    const initMap = () => {
      if (!window.kakao?.maps || !mapContainerRef.current) return;

      if (!mapInstance.current) {
        const options = {
          center: new window.kakao.maps.LatLng(38.207, 128.5918),
          level: 7,
        };

        const map = new window.kakao.maps.Map(mapContainerRef.current, options);
        mapInstance.current = map;

        setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.relayout();
          }
        }, 100);
      }

      updateMapMarkers();
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      const checkSDK = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(checkSDK);
          initMap();
        }
      }, 100);

      return () => clearInterval(checkSDK);
    }
  }, [items]);

  // Update Markers Function
  const updateMapMarkers = () => {
    if (!mapInstance.current || !window.kakao?.maps) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);

    const bounds = new window.kakao.maps.LatLngBounds();
    const linePath: any[] = [];

    items.forEach((item, index) => {
      if (item.lat && item.lng) {
        const isActive = activeId === item.id;
        const position = new window.kakao.maps.LatLng(item.lat, item.lng);

        const size = isActive ? 32 : 28;
        const markerContent = document.createElement('div');
        markerContent.style.cssText = `
          position: relative;
          width: ${size}px;
          height: ${size}px;
          margin-left: -${size / 2}px;
          margin-top: -${size / 2}px;
        `;
        markerContent.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background: ${isActive ? '#2563eb' : '#334155'};
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${isActive ? '14px' : '12px'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          ">${index + 1}</div>
        `;

        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: position,
          content: markerContent,
        });

        customOverlay.setMap(mapInstance.current);

        markerContent.onclick = () => {
          const el = itemRefs.current[item.id];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        };

        markersRef.current.push(customOverlay);
        bounds.extend(position);
        linePath.push(position);
      }
    });

    if (linePath.length > 1) {
      polylineRef.current = new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#94a3b8',
        strokeOpacity: 0.7,
        strokeStyle: 'shortdash',
      });
      polylineRef.current.setMap(mapInstance.current);
    }

    if (linePath.length > 0 && !activeId) {
      mapInstance.current.setBounds(bounds, 50, 50, 50, 50);
    } else if (activeId) {
      const activeItem = items.find(i => i.id === activeId);
      if (activeItem?.lat && activeItem?.lng) {
        const currentLevel = mapInstance.current.getLevel();
        if (currentLevel > 4) {
          mapInstance.current.setLevel(4, { animate: true });
        }
        smoothPanTo(activeItem.lat, activeItem.lng, 400);
      }
    }
  };

  useEffect(() => {
    updateMapMarkers();
  }, [activeId]);

  return {
    mapContainerRef,
    mapInstance,
    smoothPanTo,
  };
};
