"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { Problem, Submission, Container } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import useSWR from 'swr';
import api from '@/lib/api';
import { Skeleton } from '../ui/skeleton';

interface LogMessage {
    stream: 'stdout' | 'stderr' | 'info' | 'error';
    data: string;
}

// --- Sub-component for displaying static logs of finished containers ---
const StaticLogViewer = ({ submissionId, containerId }: { submissionId: string, containerId: string }) => {
    const textFetcher = (url: string) => api.get(url, { responseType: 'text' }).then(res => res.data);
    const { data: logText, error, isLoading } = useSWR(`/submissions/${submissionId}/containers/${containerId}/log`, textFetcher);
    const logContainerRef = useRef<HTMLDivElement>(null);

    const messages: LogMessage[] = useMemo(() => {
        if (!logText) return [];
        return logText
            .split('\n')
            .filter((line: string) => line.trim() !== '')
            .map((line: string) => {
                try {
                    return JSON.parse(line) as LogMessage;
                } catch (e) {
                    console.error("Failed to parse log line as JSON:", line);
                    return { stream: 'stdout', data: line };
                }
            });
    }, [logText]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="relative">
            <div className="absolute top-2 right-6 text-xs font-semibold flex items-center gap-2 z-10">
                <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                Finished
            </div>
            <div
                ref={logContainerRef}
                className="font-mono text-xs bg-muted rounded-md h-96 overflow-y-auto p-4"
            >
                {isLoading && <Skeleton className="h-full w-full" />}
                {error && <p className="text-red-400">Failed to load log.</p>}
                {messages.length > 0 && messages.map((msg, index) => (
                    <span key={index} className="whitespace-pre-wrap break-all">
                        {msg.stream === 'stderr' || msg.stream === 'error' ? (
                            <span className="text-red-400">{msg.data}</span>
                        ) : msg.stream === 'info' ? (
                            <span className="text-blue-400">{msg.data}</span>
                        ) : (
                            <span className="text-foreground">{msg.data}</span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
};


// --- Sub-component for streaming real-time logs via WebSocket ---
const RealtimeLogViewer = ({ wsUrl, onStatusUpdate }: { wsUrl: string | null, onStatusUpdate: () => void }) => {
    const [messages, setMessages] = useState<LogMessage[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);

    const { readyState, lastMessage } = useWebSocket(wsUrl, {
        shouldReconnect: (closeEvent) => true,
        reconnectInterval: 3000,
        onClose: () => {
            console.log('WebSocket closed. Attempting to refetch submission status.');
            onStatusUpdate();
        }
    });

    useEffect(() => {
        setMessages([]);
    }, [wsUrl]);

    useEffect(() => {
        if (lastMessage !== null) {
            try {
                const parsed = JSON.parse(lastMessage.data);
                setMessages((prev) => [...prev, parsed]);
            } catch (e) {
                console.error("Failed to parse WebSocket message:", lastMessage.data);
            }
        }
    }, [lastMessage]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const connectionStatus = {
        [ReadyState.CONNECTING]: { text: 'Connecting...', color: 'bg-yellow-500' },
        [ReadyState.OPEN]: { text: 'Live', color: 'bg-green-500 animate-pulse' },
        [ReadyState.CLOSING]: { text: 'Closing...', color: 'bg-yellow-500' },
        [ReadyState.CLOSED]: { text: 'Disconnected', color: 'bg-red-500' },
        [ReadyState.UNINSTANTIATED]: { text: 'Uninstantiated', color: 'bg-gray-500' },
    }[readyState];

    return (
        <div className="relative">
            <div className="absolute top-2 right-6 text-xs font-semibold flex items-center gap-2 z-10">
                <span className={`h-2 w-2 rounded-full ${connectionStatus.color}`}></span>
                {connectionStatus.text}
            </div>
            <div
                ref={logContainerRef}
                className="font-mono text-xs bg-muted rounded-md h-96 overflow-y-auto p-4"
            >
                {messages.length === 0 && <p className="text-muted-foreground">Waiting for judge output...</p>}
                {messages.map((msg, index) => (
                    <span key={index} className="whitespace-pre-wrap break-all">
                        {msg.stream === 'stderr' || msg.stream === 'error' ? (
                            <span className="text-red-400">{msg.data}</span>
                        ) : msg.stream === 'info' ? (
                            <span className="text-blue-400">{msg.data}</span>
                        ) : (
                            <span className="text-foreground">{msg.data}</span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- Main Orchestrator Component ---
interface SubmissionLogViewerProps {
    submission: Submission;
    problem: Problem;
    onStatusUpdate: () => void;
}

export function SubmissionLogViewer({ submission, problem, onStatusUpdate }: SubmissionLogViewerProps) {
    const { token } = useAuth();
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

    useEffect(() => {
        // Automatically select the last container, which is usually the active or most recent one.
        if (submission.containers.length > 0) {
            const lastContainer = submission.containers[submission.containers.length - 1];
            if(selectedContainerId !== lastContainer.id) {
                setSelectedContainerId(lastContainer.id);
            }
        }
    // Only re-run when the number of containers changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submission.containers.length]); 

    if (submission.containers.length === 0) {
        return (
            <div className="font-mono text-xs bg-muted rounded-md h-96 overflow-y-auto p-4 text-muted-foreground flex items-center justify-center">
                Submission is in queue. No logs to display yet.
            </div>
        );
    }
    
    const getWsUrl = (containerId: string | null) => {
        if (!token || !containerId || typeof window === 'undefined') return null;
        
        const containerIndex = submission.containers.findIndex(c => c.id === containerId);
        if (containerIndex === -1 || !problem.workflow[containerIndex]?.show) {
            return null;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${wsProtocol}//${host}/api/v1/ws/submissions/${submission.id}/containers/${containerId}/logs?token=${token}`;
    };

    return (
        <Tabs value={selectedContainerId ?? ""} onValueChange={setSelectedContainerId} className="w-full">
            <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${submission.containers.length}, minmax(0, 1fr))`}}>
                {submission.containers.map((container, index) => (
                    <TabsTrigger key={container.id} value={container.id} disabled={!problem.workflow[index]?.show}>
                        Step {index + 1}: {problem.workflow[index]?.name || 'Unnamed Step'}
                    </TabsTrigger>
                ))}
            </TabsList>
            {submission.containers.map((container, index) => {
                const isRunning = container.status === 'Running';
                const canShow = problem.workflow[index]?.show;

                return (
                    <TabsContent key={container.id} value={container.id} className="mt-4">
                        {!canShow ? (
                            <div className="font-mono text-xs bg-muted rounded-md h-96 overflow-y-auto p-4 text-muted-foreground flex items-center justify-center">
                                Log for this step is hidden by the problem author.
                            </div>
                        ) : isRunning ? (
                            <RealtimeLogViewer wsUrl={getWsUrl(container.id)} onStatusUpdate={onStatusUpdate} />
                        ) : (
                            <StaticLogViewer submissionId={submission.id} containerId={container.id} />
                        )}
                    </TabsContent>
                )
            })}
        </Tabs>
    );
}