import {
  Calendar,
  CheckCircle2,
  Clock,
  Cloud,
  MapPin,
  Mountain,
  PiggyBank,
  Send,
  Sparkles,
  Sunrise,
  Thermometer,
  TrendingDown,
  TrendingUp,
  User,
  UserPlus,
  Utensils,
  Wallet,
  Wind,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AIAction,
  processAIAssistantMessage,
  resolveItineraryPlace,
} from '../services/aiActionService';
import { getSokchoWeatherAndSunrise } from '../services/geminiService';
import {
  ChatMessage,
  Expense,
  ItineraryItem,
  Person,
  WeatherInfo,
} from '../types';

interface Props {
  people: Person[];
  budget: number;
  expenses: Expense[];
  itineraryCount: number;
  onAddItinerary: (item: ItineraryItem) => void;
  onAddExpense: (expense: Expense) => void;
  onSetBudget: (amount: number) => void;
  onAddPerson: (name: string) => void;
}

// 지출 현황 프리뷰 카드 컴포넌트
const ExpensePreviewCard: React.FC<{
  budget: number;
  expenses: Expense[];
  people: Person[];
  itineraryCount: number;
}> = ({ budget, expenses, people, itineraryCount }) => {
  const totalSpent = useMemo(
    () => expenses.reduce((acc, cur) => acc + cur.amount, 0),
    [expenses]
  );
  const remainingBudget = budget - totalSpent;
  const spendPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const perPersonShare = people.length > 0 ? totalSpent / people.length : 0;

  // 최근 지출 3개
  const recentExpenses = useMemo(
    () => expenses.slice(-3).reverse(),
    [expenses]
  );

  // 예산 상태
  const getBudgetStatus = () => {
    if (budget === 0)
      return {
        color: 'slate',
        label: '예산 미설정',
        icon: <PiggyBank size={16} />,
      };
    if (spendPercentage > 100)
      return {
        color: 'red',
        label: '예산 초과!',
        icon: <TrendingDown size={16} />,
      };
    if (spendPercentage > 80)
      return {
        color: 'orange',
        label: '주의 필요',
        icon: <TrendingUp size={16} />,
      };
    return {
      color: 'emerald',
      label: '여유로움',
      icon: <TrendingUp size={16} />,
    };
  };

  const status = getBudgetStatus();

  return (
    <div className='bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl flex items-center justify-center'>
            <Wallet size={16} className='text-white' />
          </div>
          <div>
            <h3 className='font-bold text-slate-800 text-sm'>지출 현황</h3>
            <p className='text-[10px] text-slate-400'>실시간 업데이트</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            status.color === 'emerald'
              ? 'bg-emerald-100 text-emerald-700'
              : status.color === 'orange'
              ? 'bg-orange-100 text-orange-700'
              : status.color === 'red'
              ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {status.icon}
          {status.label}
        </div>
      </div>

      {/* Main Stats */}
      {budget > 0 ? (
        <div className='mb-4'>
          <div className='flex items-baseline justify-between mb-2'>
            <div>
              <p className='text-[10px] text-slate-400 font-medium mb-0.5'>
                총 지출
              </p>
              <p className='text-3xl font-black text-slate-900'>
                {totalSpent.toLocaleString()}
                <span className='text-lg text-slate-400 ml-1'>원</span>
              </p>
            </div>
            <div className='text-right'>
              <p className='text-[10px] text-slate-400 font-medium mb-0.5'>
                남은 예산
              </p>
              <p
                className={`text-xl font-bold ${
                  remainingBudget >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {remainingBudget >= 0 ? '' : '-'}
                {Math.abs(remainingBudget).toLocaleString()}원
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className='h-2 w-full bg-slate-100 rounded-full overflow-hidden'>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spendPercentage > 100
                  ? 'bg-red-500'
                  : spendPercentage > 80
                  ? 'bg-orange-400'
                  : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              }`}
              style={{ width: `${Math.min(spendPercentage, 100)}%` }}
            />
          </div>
          <div className='flex justify-between mt-1.5 text-[10px] text-slate-400'>
            <span>{Math.round(spendPercentage)}% 사용</span>
            <span>예산 {budget.toLocaleString()}원</span>
          </div>
        </div>
      ) : (
        <div className='mb-4 bg-slate-50 rounded-2xl p-4 text-center'>
          <PiggyBank size={32} className='text-slate-300 mx-auto mb-2' />
          <p className='text-slate-500 text-sm font-medium'>예산을 설정하면</p>
          <p className='text-slate-400 text-xs'>
            지출 현황을 한눈에 볼 수 있어요
          </p>
        </div>
      )}

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <div className='mb-4'>
          <p className='text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2'>
            최근 지출
          </p>
          <div className='space-y-2'>
            {recentExpenses.map(exp => {
              const payer = people.find(p => p.id === exp.payerId);
              return (
                <div
                  key={exp.id}
                  className='flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2'
                >
                  <div className='flex items-center gap-2'>
                    <div className='w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200'>
                      {payer?.name.slice(0, 1) || '?'}
                    </div>
                    <span className='text-sm font-medium text-slate-700 truncate max-w-[120px]'>
                      {exp.description}
                    </span>
                  </div>
                  <span className='text-sm font-bold text-slate-800'>
                    {exp.amount.toLocaleString()}원
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className='grid grid-cols-3 gap-2 pt-3 border-t border-slate-100'>
        <div className='text-center'>
          <p className='text-lg font-black text-slate-800'>{people.length}</p>
          <p className='text-[9px] text-slate-400 font-medium'>멤버</p>
        </div>
        <div className='text-center border-x border-slate-100'>
          <p className='text-lg font-black text-slate-800'>{expenses.length}</p>
          <p className='text-[9px] text-slate-400 font-medium'>지출 건수</p>
        </div>
        <div className='text-center'>
          <p className='text-lg font-black text-slate-800'>{itineraryCount}</p>
          <p className='text-[9px] text-slate-400 font-medium'>일정</p>
        </div>
      </div>

      {/* Per Person */}
      {expenses.length > 0 && people.length > 1 && (
        <div className='mt-3 bg-blue-50 rounded-xl px-3 py-2 flex items-center justify-between'>
          <span className='text-xs text-blue-600 font-medium'>1인당 지출</span>
          <span className='text-sm font-bold text-blue-700'>
            {Math.round(perPersonShare).toLocaleString()}원
          </span>
        </div>
      )}
    </div>
  );
};

const AIPlanner: React.FC<Props> = ({
  people,
  budget,
  expenses,
  itineraryCount,
  onAddItinerary,
  onAddExpense,
  onSetBudget,
  onAddPerson,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<AIAction | null>(null);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 일출/날씨 정보 로드
  useEffect(() => {
    const loadWeather = async () => {
      setIsLoadingWeather(true);
      const info = await getSokchoWeatherAndSunrise();
      setWeatherInfo(info);
      setIsLoadingWeather(false);
    };
    loadWeather();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Execute AI action
  const executeAction = async (action: AIAction) => {
    try {
      switch (action.type) {
        case 'add_itinerary': {
          const data = action.data;
          if (data?.title) {
            const coords = await resolveItineraryPlace(data.title);
            const newItem: ItineraryItem = {
              id: Date.now().toString(),
              time: data.time || '12:00',
              title: data.title,
              location: coords?.address || data.location || data.title,
              type: data.itemType || 'activity',
              notes: data.notes || '',
              lat: coords?.lat,
              lng: coords?.lng,
            };
            onAddItinerary(newItem);
            setLastAction(action);
          }
          break;
        }
        case 'add_expense': {
          const data = action.data;
          if (data?.amount && data?.description) {
            let payerId = people[0]?.id || 'p1';
            if (data.payerName) {
              const foundPerson = people.find(p =>
                p.name.toLowerCase().includes(data.payerName.toLowerCase())
              );
              if (foundPerson) payerId = foundPerson.id;
            }
            const newExpense: Expense = {
              id: Date.now().toString(),
              amount: data.amount,
              description: data.description,
              payerId: payerId,
              date: new Date().toISOString(),
            };
            onAddExpense(newExpense);
            setLastAction(action);
          }
          break;
        }
        case 'set_budget': {
          const data = action.data;
          if (data?.budget && data.budget > 0) {
            onSetBudget(data.budget);
            setLastAction(action);
          }
          break;
        }
        case 'add_person': {
          const data = action.data;
          if (data?.personName) {
            onAddPerson(data.personName);
            setLastAction(action);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Action execution error:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);
    setLastAction(null);

    const totalSpent = expenses.reduce((acc, cur) => acc + cur.amount, 0);

    const result = await processAIAssistantMessage(userText, {
      people,
      currentBudget: budget,
      totalSpent,
      itineraryCount,
      sunriseTime: weatherInfo?.sunriseTime,
      weatherCondition: weatherInfo?.condition,
    });

    if (result.action) {
      await executeAction(result.action);
    }

    setMessages(prev => [
      ...prev,
      {
        role: 'model',
        text: result.text,
        isMapResult: result.mapLinks && result.mapLinks.length > 0,
        mapLinks: result.mapLinks,
      },
    ]);
    setIsLoading(false);
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  const getActionInfo = (action: AIAction) => {
    switch (action.type) {
      case 'add_itinerary':
        return {
          icon: <Calendar size={14} />,
          color: 'bg-emerald-500',
          label: '일정 추가됨',
        };
      case 'add_expense':
        return {
          icon: <Wallet size={14} />,
          color: 'bg-orange-500',
          label: '지출 기록됨',
        };
      case 'set_budget':
        return {
          icon: <Wallet size={14} />,
          color: 'bg-blue-500',
          label: '예산 설정됨',
        };
      case 'add_person':
        return {
          icon: <UserPlus size={14} />,
          color: 'bg-purple-500',
          label: '멤버 추가됨',
        };
      default:
        return null;
    }
  };

  // 채팅이 시작되지 않은 초기 상태
  const isInitialState = messages.length === 0;

  return (
    <div className='flex flex-col h-[calc(100vh-80px)] pb-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-orange-50/20'>
      {isInitialState ? (
        /* ===== 초기 화면 (메인 대시보드) ===== */
        <div className='flex-1 overflow-y-auto no-scrollbar'>
          {/* Hero Section */}
          <div className='relative px-5 pt-6 pb-8'>
            {/* Background Decoration */}
            <div className='absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -z-10' />
            <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-pink-400/20 rounded-full blur-3xl -z-10' />

            {/* 지출 현황 프리뷰 카드 - 상단 배치 */}
            <div className='mb-5'>
              <ExpensePreviewCard
                budget={budget}
                expenses={expenses}
                people={people}
                itineraryCount={itineraryCount}
              />
            </div>

            {/* Welcome Text */}
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

            {/* 일출/날씨 카드 */}
            <div className='bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 shadow-xl shadow-slate-300/50 mb-6 relative overflow-hidden'>
              {/* Decorative Elements */}
              <div className='absolute top-0 right-0 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl' />
              <div className='absolute bottom-0 left-0 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl' />

              <div className='relative'>
                <div className='flex items-center gap-2 mb-4'>
                  <Sunrise size={16} className='text-orange-400' />
                  <span className='text-orange-400 text-xs font-bold uppercase tracking-wider'>
                    12월 13일 설악산 일출
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
                        울산바위 정상 기준
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

            {/* Quick Actions Grid */}
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
                  onClick={() => handleQuickAction('울산바위 등산 코스 알려줘')}
                  className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all active:scale-[0.98] text-left group'
                >
                  <div className='w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <Mountain size={20} className='text-indigo-600' />
                  </div>
                  <p className='font-bold text-slate-800 text-sm'>등산 정보</p>
                  <p className='text-slate-400 text-[11px] mt-0.5'>
                    "울산바위 코스"
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== 채팅 화면 ===== */
        <div className='flex-1 overflow-y-auto px-4 pt-4 space-y-4'>
          {/* Mini Weather Card */}
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

      {/* Input Area */}
      <div className='p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100'>
        {/* Quick chips (채팅 중일 때) */}
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
