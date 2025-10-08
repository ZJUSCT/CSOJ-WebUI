"use client";
import useSWR from 'swr';
import api from '@/lib/api';
import { Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import SubmissionStatusBadge from '@/components/shared/submission-status-badge';
import { format } from 'date-fns';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

export default function MySubmissionsPage() {
    const { data: submissions, error, isLoading } = useSWR<Submission[]>('/submissions', fetcher, {
        refreshInterval: 5000 // Refresh every 5 seconds
    });

    if (isLoading) return (
        <Card>
            <CardHeader>
                <CardTitle>My Submissions</CardTitle>
                <CardDescription>A list of all your submissions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </CardContent>
        </Card>
    );

    if (error) return <div>Failed to load submissions.</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Submissions</CardTitle>
                <CardDescription>A list of all your submissions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Problem ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Submitted At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions && submissions.length > 0 ? (
                            submissions.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell>
                                        <Link href={`/submissions/${sub.id}`} className="font-mono text-primary hover:underline">
                                            {sub.id.substring(0, 8)}...
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/problems/${sub.problem_id}`} className="text-primary hover:underline">
                                            {sub.problem_id}
                                        </Link>
                                    </TableCell>
                                    <TableCell><SubmissionStatusBadge status={sub.status} /></TableCell>
                                    <TableCell>{sub.score}</TableCell>
                                    <TableCell>{format(new Date(sub.CreatedAt), "Pp")}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">No submissions yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}