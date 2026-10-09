import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, RouteSuggestion } from '@/types';
import { generateAIResponse } from '@/data/aiEngine';
import { PROMPT_CHIPS } from '@/data/promptChips';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Shield,
  Clock,
  MapPin,
  Route,
} from 'lucide-react';

interface AIAssistantProps {
  cityName: string;
  onClose: () => void;
}

let msgCounter = 0;
function genId() {
  return `msg-${++msgCounter}`;
}

export default function AIAssistant({ cityName, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: genId(),
      role: 'assistant',
      text: `Hello! I'm your UrbanPulse AI concierge for ${cityName}. I can help you plan safe routes, find great food spots, and navigate the city smartly. Ask me anything or tap a suggestion below!`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  // Update greeting when city changes
  useEffect(() => {
    setMessages([
      {
        id: genId(),
        role: 'assistant',
        text: `Hello! I'm your UrbanPulse AI concierge for ${cityName}. I can help you plan safe routes, find great food spots, and navigate the city smartly. Ask me anything or tap a suggestion below!`,
        timestamp: Date.now(),
      },
    ]);
  }, [cityName]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateAIResponse(text, cityName);
      const aiMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        text: response.text,
        timestamp: Date.now(),
        route: response.route,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">AI Concierge</h2>
            <p className="text-[10px] text-cyan-300 leading-tight">
              Smart routing & travel assistant
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && (
          <div className="flex items-center gap-2">
            <BotAvatar />
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Prompt chips - show when few messages */}
        {messages.length <= 1 && !isTyping && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-1">
              Quick Suggestions
            </p>
            {PROMPT_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="block w-full text-left px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:border-cyan-300 hover:bg-cyan-50/50 dark:hover:bg-slate-700 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder="Ask for a safe route, food tour..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent max-h-24"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-300 text-slate-900 transition-colors shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start gap-2 justify-end">
        <div className="bg-cyan-500 text-slate-900 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm max-w-[85%]">
          <p className="text-sm font-medium leading-relaxed">{message.text}</p>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0">
          <User size={16} className="text-slate-600 dark:text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <div className="space-y-2 max-w-[85%]">
        <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{message.text}</p>
        </div>
        {message.route && message.route.length > 0 && (
          <RouteCard route={message.route} />
        )}
      </div>
    </div>
  );
}

function RouteCard({ route }: { route: RouteSuggestion[] }) {
  const avgSafety = Math.round(
    route.reduce((sum, r) => sum + r.safetyScore, 0) / route.length,
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
        <Route size={16} className="text-cyan-600 dark:text-cyan-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          Suggested Route
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <Shield size={12} />
          Avg Safety {avgSafety}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {route.map((step, i) => (
          <div key={i} className="flex gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center shrink-0">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 dark:bg-cyan-600 text-white text-xs font-bold">
                {i + 1}
              </span>
              {i < route.length - 1 && (
                <span className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-600 my-1 min-h-[20px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">
                {step.step}
              </p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Shield size={11} />
                  Safety {step.safetyScore}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                  <Clock size={11} />
                  {step.duration}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 leading-snug flex items-start gap-1">
                <MapPin size={11} className="shrink-0 mt-0.5" />
                {step.safetyNote}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shrink-0 shadow-md">
      <Bot size={16} className="text-white" />
    </div>
  );
}
