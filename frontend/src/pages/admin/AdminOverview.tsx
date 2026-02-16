import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Users,
    UserCheck,
    ShieldCheck,
    Clock,
    Video,
    Activity
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { useAuthStore } from '@/store/auth.store';
import { adminUsersApi } from '@/services/admin-users.service';
import { attendanceApi } from '@/services/attendance.service';
import type { UserStatistics } from '@/services/admin-users.service';
import type { AttendanceStatistics } from '@/services/attendance.service';

export function AdminOverview() {
    const token = useAuthStore((s) => s.token);
    const [userStats, setUserStats] = useState<UserStatistics | null>(null);
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStatistics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            if (!token) return;
            try {
                const [uStats, aStats] = await Promise.all([
                    adminUsersApi.getStatistics(token),
                    attendanceApi.getStatistics(token),
                ]);
                setUserStats(uStats);
                setAttendanceStats(aStats);
            } catch (err) {
                console.error('Failed to load dashboard statistics', err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const userDistributionData = [
        { name: 'Students', value: userStats?.students || 0, color: 'hsl(var(--chart-1))' },
        { name: 'Teachers', value: userStats?.teachers || 0, color: 'hsl(var(--chart-2))' },
        { name: 'Admins', value: userStats?.admins || 0, color: 'hsl(var(--chart-3))' },
    ];

    const stats = [
        {
            title: "Total Users",
            value: userStats?.total || 0,
            description: "Registered accounts",
            icon: Users,
            color: "text-blue-500",
        },
        {
            title: "Active Users",
            value: userStats?.active || 0,
            description: "Users marked as active",
            icon: UserCheck,
            color: "text-green-500",
        },
        {
            title: "Total Sessions",
            value: attendanceStats?.totalSessions || 0,
            description: "Meeting connections",
            icon: Video,
            color: "text-purple-500",
        },
        {
            title: "Total Minutes",
            value: attendanceStats?.totalMinutes || 0,
            description: "Time spent in meetings",
            icon: Clock,
            color: "text-orange-500",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>User Distribution</CardTitle>
                        <CardDescription>Breakdown of users by role</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={userDistributionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {userDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Usage Metrics</CardTitle>
                        <CardDescription>Average session engagement</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            <div className="flex items-center">
                                <ShieldCheck className="mr-4 h-4 w-4 text-blue-500" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Unique Rooms</p>
                                    <p className="text-sm text-muted-foreground">
                                        Number of unique meetings created
                                    </p>
                                </div>
                                <div className="ml-auto font-medium">{attendanceStats?.uniqueRooms || 0}</div>
                            </div>
                            <div className="flex items-center">
                                <Activity className="mr-4 h-4 w-4 text-green-500" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Avg. Session Duration</p>
                                    <p className="text-sm text-muted-foreground">
                                        Minutes per participant session
                                    </p>
                                </div>
                                <div className="ml-auto font-medium">{attendanceStats?.averageMinutesPerSession || 0}m</div>
                            </div>
                            <div className="flex items-center">
                                <ShieldCheck className="mr-4 h-4 w-4 text-red-500" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Admins</p>
                                    <p className="text-sm text-muted-foreground">Total administrative accounts</p>
                                </div>
                                <div className="ml-auto font-medium">{userStats?.admins || 0}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
