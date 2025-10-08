"use client";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import useSWR from 'swr';
import { Contest, Problem, LeaderboardEntry } from '@/lib/types';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Calendar, Clock, BookOpen, Trophy } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MarkdownViewer from '@/components/shared/markdown-viewer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// FIX: Reverted the fetcher to always return a promise.
// SWR handles conditional fetching via its first argument (the key), not by the fetcher returning null.
const fetcher = (url: string) => api.get(url).then(res => res.data.data);

// --- Sub-component for Contest List (from former contests/page.tsx) ---
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

// --- Sub-components for Contest Details (from former [contestId] route) ---

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

function ContestLeaderboard({ contestId }: { contestId: string }) {
    const { data: leaderboard, error, isLoading } = useSWR<LeaderboardEntry[]>(`/contests/${contestId}/leaderboard`, fetcher, { refreshInterval: 15000 });
    if (isLoading) return <Skeleton className="h-64 w-full" />;
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
            <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead className="w-[100px]">Rank</TableHead><TableHead>User</TableHead><TableHead className="text-right">Total Score</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {leaderboard.map((entry, index) => (
                            <TableRow key={entry.user_id}>
                                <TableCell className={`font-medium text-lg ${getRankColor(index + 1)}`}>
                                    <div className="flex items-center gap-2">{index < 3 && <Trophy className="h-5 w-5"/>}{index + 1}</div>
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

// --- Main Contest View with Layout Logic ---
function ContestDetailView({ contestId, view }: { contestId: string, view: string }) {
    const { data: contest } = useSWR<Contest>(`/contests/${contestId}`, fetcher);
    const { toast } = useToast();

    const handleRegister = async () => {
        try {
            await api.post(`/contests/${contestId}/register`);
            toast({ title: "Success", description: "You have successfully registered for the contest." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Registration Failed", description: error.response?.data?.message || "An unexpected error occurred." });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">{contest?.name || "Contest"}</h1>
                <Button onClick={handleRegister}>Register for Contest</Button>
            </div>
            <Tabs value={view} className="w-full">
                <TabsList>
                    <TabsTrigger value="problems" asChild>
                        <Link href={`/contests?id=${contestId}`}>Problems</Link>
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" asChild>
                        <Link href={`/contests?id=${contestId}&view=leaderboard`}>Leaderboard</Link>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
            <div>
                {view === 'leaderboard' ? <ContestLeaderboard contestId={contestId} /> : <ContestProblems contestId={contestId} />}
            </div>
        </div>
    );
}

// --- Page Orchestrator ---
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