"use client";
import { AttendanceManagement } from './admin/AttendanceManagement';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from '../store/auth.store';

export function AttendancePage() {
  const currentUserRole = useAuthStore((s) => s.role);

  // Check if user has permission (Admin or Teacher)
  if (currentUserRole !== 'ADMIN' && currentUserRole !== 'TEACHER') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access attendance records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Attendance Tracking</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        <AttendanceManagement />
      </main>
    </div>
  );
}
