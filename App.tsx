import {
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
  fetchTrip,
  findUserProfileByDisplayId,
  getAllTripProfiles,
  getSupabaseClient,
  getUserProfile,
  initSupabase,
  saveTrip,
} from './services/supabaseService';
import { notificationService } from './services/notificationService';
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
  // 모든 사용자가 하나의 tripId를 공유 (디폴트로 고정)
  const [tripId] = useState<string>(
    (import.meta as any).env?.VITE_DEFAULT_TRIP_ID || 'sokcho-2025-12'
  );
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

  // Initialize push notification service
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const enabled = await notificationService.initialize();
        if (enabled) {
          console.log('✅ Push notifications enabled');
        } else {
          console.warn('⚠️ Push notifications not available');

          // Show helpful tip for common issues
          if (!window.isSecureContext) {
            console.warn('💡 HTTPS required for notifications');
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize notifications:', error);
      }
    };

    // Delay initialization to ensure DOM is ready
    setTimeout(initNotifications, 1000);
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
      // 0. 먼저 로컬에 프로필이 있는지 확인 (일반 앱처럼 동작)
      if (currentUserId) {
        const localProfile = people.find((p: Person) => p.id === currentUserId);
        if (localProfile && localProfile.name) {
          // 이미 로컬에 프로필이 있으면 모달 띄우지 않음
          return;
        }
      }

      // tripId가 없는 경우 (로컬 모드): 프로필이 없으면 모달 표시
      if (!tripId) {
        if (
          !currentUserId ||
          !people.find((p: Person) => p.id === currentUserId)
        ) {
          setShowProfileSetup(true);
        }
        return;
      }

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
              console.log('✅ Profile restored:', profile.name);
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
              console.log('✅ Profile restored:', profileById.name);
              return;
            }
          }

          // 3. 찾지 못했으면 처음 방문자로 간주하고 프로필 설정 화면 표시
          setShowProfileSetup(true);
        } catch (error) {
          console.error('Failed to restore profile:', error);
          // 에러가 나도 처음 방문자로 간주하고 프로필 설정 화면 표시
          if (tripId) {
            setShowProfileSetup(true);
          }
        }
      }
    };

    restoreProfile();
  }, [isDbConnected, tripId, currentUserId]);

  // Load trip data when tripId and connection are ready
  useEffect(() => {
    if (isDbConnected && tripId) {
      loadTripFromCloud(tripId);
    }
  }, [isDbConnected, tripId]);

  // Supabase Realtime 구독 (실시간 동기화)
  useEffect(() => {
    if (!isDbConnected || !tripId) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

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

              if (!myProfile) {
                return realPeopleFromServer;
              }

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
            // 메시지는 서버 데이터로 덮어쓰기 (서버가 Source of Truth)
            setMessages(data.messages || []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      // 메시지는 서버 데이터로 덮어쓰기 (서버가 Source of Truth)
      setMessages(data.messages || []);
      setLastSynced(new Date());
    }
    setIsSyncing(false);
  };

  // 4. Auto-Save to Cloud (Debounced) & LocalStorage
  useEffect(() => {
    // Local Save (항상 실행)
    localStorage.setItem('sokcho_people', JSON.stringify(people));
    localStorage.setItem('sokcho_expenses', JSON.stringify(expenses));
    localStorage.setItem('sokcho_budget', budget.toString());
    localStorage.setItem('sokcho_itinerary', JSON.stringify(itinerary));
    localStorage.setItem('sokcho_messages', JSON.stringify(messages));
  }, [people, expenses, budget, itinerary, messages]);

  // ✅ Auto-save 제거: 각 handler에서 이미 즉시 저장 중이므로 불필요
  // - handleAddMessage, handleAddExpense, handleAddItinerary 등에서 saveTrip() 즉시 호출
  // - Realtime subscription이 다른 사용자의 변경사항 자동 동기화
  // - Auto-save는 중복 저장 + 무한 루프 위험만 있음

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
        // 1. user_profiles 테이블에 프로필 저장
        const { saveUserProfile } = await import('./services/supabaseService');
        await saveUserProfile(
          tripId,
          newUserId,
          nickname,
          profilePic,
          nickname // displayId도 닉네임으로 저장
        );

        // 2. ✅ user_profiles에서 전체 프로필 조회 (Source of Truth!)
        const allProfiles = await getAllTripProfiles(tripId);

        // user_profiles 데이터를 Person 형식으로 변환
        const allPeople: Person[] = allProfiles.map(profile => ({
          id: profile.userId,
          name: profile.name,
          profilePic: profile.profilePic,
        }));

        // trips 테이블은 people 제외하고 저장 (낙관적 업데이트 - fetchTrip 제거)
        const data: TripData = {
          people: allPeople, // user_profiles에서 가져온 전체 리스트
          expenses,
          budget,
          itinerary,
          messages,
          currentUserId: newUserId,
        };

        await saveTrip(tripId, data);
      } catch (error) {
        console.error('Failed to save profile:', error);
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

  // 일정 추가 시 즉시 서버에 저장
  const handleAddItinerary = async (item: ItineraryItem) => {
    // ✅ 로컬 상태 먼저 업데이트 (낙관적 업데이트)
    // 함수형 업데이트로 변경하여 여러 일정 동시 추가 지원
    setItinerary(prev => {
      const updatedItinerary = [...prev, item];

      // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
      if (isDbConnected && tripId) {
        saveTrip(tripId, {
          people,
          expenses,
          budget,
          itinerary: updatedItinerary,
          messages,
          currentUserId: currentUserId || undefined,
        })
          .then(() => console.log('✅ Itinerary added and synced to server'))
          .catch(error => console.error('Failed to sync itinerary addition:', error));
      }

      return updatedItinerary;
    });
  };

  // 지출 추가 시 즉시 서버에 저장 (낙관적 업데이트)
  const handleAddExpense = async (expense: Expense) => {
    // ✅ 로컬 상태 먼저 업데이트
    const updatedExpenses = [...expenses, expense];
    setExpenses(updatedExpenses);

    // 📢 Push notification: Show budget status after expense
    const totalSpent = updatedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = budget - totalSpent;

    if (budget > 0) {
      await notificationService.showBudgetNotification({
        spent: totalSpent,
        remaining: remaining,
        budget: budget,
        expenseDescription: expense.description,
      });
    }

    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses: updatedExpenses,
          budget,
          itinerary,
          messages,
          currentUserId: currentUserId || undefined,
        });
        console.log('✅ Expense added and synced to server');
      } catch (error) {
        console.error('Failed to sync expense addition:', error);
      }
    }
  };

  // 예산 설정 시 즉시 서버에 저장 (낙관적 업데이트)
  const handleSetBudget = async (amount: number) => {
    setBudget(amount);

    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses,
          budget: amount,
          itinerary,
          messages,
          currentUserId: currentUserId || undefined,
        });
        console.log('✅ Budget set and synced to server');
      } catch (error) {
        console.error('Failed to sync budget update:', error);
      }
    }
  };

  // 일정 수정 시 즉시 서버에 저장 (낙관적 업데이트)
  const handleEditItinerary = async (
    id: string,
    updates: Partial<ItineraryItem>
  ) => {
    // ✅ 로컬 상태 먼저 업데이트
    const updatedItinerary = itinerary.map((i) =>
      i.id === id ? { ...i, ...updates } : i
    );
    setItinerary(updatedItinerary);

    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses,
          budget,
          itinerary: updatedItinerary,
          messages,
          currentUserId: currentUserId || undefined,
        });
        console.log('✅ Itinerary edited and synced to server');
      } catch (error) {
        console.error('Failed to sync itinerary edit:', error);
      }
    }
  };

  // 일정 삭제 시 즉시 서버에 저장 (낙관적 업데이트)
  const handleRemoveItinerary = async (id: string) => {
    // ✅ 로컬 상태 먼저 업데이트
    const updatedItinerary = itinerary.filter((i) => i.id !== id);
    setItinerary(updatedItinerary);

    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses,
          budget,
          itinerary: updatedItinerary,
          messages,
          currentUserId: currentUserId || undefined,
        });
        console.log('✅ Itinerary deleted and synced to server');
      } catch (error) {
        console.error('Failed to sync itinerary deletion:', error);
      }
    }
  };

  const exitAdminMode = () => {
    setIsAdminMode(false);
    window.history.pushState({}, '', '/');
  };

  const handleSendMessage = async (text: string) => {
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

    // ✅ 로컬 상태 업데이트
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    // ✅ 메시지 즉시 서버에 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses,
          budget,
          itinerary,
          messages: updatedMessages, // 새 메시지 포함
        });
        console.log('💬 Message saved to server immediately');
      } catch (error) {
        console.error('Failed to save message to server:', error);
      }
    }
  };

  // 지출 삭제 시 즉시 서버에 저장 (낙관적 업데이트)
  const handleRemoveExpense = async (id: string) => {
    // ✅ 로컬 상태 먼저 업데이트
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(updatedExpenses);

    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses: updatedExpenses,
          budget,
          itinerary,
          messages,
          currentUserId: currentUserId || undefined,
        });
        console.log('✅ Expense deleted and synced to server');
      } catch (error) {
        console.error('Failed to sync expense deletion:', error);
      }
    }
  };

  // Admin 초기화 함수들 (낙관적 업데이트)
  const handleAdminClearExpenses = async () => {
    setExpenses([]);
    localStorage.removeItem('sokcho_expenses');
    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses: [],
          budget,
          itinerary,
          messages,
          currentUserId: currentUserId || undefined,
        });
      } catch (error) {
        console.error('Failed to save after clear expenses:', error);
      }
    }
  };

  const handleAdminClearItinerary = async () => {
    setItinerary([]);
    localStorage.removeItem('sokcho_itinerary');
    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses,
          budget,
          itinerary: [],
          messages,
          currentUserId: currentUserId || undefined,
        });
      } catch (error) {
        console.error('Failed to save after clear itinerary:', error);
      }
    }
  };

  const handleAdminClearMessages = async () => {
    setMessages([]);
    localStorage.removeItem('sokcho_messages');
    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses,
          budget,
          itinerary,
          messages: [],
          currentUserId: currentUserId || undefined,
        });
      } catch (error) {
        console.error('Failed to save after clear messages:', error);
      }
    }
  };

  const handleAdminResetBudget = async () => {
    setBudget(0);
    localStorage.removeItem('sokcho_budget');
    // Supabase에 즉시 저장 (낙관적 업데이트 - fetchTrip 제거)
    if (isDbConnected && tripId) {
      try {
        await saveTrip(tripId, {
          people,
          expenses,
          budget: 0,
          itinerary,
          messages,
          currentUserId: currentUserId || undefined,
        });
      } catch (error) {
        console.error('Failed to save after reset budget:', error);
      }
    }
  };

  const handleAdminResetAll = async () => {
    const defaultPeople = [{ id: 'p1', name: '나' }];
    setPeople(defaultPeople);
    setExpenses([]);
    setItinerary([]);
    setBudget(0);
    setMessages([]);

    // currentUserId 초기화
    setCurrentUserId(null);

    // localStorage 삭제
    localStorage.removeItem('sokcho_people');
    localStorage.removeItem('sokcho_expenses');
    localStorage.removeItem('sokcho_itinerary');
    localStorage.removeItem('sokcho_budget');
    localStorage.removeItem('sokcho_messages');
    localStorage.removeItem('current_user_id');
    localStorage.removeItem('sokcho_trip_id');

    // tripId 관련 항목들도 삭제
    if (tripId) {
      localStorage.removeItem(`user_id_${tripId}`);
      localStorage.removeItem(`display_id_${tripId}`);
    }

    // Supabase URL/Key도 삭제 (완전 초기화)
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');

    // Supabase DB 완전 초기화
    if (isDbConnected && tripId) {
      try {
        // 1. user_profiles 테이블 초기화
        const { clearAllTripProfiles } = await import(
          './services/supabaseService'
        );
        await clearAllTripProfiles(tripId);
        console.log('✅ User profiles cleared from database');

        // 2. trips 테이블 초기화
        await saveTrip(tripId, {
          people: defaultPeople,
          expenses: [],
          budget: 0,
          itinerary: [],
          messages: [],
          currentUserId: undefined,
        });
        console.log('✅ Trip data cleared from database');
      } catch (error) {
        console.error('Failed to clear database:', error);
      }
    }

    // Supabase 연결 상태 초기화
    setIsDbConnected(false);
    setSupabaseUrl('');
    setSupabaseKey('');
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
        onClearExpenses={handleAdminClearExpenses}
        onClearItinerary={handleAdminClearItinerary}
        onClearMessages={handleAdminClearMessages}
        onResetBudget={handleAdminResetBudget}
        onResetAll={handleAdminResetAll}
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
      <main className='flex-1 relative flex flex-col overflow-hidden pb-nav-safe'>
        {activeTab === 'itinerary' ? (
          <div className='w-full h-full bg-slate-50'>
            <ItineraryView
              items={itinerary}
              onAddItem={handleAddItinerary}
              onEditItem={handleEditItinerary}
              onRemoveItem={handleRemoveItinerary}
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
                onAddExpense={handleAddExpense}
                onRemoveExpense={handleRemoveExpense}
                budget={budget}
                onSetBudget={handleSetBudget}
              />
            )}
            {activeTab === 'ai' && (
              <AIPlanner
                people={people}
                budget={budget}
                expenses={expenses}
                itineraryCount={itinerary.length}
                onAddItinerary={handleAddItinerary}
                onAddExpense={handleAddExpense}
                onSetBudget={handleSetBudget}
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
      <nav
        id='bottom-navigation'
        className='fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl px-4 py-2 z-40 shadow-2xl border-t border-white/50 flex justify-around items-center pb-safe'
      >
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
                {isDbConnected ? '친구 초대하기' : '클라우드 연결'}
              </h2>
              <p className='text-slate-500 text-sm mt-1'>
                {isDbConnected
                  ? '아래 링크를 복사해서 친구들에게 공유하세요.'
                  : '친구 초대 기능을 사용하려면 Supabase 연결이 필요해요.'}
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

            {/* State: Connected - 바로 링크 표시 (tripId는 고정값) */}
            {isDbConnected && (
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
