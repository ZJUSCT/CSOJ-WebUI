"use client";
import { useState, useEffect, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAuth } from '@/hooks/use-auth';

interface LogMessage {
    stream: 'stdout' | 'stderr' | 'info' | 'error';
    data: string;
    timestamp: number;
}

interface SubmissionLogViewerProps {
    submissionId: string;
    onStatusUpdate: () => void;
}

export function SubmissionLogViewer({ submissionId, onStatusUpdate }: SubmissionLogViewerProps) {
    const { token } = useAuth();
    const [messages, setMessages] = useState<LogMessage[]>([]);
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/submissions/${submissionId}/logs?token=${token}`;
    const logContainerRef = useRef<HTMLDivElement>(null);

    const { readyState, lastMessage } = useWebSocket(token ? wsUrl : null, {
        shouldReconnect: (closeEvent) => true,
        reconnectInterval: 3000,
        onClose: () => {
             console.log('WebSocket closed. Attempting to refetch submission status.');
             onStatusUpdate();
        }
    });

    useEffect(() => {
        if (lastMessage !== null) {
            try {
                const parsed = JSON.parse(lastMessage.data);
                const newMessage: LogMessage = { ...parsed, timestamp: Date.now() };
                setMessages((prev) => [...prev, newMessage]);
            } catch (e) {
                console.error("Failed to parse WebSocket message:", lastMessage.data);
            }
        }
    }, [lastMessage]);

    useEffect(() => {
        // Auto-scroll to bottom
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting...',
        [ReadyState.OPEN]: 'Live',
        [ReadyState.CLOSING]: 'Closing...',
        [ReadyState.CLOSED]: 'Disconnected',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];

    return (
        <div className="relative">
             <div className="absolute top-2 right-2 text-xs font-semibold flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                    readyState === ReadyState.OPEN ? 'bg-green-500 animate-pulse' :
                    readyState === ReadyState.CONNECTING ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                {connectionStatus}
            </div>
            <div
                ref={logContainerRef}
                className="font-mono text-xs bg-muted rounded-md h-96 overflow-y-auto p-4"
            >
                {messages.length === 0 && <p className="text-muted-foreground">Waiting for judge output...</p>}
                {messages.map((msg, index) => (
                    <div key={index} className="whitespace-pre-wrap break-all">
                        {msg.stream === 'stderr' || msg.stream === 'error' ? (
                            <span className="text-red-400">{msg.data}</span>
                        ) : msg.stream === 'info' ? (
                            <span className="text-blue-400">{msg.data}</span>
                        ) : (
                            <span className="text-foreground">{msg.data}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}