"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth.store';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminOverview } from './admin/AdminOverview';
import { UserManagement } from './admin/UserManagement';
import { AttendanceManagement } from './admin/AttendanceManagement';
import { MeetingHistory } from './admin/MeetingHistory';
import { MeetingSchedule } from './admin/MeetingSchedule';
import { CreditManagement } from './admin/CreditManagement';
import { SubjectManagement } from './admin/SubjectManagement';

export function AdminDashboard() {
  const currentUserRole = useAuthStore((s) => s.role);
  const [currentView, setCurrentView] = useState('overview');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (currentUserRole === 'STUDENT') {
      router.push('/dashboard');
    } else if (currentUserRole === 'TEACHER') {
      router.push('/teacher');
    }
  }, [currentUserRole, router]);

  if (!isMounted) return <div className="min-h-screen bg-background" />;

  // Check if user is admin
  if (currentUserRole !== 'ADMIN') {
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
      case 'overview':
        return <AdminOverview />;
      case 'users':
        return <UserManagement />;
      case 'credits':
        return <CreditManagement />;
      case 'attendance':
        return <AttendanceManagement />;
      case 'meeting-history':
        return <MeetingHistory />;
      case 'meeting-schedule':
        return <MeetingSchedule />;
      case 'subjects':
        return <SubjectManagement />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <AdminLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderContent()}
    </AdminLayout>
  );
}
