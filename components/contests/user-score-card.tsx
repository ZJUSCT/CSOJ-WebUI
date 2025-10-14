"use client";

import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Contest, LeaderboardEntry } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Star } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

export function UserScoreCard({ contestId }: { contestId: string }) {
    const t = useTranslations('contests.userScoreCard');
    const { user } = useAuth();

    const { data: contest, isLoading: isContestLoading } = useSWR<Contest>(`/contests/${contestId}`, fetcher);
    const { data: leaderboard, isLoading: isLeaderboardLoading } = useSWR<LeaderboardEntry[]>(`/contests/${contestId}/leaderboard`, fetcher, { refreshInterval: 15000 });

    const isLoading = isContestLoading || isLeaderboardLoading || !user;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Star /> {t('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <Skeleton className="h-24 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    if (!contest) return null;

    const userEntry = leaderboard?.find(entry => entry.user_id === user!.id);
    const userRank = leaderboard ? leaderboard.findIndex(entry => entry.user_id === user!.id) + 1 : 0;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star />
                    {t('title')}
                </CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {userEntry && userRank > 0 ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b">
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">{t('rank')}</span>
                                <span className="text-2xl font-bold flex items-center gap-1"><Trophy className="text-yellow-500"/> #{userRank}</span>
                            </div>
                             <div className="flex flex-col items-end">
                                <span className="text-sm text-muted-foreground">{t('totalScore')}</span>
                                <span className="text-2xl font-bold">{userEntry.total_score}</span>
                            </div>
                        </div>
                        
                        <p className="text-sm font-medium">{t('scoreBreakdown')}</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('problem')}</TableHead>
                                    <TableHead className="text-right">{t('score')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contest.problem_ids.map((problemId, index) => (
                                    <TableRow key={problemId}>
                                        <TableCell>
                                            <Link href={`/problems?id=${problemId}`} className="hover:underline" title={problemId}>
                                                P{index + 1}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {userEntry.problem_scores[problemId] ?? '–'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('notRanked')}</p>
                )}
            </CardContent>
        </Card>
    );
}