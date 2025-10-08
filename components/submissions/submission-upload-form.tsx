// FILE: components/submissions/submission-upload-form.tsx

"use client";
import { useState, useCallback, useRef } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { UploadCloud, File as FileIcon, X, Info, FolderUp, FileUp } from 'lucide-react';
import useSWR, { useSWRConfig } from 'swr';
import { Attempts } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

interface SubmissionUploadFormProps {
    problemId: string;
    uploadLimits: {
        max_num: number;
        max_size: number; // in MB
    };
}

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

function AttemptsCounter({ problemId, onLimitReached }: { problemId: string, onLimitReached: (isReached: boolean) => void }) {
    const { data: attempts, isLoading } = useSWR<Attempts>(`/problems/${problemId}/attempts`, fetcher, {
        onSuccess: (data) => {
            onLimitReached(data.remaining === 0);
        }
    });

    if (isLoading) return <Skeleton className="h-5 w-24" />;
    if (!attempts) return null;

    return (
        <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-4 w-4" />
            <span>
                Attempts: {attempts.used}
                {attempts.limit !== null ? ` / ${attempts.limit}` : ''}
                {attempts.remaining !== null && attempts.remaining <= 3 && attempts.remaining > 0 && (
                    <span className="font-bold text-yellow-500 ml-2">{attempts.remaining} remaining</span>
                )}
                 {attempts.remaining === 0 && (
                    <span className="font-bold text-destructive ml-2">Limit reached</span>
                )}
            </span>
        </div>
    );
}

export default function SubmissionUploadForm({ problemId, uploadLimits }: SubmissionUploadFormProps) {
    const [files, setFiles] = useState<FileWithPath[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLimitReached, setIsLimitReached] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const addFiles = useCallback((newFiles: File[]) => {
        const allFiles = [...files, ...newFiles];

        if (uploadLimits.max_num > 0 && allFiles.length > uploadLimits.max_num) {
            toast({
                variant: 'destructive',
                title: 'Too many files',
                description: `You can upload a maximum of ${uploadLimits.max_num} files.`,
            });
            return;
        }

        const totalSize = allFiles.reduce((acc, file) => acc + file.size, 0);
        if (uploadLimits.max_size > 0 && totalSize > uploadLimits.max_size * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Files too large',
                description: `Total upload size cannot exceed ${uploadLimits.max_size}MB.`,
            });
            return;
        }
        
        // Add `path` property for consistency, similar to react-dropzone's FileWithPath
        const filesWithPaths = newFiles.map(file => Object.assign(file, {
            path: (file as any).webkitRelativePath || file.name
        }));

        setFiles(prev => [...prev, ...filesWithPaths]);
    }, [files, uploadLimits, toast]);

    const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
        addFiles(acceptedFiles);
    }, [addFiles]);

    const handleManualFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            addFiles(Array.from(event.target.files));
        }
    };
    
    const { getRootProps, isDragActive } = useDropzone({ 
        onDrop, 
        noClick: true, // We use custom buttons, so disable click on the dropzone itself
        noKeyboard: true 
    });

    const removeFile = (fileToRemove: FileWithPath) => {
        setFiles(files.filter(file => file !== fileToRemove));
    };

    const handleSubmit = async () => {
        if (files.length === 0) {
            toast({ variant: 'destructive', title: 'No files selected' });
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file, file.path);
        });

        try {
            const response = await api.post(`/problems/${problemId}/submit`, formData);
            const submissionId = response.data.data.submission_id;
            toast({
                title: 'Submission successful!',
                description: `Your submission ID is ${submissionId}`,
            });
            mutate(`/problems/${problemId}/attempts`);
            router.push(`/submissions?id=${submissionId}`);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Submission failed',
                description: error.response?.data?.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <AttemptsCounter problemId={problemId} onLimitReached={setIsLimitReached} />
            <div {...getRootProps()}
                 className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md transition-colors 
                 ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
              ${isLimitReached ? 'bg-muted opacity-50' : ''}`}
            >
                <input type="file" multiple ref={fileInputRef} onChange={handleManualFileSelect} style={{ display: 'none' }} disabled={isLimitReached} />
                {/* @ts-ignore */}
                <input type="file" webkitdirectory="true" ref={folderInputRef} onChange={handleManualFileSelect} style={{ display: 'none' }} disabled={isLimitReached}/>

                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                {isLimitReached ? (
                 <p className="mt-2 text-sm text-destructive">You have reached the submission limit.</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground text-center">
                    {isDragActive ? 'Drop files or a folder here...' : 'Drag & drop files or a folder'}
                </p>
              )}
                <div className='mt-4 flex flex-col sm:flex-row gap-2 w-full'>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLimitReached} className='w-full'>
                        <FileUp className="mr-2 h-4 w-4" /> Select Files
                    </Button>
                    <Button type="button" variant="outline" onClick={() => folderInputRef.current?.click()} disabled={isLimitReached} className='w-full'>
                        <FolderUp className="mr-2 h-4 w-4" /> Select Folder
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                    Max {uploadLimits.max_num > 0 ? `${uploadLimits.max_num} files` : 'unlimited files'}, up to {uploadLimits.max_size > 0 ? `${uploadLimits.max_size}MB total` : 'unlimited size'}.
                </p>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-semibold">Selected files:</h4>
                    <ul className="space-y-1 bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
                        {files.map((file) => (
                            <li key={`${file.path}-${file.lastModified}`} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 truncate">
                                    <FileIcon className="h-4 w-4 shrink-0"/>
                                    <span className="truncate" title={file.path}>{file.path}</span> 
                                    <span className="text-muted-foreground shrink-0">({(file.size / 1024).toFixed(2)} KB)</span>
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => removeFile(file)} className="h-6 w-6 shrink-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <Button onClick={handleSubmit} disabled={isSubmitting || files.length === 0 || isLimitReached} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
        </div>
    );
}