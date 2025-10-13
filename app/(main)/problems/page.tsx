"use client";
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useTranslations } from 'next-intl'; // Import useTranslations
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
import { Suspense } from 'react';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

function UserSubmissionsForProblem({ problemId }: { problemId: string }) {
    const t = useTranslations('ProblemDetails');
    const { data: allSubmissions, isLoading } = useSWR<Submission[]>('/submissions', fetcher);

    if (isLoading) return <Skeleton className="h-40 w-full" />;
    
    const problemSubmissions = allSubmissions?.filter(sub => sub.problem_id === problemId) || [];

    if (problemSubmissions.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('submissions.none')}</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('submissions.id')}</TableHead>
                    <TableHead>{t('submissions.status')}</TableHead>
                    <TableHead>{t('submissions.score')}</TableHead>
                    <TableHead>{t('submissions.date')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {problemSubmissions.map(sub => (
                    <TableRow key={sub.id}>
                        <TableCell>
                            <Link href={`/submissions?id=${sub.id}`} className="font-mono text-primary hover:underline">
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

function ProblemDetails() {
    const t = useTranslations('ProblemDetails');
    const searchParams = useSearchParams();
    const problemId = searchParams.get('id');
    const { data: problem, error, isLoading } = useSWR<Problem>(problemId ? `/problems/${problemId}` : null, fetcher);

    if (!problemId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('noProblem.title')}</CardTitle>
                    <CardDescription>{t('noProblem.description')}</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    if (isLoading) return <div><Skeleton className="h-screen w-full" /></div>;
    if (error) return <div>{t('details.loadFail')}</div>;
    if (!problem) return <div>{t('details.notFound')}</div>;

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{problem.name}</CardTitle>
                        <CardDescription>{t('details.id')}: {problem.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MarkdownViewer 
                            content={problem.description}
                            assetContext="problem"
                            assetContextId={problem.id}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('submitForm.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SubmissionUploadForm problemId={problem.id} uploadLimits={problem.upload} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('submissions.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UserSubmissionsForProblem problemId={problem.id} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Using Suspense to handle client-side-only query parameter reading
export default function ProblemDetailsPage() {
    return (
        <Suspense fallback={<div><Skeleton className="h-screen w-full" /></div>}>
            <ProblemDetails />
        </Suspense>
    );
}