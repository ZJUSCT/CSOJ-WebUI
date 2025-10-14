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
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

// Component for the list of submissions
function MySubmissionsList() {
    const t = useTranslations('submissions');
    const { data: submissions, error, isLoading } = useSWR<Submission[]>('/submissions', fetcher, {
        refreshInterval: 5000
    });

    if (isLoading) return (
        <Card>
            <CardHeader>
                <CardTitle>{t('list.title')}</CardTitle>
                <CardDescription>{t('list.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            </CardContent>
        </Card>
    );
    if (error) return <div>{t('list.loadFail')}</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('list.title')}</CardTitle>
                <CardDescription>{t('list.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('list.table.id')}</TableHead>
                            <TableHead>{t('list.table.problemId')}</TableHead>
                            <TableHead>{t('list.table.status')}</TableHead>
                            <TableHead>{t('list.table.score')}</TableHead>
                            <TableHead>{t('list.table.submittedAt')}</TableHead>
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
                                <TableCell colSpan={5} className="text-center">{t('list.none')}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function QueuePosition({ submissionId, cluster }: { submissionId: string, cluster: string }) {
    const t = useTranslations('submissions');
    const { data } = useSWR<{ position: number }>(`/submissions/${submissionId}/queue_position`, fetcher, { refreshInterval: 3000 });

    if (data === undefined) return null;

    return (
        <div className="flex items-center justify-between text-sm text-blue-500">
            <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('details.queue.position')}</span>
            <span>{t('details.queue.info', { position: data.position + 1, cluster })}</span>
        </div>
    );
}


// Component for submission details
function SubmissionDetails({ submissionId }: { submissionId: string }) {
    const t = useTranslations('submissions');
    const { toast } = useToast();
    const { data: submission, error, isLoading, mutate } = useSWR<Submission>(`/submissions/${submissionId}`, fetcher, {
        refreshInterval: (data) => (data?.status === 'Queued' || data?.status === 'Running' ? 2000 : 0),
    });
    const { data: problem } = useSWR<Problem>(submission ? `/problems/${submission.problem_id}` : null, fetcher);

    if (isLoading) return <SubmissionDetailsSkeleton />;
    if (error) return <div>{t('details.loadFail')}</div>;
    if (!submission) return <div>{t('details.notFound')}</div>;

    const totalSteps = problem?.workflow.length ?? 0;
    const progress = totalSteps > 0 ? ((submission.current_step + 1) / totalSteps) * 100 : 0;
    const canBeInterrupted = submission.status === 'Queued' || submission.status === 'Running';

    const handleInterrupt = async () => {
        if (!confirm(t('details.interrupt.confirm'))) return;
        try {
            await api.post(`/submissions/${submissionId}/interrupt`);
            toast({ title: t('details.interrupt.successTitle'), description: t('details.interrupt.successDescription') });
            mutate();
        } catch (err: any) {
            toast({ variant: 'destructive', title: t('details.interrupt.failTitle'), description: err.response?.data?.message || t('details.interrupt.failDefault') });
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('details.log.title')}</CardTitle>
                        <CardDescription>{t('details.log.description')}</CardDescription>
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
                            <CardTitle>{t('details.info.title')}</CardTitle>
                            {canBeInterrupted && (
                                <Button variant="destructive" size="sm" onClick={handleInterrupt}>
                                    <XCircle className="h-4 w-4 mr-1" /> {t('details.interrupt.button')}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        {/* --- Submission Details Section --- */}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Hash className="h-4 w-4"/>{t('details.info.status')}</span>
                            <SubmissionStatusBadge status={submission.status} />
                        </div>
                        {submission.status === 'Queued' && <QueuePosition submissionId={submission.id} cluster={submission.cluster} />}
                        {(submission.status === 'Running') && totalSteps > 0 && (
                            <div>
                                <Progress value={progress} className="w-full" />
                                <p className="text-xs text-muted-foreground mt-1">{t('details.info.stepProgress', {
                                    current: submission.current_step + 1,
                                    total: totalSteps,
                                    name: problem?.workflow[submission.current_step]?.name ?? ''
                                })}</p>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4"/>{t('details.info.score')}</span>
                            <span className="font-mono text-lg">{submission.score}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/>{t('details.info.submitted')}</span>
                            <span>{formatDistanceToNow(new Date(submission.CreatedAt), { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Code className="h-4 w-4"/>{t('details.info.problem')}</span>
                             <Link href={`/problems?id=${submission.problem_id}`} className="text-primary hover:underline">
                                {submission.problem_id}
                             </Link>
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/>{t('details.info.user')}</span>
                            <span>{submission.user.nickname}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Layers className="h-4 w-4"/>{t('details.info.cluster')}</span>
                            <span>{submission.cluster}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Server className="h-4 w-4"/>{t('details.info.node')}</span>
                            <span>{submission.node || 'N/A'}</span>
                        </div>
                        
                        {/* --- Judge Info Section (conditionally rendered) --- */}
                        {submission.info && Object.keys(submission.info).length > 0 && (
                             <>
                                <Separator className="my-4" />
                                <div className="space-y-2">
                                    <h3 className="font-semibold tracking-tight">{t('details.judgeInfo.title')}</h3>
                                    <pre className="p-4 bg-muted rounded-md text-xs overflow-auto">
                                        {JSON.stringify(submission.info, null, 2)}
                                    </pre>
                                    <p className="text-xs text-muted-foreground">{t('details.judgeInfo.description')}</p>
                                </div>
                             </>
                        )}
                    </CardContent>
                 </Card>
            </div>
        </div>
    );
}


function SubmissionDetailsSkeleton() {
    const t = useTranslations('submissions');
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
                  <CardHeader><CardTitle>{t('details.info.title')}</CardTitle></CardHeader>
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