// FILE: app/(main)/submissions/page.tsx

"use client";
import useSWR from 'swr';
import api from '@/lib/api';
import { Problem, Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import SubmissionStatusBadge from '@/components/shared/submission-status-badge';
import { format, formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SubmissionLogViewer } from '@/components/submissions/submission-log-viewer';
import { Clock, Code, Hash, Layers, Loader2, Server, Tag, User, XCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

function QueuePosition({ submissionId, cluster }: { submissionId: string, cluster: string }) {
    const { data } = useSWR<{ position: number }>(`/submissions/${submissionId}/queue_position`, fetcher, { refreshInterval: 3000 });

    if (data === undefined) return null;

    return (
        <div className="flex items-center justify-between text-sm text-blue-500">
            <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Queue Position</span>
            <span>#{data.position + 1} in {cluster} queue</span>
        </div>
    );
}


// Component for submission details (from former [submissionId]/page.tsx)
function SubmissionDetails({ submissionId }: { submissionId: string }) {
    const { toast } = useToast();
    const { data: submission, error, isLoading, mutate } = useSWR<Submission>(`/submissions/${submissionId}`, fetcher, {
        refreshInterval: (data) => (data?.status === 'Queued' || data?.status === 'Running' ? 2000 : 0),
    });
    const { data: problem } = useSWR<Problem>(submission ? `/problems/${submission.problem_id}` : null, fetcher);

    if (isLoading) return <SubmissionDetailsSkeleton />;
    if (error) return <div>Failed to load submission.</div>;
    if (!submission) return <div>Submission not found.</div>;

    const totalSteps = problem?.workflow.length ?? 0;
    const progress = totalSteps > 0 ? ((submission.current_step + 1) / totalSteps) * 100 : 0;
    const canBeInterrupted = submission.status === 'Queued' || submission.status === 'Running';

    const handleInterrupt = async () => {
        if (!confirm('Are you sure you want to interrupt this submission? This action cannot be undone.')) return;
        try {
            await api.post(`/submissions/${submissionId}/interrupt`);
            toast({ title: 'Success', description: 'Submission interruption request sent.' });
            mutate();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to interrupt submission.' });
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Live Log</CardTitle>
                        <CardDescription>Real-time output from the judge. Select a step to view its log.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {problem && submission ? <SubmissionLogViewer submission={submission} problem={problem} onStatusUpdate={mutate} /> : <Skeleton className="h-96 w-full" />}
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Submission Details</CardTitle>
                            {canBeInterrupted && (
                                <Button variant="destructive" size="sm" onClick={handleInterrupt}>
                                    <XCircle /> Interrupt
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Hash className="h-4 w-4"/>Status</span>
                            <SubmissionStatusBadge status={submission.status} />
                        </div>
                        {submission.status === 'Queued' && <QueuePosition submissionId={submission.id} cluster={submission.cluster} />}
                         {(submission.status === 'Running') && totalSteps > 0 && (
                            <div>
                                <Progress value={progress} className="w-full" />
                                <p className="text-xs text-muted-foreground mt-1">Step {submission.current_step + 1} of {totalSteps}: {problem?.workflow[submission.current_step]?.name}</p>
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
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">This is the raw JSON output from the final step of the judging process.</p>
                        </CardFooter>
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
