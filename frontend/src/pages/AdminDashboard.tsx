import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminOverview } from './admin/AdminOverview';
import { UserManagement } from './admin/UserManagement';
import { AttendanceManagement } from './admin/AttendanceManagement';

export function AdminDashboard() {
  const currentUserRole = useAuthStore((s) => s.role);
  const [currentView, setCurrentView] = useState('overview');

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
      case 'attendance':
        return <AttendanceManagement />;
      case 'meeting-history':
        return (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Meeting History</h2>
            <p className="text-muted-foreground">Historical records of all meetings and sessions will appear here.</p>
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">Meeting history module coming soon.</p>
            </div>
          </div>
        );
      case 'meeting-schedule':
        return (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Meeting Schedule</h2>
            <p className="text-muted-foreground">Plan and manage upcoming meeting schedules.</p>
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">Scheduling module coming soon.</p>
            </div>
          </div>
        );
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
