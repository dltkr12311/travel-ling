import {
  Bed,
  Car,
  GripVertical,
  Loader2,
  MapPin,
  Mountain,
  Plus,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  getCoordsFromAddress,
  searchPlacesKakao,
} from '../services/kakaoPlaceService';
import { ItineraryItem, PlaceSearchResult } from '../types';

interface Props {
  items: ItineraryItem[];
  onAddItem: (item: ItineraryItem) => void;
  onRemoveItem: (id: string) => void;
  onReorder: (items: ItineraryItem[]) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const ItineraryView: React.FC<Props> = ({
  items,
  onAddItem,
  onRemoveItem,
  onReorder,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Add Item State
  const [newItem, setNewItem] = useState<Partial<ItineraryItem>>({
    type: 'activity',
    time: '12:00',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Drag & Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Map Refs
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // List Refs for Intersection Observer
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Animation ref
  const animationRef = useRef<number | null>(null);

  // 부드러운 지도 이동 애니메이션
  const smoothPanTo = (
    targetLat: number,
    targetLng: number,
    duration = 500
  ) => {
    if (!mapInstance.current || !window.kakao?.maps) return;

    // 이전 애니메이션 취소
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

      // easeOutCubic for smooth deceleration
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

  // 1. Initialize Kakao Map
  useEffect(() => {
    if (!window.kakao?.maps || !mapContainerRef.current) return;

    if (!mapInstance.current) {
      const options = {
        center: new window.kakao.maps.LatLng(38.207, 128.5918), // 속초
        level: 7, // 확대 레벨 (숫자가 작을수록 확대)
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);

      // 지도 컨트롤 제거 (깔끔한 UI)
      mapInstance.current = map;
    }

    // Update Markers
    updateMapMarkers();
  }, [items]);

  // 2. Update Markers Function (Kakao Maps)
  const updateMapMarkers = () => {
    if (!mapInstance.current || !window.kakao?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);

    const bounds = new window.kakao.maps.LatLngBounds();
    const linePath: any[] = [];

    items.forEach((item, index) => {
      if (item.lat && item.lng) {
        const isActive = activeId === item.id;
        const position = new window.kakao.maps.LatLng(item.lat, item.lng);

        // 커스텀 마커 이미지 생성
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

        // CustomOverlay 사용 (yAnchor/xAnchor 제거, margin으로 직접 조절)
        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: position,
          content: markerContent,
        });

        customOverlay.setMap(mapInstance.current);

        // 클릭 이벤트
        markerContent.onclick = () => {
          const el = itemRefs.current[item.id];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveId(item.id);
          }
        };

        markersRef.current.push(customOverlay);
        bounds.extend(position);
        linePath.push(position);
      }
    });

    // Draw polyline (경로선)
    if (linePath.length > 1) {
      polylineRef.current = new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#94a3b8', // slate-400
        strokeOpacity: 0.7,
        strokeStyle: 'shortdash',
      });
      polylineRef.current.setMap(mapInstance.current);
    }

    // Fit bounds (지도 영역 자동 조절)
    if (linePath.length > 0 && !activeId) {
      // 전체 경로 보기 (축소)
      mapInstance.current.setBounds(bounds, 50, 50, 50, 50);
    } else if (activeId) {
      // 트리플 스타일: 활성화된 아이템으로 부드럽게 이동
      const activeItem = items.find(i => i.id === activeId);
      if (activeItem?.lat && activeItem?.lng) {
        const currentLevel = mapInstance.current.getLevel();

        // 현재 줌이 멀면 먼저 확대
        if (currentLevel > 4) {
          mapInstance.current.setLevel(4, { animate: true });
        }

        // 부드럽게 애니메이션 이동
        smoothPanTo(activeItem.lat, activeItem.lng, 400);
      }
    }
  };

  // 3. Re-render markers when activeId changes to update styles
  useEffect(() => {
    updateMapMarkers();
  }, [activeId]);

  // 4. Scroll-based tracking for precise item detection
  useEffect(() => {
    const listContainer = document.getElementById('list-container');
    if (!listContainer) return;

    let ticking = false;
    let lastActiveId: string | null = null;

    const findClosestItem = () => {
      const containerRect = listContainer.getBoundingClientRect();
      // 컨테이너의 기준점 (위쪽 40% 지점을 기준으로 - 균형잡힌 감지)
      const targetY = containerRect.top + containerRect.height * 0.4;

      // 스크롤이 맨 위에 있으면 첫 번째 아이템 활성화
      if (listContainer.scrollTop < 10 && items.length > 0) {
        return items[0].id;
      }

      let closestItem: { id: string; distance: number } | null = null;

      Object.entries(itemRefs.current).forEach(([id, el]) => {
        if (!el) return;

        const rect = (el as HTMLDivElement).getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenterY - targetY);

        // 컨테이너 내에 보이는 아이템만 고려
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
              // 트리플 스타일: 부드러운 확대 + 이동
              const currentLevel = mapInstance.current.getLevel();

              // 현재 줌이 멀면 먼저 확대
              if (currentLevel > 4) {
                mapInstance.current.setLevel(4, { animate: true });
              }

              // 부드럽게 애니메이션 이동
              smoothPanTo(item.lat, item.lng, 400);
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    // 초기 실행
    handleScroll();

    listContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      listContainer.removeEventListener('scroll', handleScroll);
    };
  }, [items]);

  // Search Debounce - Kakao Places API
  useEffect(() => {
    if (searchQuery.length > 1) {
      setIsSearching(true);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);

      searchTimeout.current = setTimeout(async () => {
        const results = await searchPlacesKakao(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      }, 300); // Kakao API는 더 빠르게 응답
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

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
    setSearchResults([]); // Clear results after selection
  };

  const handleAdd = async () => {
    if (newItem.title) {
      // Use existing lat/lng if selected from search, otherwise resolve via Kakao
      let lat = newItem.lat;
      let lng = newItem.lng;
      let location = newItem.location || newItem.title;

      if (!lat || !lng) {
        const coords = await getCoordsFromAddress(newItem.title);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          // 기본 속초 좌표
          lat = 38.207;
          lng = 128.5918;
        }
      }

      onAddItem({
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
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _items = [...items];
    const draggedItemContent = _items.splice(dragItem.current, 1)[0];
    _items.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    onReorder(_items);
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'food':
        return <Utensils size={20} className='text-white' />;
      case 'activity':
        return <Mountain size={20} className='text-white' />;
      case 'hotel':
        return <Bed size={20} className='text-white' />;
      case 'travel':
        return <Car size={20} className='text-white' />;
      default:
        return <MapPin size={20} className='text-white' />;
    }
  };

  const getPlaceColor = (type: string) => {
    switch (type) {
      case 'food':
        return 'bg-orange-400';
      case 'activity':
        return 'bg-emerald-500';
      case 'hotel':
        return 'bg-indigo-500';
      case 'travel':
        return 'bg-slate-500';
      default:
        return 'bg-blue-400';
    }
  };

  return (
    <div className='flex flex-col h-full relative bg-white overflow-hidden'>
      {/* 1. Map Area (Top Fixed) */}
      <div className='h-[40%] w-full bg-slate-100 relative z-0 shrink-0'>
        <div ref={mapContainerRef} className='w-full h-full' />
        {/* Gradient overlay for better text visibility if we put text on map */}
        <div className='absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/20 to-transparent pointer-events-none'></div>
      </div>

      {/* 2. List Area (Bottom Sheet) */}
      <div
        id='list-container'
        className='flex-1 min-h-0 bg-white rounded-t-3xl -mt-6 z-10 relative shadow-[0_-5px_20px_rgba(0,0,0,0.05)] overflow-y-auto no-scrollbar flex flex-col pb-32'
      >
        {/* Handle bar */}
        <div
          className='sticky top-0 bg-white z-20 pt-3 pb-2 flex justify-center shrink-0'
          onClick={() => setIsAdding(true)}
        >
          <div className='w-10 h-1 bg-slate-200 rounded-full'></div>
        </div>

        {/* Header with Add Button */}
        <div className='px-5 pb-2 flex justify-between items-center sticky top-6 bg-white z-20 mb-1 shrink-0'>
          <div>
            <h2 className='text-lg font-black text-slate-800'>Day 1</h2>
            <p className='text-[11px] text-slate-400 font-medium'>
              12월 12일 (금)
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className='bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg active:scale-95 transition-all flex items-center gap-1'
          >
            <Plus size={12} strokeWidth={3} /> 일정 추가
          </button>
        </div>

        {/* List Items */}
        <div className='px-4 relative'>
          {/* Connector Line */}
          <div className='absolute left-[1.6rem] top-3 bottom-10 w-0.5 bg-slate-100 z-0'></div>

          {items.map((item, index) => {
            const isActive = activeId === item.id;
            return (
              <div
                key={item.id}
                data-id={item.id}
                ref={el => {
                  itemRefs.current[item.id] = el;
                }}
                className={`group relative flex gap-3 mb-3 z-10 transition-opacity duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-60'
                }`}
                draggable
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={e => e.preventDefault()}
                onClick={() => {
                  setActiveId(item.id);
                  if (item.lat && item.lng && mapInstance.current) {
                    mapInstance.current.flyTo([item.lat, item.lng], 15, {
                      animate: true,
                    });
                  }
                }}
              >
                {/* Marker Badge in List */}
                <div className='flex flex-col items-center pt-0.5 min-w-[2rem]'>
                  <div
                    className={`w-6 h-6 rounded-full ${
                      isActive ? 'bg-blue-600 scale-105' : 'bg-slate-400'
                    } text-white text-[10px] font-bold shadow-sm border border-white flex items-center justify-center z-10 transition-all`}
                  >
                    {index + 1}
                  </div>
                  <div className='text-[9px] font-bold text-slate-300 mt-0.5 tracking-tighter'>
                    {item.time}
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`flex-1 p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-50'
                      : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <div className='flex justify-between items-start gap-2'>
                    <div className='flex-1 min-w-0'>
                      <h3
                        className={`font-bold text-[15px] leading-tight truncate ${
                          isActive ? 'text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <div className='flex items-center gap-1 mt-0.5 text-[11px] text-slate-400'>
                        <span className='truncate font-medium'>
                          {item.type === 'food'
                            ? '식사'
                            : item.type === 'activity'
                            ? '활동'
                            : item.type === 'hotel'
                            ? '숙소'
                            : '이동'}
                        </span>
                        <span className='text-slate-300'>|</span>
                        <span className='truncate'>{item.location}</span>
                      </div>
                      {item.notes && (
                        <div className='mt-1.5 bg-slate-50 px-2 py-1 rounded text-[10px] text-slate-500 inline-block border border-slate-100'>
                          {item.notes}
                        </div>
                      )}
                    </div>

                    {/* Edit Controls */}
                    <div className='flex flex-col gap-3 pt-0.5 pl-1'>
                      <button className='text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing'>
                        <GripVertical size={14} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onRemoveItem(item.id);
                        }}
                        className='text-slate-200 hover:text-red-400'
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className='text-center py-20 text-slate-300 text-sm'>
              일정을 추가하여 여행을 계획해보세요.
            </div>
          )}

          {/* 마지막 카드가 기준점까지 스크롤될 수 있도록 여유 공간 추가 */}
          {items.length > 0 && <div className='h-[10vh]' />}
        </div>
      </div>

      {/* Add Modal with Search */}
      {isAdding && (
        <div className='fixed inset-0 z-[100] flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity'
            onClick={() => setIsAdding(false)}
          ></div>
          <div className='bg-white w-full max-w-md rounded-t-3xl p-0 z-10 animate-in slide-in-from-bottom-10 duration-300 pb-safe shadow-2xl flex flex-col max-h-[90vh]'>
            {/* Modal Header */}
            <div className='px-6 pt-6 pb-4'>
              <div className='w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6'></div>
              <h2 className='text-2xl font-black text-slate-900 mb-1'>
                새로운 일정
              </h2>
              <p className='text-slate-400 text-sm'>어디로 떠나시나요?</p>
            </div>

            <div className='flex-1 overflow-y-auto no-scrollbar px-6 pb-6'>
              {/* Search Input */}
              <div className='relative mb-6 z-50'>
                <div className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'>
                  <Search size={20} />
                </div>
                <input
                  autoFocus
                  placeholder='장소 검색 (예: 속초 중앙시장)'
                  className='w-full bg-slate-100 rounded-2xl pl-12 pr-4 py-4 text-lg font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all placeholder:font-medium placeholder:text-slate-300'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                    <Loader2 size={20} className='animate-spin text-blue-500' />
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 ? (
                <div className='mb-8 space-y-2 animate-in slide-in-from-bottom-2 fade-in'>
                  <label className='block text-xs font-bold text-slate-400 mb-2 ml-1'>
                    검색 결과
                  </label>
                  {searchResults.map((place, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPlace(place)}
                      className='w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 active:bg-blue-50 transition-colors text-left group border border-transparent hover:border-slate-100'
                    >
                      {/* Visual Thumbnail Placeholder */}
                      <div
                        className={`w-12 h-12 rounded-xl ${getPlaceColor(
                          place.type
                        )} shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                      >
                        {getPlaceIcon(place.type)}
                      </div>
                      <div className='min-w-0'>
                        <div className='font-bold text-slate-800 text-[15px] truncate'>
                          {place.name}
                        </div>
                        <div className='text-xs text-slate-400 truncate mt-0.5'>
                          {place.address}
                        </div>
                        {place.description && (
                          <div className='text-[10px] text-blue-500 mt-1 truncate'>
                            {place.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 1 && !isSearching ? (
                <div className='mb-8 text-center py-4'>
                  <p className='text-slate-400 text-sm'>
                    검색 결과가 없어요.
                    <br />
                    직접 입력하시겠어요?
                  </p>
                </div>
              ) : null}

              {/* Manual Entry Fields (Only show if manual override needed or editing) */}
              <div className='space-y-5 border-t border-slate-100 pt-6'>
                <div className='flex gap-3'>
                  <div className='flex-1'>
                    <label className='block text-xs font-bold text-slate-400 mb-1.5 ml-1'>
                      시간
                    </label>
                    <input
                      type='time'
                      className='w-full bg-slate-50 rounded-2xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 text-center'
                      value={newItem.time}
                      onChange={e =>
                        setNewItem({ ...newItem, time: e.target.value })
                      }
                    />
                  </div>
                  <div className='flex-[1.8]'>
                    <label className='block text-xs font-bold text-slate-400 mb-1.5 ml-1'>
                      유형
                    </label>
                    <div className='flex gap-1 bg-slate-50 p-1 rounded-2xl'>
                      {['food', 'activity', 'hotel', 'travel'].map(t => (
                        <button
                          key={t}
                          onClick={() =>
                            setNewItem({ ...newItem, type: t as any })
                          }
                          className={`flex-1 h-10 rounded-xl flex items-center justify-center transition-all ${
                            newItem.type === t
                              ? 'bg-white shadow-sm ring-1 ring-black/5'
                              : 'text-slate-300 hover:text-slate-500'
                          }`}
                        >
                          {t === 'food' && (
                            <Utensils
                              size={14}
                              className={
                                newItem.type === t ? 'text-orange-500' : ''
                              }
                            />
                          )}
                          {t === 'activity' && (
                            <Mountain
                              size={14}
                              className={
                                newItem.type === t ? 'text-emerald-500' : ''
                              }
                            />
                          )}
                          {t === 'hotel' && (
                            <Bed
                              size={14}
                              className={
                                newItem.type === t ? 'text-indigo-500' : ''
                              }
                            />
                          )}
                          {t === 'travel' && (
                            <Car
                              size={14}
                              className={
                                newItem.type === t ? 'text-slate-600' : ''
                              }
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-bold text-slate-400 mb-1.5 ml-1'>
                    장소명 (직접 수정 가능)
                  </label>
                  <input
                    className='w-full bg-slate-50 rounded-2xl p-3.5 text-base font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all'
                    value={newItem.title || ''}
                    onChange={e =>
                      setNewItem({ ...newItem, title: e.target.value })
                    }
                    placeholder='장소 이름'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold text-slate-400 mb-1.5 ml-1'>
                    메모
                  </label>
                  <input
                    placeholder='필요한 정보 입력'
                    className='w-full bg-slate-50 rounded-2xl p-3.5 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all'
                    value={newItem.notes || ''}
                    onChange={e =>
                      setNewItem({ ...newItem, notes: e.target.value })
                    }
                  />
                </div>

                <button
                  onClick={handleAdd}
                  disabled={!newItem.title}
                  className='w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 active:scale-[0.98] transition-all mt-4 disabled:opacity-50 flex justify-center items-center gap-2 text-lg'
                >
                  등록 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryView;
