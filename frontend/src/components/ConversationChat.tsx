import React, { useState } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, CornerDownRight } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  timestamp: string;
}

interface ConversationChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export const ConversationChat: React.FC<ConversationChatProps> = ({
  messages,
  onSendMessage,
  isLoading
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const sampleFollowUps = [
    "Filter for orders above $500",
    "Only show data for 2026",
    "Group by city instead of customer",
    "Sort in descending order and limit to top 3"
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col h-[340px]">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 mb-3">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-200">Conversational Query Refinement</h3>
          <p className="text-[10px] text-slate-400">Context-aware multi-turn AI reasoning</p>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2">
            <Bot className="w-6 h-6 opacity-40 text-cyan-400" />
            <p className="text-xs">Ask a follow-up to refine or pivot the current SQL query.</p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-sm pt-2">
              {sampleFollowUps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s)}
                  className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <CornerDownRight className="w-3 h-3 text-cyan-500" />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] p-3 rounded-xl text-xs space-y-1.5 ${
                  msg.role === 'user'
                    ? 'bg-sky-600/20 border border-sky-500/30 text-sky-200'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
                {msg.sql && (
                  <pre className="text-[11px] font-mono text-cyan-300 bg-slate-950 p-2 rounded-lg border border-slate-800 overflow-x-auto">
                    {msg.sql}
                  </pre>
                )}
                <span className="text-[9px] text-slate-500 block font-mono text-right">
                  {msg.timestamp}
                </span>
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
        <input
          type="text"
          placeholder="e.g. 'Now only show 2026' or 'Sort descending'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-slate-950/90 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
