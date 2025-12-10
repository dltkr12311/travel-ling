import { Check, User, X } from 'lucide-react';
import React, { useState } from 'react';

interface IdLoginProps {
  onLogin: (displayId: string) => void;
  onCancel?: () => void;
  onNewUser?: () => void;
}

const IdLogin: React.FC<IdLoginProps> = ({ onLogin, onCancel, onNewUser }) => {
  const [displayId, setDisplayId] = useState('');

  const handleSubmit = () => {
    if (displayId.trim()) {
      onLogin(displayId.trim());
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative'>
        {onCancel && (
          <button
            onClick={onCancel}
            className='absolute right-4 top-4 text-slate-300 hover:text-slate-500 transition-colors'
          >
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div className='text-center mb-6'>
          <div className='w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg'>
            <User size={40} />
          </div>
          <h2 className='text-2xl font-black text-slate-900'>프로필 찾기</h2>
          <p className='text-slate-500 text-sm mt-2'>
            이전에 설정한 아이디를 입력하면
            <br />
            프로필을 복원할 수 있어요
          </p>
        </div>

        {/* ID Input */}
        <div className='mb-6'>
          <label className='text-xs font-bold text-slate-600 mb-2 block'>
            아이디
          </label>
          <input
            type='text'
            placeholder='예: 홍길동, hong123'
            value={displayId}
            onChange={e => setDisplayId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={20}
            className='w-full bg-slate-100 rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'
            autoFocus
          />
          <p className='text-xs text-slate-400 mt-1.5'>
            한글이나 영어, 숫자 모두 가능해요
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!displayId.trim()}
          className='w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-3'
        >
          <Check size={20} />
          프로필 찾기
        </button>

        {/* New User Link */}
        {onNewUser && (
          <button
            onClick={onNewUser}
            className='w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors'
          >
            처음 사용하시나요? 프로필 설정하기
          </button>
        )}
      </div>
    </div>
  );
};

export default IdLogin;
