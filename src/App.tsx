import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, BookOpen, Clock, Trash2, ExternalLink, ChevronRight, Sparkles, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ResearchSession, PerplexityResponse } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('research_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSession(parsed[0]);
        }
      } catch (e) {
        console.error('Failed to load sessions', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('research_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Research failed');
      }

      const data: PerplexityResponse = await response.json();
      const newSession: ResearchSession = {
        id: crypto.randomUUID(),
        title: query.length > 40 ? query.substring(0, 40) + '...' : query,
        query,
        response: data.choices[0].message.content,
        citations: data.citations || [],
        timestamp: Date.now(),
      };

      setSessions([newSession, ...sessions]);
      setActiveSession(newSession);
      setQuery('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSession?.id === id) {
      setActiveSession(updated.length > 0 ? updated[0] : null);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50 backdrop-blur-xl">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight">Perplex</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">History</span>
            <span className="text-xs text-zinc-600">{sessions.length} sessions</span>
          </div>

          <AnimatePresence mode="popLayout">
            {sessions.map((session) => (
              <motion.button
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setActiveSession(session)}
                className={cn(
                  "w-full group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left relative",
                  activeSession?.id === session.id 
                    ? "bg-zinc-800 text-zinc-100 shadow-lg shadow-black/20" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <Clock className="w-4 h-4 flex-shrink-0 opacity-50" />
                <span className="flex-1 truncate text-sm font-medium">{session.title}</span>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded-md transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
                </button>
                {activeSession?.id === session.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
                  />
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          {sessions.length === 0 && (
            <div className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
              <p className="text-sm text-zinc-600">No research history yet</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-zinc-900">
              TR
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Research Agent</p>
              <p className="text-xs text-zinc-500 truncate">Pro Plan Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/20 via-zinc-950 to-zinc-950">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-zinc-400">Research Session</h2>
            <ChevronRight className="w-4 h-4 text-zinc-700" />
            <span className="text-sm font-semibold text-zinc-100 truncate max-w-md">
              {activeSession?.title || "New Research"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sonar Reasoning Pro</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 custom-scrollbar"
        >
          <div className="max-w-4xl mx-auto space-y-12 pb-32">
            <AnimatePresence mode="wait">
              {activeSession ? (
                <motion.div
                  key={activeSession.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10"
                >
                  {/* User Query */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-zinc-500">
                      <Search className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Your Inquiry</span>
                    </div>
                    <h3 className="text-3xl font-display font-bold text-zinc-100 leading-tight">
                      {activeSession.query}
                    </h3>
                  </div>

                  {/* AI Response */}
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Research Findings</span>
                    </div>
                    <div className="markdown-body prose prose-invert prose-emerald max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeSession.response}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Citations */}
                  {activeSession.citations.length > 0 && (
                    <div className="flex flex-col gap-6 pt-8 border-t border-zinc-800">
                      <div className="flex items-center gap-3 text-zinc-500">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Sources & Citations</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeSession.citations.map((citation, idx) => (
                          <a
                            key={idx}
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all duration-300 flex items-start gap-4"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 transition-colors">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                                {new URL(citation).hostname}
                              </p>
                              <p className="text-xs text-zinc-500 truncate mt-1">
                                {citation}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 text-center"
                >
                  <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-8 border border-zinc-800 shadow-2xl">
                    <Search className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-4xl font-display font-bold mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                    What are we researching today?
                  </h2>
                  <p className="text-zinc-500 max-w-md text-lg leading-relaxed">
                    Ask anything. I'll search the web, analyze data, and provide cited research papers and articles.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
          <div className="max-w-4xl mx-auto relative">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 left-0 right-0 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center font-medium"
              >
                {error}
              </motion.div>
            )}
            
            <form 
              onSubmit={handleSearch}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000 group-focus-within:duration-200"></div>
              <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything for deep research..."
                  disabled={loading}
                  className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-zinc-100 placeholder-zinc-600 font-medium"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-300 flex items-center gap-2",
                    loading || !query.trim() 
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" 
                      : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span className="text-sm font-bold uppercase tracking-wider px-1">Search</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
            <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-[0.2em] font-bold">
              Powered by Perplexity AI &bull; Deep Research Mode Active
            </p>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}} />
    </div>
  );
};

export default App;
