"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import { LeaderboardEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

export default function LeaderboardPage() {
    const params = useParams();
    const contestId = params.contestId as string;
    const { data: leaderboard, error, isLoading } = useSWR<LeaderboardEntry[]>(
        `/contests/${contestId}/leaderboard`,
        fetcher,
        { refreshInterval: 15000 } // Refresh every 15 seconds
    );

    if (isLoading) return (
        <Card>
            <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </CardContent>
        </Card>
    );

    if (error) return <div>Failed to load leaderboard.</div>;
    if (!leaderboard || leaderboard.length === 0) return <div>No scores recorded yet.</div>;

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-400';
        if (rank === 2) return 'text-gray-400';
        if (rank === 3) return 'text-yellow-600';
        return '';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Rank</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead className="text-right">Total Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboard.map((entry, index) => (
                            <TableRow key={entry.user_id}>
                                <TableCell className={`font-medium text-lg ${getRankColor(index + 1)}`}>
                                    <div className="flex items-center gap-2">
                                        {index < 3 && <Trophy className="h-5 w-5"/>}
                                        {index + 1}
                                    </div>
                                </TableCell>
                                <TableCell>{entry.nickname} ({entry.username})</TableCell>
                                <TableCell className="text-right font-mono text-lg">{entry.total_score}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}