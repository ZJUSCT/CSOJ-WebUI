"use client";
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { UploadCloud, File as FileIcon, X, Info, FolderUp, FileUp } from 'lucide-react';
import useSWR, { useSWRConfig } from 'swr';
import { Attempts } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import Editor from "@monaco-editor/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SubmissionUploadFormProps {
    problemId: string;
    uploadLimits: {
        max_num: number;
        max_size: number; // in MB
        editor?: boolean;
        editor_files?: string[];
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

const getLanguageForFile = (filename: string = '') => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'cpp':
        case 'cxx':
        case 'h':
        case 'hpp':
            return 'cpp';
        case 'c':
            return 'c';
        case 'py':
            return 'python';
        case 'java':
            return 'java';
        case 'js':
            return 'javascript';
        case 'ts':
            return 'typescript';
        case 'json':
            return 'json';
        case 'xml':
            return 'xml';
        case 'html':
            return 'html';
        case 'css':
            return 'css';
        case 'md':
            return 'markdown';
        default:
            return 'plaintext';
    }
};

export default function SubmissionUploadForm({ problemId, uploadLimits }: SubmissionUploadFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLimitReached, setIsLimitReached] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { mutate } = useSWRConfig();
    
    // State for file upload mode
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    
    // State for editor mode
    const initialContents = Object.fromEntries((uploadLimits.editor_files || []).map(file => [file, '']));
    const [fileContents, setFileContents] = useState<Record<string, string>>(initialContents);
    const [activeFile, setActiveFile] = useState<string>((uploadLimits.editor_files || [])[0] || '');
    const [monacoTheme, setMonacoTheme] = useState('light');

    useEffect(() => {
        // Detect theme for Monaco editor on component mount
        if (typeof window !== "undefined" && window.document.documentElement.classList.contains('dark')) {
            setMonacoTheme('vs-dark');
        }
    }, []);

    const handleSubmit = async () => {
        let filesToSubmit: File[];
        
        if (uploadLimits.editor) {
            filesToSubmit = Object.entries(fileContents)
                .map(([name, content]) => new File([content], name, { type: 'text/plain' }));
        } else {
            filesToSubmit = files;
        }

        if (filesToSubmit.length === 0) {
            toast({ variant: 'destructive', title: 'No files selected or content is empty' });
            return;
        }

        const totalSize = filesToSubmit.reduce((acc, file) => acc + file.size, 0);
        if (uploadLimits.max_size > 0 && totalSize > uploadLimits.max_size * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Files too large',
                description: `Total upload size cannot exceed ${uploadLimits.max_size}MB.`,
            });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        filesToSubmit.forEach(file => {
            const filePath = uploadLimits.editor ? file.name : (file as FileWithPath).path || (file as any).webkitRelativePath || file.name;
            formData.append('files', file, filePath);
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
    
    // --- File Upload Logic ---
    const addFiles = useCallback((newFiles: File[]) => {
        const allFiles = [...files, ...newFiles];
        if (uploadLimits.max_num > 0 && allFiles.length > uploadLimits.max_num) {
            toast({ variant: 'destructive', title: 'Too many files', description: `You can upload a maximum of ${uploadLimits.max_num} files.` });
            return;
        }
        setFiles(prev => [...prev, ...newFiles]);
    }, [files, uploadLimits.max_num, toast]);

    const onDrop = useCallback((acceptedFiles: FileWithPath[]) => { addFiles(acceptedFiles); }, [addFiles]);

    const handleManualFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) { addFiles(Array.from(event.target.files)); }
        event.target.value = '';
    };

    const { getRootProps, isDragActive } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

    const removeFile = (fileToRemove: File) => { setFiles(files.filter(file => file !== fileToRemove)); };


    // --- Render Logic ---
    if (uploadLimits.editor) {
        return (
            <div className="space-y-4">
                <AttemptsCounter problemId={problemId} onLimitReached={setIsLimitReached} />
                <Tabs value={activeFile} onValueChange={setActiveFile} className="w-full">
                    <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${uploadLimits.editor_files?.length || 1}, minmax(0, 1fr))`}}>
                        {(uploadLimits.editor_files || []).map(filename => (
                            <TabsTrigger key={filename} value={filename}>{filename}</TabsTrigger>
                        ))}
                    </TabsList>
                        <div className="mt-4 rounded-md border overflow-hidden">
                           <Editor
                                height="40vh"
                                path={activeFile}
                                language={getLanguageForFile(activeFile)}
                                value={fileContents[activeFile]}
                                onChange={(value) => setFileContents(prev => ({ ...prev, [activeFile]: value || '' }))}
                                theme={monacoTheme}
                                options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                            />
                        </div>
                </Tabs>
                <Button onClick={handleSubmit} disabled={isSubmitting || isLimitReached} className="w-full">
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
            </div>
        );
    }
    
    // Default to file upload form
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
                        {files.map((file) => {
                            const displayPath = (file as FileWithPath).path || (file as any).webkitRelativePath || file.name;
                            return (
                                <li key={`${displayPath}-${file.lastModified}`} className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 truncate">
                                        <FileIcon className="h-4 w-4 shrink-0"/>
                                        <span className="truncate" title={displayPath}>{displayPath}</span> 
                                        <span className="text-muted-foreground shrink-0">({(file.size / 1024).toFixed(2)} KB)</span>
                                    </span>
                                    <Button variant="ghost" size="icon" onClick={() => removeFile(file)} className="h-6 w-6 shrink-0">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            
            <Button onClick={handleSubmit} disabled={isSubmitting || files.length === 0 || isLimitReached} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
        </div>
    );
}