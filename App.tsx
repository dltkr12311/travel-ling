import React, { useState, useEffect, useCallback } from 'react';
import ItineraryView from './components/ItineraryView';
import ExpenseView from './components/ExpenseView';
import SunriseView from './components/SunriseView';
import AIPlanner from './components/AIPlanner';
import { ItineraryItem, Person, Expense, TripData } from './types';
import { initSupabase, fetchTrip, saveTrip, subscribeToTrip, getSupabase } from './services/supabaseService';
import { Map, Wallet, Sunrise, Sparkles, Share2, Users, Cloud, Settings, Check, AlertCircle, Link as LinkIcon, X, Database } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'itinerary' | 'money' | 'sunrise' | 'ai'>('itinerary');
  
  // --- Cloud / Share State ---
  const [tripId, setTripId] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('sb_url') || process.env.SUPABASE_URL || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('sb_key') || process.env.SUPABASE_KEY || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // --- Data State ---
  const [people, setPeople] = useState<Person[]>(() => {
    const saved = localStorage.getItem('sokcho_people');
    return saved ? JSON.parse(saved) : [
      { id: 'p1', name: '나' },
      { id: 'p2', name: '친구' }
    ];
  });
  
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('sokcho_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem('sokcho_budget');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(() => {
    const saved = localStorage.getItem('sokcho_itinerary');
    return saved ? JSON.parse(saved) : [
      { 
        id: '1', 
        time: '14:00', 
        title: '속초 도착', 
        location: '속초시외버스터미널', 
        type: 'travel', 
        notes: '버스표 미리 확인하기',
        lat: 38.2127, 
        lng: 128.5916 
      },
      { 
        id: '2', 
        time: '18:00', 
        title: '아바이 마을 저녁 식사', 
        location: '아바이마을', 
        type: 'food', 
        notes: '오징어 순대 먹기',
        lat: 38.2032, 
        lng: 128.5913 
      },
      { 
        id: '3', 
        time: '20:00', 
        title: '속초아이 관람차', 
        location: '속초해수욕장', 
        type: 'activity', 
        notes: '야경 사진 찍기',
        lat: 38.1906, 
        lng: 128.6033 
      }
    ];
  });

  // 1. Initialize DB Connection
  useEffect(() => {
    if (dbUrl && dbKey) {
      const success = initSupabase(dbUrl, dbKey);
      setIsDbConnected(success);
    }
  }, [dbUrl, dbKey]);

  // 2. Check URL for Trip ID (Join Mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('trip');
    if (tid) {
      setTripId(tid);
      if (isDbConnected) {
        loadTripFromCloud(tid);
      } else {
        setShowShareModal(true); // Prompt to connect DB to view trip
      }
    }
  }, [isDbConnected]);

  // 3. Load Data from Cloud
  const loadTripFromCloud = async (tid: string) => {
    setIsSyncing(true);
    const data = await fetchTrip(tid);
    if (data) {
      setPeople(data.people);
      setExpenses(data.expenses);
      setBudget(data.budget);
      setItinerary(data.itinerary);
      setLastSynced(new Date());
    }
    setIsSyncing(false);

    // Subscribe to changes
    const unsubscribe = subscribeToTrip(tid, (newData) => {
      console.log("Realtime update received!", newData);
      setPeople(newData.people);
      setExpenses(newData.expenses);
      setBudget(newData.budget);
      setItinerary(newData.itinerary);
      setLastSynced(new Date());
    });

    return () => unsubscribe();
  };

  // 4. Auto-Save to Cloud (Debounced) & LocalStorage
  useEffect(() => {
    // Local Save
    localStorage.setItem('sokcho_people', JSON.stringify(people));
    localStorage.setItem('sokcho_expenses', JSON.stringify(expenses));
    localStorage.setItem('sokcho_budget', budget.toString());
    localStorage.setItem('sokcho_itinerary', JSON.stringify(itinerary));

    // Cloud Save (If connected and tripId exists)
    if (isDbConnected && tripId) {
      const data: TripData = { people, expenses, budget, itinerary };
      const timer = setTimeout(() => {
        saveTrip(tripId, data).then(() => setLastSynced(new Date()));
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [people, expenses, budget, itinerary, isDbConnected, tripId]);

  const handleCreateTrip = async () => {
    if (!isDbConnected) return;
    const newId = Math.random().toString(36).substring(2, 10);
    setTripId(newId);
    setIsSyncing(true);
    const data: TripData = { people, expenses, budget, itinerary };
    await saveTrip(newId, data);
    setLastSynced(new Date());
    setIsSyncing(false);
    
    // Update URL without reload
    const newUrl = `${window.location.pathname}?trip=${newId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleSaveDbConfig = () => {
    localStorage.setItem('sb_url', dbUrl);
    localStorage.setItem('sb_key', dbKey);
    const success = initSupabase(dbUrl, dbKey);
    setIsDbConnected(success);
    if (success && tripId) {
        loadTripFromCloud(tripId);
    }
  };

  // Time Left Timer
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const targetDate = new Date('2025-12-12T00:00:00');
    const timer = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) setTimeLeft("여행 출발!");
      else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`D-${days} ${hours}시간`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleReorderItinerary = (newItems: ItineraryItem[]) => {
    setItinerary(newItems);
  };

  return (
    <div className="h-screen bg-[#f2f4f6] font-sans text-slate-800 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 px-5 py-3 flex justify-between items-end border-b border-slate-100 shrink-0 h-[60px]">
        <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">2025.12.12 - 12.13</p>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1">
                속초<span className="text-blue-600">Link</span>
                {tripId && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full align-top font-bold">Cloud</span>}
            </h1>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowShareModal(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${tripId ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'bg-slate-50 text-slate-400'}`}
            >
                {tripId ? <Users size={16} /> : <Share2 size={16} />}
            </button>
            <div className="bg-slate-900 px-2.5 py-1 rounded-full shadow-lg shadow-slate-200">
                <span className="text-[10px] font-bold text-white">{timeLeft}</span>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {activeTab === 'itinerary' ? (
             <div className="w-full h-full bg-slate-50">
                <ItineraryView 
                    items={itinerary} 
                    onAddItem={(item) => setItinerary([...itinerary, item])}
                    onRemoveItem={(id) => setItinerary(itinerary.filter(i => i.id !== id))}
                    onReorder={handleReorderItinerary}
                />
             </div>
        ) : (
            <div className="w-full h-full overflow-y-auto no-scrollbar">
                {activeTab === 'money' && (
                    <ExpenseView 
                        people={people} 
                        expenses={expenses}
                        onAddPerson={(name) => setPeople([...people, { id: Date.now().toString(), name }])}
                        onAddExpense={(exp) => setExpenses([...expenses, exp])}
                        onRemoveExpense={(id) => setExpenses(expenses.filter(e => e.id !== id))}
                        budget={budget}
                        onSetBudget={setBudget}
                    />
                )}
                {activeTab === 'sunrise' && <SunriseView />}
                {activeTab === 'ai' && <AIPlanner />}
            </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-3xl px-2 py-2 z-40 shadow-2xl border border-white/50 flex justify-around items-center">
            <button 
                onClick={() => setActiveTab('itinerary')}
                className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${activeTab === 'itinerary' ? 'text-slate-900 bg-slate-100/50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Map size={20} strokeWidth={activeTab === 'itinerary' ? 3 : 2} />
                <span className="text-[10px] font-bold mt-1">일정</span>
            </button>
            <button 
                onClick={() => setActiveTab('money')}
                className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${activeTab === 'money' ? 'text-slate-900 bg-slate-100/50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Wallet size={20} strokeWidth={activeTab === 'money' ? 3 : 2} />
                <span className="text-[10px] font-bold mt-1">정산</span>
            </button>
            <button 
                onClick={() => setActiveTab('ai')}
                className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${activeTab === 'ai' ? 'text-blue-600 bg-blue-50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Sparkles size={20} fill={activeTab === 'ai' ? "currentColor" : "none"} strokeWidth={activeTab === 'ai' ? 2 : 2} />
                <span className="text-[10px] font-bold mt-1">AI</span>
            </button>
             <button 
                onClick={() => setActiveTab('sunrise')}
                className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${activeTab === 'sunrise' ? 'text-orange-500 bg-orange-50 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Sunrise size={20} strokeWidth={activeTab === 'sunrise' ? 3 : 2} />
                <span className="text-[10px] font-bold mt-1">일출</span>
            </button>
      </nav>

      {/* --- SHARE MODAL --- */}
      {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)}></div>
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 z-10 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
                  <button onClick={() => setShowShareModal(false)} className="absolute right-4 top-4 text-slate-300 hover:text-slate-500"><X size={20}/></button>
                  
                  {/* Header */}
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                          {isDbConnected ? <Cloud size={32} /> : <Database size={32} />}
                      </div>
                      <h2 className="text-xl font-black text-slate-900">
                          {isDbConnected ? (tripId ? '친구 초대하기' : '여행 공유하기') : '클라우드 연결'}
                      </h2>
                      <p className="text-slate-500 text-sm mt-1">
                          {isDbConnected 
                            ? '친구들과 실시간으로 일정을 함께 수정하세요.' 
                            : '공유 기능을 사용하려면 DB 연결이 필요해요.'}
                      </p>
                  </div>

                  {/* State: Not Connected */}
                  {!isDbConnected && (
                      <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-500 space-y-2 border border-slate-100">
                              <p className="font-bold text-slate-700 mb-1 flex items-center gap-1"><AlertCircle size={12}/> Supabase 설정 필요</p>
                              <p>친구와 공유하려면 <a href="https://supabase.com" target="_blank" className="text-blue-600 underline">Supabase</a> 프로젝트가 필요합니다. SQL Editor에서 아래 쿼리를 실행해주세요.</p>
                              <code className="block bg-slate-800 text-slate-300 p-2 rounded-lg mt-2 font-mono select-all">
                                  create table trips ( id text primary key, data jsonb );
                              </code>
                          </div>
                          <div className="space-y-3">
                              <input 
                                  placeholder="Supabase Project URL" 
                                  className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                  value={dbUrl}
                                  onChange={e => setDbUrl(e.target.value)}
                              />
                              <input 
                                  type="password"
                                  placeholder="Supabase Anon Key" 
                                  className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                  value={dbKey}
                                  onChange={e => setDbKey(e.target.value)}
                              />
                          </div>
                          <button 
                            onClick={handleSaveDbConfig}
                            disabled={!dbUrl || !dbKey}
                            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50 mt-2"
                          >
                              연동 시작하기
                          </button>
                      </div>
                  )}

                  {/* State: Connected, No Trip ID */}
                  {isDbConnected && !tripId && (
                      <div className="space-y-4">
                          <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                              <Check size={16} /> DB 연결 성공!
                          </div>
                          <button 
                              onClick={handleCreateTrip}
                              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                          >
                              <Share2 size={20} />
                              공유 링크 만들기
                          </button>
                      </div>
                  )}

                  {/* State: Connected & Shared */}
                  {isDbConnected && tripId && (
                      <div className="space-y-4">
                          <div className="bg-slate-100 p-4 rounded-2xl flex items-center gap-3 break-all">
                              <div className="bg-white p-2 rounded-lg shadow-sm">
                                  <LinkIcon size={20} className="text-slate-400"/>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase">Trip Link</div>
                                  <div className="text-sm font-bold text-blue-600 truncate">{window.location.href}</div>
                              </div>
                          </div>
                          <button 
                              onClick={() => {
                                  navigator.clipboard.writeText(window.location.href);
                                  alert('링크가 복사되었습니다!');
                              }}
                              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-transform"
                          >
                              링크 복사하기
                          </button>
                          
                          {lastSynced && (
                              <p className="text-center text-[10px] text-slate-400 font-medium">
                                  마지막 동기화: {lastSynced.toLocaleTimeString()}
                              </p>
                          )}
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default App;