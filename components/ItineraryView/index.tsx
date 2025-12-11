import {
  Bed,
  Car,
  Edit3,
  GripVertical,
  Loader2,
  MapPin,
  Mountain,
  Plus,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react';
import React from 'react';
import { ItineraryViewProps } from './ItineraryView.types';
import { useItineraryViewModel } from './ItineraryView.viewmodel';

const ItineraryView: React.FC<ItineraryViewProps> = props => {
  const {
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
    handleSelectPlace,
    handleAdd,
    handleEdit,
    handleStartEdit,
    handleCancelEdit,
    handleSort,
    handleItemClick,
  } = useItineraryViewModel(props);

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
      <div className='h-[40vh] w-full bg-slate-100 relative z-0 shrink-0'>
        <div ref={mapContainerRef} className='w-full h-full' />
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

          {props.items.map((item, index) => {
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
                onClick={() => handleItemClick(item)}
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
                  className={`flex-1 p-3 rounded-xl border transition-all cursor-pointer min-w-0 max-w-full overflow-hidden ${
                    isActive
                      ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-50'
                      : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <div className='flex justify-between items-start gap-2 min-w-0'>
                    <div className='flex-1 min-w-0 overflow-hidden'>
                      <h3
                        className={`font-bold text-[15px] leading-tight truncate ${
                          isActive ? 'text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <div className='flex items-center gap-1 mt-0.5 text-[11px] text-slate-400 min-w-0'>
                        <span className='truncate font-medium shrink-0'>
                          {item.type === 'food'
                            ? '식사'
                            : item.type === 'activity'
                            ? '활동'
                            : item.type === 'hotel'
                            ? '숙소'
                            : '이동'}
                        </span>
                        <span className='text-slate-300 shrink-0'>|</span>
                        <span className='truncate min-w-0'>
                          {item.location}
                        </span>
                      </div>
                      {item.notes && (
                        <div className='mt-1.5 bg-slate-50 px-2 py-1 rounded text-[10px] text-slate-500 inline-block border border-slate-100 max-w-full truncate'>
                          {item.notes}
                        </div>
                      )}
                    </div>

                    {/* Edit Controls */}
                    <div className='flex flex-col gap-2 pt-0.5 pl-1'>
                      <button className='text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing'>
                        <GripVertical size={14} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleStartEdit(item);
                        }}
                        className='text-slate-300 hover:text-blue-500'
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          props.onRemoveItem(item.id);
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

          {props.items.length === 0 && (
            <div className='text-center py-20 text-slate-300 text-sm'>
              일정을 추가하여 여행을 계획해보세요.
            </div>
          )}

          {props.items.length > 0 && <div className='h-[10vh]' />}
        </div>
      </div>

      {/* Add/Edit Modal with Search */}
      {(isAdding || editingItem) && (
        <div className='fixed inset-0 z-[100] flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity'
            onClick={handleCancelEdit}
          ></div>
          <div className='bg-white w-full max-w-md rounded-t-3xl p-0 z-10 animate-in slide-in-from-bottom-10 duration-300 pb-safe shadow-2xl flex flex-col max-h-[90vh]'>
            {/* Modal Header */}
            <div className='px-6 pt-6 pb-4'>
              <div className='w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6'></div>
              <h2 className='text-2xl font-black text-slate-900 mb-1'>
                {editingItem ? '일정 수정' : '새로운 일정'}
              </h2>
              <p className='text-slate-400 text-sm'>
                {editingItem ? '일정 정보를 수정하세요' : '어디로 떠나시나요?'}
              </p>
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

              {/* Manual Entry Fields */}
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
                  onClick={editingItem ? handleEdit : handleAdd}
                  disabled={!newItem.title}
                  className='w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 active:scale-[0.98] transition-all mt-4 disabled:opacity-50 flex justify-center items-center gap-2 text-lg'
                >
                  {editingItem ? '수정 완료' : '등록 완료'}
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
