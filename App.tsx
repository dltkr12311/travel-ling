import {
  Check,
  Cloud,
  Database,
  Link as LinkIcon,
  Loader2,
  Map,
  MessageSquare,
  Share2,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import AdminView from './components/AdminView';
import AIPlanner from './components/AIPlanner';
import ChatRoom from './components/ChatRoom';
import ExpenseView from './components/ExpenseView';
import IdLogin from './components/IdLogin';
import ItineraryView from './components/ItineraryView';
import ProfileSetup from './components/ProfileSetup';
import {
  checkSupabaseHealth,
  createTrip,
  fetchTrip,
  findUserProfileByDisplayId,
  getSupabaseClient,
  getUserProfile,
  initSupabase,
  saveTrip,
} from './services/supabaseService';
import {
  Expense,
  GroupChatMessage,
  ItineraryItem,
  Person,
  TripData,
} from './types';
import { getOrCreateUserId } from './utils/browserFingerprint';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'itinerary' | 'money' | 'ai' | 'chat'
  >('ai');

  // --- Admin Mode ---
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Check for /admin URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setIsAdminMode(true);
    }
  }, []);

  // --- Cloud / Share State ---
  const [tripId, setTripId] = useState<string | null>(() => {
    // 먼저 localStorage에서 기존 trip ID 확인
    const savedTripId = localStorage.getItem('sokcho_trip_id');
    if (savedTripId) return savedTripId;

    // localStorage에 없으면 URL 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const urlTripId = params.get('trip');
    if (urlTripId) {
      localStorage.setItem('sokcho_trip_id', urlTripId);
      return urlTripId;
    }

    return null;
  });
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('supabase_url') ||
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('supabase_key') ||
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      ''
  );
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // --- Profile Setup State ---
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    // tripId가 있으면 브라우저 지문으로 일관된 ID 생성
    const savedTripId =
      localStorage.getItem('sokcho_trip_id') ||
      new URLSearchParams(window.location.search).get('trip');

    if (savedTripId) {
      // 브라우저 지문 기반으로 일관된 userId 생성
      const fingerprintUserId = getOrCreateUserId(savedTripId);

      // localStorage에 저장 (이전 버전 호환)
      const stored = localStorage.getItem('current_user_id');
      if (!stored) {
        localStorage.setItem('current_user_id', fingerprintUserId);
      }

      // 브라우저 지문 기반 ID 사용
      return fingerprintUserId;
    }

    // tripId가 없으면 기존 방식
    return localStorage.getItem('current_user_id');
  });
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showIdLogin, setShowIdLogin] = useState(false);

  // --- Data State ---
  const [people, setPeople] = useState<Person[]>(() => {
    // 링크로 들어온 경우, 빈 배열로 시작 (Supabase에서 로드할 예정)
    const params = new URLSearchParams(window.location.search);
    const hasTrip = params.get('trip');

    if (hasTrip) {
      return []; // 링크로 들어온 경우 빈 배열
    }

    // 일반적인 경우 localStorage 사용
    const saved = localStorage.getItem('sokcho_people');
    return saved
      ? JSON.parse(saved)
      : [
          { id: 'p1', name: '나' },
          { id: 'p2', name: '친구' },
        ];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasTrip = params.get('trip');
    if (hasTrip) return [];

    const saved = localStorage.getItem('sokcho_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [budget, setBudget] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasTrip = params.get('trip');
    if (hasTrip) return 0;

    const saved = localStorage.getItem('sokcho_budget');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [itinerary, setItinerary] = useState<ItineraryItem[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasTrip = params.get('trip');
    if (hasTrip) return [];

    const saved = localStorage.getItem('sokcho_itinerary');
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<GroupChatMessage[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasTrip = params.get('trip');
    if (hasTrip) return [];

    const saved = localStorage.getItem('sokcho_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const verifyConnection = useCallback(async () => {
    if (!supabaseUrl || !supabaseKey) {
      setIsDbConnected(false);
      setConnectionError(null);
      return false;
    }

    setIsCheckingConnection(true);
    const healthy = await checkSupabaseHealth(supabaseUrl, supabaseKey);
    setIsCheckingConnection(false);

    if (!healthy) {
      setIsDbConnected(false);
      setConnectionError(
        'Supabase 연결에 실패했습니다. URL과 Anon Key를 확인하세요.'
      );
      return false;
    }

    initSupabase({ url: supabaseUrl, anonKey: supabaseKey });
    setIsDbConnected(true);
    setConnectionError(null);
    return true;
  }, [supabaseKey, supabaseUrl]);

  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      verifyConnection();
    }
  }, []);

  // 1.5. Update userId when tripId changes
  useEffect(() => {
    if (tripId) {
      // tripId가 변경되면 브라우저 지문 기반 userId 생성
      const fingerprintUserId = getOrCreateUserId(tripId);
      setCurrentUserId(fingerprintUserId);
      localStorage.setItem('current_user_id', fingerprintUserId);
      localStorage.setItem(`user_id_${tripId}`, fingerprintUserId);
    }
  }, [tripId]);

  // 2. Check for profile setup when joining via link & restore profile
  useEffect(() => {
    const restoreProfile = async () => {
      // Supabase가 연결되어 있고, tripId가 있으면 프로필 복원 시도
      if (isDbConnected && tripId) {
        try {
          // 1. 브라우저 지문 기반 userId로 프로필 찾기
          if (currentUserId) {
            const profile = await getUserProfile(tripId, currentUserId);

            if (profile) {
              // 프로필이 있으면 people 배열에 추가 (이미 있으면 스킵)
              setPeople((prev: Person[]) => {
                const exists = prev.find(p => p.id === currentUserId);
                if (exists) return prev;

                return [
                  ...prev,
                  {
                    id: currentUserId,
                    name: profile.name,
                    profilePic: profile.profilePic,
                    joinedAt: new Date().toISOString(),
                  },
                ];
              });
              console.log(
                '✅ Profile restored from Supabase (by fingerprint):',
                profile.name
              );
              return;
            }
          }

          // 2. 아이디로 프로필 찾기 (캐시 삭제된 경우)
          const savedDisplayId = localStorage.getItem(`display_id_${tripId}`);
          if (savedDisplayId) {
            const profileById = await findUserProfileByDisplayId(
              tripId,
              savedDisplayId
            );

            if (profileById) {
              // 아이디로 찾은 프로필이 있으면 userId 업데이트
              setCurrentUserId(profileById.userId);
              localStorage.setItem('current_user_id', profileById.userId);
              localStorage.setItem(`user_id_${tripId}`, profileById.userId);

              // 프로필이 있으면 people 배열에 추가
              setPeople((prev: Person[]) => {
                const exists = prev.find(p => p.id === profileById.userId);
                if (exists) return prev;

                return [
                  ...prev,
                  {
                    id: profileById.userId,
                    name: profileById.name,
                    profilePic: profileById.profilePic,
                    joinedAt: new Date().toISOString(),
                  },
                ];
              });
              console.log(
                '✅ Profile restored from Supabase (by ID):',
                profileById.name
              );
              return;
            }
          }

          // 3. 찾지 못했으면 처음 방문자로 간주하고 프로필 설정 화면 표시
          console.log('ℹ️ First visit detected - showing profile setup');
          if (!currentUserId) {
            // 처음 방문자: 프로필 설정 화면 표시 (아이디는 선택사항으로 입력 가능)
            setShowProfileSetup(true);
          }
        } catch (error) {
          console.error('Failed to restore profile:', error);
          // 에러가 나도 처음 방문자로 간주하고 프로필 설정 화면 표시
          if (tripId && !currentUserId) {
            setShowProfileSetup(true);
          }
        }
      }
    };

    restoreProfile();
  }, [isDbConnected, tripId, currentUserId]);

  useEffect(() => {
    // 링크로 들어온 경우 (tripId가 있고 프로필이 없으면) 프로필 설정 표시
    if (tripId && !currentUserId) {
      setShowProfileSetup(true);
    }
  }, [currentUserId, tripId]);

  // Load trip data when tripId and connection are ready
  useEffect(() => {
    if (isDbConnected && tripId) {
      loadTripFromCloud(tripId);
    }
  }, [isDbConnected, tripId]);

  // Supabase Realtime 구독 (실시간 동기화)
  useEffect(() => {
    if (!isDbConnected || !tripId) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Realtime 구독 설정
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload: any) => {
          console.log('Realtime update received:', payload);
          if (payload.new && payload.new.data) {
            const data = payload.new.data as TripData;
            // 다른 사용자의 변경사항만 반영 (자신의 변경은 이미 로컬에 있음)
            // 현재 사용자의 프로필은 유지하고 나머지만 업데이트
            setPeople((prev: Person[]) => {
              // 더미 데이터 필터링 (id가 'p'로 시작하는 것은 제외)
              const realPeopleFromServer = data.people.filter(
                (p: Person) => !p.id.startsWith('p')
              );

              if (!currentUserId) return realPeopleFromServer;

              // 현재 사용자의 최신 프로필 찾기
              const myProfile = prev.find(p => p.id === currentUserId);

              if (!myProfile) return realPeopleFromServer;

              // Supabase 데이터에서 현재 사용자 제외
              const othersFromServer = realPeopleFromServer.filter(
                p => p.id !== currentUserId
              );

              // 현재 사용자 프로필 + 다른 사용자들
              return [myProfile, ...othersFromServer];
            });
            setExpenses(data.expenses);
            setBudget(data.budget);
            setItinerary(data.itinerary);
            // 메시지 병합 (id 기준 중복 제거)
            setMessages((prev: GroupChatMessage[]) => {
              const serverMessages = data.messages || [];
              const allMessages = [...prev];

              // 서버 메시지 중 로컬에 없는 것만 추가
              serverMessages.forEach((msg: GroupChatMessage) => {
                if (!allMessages.find(m => m.id === msg.id)) {
                  allMessages.push(msg);
                }
              });

              // timestamp 순으로 정렬
              return allMessages.sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              );
            });
          }
        }
      )
      .subscribe();

    // Realtime이 작동하지 않을 경우를 대비한 폴링 (10초마다)
    const pollingInterval = setInterval(() => {
      loadTripFromCloud(tripId);
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [isDbConnected, tripId]);

  // 3. Load Data from Cloud
  const loadTripFromCloud = async (tid: string) => {
    setIsSyncing(true);
    const data = await fetchTrip(tid);
    if (data) {
      // 현재 사용자의 프로필은 유지하고 나머지만 업데이트
      setPeople((prev: Person[]) => {
        // 더미 데이터 필터링 (id가 'p'로 시작하는 것은 제외)
        const realPeopleFromServer = data.people.filter(
          (p: Person) => !p.id.startsWith('p')
        );

        if (!currentUserId) return realPeopleFromServer;

        // 현재 사용자의 최신 프로필 찾기
        const myProfile = prev.find(p => p.id === currentUserId);

        if (!myProfile) return realPeopleFromServer;

        // Supabase 데이터에서 현재 사용자 제외
        const othersFromServer = realPeopleFromServer.filter(
          p => p.id !== currentUserId
        );

        // 현재 사용자 프로필 + 다른 사용자들
        return [myProfile, ...othersFromServer];
      });
      setExpenses(data.expenses);
      setBudget(data.budget);
      setItinerary(data.itinerary);
      // 메시지 병합 (id 기준 중복 제거)
      setMessages((prev: GroupChatMessage[]) => {
        const serverMessages = data.messages || [];
        const allMessages = [...prev];

        // 서버 메시지 중 로컬에 없는 것만 추가
        serverMessages.forEach((msg: GroupChatMessage) => {
          if (!allMessages.find(m => m.id === msg.id)) {
            allMessages.push(msg);
          }
        });

        // timestamp 순으로 정렬
        return allMessages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
      setLastSynced(new Date());
    }
    setIsSyncing(false);
  };

  // 4. Auto-Save to Cloud (Debounced) & LocalStorage
  useEffect(() => {
    // Local Save
    localStorage.setItem('sokcho_people', JSON.stringify(people));
    localStorage.setItem('sokcho_expenses', JSON.stringify(expenses));
    localStorage.setItem('sokcho_budget', budget.toString());
    localStorage.setItem('sokcho_itinerary', JSON.stringify(itinerary));
    localStorage.setItem('sokcho_messages', JSON.stringify(messages));

    // Cloud Save (If connected and tripId exists)
    if (isDbConnected && tripId) {
      // 더미 데이터 필터링 (id가 'p'로 시작하는 것은 제외)
      const realPeople = people.filter((p: Person) => !p.id.startsWith('p'));
      const data: TripData = {
        people: realPeople,
        expenses,
        budget,
        itinerary,
        messages,
        currentUserId: currentUserId || undefined,
      };
      const timer = setTimeout(() => {
        saveTrip(tripId, data).then(() => setLastSynced(new Date()));
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [
    people,
    expenses,
    budget,
    itinerary,
    messages,
    isDbConnected,
    tripId,
    currentUserId,
  ]);

  const handleCreateTrip = async () => {
    if (!isDbConnected) return;

    // 이미 tripId가 있으면 재사용 (새로 생성하지 않음)
    if (tripId) {
      setShowShareModal(false);
      return;
    }

    setIsSyncing(true);
    // 더미 데이터 필터링 (id가 'p'로 시작하는 것은 제외)
    const realPeople = people.filter((p: Person) => !p.id.startsWith('p'));
    const data: TripData = {
      people: realPeople,
      expenses,
      budget,
      itinerary,
      messages,
      currentUserId: currentUserId || undefined,
    };
    const newId = await createTrip(data);
    setIsSyncing(false);
    if (!newId) return;

    // 새로운 trip ID를 localStorage에 저장
    localStorage.setItem('sokcho_trip_id', newId);
    setTripId(newId);
    setLastSynced(new Date());

    // Update URL without reload
    const newUrl = `${window.location.pathname}?trip=${newId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleProfileSetupComplete = async (
    nickname: string,
    profilePic: string
  ) => {
    // tripId가 있으면 브라우저 지문 기반 ID 사용, 없으면 타임스탬프 기반
    let newUserId: string;

    if (tripId) {
      // 브라우저 지문 기반으로 일관된 ID 생성
      newUserId = getOrCreateUserId(tripId);
    } else {
      // tripId가 없으면 (로컬 모드) 타임스탬프 기반
      newUserId = Date.now().toString();
    }

    // 닉네임을 name과 displayId 둘 다로 사용
    const newPerson: Person = {
      id: newUserId,
      name: nickname,
      profilePic,
      joinedAt: new Date().toISOString(),
    };

    // Add to people list (update if exists, add if new)
    setPeople((prev: Person[]) => {
      const existingIndex = prev.findIndex(p => p.id === newUserId);
      if (existingIndex !== -1) {
        // 기존 항목 업데이트
        const updated = [...prev];
        updated[existingIndex] = newPerson;
        return updated;
      } else {
        // 새 항목 추가
        return [...prev, newPerson];
      }
    });

    // Save current user ID (localStorage for offline access)
    setCurrentUserId(newUserId);
    localStorage.setItem('current_user_id', newUserId);

    // tripId가 있으면 trip-specific 저장소에도 저장
    if (tripId) {
      localStorage.setItem(`user_id_${tripId}`, newUserId);
      // 닉네임을 displayId로도 저장 (캐시 삭제 후 복원용)
      localStorage.setItem(`display_id_${tripId}`, nickname);
    }

    // Save to Supabase if connected
    if (isDbConnected && tripId) {
      try {
        const { saveUserProfile } = await import('./services/supabaseService');
        // 닉네임을 name과 displayId 둘 다로 사용
        const saved = await saveUserProfile(
          tripId,
          newUserId,
          nickname,
          profilePic,
          nickname // displayId도 닉네임으로 저장
        );
        if (saved) {
          console.log('✅ Profile saved to Supabase with nickname:', nickname);
        }
      } catch (error) {
        console.error('Failed to save profile to Supabase:', error);
        // Continue anyway - localStorage에 저장되어 있음
      }
    }

    // Add system message
    const systemMessage: GroupChatMessage = {
      id: Date.now().toString(),
      userId: 'system',
      userName: '시스템',
      text: `${nickname}님이 여행방에 참여했습니다 🎉`,
      timestamp: new Date().toISOString(),
      type: 'system',
    };
    setMessages((prev: GroupChatMessage[]) => [...prev, systemMessage]);

    // Close modal
    setShowProfileSetup(false);
  };

  const handleIdLogin = async (displayId: string) => {
    if (!tripId || !isDbConnected) {
      console.error('Cannot login: tripId or Supabase not connected');
      return;
    }

    try {
      // 아이디로 프로필 찾기
      const profile = await findUserProfileByDisplayId(tripId, displayId);

      if (profile) {
        // 프로필 찾았으면 userId 업데이트 및 복원
        setCurrentUserId(profile.userId);
        localStorage.setItem('current_user_id', profile.userId);
        localStorage.setItem(`user_id_${tripId}`, profile.userId);
        localStorage.setItem(`display_id_${tripId}`, displayId);

        // 프로필이 있으면 people 배열에 추가
        setPeople((prev: Person[]) => {
          const exists = prev.find(p => p.id === profile.userId);
          if (exists) return prev;

          return [
            ...prev,
            {
              id: profile.userId,
              name: profile.name,
              profilePic: profile.profilePic,
              joinedAt: new Date().toISOString(),
            },
          ];
        });

        console.log('✅ Profile restored by ID:', profile.name);
        setShowIdLogin(false);
      } else {
        // 프로필을 찾지 못했으면 알림
        alert(
          '입력하신 아이디로 프로필을 찾을 수 없어요.\n처음 사용하시는 경우 프로필을 설정해주세요.'
        );
      }
    } catch (error) {
      console.error('Failed to login with ID:', error);
      alert('프로필을 불러오는 중 오류가 발생했어요. 다시 시도해주세요.');
    }
  };

  const handleSaveSupabaseConfig = async () => {
    localStorage.setItem('supabase_url', supabaseUrl);
    localStorage.setItem('supabase_key', supabaseKey);
    const healthy = await verifyConnection();
    if (healthy && tripId) {
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
      if (diff <= 0) setTimeLeft('여행 출발!');
      else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        setTimeLeft(`D-${days} ${hours}시간`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleReorderItinerary = (newItems: ItineraryItem[]) => {
    setItinerary(newItems);
  };

  const exitAdminMode = () => {
    setIsAdminMode(false);
    window.history.pushState({}, '', '/');
  };

  const handleSendMessage = (text: string) => {
    if (!currentUserId) return;

    const person = people.find((p: Person) => p.id === currentUserId);
    const newMessage: GroupChatMessage = {
      id: Date.now().toString(),
      userId: currentUserId,
      userName: person?.name || '익명',
      text,
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setMessages((prev: GroupChatMessage[]) => [...prev, newMessage]);
  };

  // ===== ADMIN PAGE =====
  if (isAdminMode) {
    return (
      <AdminView
        people={people}
        expenses={expenses}
        itinerary={itinerary}
        budget={budget}
        messages={messages}
        onSetPeople={setPeople}
        onSetExpenses={setExpenses}
        onSetItinerary={setItinerary}
        onSetBudget={setBudget}
        onSetMessages={setMessages}
        onExit={exitAdminMode}
      />
    );
  }

  return (
    <div className='h-screen bg-[#f2f4f6] font-sans text-slate-800 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative'>
      {/* Header */}
      <header className='bg-white/90 backdrop-blur-md sticky top-0 z-30 px-5 py-3 flex justify-between items-end border-b border-slate-100 shrink-0 h-[60px]'>
        <div>
          <p className='text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5'>
            2025.12.12 - 12.13
          </p>
          <h1 className='text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1'>
            속초<span className='text-blue-600'>Link</span>
            {tripId && (
              <span className='text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full align-top font-bold'>
                Cloud
              </span>
            )}
          </h1>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => setShowShareModal(true)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              tripId
                ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
                : 'bg-slate-50 text-slate-400'
            }`}
          >
            {tripId ? <Users size={16} /> : <Share2 size={16} />}
          </button>
          <div className='bg-slate-900 px-2.5 py-1 rounded-full shadow-lg shadow-slate-200'>
            <span className='text-[10px] font-bold text-white'>{timeLeft}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='flex-1 relative flex flex-col overflow-hidden'>
        {activeTab === 'itinerary' ? (
          <div className='w-full h-full bg-slate-50'>
            <ItineraryView
              items={itinerary}
              onAddItem={item => setItinerary([...itinerary, item])}
              onEditItem={(id, updates) =>
                setItinerary(
                  itinerary.map(i => (i.id === id ? { ...i, ...updates } : i))
                )
              }
              onRemoveItem={id =>
                setItinerary(itinerary.filter(i => i.id !== id))
              }
              onReorder={handleReorderItinerary}
            />
          </div>
        ) : activeTab === 'chat' ? (
          <div className='w-full h-full'>
            {currentUserId ? (
              <ChatRoom
                currentUserId={currentUserId}
                people={people}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            ) : (
              <div className='flex flex-col items-center justify-center h-full text-center px-5'>
                <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3'>
                  <MessageSquare size={32} className='text-slate-400' />
                </div>
                <p className='text-slate-500 text-sm font-medium'>
                  채팅을 사용하려면 프로필을 설정하세요
                </p>
                <button
                  onClick={() => setShowProfileSetup(true)}
                  className='mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform'
                >
                  프로필 설정하기
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className='w-full h-full overflow-y-auto no-scrollbar'>
            {activeTab === 'money' && (
              <ExpenseView
                people={people}
                expenses={expenses}
                onAddPerson={name =>
                  setPeople([...people, { id: Date.now().toString(), name }])
                }
                onAddExpense={exp => setExpenses([...expenses, exp])}
                onRemoveExpense={id =>
                  setExpenses(expenses.filter(e => e.id !== id))
                }
                budget={budget}
                onSetBudget={setBudget}
              />
            )}
            {activeTab === 'ai' && (
              <AIPlanner
                people={people}
                budget={budget}
                expenses={expenses}
                itineraryCount={itinerary.length}
                onAddItinerary={item => setItinerary(prev => [...prev, item])}
                onAddExpense={exp => setExpenses(prev => [...prev, exp])}
                onSetBudget={setBudget}
                onAddPerson={name =>
                  setPeople(prev => [
                    ...prev,
                    { id: Date.now().toString(), name },
                  ])
                }
              />
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className='absolute bottom-nav-safe left-4 right-4 bg-white/90 backdrop-blur-xl rounded-3xl px-2 py-2 z-40 shadow-2xl border border-white/50 flex justify-around items-center'>
        {/* 비서 탭 - 첫 번째 (메인) */}
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${
            activeTab === 'ai'
              ? 'text-blue-600 bg-blue-50 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles
            size={20}
            fill={activeTab === 'ai' ? 'currentColor' : 'none'}
            strokeWidth={activeTab === 'ai' ? 2.5 : 2}
          />
          <span className='text-[10px] font-bold mt-1'>비서</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${
            activeTab === 'chat'
              ? 'text-green-600 bg-green-50 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <MessageSquare
            size={20}
            fill={activeTab === 'chat' ? 'currentColor' : 'none'}
            strokeWidth={activeTab === 'chat' ? 2.5 : 2}
          />
          <span className='text-[10px] font-bold mt-1'>채팅</span>
        </button>
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${
            activeTab === 'itinerary'
              ? 'text-slate-900 bg-slate-100/50 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Map size={20} strokeWidth={activeTab === 'itinerary' ? 3 : 2} />
          <span className='text-[10px] font-bold mt-1'>일정</span>
        </button>
        <button
          onClick={() => setActiveTab('money')}
          className={`flex-1 flex flex-col items-center py-2 rounded-2xl transition-all duration-300 ${
            activeTab === 'money'
              ? 'text-slate-900 bg-slate-100/50 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet size={20} strokeWidth={activeTab === 'money' ? 3 : 2} />
          <span className='text-[10px] font-bold mt-1'>정산</span>
        </button>
      </nav>

      {/* --- SHARE MODAL --- */}
      {showShareModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => setShowShareModal(false)}
          ></div>
          <div className='bg-white w-full max-w-sm rounded-3xl p-6 z-10 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden'>
            <button
              onClick={() => setShowShareModal(false)}
              className='absolute right-4 top-4 text-slate-300 hover:text-slate-500'
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className='text-center mb-6'>
              <div className='w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600'>
                {isDbConnected ? <Cloud size={32} /> : <Database size={32} />}
              </div>
              <h2 className='text-xl font-black text-slate-900'>
                {isDbConnected
                  ? tripId
                    ? '친구 초대하기'
                    : '여행 공유하기'
                  : '클라우드 연결'}
              </h2>
              <p className='text-slate-500 text-sm mt-1'>
                {isDbConnected
                  ? '친구들과 실시간으로 일정을 함께 수정하세요.'
                  : '공유 기능을 사용하려면 Supabase 연결이 필요해요.'}
              </p>
            </div>

            {/* State: Not Connected */}
            {!isDbConnected && (
              <div className='space-y-4'>
                <div className='bg-emerald-50 p-4 rounded-2xl text-xs text-emerald-700 space-y-2 border border-emerald-100'>
                  <p className='font-bold text-emerald-800 mb-1 flex items-center gap-1'>
                    <Database size={12} /> Supabase 연결
                  </p>
                  <p>
                    Supabase 프로젝트의 URL과 anon key를 입력하세요.{' '}
                    <code className='font-mono bg-emerald-100 px-1 rounded'>
                      trips
                    </code>{' '}
                    테이블이 자동으로 사용됩니다.
                  </p>
                </div>
                <div className='space-y-3'>
                  <input
                    placeholder='Supabase URL (예: https://xxx.supabase.co)'
                    className='w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500'
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                  />
                  <input
                    type='password'
                    placeholder='Supabase Anon Key'
                    className='w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500'
                    value={supabaseKey}
                    onChange={e => setSupabaseKey(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSaveSupabaseConfig}
                  disabled={
                    !supabaseUrl || !supabaseKey || isCheckingConnection
                  }
                  className='w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50 mt-2 flex items-center justify-center gap-2'
                >
                  {isCheckingConnection ? (
                    <Loader2 size={18} className='animate-spin' />
                  ) : null}
                  {isCheckingConnection
                    ? '연결 확인 중...'
                    : 'Supabase 연결하기'}
                </button>
                {connectionError && (
                  <p className='text-red-500 text-xs font-medium text-center'>
                    {connectionError}
                  </p>
                )}
              </div>
            )}

            {/* State: Connected, No Trip ID */}
            {isDbConnected && !tripId && (
              <div className='space-y-4'>
                <div className='bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2'>
                  <Check size={16} /> Supabase 연결 성공!
                </div>
                <button
                  onClick={handleCreateTrip}
                  className='w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2'
                >
                  <Share2 size={20} />
                  공유 링크 만들기
                </button>
              </div>
            )}

            {/* State: Connected & Shared */}
            {isDbConnected && tripId && (
              <div className='space-y-4'>
                <div className='bg-slate-100 p-4 rounded-2xl flex items-center gap-3 break-all'>
                  <div className='bg-white p-2 rounded-lg shadow-sm'>
                    <LinkIcon size={20} className='text-slate-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-[10px] font-bold text-slate-400 uppercase'>
                      Trip Link
                    </div>
                    <div className='text-sm font-bold text-blue-600 truncate'>
                      {window.location.href}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('링크가 복사되었습니다!');
                  }}
                  className='w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-transform'
                >
                  링크 복사하기
                </button>

                {lastSynced && (
                  <p className='text-center text-[10px] text-slate-400 font-medium'>
                    마지막 동기화: {lastSynced.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ID LOGIN MODAL --- */}
      {showIdLogin && (
        <IdLogin
          onLogin={handleIdLogin}
          onNewUser={() => {
            setShowIdLogin(false);
            setShowProfileSetup(true);
          }}
        />
      )}

      {/* --- PROFILE SETUP MODAL --- */}
      {showProfileSetup && (
        <ProfileSetup
          onComplete={handleProfileSetupComplete}
          onCancel={
            showIdLogin || (tripId && !currentUserId)
              ? undefined
              : () => setShowProfileSetup(false)
          }
          onLoginWithId={
            isDbConnected && tripId
              ? () => {
                  setShowProfileSetup(false);
                  setShowIdLogin(true);
                }
              : undefined
          }
          isRequired={tripId !== null && !currentUserId}
        />
      )}
    </div>
  );
};

export default App;
