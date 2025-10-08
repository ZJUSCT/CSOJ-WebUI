"use client"
import useSWR from 'swr';
import { Contest } from '@/lib/types';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

export default function ContestsPage() {
    const { data: contests, error, isLoading } = useSWR<Record<string, Contest>>('/contests', fetcher);

    if (isLoading) return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                 <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-10 w-24" />
                    </CardFooter>
                 </Card>
            ))}
        </div>
    );
    if (error) return <div>Failed to load contests.</div>;
    if (!contests || Object.keys(contests).length === 0) return <div>No contests available.</div>;

    const contestArray = Object.values(contests);

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {contestArray.map(contest => {
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
                                <span className={`font-semibold ${
                                    statusText === 'Ongoing' ? 'text-green-500' :
                                    statusText === 'Finished' ? 'text-red-500' : 'text-blue-500'
                                }`}>{statusText}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(startTime, 'MMM d, yyyy')} - {format(endTime, 'MMM d, yyyy')}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{format(startTime, 'p')} to {format(endTime, 'p')}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/contests/${contest.id}`} passHref>
                                <Button>View Details</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    );
}