"use client";
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(50),
  signature: z.string().max(100).optional(),
});

export default function ProfilePage() {
    const { user, isLoading, logout } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        values: {
            nickname: user?.nickname || '',
            signature: user?.signature || '',
        },
    });

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        setIsUploading(true);

        try {
            await api.post('/user/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast({ title: 'Avatar updated successfully!' });
            // Forcing a reload to get the new user profile with updated avatar URL
            window.location.reload(); 
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Upload failed',
                description: error.response?.data?.message || 'Could not upload avatar.',
            });
        } finally {
            setIsUploading(false);
        }
    };
    
    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        try {
            await api.patch('/user/profile', values);
            toast({ title: 'Profile updated successfully!' });
            // Forcing a reload to get the new user profile
            window.location.reload();
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Update failed',
                description: error.response?.data?.message || 'Could not update profile.',
            });
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    }

    if (isLoading || !user) {
        return <Skeleton className="w-full h-96" />;
    }

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle>Avatar</CardTitle>
                    <CardDescription>Update your profile picture.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={user.avatar_url} alt={user.nickname} />
                        <AvatarFallback>{getInitials(user.nickname)}</AvatarFallback>
                    </Avatar>
                    <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <Button asChild variant="outline">
                        <label htmlFor="avatar-upload">{isUploading ? "Uploading..." : "Change Avatar"}</label>
                    </Button>
                </CardContent>
            </Card>

             <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                     <CardDescription>Update your account details. Username cannot be changed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <Input disabled value={user.username} />
                            </FormItem>
                            <FormField
                                control={form.control}
                                name="nickname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nickname</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Your display name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="signature"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Signature</FormLabel>
                                        <FormControl>
                                            <Input placeholder="A short bio" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </form>
                    </Form>
                     <div className="border-t pt-6 mt-6">
                         <Button variant="destructive" onClick={handleLogout}>Log Out</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}