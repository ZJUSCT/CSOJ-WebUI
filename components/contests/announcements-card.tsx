"use client";

import useSWR from 'swr';
import api from '@/lib/api';
import { Announcement } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Separator } from '../ui/separator';
import MarkdownViewer from '../shared/markdown-viewer';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

export function AnnouncementsCard({ contestId }: { contestId: string }) {
    const { data: announcements, error, isLoading } = useSWR<Announcement[]>(`/contests/${contestId}/announcements`, fetcher, {
        refreshInterval: 60000 // Refresh every minute
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Megaphone />
                    Announcements
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Separator />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                )}
                {error && <p className="text-sm text-destructive">Failed to load announcements.</p>}
                {!isLoading && announcements && announcements.length > 0 ? (
                    <div className="space-y-6">
                        {announcements.map((ann, index) => (
                            <div key={ann.id}>
                                <div className="space-y-1">
                                    <h3 className="font-semibold">{ann.title}</h3>
                                    <p className="text-xs text-muted-foreground" title={format(new Date(ann.created_at), 'Pp')}>
                                        {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                                    </p>
                                    <div className="pt-2">
                                        <MarkdownViewer content={ann.description} />
                                    </div>
                                </div>
                                {index < announcements.length - 1 && <Separator className="mt-6" />}
                            </div>
                        ))}
                    </div>
                ) : !isLoading && (
                    <p className="text-sm text-muted-foreground text-center py-4">No announcements yet.</p>
                )}
            </CardContent>
        </Card>
    );
}