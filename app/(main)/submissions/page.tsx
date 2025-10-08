"use client";
import useSWR from 'swr';
import api from '@/lib/api';
import { Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import SubmissionStatusBadge from '@/components/shared/submission-status-badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SubmissionLogViewer } from '@/components/submissions/submission-log-viewer';
import { Clock, Code, Hash, Layers, Server, Tag, User } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

// Component for the list of submissions
function MySubmissionsList() {
    const { data: submissions, error, isLoading } = useSWR<Submission[]>('/submissions', fetcher, {
        refreshInterval: 5000
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
                                        <Link href={`/submissions?id=${sub.id}`} className="font-mono text-primary hover:underline">
                                            {sub.id.substring(0, 8)}...
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/problems?id=${sub.problem_id}`} className="text-primary hover:underline">
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

// Component for submission details (from former [submissionId]/page.tsx)
function SubmissionDetails({ submissionId }: { submissionId: string }) {
    const { data: submission, error, isLoading, mutate } = useSWR<Submission>(`/submissions/${submissionId}`, fetcher, {
        refreshInterval: (data) => (data?.status === 'Queued' || data?.status === 'Running' ? 2000 : 0),
    });

    if (isLoading) return <SubmissionDetailsSkeleton />;
    if (error) return <div>Failed to load submission.</div>;
    if (!submission) return <div>Submission not found.</div>;

    const totalSteps = submission.info?.total_steps ?? submission.containers.length + 1;
    const progress = (submission.current_step / totalSteps) * 100;

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Live Log</CardTitle>
                        <CardDescription>Real-time output from the judge.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SubmissionLogViewer submissionId={submissionId} onStatusUpdate={mutate} />
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Submission Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Hash className="h-4 w-4"/>Status</span>
                            <SubmissionStatusBadge status={submission.status} />
                        </div>
                         {(submission.status === 'Running' || submission.status === 'Queued') && (
                            <div>
                                <Progress value={progress} className="w-full" />
                                <p className="text-xs text-muted-foreground mt-1">Step {submission.current_step} of {totalSteps}</p>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4"/>Score</span>
                            <span className="font-mono text-lg">{submission.score}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/>Submitted</span>
                            <span>{formatDistanceToNow(new Date(submission.CreatedAt), { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Code className="h-4 w-4"/>Problem</span>
                             <Link href={`/problems?id=${submission.problem_id}`} className="text-primary hover:underline">
                                {submission.problem_id}
                             </Link>
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/>User</span>
                            <span>{submission.user.nickname}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Layers className="h-4 w-4"/>Cluster</span>
                            <span>{submission.cluster}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Server className="h-4 w-4"/>Node</span>
                            <span>{submission.node || 'N/A'}</span>
                        </div>
                    </CardContent>
                 </Card>
                {submission.info && Object.keys(submission.info).length > 0 && (
                     <Card>
                         <CardHeader><CardTitle>Judge Info</CardTitle></CardHeader>
                         <CardContent>
                             <pre className="p-4 bg-muted rounded-md text-xs overflow-auto">
                                 {JSON.stringify(submission.info, null, 2)}
                             </pre>
                         </CardContent>
                     </Card>
                )}
            </div>
        </div>
    );
}


function SubmissionDetailsSkeleton() {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
              <Card>
                  <CardHeader>
                      <Skeleton className="h-6 w-1/4" />
                      <Skeleton className="h-4 w-2/4" />
                  </CardHeader>
                  <CardContent>
                      <div className="bg-muted h-96 rounded-md p-4 space-y-2">
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-3/4" />
                      </div>
                  </CardContent>
              </Card>
          </div>
          <div className="space-y-6">
              <Card>
                  <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                  <CardContent className="space-y-4">
                      {[...Array(6)].map((_, i) => (
                           <div key={i} className="flex justify-between">
                               <Skeleton className="h-5 w-1/3" />
                               <Skeleton className="h-5 w-1/2" />
                           </div>
                      ))}
                  </CardContent>
              </Card>
          </div>
      </div>
    );
}

// Main page component that decides which view to render
function SubmissionsPageContent() {
    const searchParams = useSearchParams();
    const submissionId = searchParams.get('id');

    if (submissionId) {
        return <SubmissionDetails submissionId={submissionId} />;
    }

    return <MySubmissionsList />;
}

export default function MySubmissionsPage() {
    return (
        <Suspense fallback={<SubmissionDetailsSkeleton />}>
            <SubmissionsPageContent />
        </Suspense>
    );
}
