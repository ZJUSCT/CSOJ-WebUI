"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import { Problem, Submission } from '@/lib/types';
import MarkdownViewer from '@/components/shared/markdown-viewer';
import SubmissionStatusBadge from '@/components/shared/submission-status-badge';
import SubmissionUploadForm from '@/components/submissions/submission-upload-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

function UserSubmissionsForProblem({ problemId }: { problemId: string }) {
    const { data: allSubmissions, isLoading } = useSWR<Submission[]>('/submissions', fetcher);

    if (isLoading) return <Skeleton className="h-40 w-full" />;
    
    const problemSubmissions = allSubmissions?.filter(sub => sub.problem_id === problemId) || [];

    if (problemSubmissions.length === 0) {
        return <p className="text-sm text-muted-foreground">You have not made any submissions for this problem yet.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Submission ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {problemSubmissions.map(sub => (
                    <TableRow key={sub.id}>
                        <TableCell>
                            <Link href={`/submissions/${sub.id}`} className="font-mono text-primary hover:underline">
                                {sub.id.substring(0, 8)}...
                            </Link>
                        </TableCell>
                        <TableCell><SubmissionStatusBadge status={sub.status} /></TableCell>
                        <TableCell>{sub.score}</TableCell>
                        <TableCell>{format(new Date(sub.CreatedAt), "Pp")}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function ProblemDetailsPage() {
    const params = useParams();
    const problemId = params.problemId as string;
    const { data: problem, error, isLoading } = useSWR<Problem>(`/problems/${problemId}`, fetcher);

    if (isLoading) return <div><Skeleton className="h-screen w-full" /></div>;
    if (error) return <div>Failed to load problem. You may not have access to it yet.</div>;
    if (!problem) return <div>Problem not found.</div>;

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{problem.name}</CardTitle>
                        <CardDescription>Problem ID: {problem.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <MarkdownViewer content={problem.description} />
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Submit Solution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SubmissionUploadForm problemId={problem.id} uploadLimits={problem.upload} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Your Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UserSubmissionsForProblem problemId={problem.id} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}