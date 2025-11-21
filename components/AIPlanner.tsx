import React, { useState, useRef, useEffect } from 'react';
import { getTravelSuggestions } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, Map as MapIcon, Sparkles, User } from 'lucide-react';

const AIPlanner: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm your Sokcho guide. Need restaurant recommendations or hidden spots?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    const result = await getTravelSuggestions(userText);

    setMessages(prev => [
      ...prev,
      { role: 'model', text: result.text, isMapResult: result.mapLinks && result.mapLinks.length > 0, mapLinks: result.mapLinks }
    ]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pb-20 bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70 text-xs font-bold uppercase">
                {msg.role === 'user' ? <User size={10} /> : <Sparkles size={10} />}
                {msg.role === 'user' ? 'You' : 'AI Guide'}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
              
              {/* Render Map Links if available */}
              {msg.mapLinks && msg.mapLinks.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-bold opacity-70 flex items-center gap-1"><MapIcon size={10}/> Found Places:</p>
                  <div className="grid gap-2">
                    {msg.mapLinks.map((link, i) => (
                      <a 
                        key={i}
                        href={link.uri}
                        target="_blank" 
                        rel="noreferrer"
                        className={`block p-2 rounded-lg text-xs font-medium transition-colors ${
                            msg.role === 'user' ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-white hover:bg-slate-50 text-blue-600 border border-slate-200'
                        }`}
                      >
                        {link.title} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about Sokcho food, spots..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPlanner;
