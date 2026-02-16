import * as React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { useAuthStore } from "@/store/auth.store";

interface AdminLayoutProps {
    children: React.ReactNode;
    currentView: string;
    onViewChange: (view: string) => void;
}

export function AdminLayout({ children, currentView, onViewChange }: AdminLayoutProps) {
    const { displayName, role } = useAuthStore();
    const getViewTitle = (view: string) => {
        switch (view) {
            case "overview": return "Overview";
            case "users": return "User Management";
            case "attendance": return "Attendance Tracking";
            default: return "Admin Dashboard";
        }
    };

    return (
        <SidebarProvider>
            <AdminSidebar currentView={currentView} onViewChange={onViewChange} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">Admin</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{getViewTitle(currentView)}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    <div className="ml-auto px-4 flex items-center gap-4">
                        <ProfileSettings
                            trigger={
                                <button className="flex items-center gap-2 hover:bg-muted/50 p-1.5 rounded-full transition-colors">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold ring-2 ring-transparent hover:ring-primary/20 transition-all">
                                        {(displayName || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="hidden md:block text-right">
                                        <div className="text-sm font-medium leading-none">{displayName}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">{role}</div>
                                    </div>
                                </button>
                            }
                        />
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-muted/20">
                    <div className="mx-auto max-w-7xl p-6">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
