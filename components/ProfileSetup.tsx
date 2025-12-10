import { Check, User, X } from 'lucide-react';
import React, { useState } from 'react';

interface ProfileSetupProps {
  onComplete: (nickname: string, profilePic: string) => void;
  onCancel?: () => void;
  onLoginWithId?: () => void;
  isRequired?: boolean;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({
  onComplete,
  onCancel,
  onLoginWithId,
  isRequired = false,
}) => {
  const [nickname, setNickname] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👤');

  const emojis = [
    '👤',
    '😀',
    '😎',
    '🤓',
    '😇',
    '🥳',
    '🤠',
    '🥷',
    '👨',
    '👩',
    '🧑',
    '👦',
    '👧',
    '👶',
    '🧔',
    '👱',
    '🐶',
    '🐱',
    '🐭',
    '🐹',
    '🐰',
    '🦊',
    '🐻',
    '🐼',
    '🌸',
    '🌺',
    '🌻',
    '🌹',
    '🌷',
    '🌴',
    '🌵',
    '🍀',
  ];

  const handleSubmit = () => {
    if (nickname.trim()) {
      onComplete(nickname.trim(), selectedEmoji);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto'>
      <div className='bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200 relative my-auto'>
        {onCancel && (
          <button
            onClick={onCancel}
            className='absolute right-4 top-4 text-slate-300 hover:text-slate-500 transition-colors'
          >
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div className='text-center mb-4'>
          <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 text-white shadow-lg'>
            <User size={32} />
          </div>
          <h2 className='text-xl font-black text-slate-900'>프로필 설정</h2>
          <p className='text-slate-500 text-xs mt-1'>
            {isRequired
              ? '여행방을 사용하려면 프로필 설정이 필요해요'
              : '여행방에 입장하기 전에 프로필을 설정해주세요'}
          </p>
        </div>

        {/* Profile Picture Selection */}
        <div className='mb-4'>
          <label className='text-xs font-bold text-slate-600 mb-1.5 block'>
            프로필 아이콘
          </label>
          <div className='bg-slate-50 rounded-xl p-2 max-h-24 overflow-y-auto'>
            <div className='grid grid-cols-8 gap-1.5'>
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-xl w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-blue-500 scale-110 shadow-md'
                      : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nickname Input */}
        <div className='mb-4'>
          <label className='text-xs font-bold text-slate-600 mb-1.5 block'>
            닉네임 <span className='text-red-500'>*</span>
          </label>
          <input
            type='text'
            placeholder='예: 홍길동, hong123, 나의닉네임'
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={20}
            className='w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'
            autoFocus
          />
          <p className='text-xs text-slate-400 mt-1'>
            한글, 영어, 숫자 모두 가능해요. 캐시 삭제 후에도 이 닉네임으로
            프로필을 찾을 수 있어요
          </p>
        </div>

        {/* Preview - Compact */}
        <div className='bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 mb-4 border border-blue-100'>
          <div className='flex items-center gap-2.5'>
            <div className='text-2xl bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm'>
              {selectedEmoji}
            </div>
            <p className='font-bold text-slate-900 text-sm'>
              {nickname.trim() || '닉네임을 입력하세요'}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!nickname.trim()}
          className='w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-2'
        >
          <Check size={18} />
          여행방 입장하기
        </button>

        {/* Login with ID Link */}
        {onLoginWithId && (
          <button
            onClick={onLoginWithId}
            className='w-full text-center text-xs text-slate-500 hover:text-slate-700 py-1.5 transition-colors'
          >
            이미 계정이 있어요? 프로필 찾기
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;
