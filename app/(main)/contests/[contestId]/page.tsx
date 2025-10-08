"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import { Contest, Problem } from '@/lib/types';
import MarkdownViewer from '@/components/shared/markdown-viewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

// This component fetches details for a single problem
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
                <Link href={`/problems/${problemId}`}>
                    <Button size="sm">View Problem</Button>
                </Link>
            </CardContent>
        </Card>
    )
}

export default function ContestDetailsPage() {
    const params = useParams();
    const contestId = params.contestId as string;
    const { data: contest, error, isLoading } = useSWR<Contest>(`/contests/${contestId}`, fetcher);

    if (isLoading) return (
        <div className="space-y-6">
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        </div>
    );
    if (error) return <div>Failed to load contest details.</div>;
    if (!contest) return <div>Contest not found.</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Contest Description</CardTitle>
                </CardHeader>
                <CardContent>
                    <MarkdownViewer content={contest.description} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Problems</CardTitle>
                    <CardDescription>
                        {contest.problem_ids.length > 0
                         ? "Select a problem to view its details and submit your solution."
                         : "This contest is not active or has no problems."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   {contest.problem_ids.map(problemId => (
                       <ProblemCard key={problemId} problemId={problemId} />
                   ))}
                </CardContent>
            </Card>
        </div>
    );
}