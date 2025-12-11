import { useEffect, useRef, useState } from 'react';
import { AIAction } from '../../services/aiActionService';
import { AIPlannerProps } from './AIPlanner.types';
import { useAIChat } from './hooks/useAIChat';
import { useWeather } from './hooks/useWeather';

export const useAIPlannerViewModel = (props: AIPlannerProps) => {
  const [navHeight, setNavHeight] = useState('3.5rem');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { weatherInfo, isLoadingWeather } = useWeather();

  const {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    lastAction,
    handleSend,
  } = useAIChat({
    ...props,
    weatherInfo,
  });

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
  }, [messages]);

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  const getActionInfo = (action: AIAction) => {
    switch (action.type) {
      case 'add_itinerary':
        return {
          iconType: 'calendar' as const,
          color: 'bg-emerald-500',
          label: '일정 추가됨',
        };
      case 'add_expense':
        return {
          iconType: 'wallet' as const,
          color: 'bg-orange-500',
          label: '지출 기록됨',
        };
      case 'set_budget':
        return {
          iconType: 'wallet' as const,
          color: 'bg-blue-500',
          label: '예산 설정됨',
        };
      case 'add_person':
        return {
          iconType: 'userPlus' as const,
          color: 'bg-purple-500',
          label: '멤버 추가됨',
        };
      default:
        return null;
    }
  };

  const isInitialState = messages.length === 0;
  const inputAreaHeight = 40;
  const totalBottomSpace = `calc(${inputAreaHeight}px + ${navHeight})`;

  return {
    messages,
    input,
    setInput,
    isLoading,
    lastAction,
    weatherInfo,
    isLoadingWeather,
    navHeight,
    messagesEndRef,
    isInitialState,
    totalBottomSpace,
    handleSend,
    handleQuickAction,
    getActionInfo,
  };
};
