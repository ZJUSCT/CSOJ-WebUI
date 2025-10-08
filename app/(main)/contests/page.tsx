// FILE: app/(main)/contests/page.tsx

"use client";
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Contest, Problem, LeaderboardEntry, TrendEntry, ScoreHistoryPoint } from '@/lib/types';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Calendar, Clock, BookOpen, Trophy, CheckCircle, Edit3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MarkdownViewer from '@/components/shared/markdown-viewer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, LineChart as RechartsLineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { UserProfileCard } from '@/components/shared/user-profile-card';
import { useAuthenticatedImage } from '@/hooks/use-authenticated-image';
import { getInitials } from '@/lib/utils';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

// --- ContestList (no changes) ---
function ContestList() {
    const { data: contests, error, isLoading } = useSWR<Record<string, Contest>>('/contests', fetcher);

    if (isLoading) return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader>
                    <CardContent className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></CardContent>
                    <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
                </Card>
            ))}
        </div>
    );
    if (error) return <div>Failed to load contests.</div>;
    if (!contests || Object.keys(contests).length === 0) return <div>No contests available.</div>;

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.values(contests).map(contest => {
                const now = new Date();
                const startTime = new Date(contest.starttime);
                const endTime = new Date(contest.endtime);
                const hasStarted = now >= startTime;
                const hasEnded = now > endTime;
                let statusText = "Upcoming";
                if (hasStarted && !hasEnded) statusText = "Ongoing";
                if (hasEnded) statusText = "Finished";

                return (
                    <Card key={contest.id}>
                        <CardHeader>
                            <CardTitle className="text-xl">{contest.name}</CardTitle>
                            <CardDescription>
                                <span className={`font-semibold ${statusText === 'Ongoing' ? 'text-green-500' : statusText === 'Finished' ? 'text-red-500' : 'text-blue-500'}`}>{statusText}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{format(startTime, 'MMM d, yyyy')} - {format(endTime, 'MMM d, yyyy')}</span></div>
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{format(startTime, 'p')} to {format(endTime, 'p')}</span></div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/contests?id=${contest.id}`} passHref>
                                <Button>View Details</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    );
}


// --- ProblemCard, ContestProblems, ContestTrend (no changes) ---
function ProblemCard({ problemId }: { problemId: string }) {
    const { data: problem, isLoading } = useSWR<Problem>(`/problems/${problemId}`, fetcher);
    if (isLoading) return <Skeleton className="h-24 w-full" />;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">{problem?.name || problemId}</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground mb-4">Problem ID: {problemId}</div>
                <Link href={`/problems?id=${problemId}`}><Button size="sm">View Problem</Button></Link>
            </CardContent>
        </Card>
    );
}

function ContestProblems({ contestId }: { contestId: string }) {
    const { data: contest, error, isLoading } = useSWR<Contest>(`/contests/${contestId}`, fetcher);
    if (isLoading) return <Skeleton className="h-64 w-full" />;
    if (error) return <div>Failed to load contest details.</div>;
    if (!contest) return <div>Contest not found.</div>;
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Contest Description</CardTitle></CardHeader>
                <CardContent><MarkdownViewer content={contest.description} /></CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Problems</CardTitle>
                    <CardDescription>{contest.problem_ids.length > 0 ? "Select a problem to view its details and submit your solution." : "This contest is not active or has no problems."}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {contest.problem_ids.map(problemId => <ProblemCard key={problemId} problemId={problemId} />)}
                </CardContent>
            </Card>
        </div>
    );
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function ContestTrend({ contestId }: { contestId: string }) {
    const { data: trendData, error, isLoading } = useSWR<TrendEntry[]>(`/contests/${contestId}/trend`, fetcher, { refreshInterval: 30000 });

    if (isLoading) return <Skeleton className="h-96 w-full" />;
    if (error) return <div>Failed to load trend data.</div>;
    if (!trendData || trendData.length === 0) return <div>No trend data available yet.</div>;

    const allTimePoints = new Set<number>();
    trendData.forEach(user => {
        user.history.forEach(point => {
            allTimePoints.add(new Date(point.time).getTime());
        });
    });

    const sortedTimePoints = Array.from(allTimePoints).sort();

    const chartData = sortedTimePoints.map(time => {
        const dataPoint: { [key: string]: any } = { time: format(new Date(time), 'HH:mm:ss') };
        trendData.forEach(user => {
            const lastPoint = [...user.history].reverse().find(p => new Date(p.time).getTime() <= time);
            dataPoint[user.nickname] = lastPoint ? lastPoint.score : 0;
        });
        return dataPoint;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Score Trend</CardTitle>
                <CardDescription>Score progression of top users over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-96 w-full">
                <ResponsiveContainer>
                    <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {trendData.map((user, index) => (
                            <Line key={user.user_id} type="stepAfter" dataKey={user.nickname} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} />
                        ))}
                    </RechartsLineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function LeaderboardRow({ entry, rank, problemIds }: { entry: LeaderboardEntry, rank: number, problemIds: string[] }) {
    const authenticatedAvatarUrl = useAuthenticatedImage(entry.avatar_url);

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-400';
        if (rank === 2) return 'text-gray-400';
        if (rank === 3) return 'text-yellow-600';
        return '';
    };

    return (
        <TableRow key={entry.user_id}>
            <TableCell className={`font-medium text-lg ${getRankColor(rank)}`}>
                <div className="flex items-center gap-2">
                    {rank <= 3 && <Trophy className="h-5 w-5" />}
                    {rank}
                </div>
            </TableCell>
            <TableCell>
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={authenticatedAvatarUrl || undefined} alt={entry.nickname} />
                                <AvatarFallback>{getInitials(entry.nickname)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{entry.nickname}</span>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <UserProfileCard userId={entry.user_id} />
                    </HoverCardContent>
                </HoverCard>
            </TableCell>
            {problemIds.map(problemId => (
                <TableCell key={problemId} className="text-center font-mono">
                    {entry.problem_scores[problemId] ?? '–'}
                </TableCell>
            ))}
            <TableCell className="text-right font-mono text-lg">{entry.total_score}</TableCell>
        </TableRow>
    );
}


// --- UPDATED ContestLeaderboard component ---
function ContestLeaderboard({ contestId }: { contestId: string }) {
    // Fetch contest details to get the problem IDs in order
    const { data: contest, error: contestError, isLoading: isContestLoading } = useSWR<Contest>(`/contests/${contestId}`, fetcher);
    const { data: leaderboard, error: leaderboardError, isLoading: isLeaderboardLoading } = useSWR<LeaderboardEntry[]>(`/contests/${contestId}/leaderboard`, fetcher, { refreshInterval: 15000 });

    const isLoading = isContestLoading || isLeaderboardLoading;
    if (isLoading) return <Skeleton className="h-64 w-full" />;
    if (contestError || leaderboardError) return <div>Failed to load leaderboard data.</div>;
    if (!leaderboard || leaderboard.length === 0) return <div>No scores recorded yet.</div>;
    if (!contest) return <div>Could not load contest details for leaderboard header.</div>;

    const problemIds = contest.problem_ids;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Rank</TableHead>
                            <TableHead>User</TableHead>
                            {problemIds.map((id, index) => (
                                <TableHead key={id} className="text-center">
                                    <Link href={`/problems?id=${id}`} className="hover:underline" title={id}>
                                        P{index + 1}
                                    </Link>
                                </TableHead>
                            ))}
                            <TableHead className="text-right">Total Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboard.map((entry, index) => (
                            <LeaderboardRow key={entry.user_id} entry={entry} rank={index + 1} problemIds={problemIds} />
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


// --- Main Contest View with Layout Logic ---
function ContestDetailView({ contestId, view }: { contestId: string, view: string }) {
    const { data: contest } = useSWR<Contest>(`/contests/${contestId}`, fetcher);
    const { data: history, isLoading: isHistoryLoading } = useSWR<ScoreHistoryPoint[]>(`/contests/${contestId}/history`, fetcher);
    const { mutate } = useSWRConfig();
    const { toast } = useToast();
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        if (history && history.length > 0) {
            setIsRegistered(true);
        } else if (history) {
            setIsRegistered(false);
        }
    }, [history]);

    const handleRegister = async () => {
        try {
            await api.post(`/contests/${contestId}/register`);
            toast({ title: "Success", description: "You have successfully registered for the contest." });
            mutate(`/contests/${contestId}/history`);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Registration Failed", description: error.response?.data?.message || "An unexpected error occurred." });
        }
    };
    
    const now = new Date();
    const canRegister = contest && now >= new Date(contest.starttime) && now <= new Date(contest.endtime);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold">{contest?.name || "Contest"}</h1>
                {canRegister && (
                    isRegistered ? (
                        <Button disabled variant="secondary">
                            <CheckCircle /> Registered
                        </Button>
                    ) : (
                        <Button onClick={handleRegister} disabled={isHistoryLoading}>
                            {isHistoryLoading ? "Loading..." : "Register for Contest"}
                        </Button>
                    )
                )}
            </div>
            <Tabs value={view} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="problems" asChild>
                        <Link href={`/contests?id=${contestId}&view=problems`}>Problems</Link>
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" asChild>
                        <Link href={`/contests?id=${contestId}&view=leaderboard`}>Leaderboard</Link>
                    </TabsTrigger>
                    <TabsTrigger value="trend" asChild>
                        <Link href={`/contests?id=${contestId}&view=trend`}>Trend</Link>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="mt-6">
                {view === 'leaderboard' ? <ContestLeaderboard contestId={contestId} /> : view === 'trend' ? <ContestTrend contestId={contestId} /> : <ContestProblems contestId={contestId} />}
            </div>
        </div>
    );
}

// --- Page Orchestrator (no changes) ---
function ContestsPageContent() {
    const searchParams = useSearchParams();
    const contestId = searchParams.get('id');
    const view = searchParams.get('view') || 'problems';

    if (contestId) {
        return <ContestDetailView contestId={contestId} view={view} />;
    }

    return <ContestList />;
}

export default function ContestsPage() {
    return (
        <Suspense fallback={<Skeleton className="w-full h-96" />}>
            <ContestsPageContent />
        </Suspense>
    );
}