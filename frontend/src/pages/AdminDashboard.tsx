import { useState } from 'react';
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

  // Check if user is admin or teacher
  if (currentUserRole !== 'ADMIN' && currentUserRole !== 'TEACHER') {
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
