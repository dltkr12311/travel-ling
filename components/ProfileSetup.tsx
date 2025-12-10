import { Check, User, X } from 'lucide-react';
import React, { useState } from 'react';

interface ProfileSetupProps {
  onComplete: (name: string, profilePic: string) => void;
  onCancel?: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete, onCancel }) => {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👤');

  const emojis = [
    '👤', '😀', '😎', '🤓', '😇', '🥳', '🤠', '🥷',
    '👨', '👩', '🧑', '👦', '👧', '👶', '🧔', '👱',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🌸', '🌺', '🌻', '🌹', '🌷', '🌴', '🌵', '🍀',
  ];

  const handleSubmit = () => {
    if (name.trim()) {
      onComplete(name.trim(), selectedEmoji);
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
          <h2 className='text-2xl font-black text-slate-900'>프로필 설정</h2>
          <p className='text-slate-500 text-sm mt-2'>
            여행방에 입장하기 전에<br />
            프로필을 설정해주세요
          </p>
        </div>

        {/* Profile Picture Selection */}
        <div className='mb-5'>
          <label className='text-xs font-bold text-slate-600 mb-2 block'>
            프로필 아이콘 선택
          </label>
          <div className='bg-slate-50 rounded-2xl p-3 max-h-32 overflow-y-auto'>
            <div className='grid grid-cols-8 gap-2'>
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-blue-500 scale-110 shadow-lg'
                      : 'bg-white hover:bg-slate-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Name Input */}
        <div className='mb-6'>
          <label className='text-xs font-bold text-slate-600 mb-2 block'>
            이름 <span className='text-red-500'>*</span>
          </label>
          <input
            type='text'
            placeholder='이름을 입력하세요'
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={10}
            className='w-full bg-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'
          />
          <p className='text-xs text-slate-400 mt-1.5'>
            채팅과 지출 내역에 표시됩니다
          </p>
        </div>

        {/* Preview */}
        <div className='bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-5 border border-blue-100'>
          <p className='text-xs font-bold text-slate-600 mb-2'>미리보기</p>
          <div className='flex items-center gap-3'>
            <div className='text-3xl bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-sm'>
              {selectedEmoji}
            </div>
            <div>
              <p className='font-bold text-slate-900'>
                {name.trim() || '이름 없음'}
              </p>
              <p className='text-xs text-slate-500'>새로운 멤버</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className='w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2'
        >
          <Check size={20} />
          여행방 입장하기
        </button>
      </div>
    </div>
  );
};

export default ProfileSetup;
