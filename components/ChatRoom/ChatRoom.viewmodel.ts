import React, { useEffect, useRef, useState } from 'react';
import { ChatRoomProps } from './ChatRoom.types';

export const useChatRoomViewModel = (props: ChatRoomProps) => {
  const [inputText, setInputText] = useState('');
  const [navHeight, setNavHeight] = useState('3.5rem');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateNavHeight = () => {
      const nav = document.getElementById('bottom-navigation');
      if (nav) {
        const height = nav.offsetHeight;
        setNavHeight(`${height}px`);
      }
    };

    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    setTimeout(updateNavHeight, 100);

    return () => window.removeEventListener('resize', updateNavHeight);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [props.messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      props.onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPerson = (userId: string) => {
    return props.people.find(p => p.id === userId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return {
    inputText,
    setInputText,
    navHeight,
    messagesEndRef,
    handleSend,
    handleKeyDown,
    getPerson,
    formatTime,
  };
};
