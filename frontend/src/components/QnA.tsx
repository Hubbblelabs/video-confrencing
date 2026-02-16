import { useState } from 'react';
import type { Question } from '../types/chat.types';

interface QnAProps {
    questions: Question[];
    onAskQuestion: (content: string) => void;
    onUpvoteQuestion: (questionId: string) => void;
    onMarkAnswered: (questionId: string) => void;
    onDeleteQuestion: (questionId: string) => void;
    isHost: boolean;
}

export function QnA({
    questions,
    onAskQuestion,
    onUpvoteQuestion,
    onMarkAnswered,
    onDeleteQuestion,
    isHost,
}: QnAProps) {
    const [inputValue, setInputValue] = useState('');

    const handleAsk = () => {
        if (!inputValue.trim()) return;
        onAskQuestion(inputValue);
        setInputValue('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {questions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                        <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-center">
                            <p className="text-xs font-medium text-white/40">No questions yet</p>
                            <p className="text-[10px] mt-0.5 text-white/25">Be the first to ask!</p>
                        </div>
                    </div>
                ) : (
                    questions.map((q) => (
                        <div key={q.id} className={`flex flex-col gap-1.5 p-3 rounded-lg border ${q.isAnswered ? 'bg-green-500/5 border-green-500/15' : 'bg-white/[0.03] border-white/5'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-teal-700 flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
                                        {q.displayName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-white block">{q.displayName}</span>
                                        <span className="text-[9px] text-white/30">{new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                {isHost && (
                                    <div className="flex gap-0.5">
                                        {!q.isAnswered && (
                                            <button
                                                onClick={() => onMarkAnswered(q.id)}
                                                className="p-1 hover:bg-green-500/15 text-green-400 rounded transition-colors"
                                                title="Mark as answered"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDeleteQuestion(q.id)}
                                            className="p-1 hover:bg-red-500/15 text-red-400/70 hover:text-red-400 rounded transition-colors"
                                            title="Delete question"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-white/80 leading-relaxed">{q.content}</p>

                            <div className="flex items-center justify-between mt-0.5">
                                <button
                                    onClick={() => onUpvoteQuestion(q.id)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all ${q.isUpvoted
                                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
                                        }`}
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                    </svg>
                                    {q.upvotes}
                                </button>
                                {q.isAnswered && (
                                    <span className="text-[10px] font-semibold text-green-400 flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Answered
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/5">
                <div className="flex items-end gap-2">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask a question..."
                        className="flex-1 max-h-20 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 resize-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none py-2 px-3 text-sm scrollbar-hide font-medium leading-relaxed transition-all"
                        rows={1}
                    />
                    <button
                        onClick={handleAsk}
                        disabled={!inputValue.trim()}
                        className={`p-2 rounded-lg transition-all shrink-0 ${inputValue.trim()
                            ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
