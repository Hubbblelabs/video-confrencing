import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/services/api.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ProfileSettingsProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function ProfileSettings({ open, onOpenChange, trigger }: ProfileSettingsProps) {
    const { token, displayName: currentDisplayName, email: currentEmail, setAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    // General Form State
    const [displayName, setDisplayName] = useState(currentDisplayName || "");
    const email = currentEmail || "";

    // Password Form State
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleUpdateProfile = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await authApi.updateProfile({ displayName }, token);
            setAuth(response.accessToken); // Update store with new token
            toast.success("Profile updated successfully");
            if (onOpenChange) onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!token) return;
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.updateProfile({ password: newPassword }, token);
            setAuth(response.accessToken);
            toast.success("Password updated successfully");
            setNewPassword("");
            setConfirmPassword("");
            if (onOpenChange) onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    // If controlled via props or internal trigger
    const dialogProps = trigger ? {} : { open, onOpenChange };

    return (
        <Dialog {...dialogProps}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Profile Settings</DialogTitle>
                    <DialogDescription>
                        Manage your account settings and preferences.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={email} disabled className="bg-muted" />
                            <p className="text-[0.8rem] text-muted-foreground">
                                Email address cannot be changed.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                                id="name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleUpdateProfile} disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleUpdatePassword} disabled={isLoading || !newPassword}>
                                {isLoading ? "Updating..." : "Update Password"}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
