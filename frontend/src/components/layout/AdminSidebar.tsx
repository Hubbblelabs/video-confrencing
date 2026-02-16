
import {
    BarChart3,
    Users,
    Clock,
    LogOut,
    Monitor,
    History,
    Calendar
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/auth.store";

interface AdminSidebarProps {
    currentView: string;
    onViewChange: (view: string) => void;
}

export function AdminSidebar({ currentView, onViewChange }: AdminSidebarProps) {
    const { state } = useSidebar();
    const displayName = useAuthStore((s) => s.displayName);
    const role = useAuthStore((s) => s.role);
    const clearAuth = useAuthStore((s) => s.clearAuth);

    const isCollapsed = state === "collapsed";

    const items = [
        {
            title: "Overview",
            icon: BarChart3,
            id: "overview",
        },
        {
            title: "User Management",
            icon: Users,
            id: "users",
            adminOnly: true,
        },
        {
            title: "Attendance",
            icon: Clock,
            id: "attendance",
        },
        {
            title: "Meeting History",
            icon: History,
            id: "meeting-history",
        },
        {
            title: "Meeting Schedule",
            icon: Calendar,
            id: "meeting-schedule",
        },
    ].filter(item => !item.adminOnly || role === 'ADMIN');

    const handleLogout = () => {
        clearAuth();
        window.location.href = '/';
    };

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b px-2 py-4">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight px-2">
                    <div className="bg-primary text-primary-foreground p-1 rounded-md shrink-0">
                        <Monitor size={20} />
                    </div>
                    {!isCollapsed && <span className="truncate">VideoConf</span>}
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    {!isCollapsed && (
                        <SidebarGroupLabel>
                            {role === 'ADMIN' ? 'Administrative' : 'Management'}
                        </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton
                                        onClick={() => onViewChange(item.id)}
                                        isActive={currentView === item.id}
                                        tooltip={item.title}
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-2">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20 shrink-0">
                        {(displayName || 'A').charAt(0).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0 overflow-hidden">
                            <span className="text-sm font-medium truncate">{displayName || 'Admin'}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider truncate">{role}</span>
                        </div>
                    )}
                </div>
                <SidebarMenu className="mt-2">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleLogout}
                            tooltip="Logout"
                        >
                            <LogOut />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
