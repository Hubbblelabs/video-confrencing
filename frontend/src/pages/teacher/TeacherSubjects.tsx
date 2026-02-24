import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { subjectsApi } from '@/services/subjects.service';
import type { TeacherSubjectEntry } from '@/services/subjects.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar } from "lucide-react";

export function TeacherSubjects() {
    const token = useAuthStore((s) => s.token);
    const [subjects, setSubjects] = useState<TeacherSubjectEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!token) return;
            try {
                const data = await subjectsApi.getMySubjects(token);
                setSubjects(data);
            } catch (err) {
                console.error('Failed to load subjects', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Subjects</h1>
                <p className="text-muted-foreground">Subjects assigned to you by the administrator</p>
            </div>

            {subjects.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">No subjects assigned yet</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                            Your administrator will assign subjects to you. They will appear here once assigned.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((entry) => (
                        <Card key={entry.id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                        style={{
                                            backgroundColor: `${entry.subject.color || '#3b82f6'}15`,
                                            color: entry.subject.color || '#3b82f6',
                                        }}
                                    >
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <Badge variant={entry.subject.isActive ? "default" : "secondary"} className="text-[10px]">
                                        {entry.subject.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg mt-3">{entry.subject.name}</CardTitle>
                                {entry.subject.description && (
                                    <CardDescription className="line-clamp-2">{entry.subject.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    Assigned {new Date(entry.assignedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
