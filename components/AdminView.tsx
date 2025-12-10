import {
  AlertTriangle,
  ArrowLeft,
  Database,
  MessageSquare,
  RefreshCw,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { Expense, GroupChatMessage, ItineraryItem, Person } from '../types';

interface Props {
  people: Person[];
  expenses: Expense[];
  itinerary: ItineraryItem[];
  budget: number;
  messages: GroupChatMessage[];
  onSetPeople: (people: Person[]) => void;
  onSetExpenses: (expenses: Expense[]) => void;
  onSetItinerary: (itinerary: ItineraryItem[]) => void;
  onSetBudget: (budget: number) => void;
  onSetMessages: (messages: GroupChatMessage[]) => void;
  onExit: () => void;
}

const AdminView: React.FC<Props> = ({
  people,
  expenses,
  itinerary,
  budget,
  messages,
  onSetPeople,
  onSetExpenses,
  onSetItinerary,
  onSetBudget,
  onSetMessages,
  onExit,
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmoji, setNewMemberEmoji] = useState('👤');

  const quickEmojis = ['👤', '😀', '😎', '🤓', '🥳', '🤠', '👨', '👩'];

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    const newPerson: Person = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      profilePic: newMemberEmoji,
      joinedAt: new Date().toISOString(),
    };

    onSetPeople([...people, newPerson]);
    setNewMemberName('');
    setNewMemberEmoji('👤');
    setShowAddMember(false);
    alert(`${newMemberName}님이 추가되었습니다.`);
  };

  const handleRemovePerson = (id: string) => {
    if (people.length <= 1) {
      alert('최소 1명의 멤버가 필요합니다.');
      return;
    }
    const personExpenses = expenses.filter(e => e.payerId === id);
    if (personExpenses.length > 0) {
      if (
        !confirm(
          `이 멤버의 지출 ${personExpenses.length}건도 함께 삭제됩니다. 계속할까요?`
        )
      ) {
        return;
      }
      onSetExpenses(expenses.filter(e => e.payerId !== id));
    }
    onSetPeople(people.filter(p => p.id !== id));
  };

  const handleResetAll = () => {
    if (confirm('모든 데이터를 초기화합니다. 계속할까요?')) {
      onSetPeople([{ id: 'p1', name: '나' }]);
      onSetExpenses([]);
      onSetItinerary([]);
      onSetBudget(0);
      onSetMessages([]);
      localStorage.removeItem('sokcho_people');
      localStorage.removeItem('sokcho_expenses');
      localStorage.removeItem('sokcho_itinerary');
      localStorage.removeItem('sokcho_budget');
      localStorage.removeItem('sokcho_messages');
      localStorage.removeItem('current_user_id');
      localStorage.removeItem('sokcho_trip_id');
      alert('모든 데이터가 초기화되었습니다.');
    }
  };

  const handleClearExpenses = () => {
    if (
      confirm(`지출 내역 ${expenses.length}건을 모두 삭제합니다. 계속할까요?`)
    ) {
      onSetExpenses([]);
      alert('지출 내역이 초기화되었습니다.');
    }
  };

  const handleClearItinerary = () => {
    if (confirm(`일정 ${itinerary.length}건을 모두 삭제합니다. 계속할까요?`)) {
      onSetItinerary([]);
      alert('일정이 초기화되었습니다.');
    }
  };

  const handleClearMessages = () => {
    if (
      confirm(`채팅 메시지 ${messages.length}건을 모두 삭제합니다. 계속할까요?`)
    ) {
      onSetMessages([]);
      alert('채팅 메시지가 초기화되었습니다.');
    }
  };

  return (
    <div className='h-screen bg-slate-900 font-sans text-white flex flex-col max-w-md mx-auto overflow-hidden'>
      {/* Admin Header */}
      <header className='bg-slate-800 px-5 py-4 flex items-center gap-3 border-b border-slate-700'>
        <button
          onClick={onExit}
          className='w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-slate-600 transition-colors'
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className='flex items-center gap-2'>
            <Settings size={16} className='text-orange-400' />
            <span className='text-xs text-orange-400 font-bold uppercase tracking-wider'>
              Admin
            </span>
          </div>
          <h1 className='text-lg font-black'>데이터 관리</h1>
        </div>
      </header>

      <div className='flex-1 overflow-y-auto p-5 space-y-6'>
        {/* 멤버 관리 */}
        <section>
          <h2 className='text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
            <Users size={14} /> 멤버 관리 ({people.length}명)
          </h2>
          <div className='bg-slate-800 rounded-2xl overflow-hidden'>
            {people.map((person, idx) => (
              <div
                key={person.id}
                className={`flex items-center justify-between p-4 ${
                  idx !== people.length - 1 ? 'border-b border-slate-700' : ''
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-lg'>
                    {person.profilePic || person.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className='font-bold'>{person.name}</p>
                    <p className='text-xs text-slate-500'>
                      ID: {person.id}
                      {person.joinedAt &&
                        ` • 가입: ${new Date(person.joinedAt).toLocaleDateString('ko-KR')}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePerson(person.id)}
                  className='w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500/30 transition-colors'
                >
                  <UserMinus size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* 멤버 추가 버튼 & 폼 */}
          {!showAddMember ? (
            <button
              onClick={() => setShowAddMember(true)}
              className='w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2'
            >
              <UserPlus size={18} />
              멤버 추가
            </button>
          ) : (
            <div className='mt-3 bg-slate-800 rounded-2xl p-4 space-y-3'>
              <div>
                <label className='text-xs font-bold text-slate-400 mb-2 block'>
                  프로필 아이콘
                </label>
                <div className='flex gap-2'>
                  {quickEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewMemberEmoji(emoji)}
                      className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        newMemberEmoji === emoji
                          ? 'bg-blue-600 scale-110'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='text-xs font-bold text-slate-400 mb-2 block'>
                  이름
                </label>
                <input
                  type='text'
                  placeholder='멤버 이름 입력'
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                  maxLength={10}
                  className='w-full bg-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'
                />
              </div>

              <div className='flex gap-2'>
                <button
                  onClick={handleAddMember}
                  className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors'
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberName('');
                    setNewMemberEmoji('👤');
                  }}
                  className='flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors'
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 데이터 현황 */}
        <section>
          <h2 className='text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
            <Database size={14} /> 데이터 현황
          </h2>
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-slate-800 rounded-2xl p-4'>
              <p className='text-3xl font-black text-blue-400'>
                {expenses.length}
              </p>
              <p className='text-xs text-slate-500 mt-1'>지출 내역</p>
            </div>
            <div className='bg-slate-800 rounded-2xl p-4'>
              <p className='text-3xl font-black text-emerald-400'>
                {itinerary.length}
              </p>
              <p className='text-xs text-slate-500 mt-1'>일정</p>
            </div>
            <div className='bg-slate-800 rounded-2xl p-4'>
              <p className='text-3xl font-black text-green-400'>
                {messages.length}
              </p>
              <p className='text-xs text-slate-500 mt-1'>채팅 메시지</p>
            </div>
            <div className='bg-slate-800 rounded-2xl p-4'>
              <p className='text-3xl font-black text-orange-400'>
                {budget > 0 ? `${Math.round(budget / 10000)}만` : '-'}
              </p>
              <p className='text-xs text-slate-500 mt-1'>예산</p>
            </div>
            <div className='bg-slate-800 rounded-2xl p-4 col-span-2'>
              <p className='text-3xl font-black text-purple-400'>
                {expenses.reduce((a, b) => a + b.amount, 0).toLocaleString()}
              </p>
              <p className='text-xs text-slate-500 mt-1'>총 지출(원)</p>
            </div>
          </div>
        </section>

        {/* 위험한 작업 */}
        <section>
          <h2 className='text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
            <AlertTriangle size={14} /> 위험한 작업
          </h2>
          <div className='space-y-3'>
            <button
              onClick={handleClearExpenses}
              disabled={expenses.length === 0}
              className='w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 p-4 rounded-2xl flex items-center justify-between transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center'>
                  <Trash2 size={18} />
                </div>
                <div className='text-left'>
                  <p className='font-bold'>지출 내역 초기화</p>
                  <p className='text-xs text-slate-500'>
                    {expenses.length}건 삭제
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleClearItinerary}
              disabled={itinerary.length === 0}
              className='w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 p-4 rounded-2xl flex items-center justify-between transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center'>
                  <Trash2 size={18} />
                </div>
                <div className='text-left'>
                  <p className='font-bold'>일정 초기화</p>
                  <p className='text-xs text-slate-500'>
                    {itinerary.length}건 삭제
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleClearMessages}
              disabled={messages.length === 0}
              className='w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 p-4 rounded-2xl flex items-center justify-between transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center'>
                  <MessageSquare size={18} />
                </div>
                <div className='text-left'>
                  <p className='font-bold'>채팅 메시지 초기화</p>
                  <p className='text-xs text-slate-500'>
                    {messages.length}건 삭제
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => onSetBudget(0)}
              disabled={budget === 0}
              className='w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 p-4 rounded-2xl flex items-center justify-between transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center'>
                  <RefreshCw size={18} />
                </div>
                <div className='text-left'>
                  <p className='font-bold'>예산 리셋</p>
                  <p className='text-xs text-slate-500'>
                    현재: {budget.toLocaleString()}원
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleResetAll}
              className='w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between transition-colors mt-4'
            >
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center'>
                  <AlertTriangle size={18} />
                </div>
                <div className='text-left'>
                  <p className='font-bold text-red-400'>전체 초기화</p>
                  <p className='text-xs text-red-400/70'>모든 데이터 삭제</p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className='p-5 bg-slate-800 border-t border-slate-700'>
        <button
          onClick={onExit}
          className='w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-colors'
        >
          앱으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default AdminView;
