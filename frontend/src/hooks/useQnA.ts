import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { WS_EVENTS } from '../constants';
import type { Question } from '../types/chat.types';

interface UseQnAProps {
    socket: Socket | null;
    roomId: string;
    userId: string;
}

export function useQnA({ socket, roomId }: Omit<UseQnAProps, 'userId'>) {
    const [questions, setQuestions] = useState<Question[]>([]);

    // Ask a question
    const askQuestion = useCallback((content: string) => {
        if (!socket || !content.trim()) return;

        socket.emit(WS_EVENTS.QNA_ASK, {
            roomId,
            content: content.trim(),
        });
    }, [socket, roomId]);

    // Upvote a question
    const upvoteQuestion = useCallback((questionId: string) => {
        if (!socket) return;

        socket.emit(WS_EVENTS.QNA_UPVOTE, {
            roomId,
            questionId,
        });

        // Optimistic update
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    upvotes: q.isUpvoted ? q.upvotes - 1 : q.upvotes + 1,
                    isUpvoted: !q.isUpvoted,
                };
            }
            return q;
        }));
    }, [socket, roomId]);

    // Mark as answered (Host only)
    const markAnswered = useCallback((questionId: string) => {
        if (!socket) return;

        socket.emit(WS_EVENTS.QNA_ANSWER, {
            roomId,
            questionId,
        });
    }, [socket, roomId]);

    // Delete question (Host/Admin only)
    const deleteQuestion = useCallback((questionId: string) => {
        if (!socket) return;

        socket.emit(WS_EVENTS.QNA_DELETE, {
            roomId,
            questionId,
        });
    }, [socket, roomId]);

    // Setup socket listeners
    useEffect(() => {
        if (!socket) return;

        // Load initial history
        socket.emit(WS_EVENTS.QNA_HISTORY, { roomId }, (response: { questions: Question[] }) => {
            if (response && response.questions) {
                setQuestions(response.questions);
            }
        });

        const handleQuestionAsked = (data: Question) => {
            setQuestions(prev => [data, ...prev]);
        };

        const handleQuestionUpdated = (data: { questionId: string; upvotes: number }) => {
            setQuestions(prev => prev.map(q =>
                q.id === data.questionId ? { ...q, upvotes: data.upvotes } : q
            ));
        };

        const handleQuestionAnswered = (data: { questionId: string; isAnswered: boolean }) => {
            setQuestions(prev => prev.map(q =>
                q.id === data.questionId ? { ...q, isAnswered: data.isAnswered } : q
            ));
        };

        const handleQuestionDeleted = (data: { questionId: string }) => {
            setQuestions(prev => prev.filter(q => q.id !== data.questionId));
        };

        socket.on(WS_EVENTS.QNA_QUESTION_ASKED, handleQuestionAsked);
        socket.on(WS_EVENTS.QNA_QUESTION_UPDATED, handleQuestionUpdated);
        socket.on(WS_EVENTS.QNA_QUESTION_ANSWERED, handleQuestionAnswered);
        socket.on(WS_EVENTS.QNA_QUESTION_DELETED, handleQuestionDeleted);

        return () => {
            socket.off(WS_EVENTS.QNA_QUESTION_ASKED, handleQuestionAsked);
            socket.off(WS_EVENTS.QNA_QUESTION_UPDATED, handleQuestionUpdated);
            socket.off(WS_EVENTS.QNA_QUESTION_ANSWERED, handleQuestionAnswered);
            socket.off(WS_EVENTS.QNA_QUESTION_DELETED, handleQuestionDeleted);
        };
    }, [socket, roomId]);

    return {
        questions,
        askQuestion,
        upvoteQuestion,
        markAnswered,
        deleteQuestion
    };
}
