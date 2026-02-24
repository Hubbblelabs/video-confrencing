import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { TeacherLayout } from '../components/layout/TeacherLayout';
import { TeacherOverview } from './teacher/TeacherOverview';
import { TeacherSubjects } from './teacher/TeacherSubjects';
import { AttendanceManagement } from './admin/AttendanceManagement';
import { MeetingHistory } from './admin/MeetingHistory';
import { MeetingSchedule } from './admin/MeetingSchedule';

export function TeacherDashboard() {
    const currentUserRole = useAuthStore((s) => s.role);
    const [currentView, setCurrentView] = useState('my-classes');

    if (currentUserRole !== 'TEACHER') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h1>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (currentView) {
            case 'my-classes':
                return <TeacherOverview />;
            case 'my-subjects':
                return <TeacherSubjects />;
            case 'schedule':
                return <MeetingSchedule />;
            case 'attendance':
                return <AttendanceManagement />;
            case 'class-history':
                return <MeetingHistory />;
            default:
                return <TeacherOverview />;
        }
    };

    return (
        <TeacherLayout currentView={currentView} onViewChange={setCurrentView}>
            {renderContent()}
        </TeacherLayout>
    );
}
