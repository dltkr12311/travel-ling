import { Bot, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { GroupChatMessage, Person } from '../types';

interface ChatRoomProps {
  currentUserId: string;
  people: Person[];
  messages: GroupChatMessage[];
  onSendMessage: (text: string) => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  currentUserId,
  people,
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 입력 중(IME composition)에는 메시지 전송하지 않음
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPerson = (userId: string): Person | undefined => {
    return people.find(p => p.id === userId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = (message: GroupChatMessage) => {
    const person = getPerson(message.userId);
    const isMe = message.userId === currentUserId;
    const isAI = message.userId === 'ai';
    const isSystem = message.userId === 'system';

    // System Message (Center)
    if (isSystem) {
      return (
        <div key={message.id} className='flex justify-center my-4'>
          <div className='bg-slate-100 text-slate-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm'>
            {message.text}
          </div>
        </div>
      );
    }

    // AI Message (Left, Special)
    if (isAI) {
      return (
        <div key={message.id} className='flex justify-start mb-4'>
          <div className='flex gap-2 max-w-[75%]'>
            <div className='w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0'>
              <Bot size={18} />
            </div>
            <div>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-xs font-bold text-purple-600'>
                  AI 비서
                </span>
                <span className='text-[10px] text-slate-400'>
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className='bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-purple-100'>
                <p className='text-sm text-slate-800 whitespace-pre-wrap'>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // User Message
    if (isMe) {
      // My Message (Right)
      return (
        <div key={message.id} className='flex justify-end mb-4'>
          <div className='flex gap-2 max-w-[75%]'>
            <div className='text-right'>
              <div className='flex items-center gap-2 mb-1 justify-end'>
                <span className='text-[10px] text-slate-400'>
                  {formatTime(message.timestamp)}
                </span>
                <span className='text-xs font-bold text-blue-600'>나</span>
              </div>
              <div className='bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md'>
                <p className='text-sm whitespace-pre-wrap'>{message.text}</p>
              </div>
            </div>
            <div className='w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg shadow-md shrink-0'>
              {person?.profilePic || '👤'}
            </div>
          </div>
        </div>
      );
    } else {
      // Other User Message (Left)
      return (
        <div key={message.id} className='flex justify-start mb-4'>
          <div className='flex gap-2 max-w-[75%]'>
            <div className='w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-lg shadow-sm shrink-0'>
              {person?.profilePic || '👤'}
            </div>
            <div>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-xs font-bold text-slate-700'>
                  {person?.name || message.userName}
                </span>
                <span className='text-[10px] text-slate-400'>
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className='bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100'>
                <p className='text-sm text-slate-800 whitespace-pre-wrap'>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className='flex flex-col h-full bg-slate-50 pb-[102px]'>
      {/* Header */}
      <div className='bg-white border-b border-slate-200 px-5 py-3 shrink-0'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-base font-black text-slate-900'>단체 채팅방</h2>
            <p className='text-xs text-slate-500'>{people.length}명 참여 중</p>
          </div>
          <div className='flex -space-x-2'>
            {people.slice(0, 4).map(person => (
              <div
                key={person.id}
                className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm border-2 border-white shadow-sm'
              >
                {person.profilePic || '👤'}
              </div>
            ))}
            {people.length > 4 && (
              <div className='w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold border-2 border-white shadow-sm'>
                +{people.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className='flex-1 overflow-y-auto px-5 py-4'>
        {messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center'>
            <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3'>
              <Bot size={32} className='text-slate-400' />
            </div>
            <p className='text-slate-500 text-sm font-medium'>
              채팅방이 비어있어요
            </p>
            <p className='text-slate-400 text-xs mt-1'>
              첫 메시지를 보내보세요!
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => renderMessage(message))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className='bg-white border-t border-slate-200 px-5 py-3 shrink-0'>
        <div className='flex gap-2'>
          <input
            type='text'
            placeholder='메시지를 입력하세요...'
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className='flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className='w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95'
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
