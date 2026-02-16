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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {questions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center backdrop-blur-sm border border-white/5">
                            <QuestionIcon className="w-8 h-8 opacity-40 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-foreground/80">No questions yet</p>
                            <p className="text-xs mt-1 opacity-50">Be the first to ask!</p>
                        </div>
                    </div>
                ) : (
                    questions.map((q) => (
                        <div key={q.id} className={`flex flex-col gap-2 p-3 rounded-xl border ${q.isAnswered ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                        {q.displayName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-foreground block">{q.displayName}</span>
                                        <span className="text-[9px] text-muted-foreground">{new Date(q.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                                {isHost && (
                                    <div className="flex gap-1">
                                        {!q.isAnswered && (
                                            <button
                                                onClick={() => onMarkAnswered(q.id)}
                                                className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                                                title="Mark as answered"
                                            >
                                                <CheckIcon />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDeleteQuestion(q.id)}
                                            className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                            title="Delete question"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                                {q.content}
                            </p>

                            <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onUpvoteQuestion(q.id)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all ${q.isUpvoted
                                            ? 'bg-primary/20 text-primary border border-primary/20'
                                            : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'
                                            }`}
                                    >
                                        <UpvoteIcon />
                                        <span>{q.upvotes}</span>
                                    </button>
                                </div>
                                {q.isAnswered && (
                                    <span className="text-[10px] font-bold text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                        <CheckIcon className="w-3 h-3" />
                                        ANSWERED
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-muted/30 border-t border-border backdrop-blur-md">
                <div className="flex items-end gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 focus-within:bg-black/40 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question..."
                        className="flex-1 max-h-24 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 resize-none focus:ring-0 py-2.5 px-1 text-sm scrollbar-hide font-medium leading-relaxed"
                        rows={1}
                    />
                    <button
                        onClick={handleAsk}
                        disabled={!inputValue.trim()}
                        className={`p-2.5 rounded-xl transition-all duration-300 ${inputValue.trim()
                            ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95'
                            : 'bg-white/5 text-muted-foreground/50 cursor-not-allowed'
                            }`}
                    >
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Icons
const QuestionIcon = ({ className = '' }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UpvoteIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const SendIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);
