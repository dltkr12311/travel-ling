import { Bot, Send } from 'lucide-react';
import React from 'react';
import { ChatRoomProps } from './ChatRoom.types';
import { useChatRoomViewModel } from './ChatRoom.viewmodel';

const ChatRoom: React.FC<ChatRoomProps> = (props) => {
  const {
    inputText,
    setInputText,
    navHeight,
    messagesEndRef,
    handleSend,
    handleKeyDown,
    getPerson,
    formatTime,
  } = useChatRoomViewModel(props);

  const renderMessage = (message: typeof props.messages[0]) => {
    const person = getPerson(message.userId);
    const isMe = message.userId === props.currentUserId;
    const isAI = message.userId === 'ai';
    const isSystem = message.userId === 'system';

    if (isSystem) {
      return (
        <div key={message.id} className='flex justify-center my-4'>
          <div className='bg-slate-100 text-slate-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm'>
            {message.text}
          </div>
        </div>
      );
    }

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

    if (isMe) {
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
    <div className='flex flex-col h-full bg-slate-50'>
      <div className='bg-white border-b border-slate-200 px-5 py-3 shrink-0'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-base font-black text-slate-900'>단체 채팅방</h2>
            <p className='text-xs text-slate-500'>{props.people.length}명 참여 중</p>
          </div>
          <div className='flex -space-x-2'>
            {props.people.slice(0, 4).map(person => (
              <div
                key={person.id}
                className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm border-2 border-white shadow-sm'
              >
                {person.profilePic || '👤'}
              </div>
            ))}
            {props.people.length > 4 && (
              <div className='w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold border-2 border-white shadow-sm'>
                +{props.people.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-5 py-4 pb-20'>
        {props.messages.length === 0 ? (
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
            {props.messages.map(message => renderMessage(message))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div
        className='fixed bg-white border-t border-slate-200 px-5 py-2 z-50'
        style={{
          bottom: navHeight,
          left: 0,
          right: 0,
        }}
      >
        <div className='flex gap-2'>
          <input
            type='text'
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
            spellCheck='false'
            data-form-type='other'
            name='chat-message'
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

