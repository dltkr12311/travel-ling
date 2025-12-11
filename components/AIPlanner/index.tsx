import {
  Calendar,
  CheckCircle2,
  Clock,
  Cloud,
  MapPin,
  Mountain,
  Send,
  Sparkles,
  Sunrise,
  Thermometer,
  User,
  Utensils,
  Wallet,
  Wind,
} from 'lucide-react';
import React from 'react';
import { AIPlannerProps } from './AIPlanner.types';
import { useAIPlannerViewModel } from './AIPlanner.viewmodel';
import { ExpensePreviewCard } from './components/ExpensePreviewCard';

const AIPlanner: React.FC<AIPlannerProps> = props => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    lastAction,
    weatherInfo,
    isLoadingWeather,
    navHeight,
    messagesEndRef,
    isInitialState,
    totalBottomSpace,
    handleSend,
    handleQuickAction,
    getActionInfo,
  } = useAIPlannerViewModel(props);

  return (
    <div
      className='flex flex-col h-[calc(100vh-80px)] bg-gradient-to-br from-slate-50 via-blue-50/30 to-orange-50/20'
      style={{ paddingBottom: totalBottomSpace }}
    >
      {isInitialState ? (
        <div className='flex-1 overflow-y-auto no-scrollbar'>
          <div className='relative px-5 pt-6 pb-8'>
            <div className='absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -z-10' />
            <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-pink-400/20 rounded-full blur-3xl -z-10' />

            <div className='mb-5'>
              <ExpensePreviewCard
                budget={props.budget}
                expenses={props.expenses}
                people={props.people}
                itineraryCount={props.itineraryCount}
              />
            </div>

            <div className='mb-5'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200'>
                  <Sparkles size={20} className='text-white' />
                </div>
                <div>
                  <p className='text-[10px] text-slate-400 font-bold uppercase tracking-wider'>
                    AI Travel Assistant
                  </p>
                  <h1 className='text-xl font-black text-slate-900'>
                    무엇을 도와드릴까요?
                  </h1>
                </div>
              </div>
              <p className='text-slate-500 text-sm mt-2 leading-relaxed'>
                말만 하면 일정 추가, 지출 기록, 맛집 추천까지
                <br />
                <span className='text-blue-600 font-semibold'>
                  AI가 직접 앱을 조작
                </span>
                해드려요 ✨
              </p>
            </div>

            <div className='bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 shadow-xl shadow-slate-300/50 mb-6 relative overflow-hidden'>
              <div className='absolute top-0 right-0 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl' />
              <div className='absolute bottom-0 left-0 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl' />

              <div className='relative'>
                <div className='flex items-center gap-2 mb-4'>
                  <Sunrise size={16} className='text-orange-400' />
                  <span className='text-orange-400 text-xs font-bold uppercase tracking-wider'>
                    12월 13일 청대산 일출
                  </span>
                </div>

                {isLoadingWeather ? (
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-slate-700 rounded-full animate-pulse' />
                    <div className='space-y-2'>
                      <div className='w-24 h-6 bg-slate-700 rounded animate-pulse' />
                      <div className='w-32 h-3 bg-slate-700 rounded animate-pulse' />
                    </div>
                  </div>
                ) : (
                  <div className='flex items-end justify-between'>
                    <div>
                      <div className='flex items-baseline gap-2'>
                        <span className='text-4xl font-black text-white tracking-tight'>
                          {weatherInfo?.sunriseTime || '07:28'}
                        </span>
                        <span className='text-orange-400 text-sm font-bold'>
                          AM
                        </span>
                      </div>
                      <p className='text-slate-400 text-xs mt-1 font-medium'>
                        청대산 정상 기준
                      </p>
                    </div>

                    <div className='flex flex-col items-end gap-1.5'>
                      <div className='flex items-center gap-1.5 text-slate-300 text-xs'>
                        <Thermometer size={12} />
                        <span>
                          {weatherInfo?.tempLow}° ~ {weatherInfo?.tempHigh}°
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5 text-slate-300 text-xs'>
                        <Wind size={12} />
                        <span>{weatherInfo?.windSpeed}</span>
                      </div>
                      <div className='flex items-center gap-1.5 text-slate-300 text-xs'>
                        <Cloud size={12} />
                        <span>{weatherInfo?.condition}</span>
                      </div>
                    </div>
                  </div>
                )}

                {weatherInfo?.hikingAdvice && (
                  <div className='mt-4 pt-4 border-t border-slate-700/50'>
                    <p className='text-slate-400 text-xs leading-relaxed'>
                      💡 {weatherInfo.hikingAdvice}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className='mb-4'>
              <h3 className='text-slate-800 font-bold text-sm mb-3 flex items-center gap-2'>
                <Clock size={14} className='text-slate-400' />
                빠른 액션
              </h3>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  onClick={() =>
                    handleQuickAction('오후 3시에 속초 중앙시장 일정 추가해줘')
                  }
                  className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98] text-left group'
                >
                  <div className='w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <MapPin size={20} className='text-emerald-600' />
                  </div>
                  <p className='font-bold text-slate-800 text-sm'>일정 추가</p>
                  <p className='text-slate-400 text-[11px] mt-0.5'>
                    "3시에 중앙시장 가자"
                  </p>
                </button>

                <button
                  onClick={() => handleQuickAction('점심 15000원 썼어')}
                  className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.98] text-left group'
                >
                  <div className='w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <Wallet size={20} className='text-orange-600' />
                  </div>
                  <p className='font-bold text-slate-800 text-sm'>지출 기록</p>
                  <p className='text-slate-400 text-[11px] mt-0.5'>
                    "점심 15000원"
                  </p>
                </button>

                <button
                  onClick={() => handleQuickAction('속초 맛집 추천해줘')}
                  className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all active:scale-[0.98] text-left group'
                >
                  <div className='w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <Utensils size={20} className='text-rose-600' />
                  </div>
                  <p className='font-bold text-slate-800 text-sm'>맛집 추천</p>
                  <p className='text-slate-400 text-[11px] mt-0.5'>
                    "속초 회 맛집"
                  </p>
                </button>

                <button
                  onClick={() => handleQuickAction('청대산 등산 코스 알려줘')}
                  className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all active:scale-[0.98] text-left group'
                >
                  <div className='w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <Mountain size={20} className='text-indigo-600' />
                  </div>
                  <p className='font-bold text-slate-800 text-sm'>등산 정보</p>
                  <p className='text-slate-400 text-[11px] mt-0.5'>
                    "청대산 코스"
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='flex-1 overflow-y-auto px-4 pt-4 space-y-4'>
          {weatherInfo && (
            <div className='flex justify-center mb-2'>
              <div className='inline-flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-full text-xs'>
                <Sunrise size={14} className='text-orange-400' />
                <span>일출 {weatherInfo.sunriseTime}</span>
                <span className='text-slate-500'>|</span>
                <span>
                  {weatherInfo.condition} {weatherInfo.tempLow}°~
                  {weatherInfo.tempHigh}°
                </span>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                }`}
              >
                <div className='flex items-center gap-2 mb-1.5 opacity-70 text-[10px] font-bold uppercase tracking-wider'>
                  {msg.role === 'user' ? (
                    <User size={10} />
                  ) : (
                    <Sparkles size={10} className='text-blue-500' />
                  )}
                  {msg.role === 'user' ? 'You' : 'AI 어시스턴트'}
                </div>
                <div className='whitespace-pre-wrap text-sm leading-relaxed'>
                  {msg.text}
                </div>

                {msg.mapLinks && msg.mapLinks.length > 0 && (
                  <div className='mt-3 space-y-2'>
                    <p className='text-xs font-bold opacity-70 flex items-center gap-1'>
                      <MapPin size={10} /> 찾은 장소:
                    </p>
                    <div className='grid gap-2'>
                      {msg.mapLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.uri}
                          target='_blank'
                          rel='noreferrer'
                          className={`block p-2 rounded-lg text-xs font-medium transition-colors ${
                            msg.role === 'user'
                              ? 'bg-slate-800 hover:bg-slate-700 text-white'
                              : 'bg-slate-50 hover:bg-slate-100 text-blue-600 border border-slate-200'
                          }`}
                        >
                          {link.title} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className='flex justify-start'>
              <div className='bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm'>
                <div className='flex items-center gap-3'>
                  <div className='flex gap-1'>
                    <div className='w-2 h-2 bg-blue-400 rounded-full animate-bounce' />
                    <div className='w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]' />
                    <div className='w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]' />
                  </div>
                  <span className='text-xs text-slate-400 font-medium'>
                    생각 중...
                  </span>
                </div>
              </div>
            </div>
          )}

          {lastAction && getActionInfo(lastAction) && (
            <div className='flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300'>
              <div
                className={`flex items-center gap-2 ${
                  getActionInfo(lastAction)!.color
                } text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg`}
              >
                <CheckCircle2 size={14} />
                {getActionInfo(lastAction)!.label}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      <div
        className='fixed left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50'
        style={{
          bottom: navHeight,
        }}
      >
        {!isInitialState && (
          <div className='flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1'>
            <button
              onClick={() => handleQuickAction('일정 더 추가해줘')}
              className='flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-600 whitespace-nowrap transition-colors'
            >
              <Calendar size={12} /> 일정 추가
            </button>
            <button
              onClick={() => handleQuickAction('지출 기록해줘')}
              className='flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-600 whitespace-nowrap transition-colors'
            >
              <Wallet size={12} /> 지출 기록
            </button>
            <button
              onClick={() => handleQuickAction('맛집 추천해줘')}
              className='flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-600 whitespace-nowrap transition-colors'
            >
              <Utensils size={12} /> 맛집 추천
            </button>
          </div>
        )}

        <div className='relative flex items-center'>
          <input
            type='text'
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
            spellCheck='false'
            data-form-type='other'
            name='ai-message'
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder='무엇이든 말씀하세요...'
            className='w-full bg-slate-100 border-0 rounded-full py-3.5 pl-5 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition-all'
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className='absolute right-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2.5 rounded-full hover:from-blue-700 hover:to-blue-800 disabled:opacity-40 transition-all shadow-lg shadow-blue-200 active:scale-95'
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPlanner;
