"use client";
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { UploadCloud, File, X } from 'lucide-react';

interface SubmissionUploadFormProps {
    problemId: string;
    uploadLimits: {
        max_num: number;
        max_size: number; // in MB
    };
}

export default function SubmissionUploadForm({ problemId, uploadLimits }: SubmissionUploadFormProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Validate against limits
        if (files.length + acceptedFiles.length > uploadLimits.max_num) {
            toast({
                variant: 'destructive',
                title: 'Too many files',
                description: `You can upload a maximum of ${uploadLimits.max_num} files.`,
            });
            return;
        }

        const totalSize = [...files, ...acceptedFiles].reduce((acc, file) => acc + file.size, 0);
        if (totalSize > uploadLimits.max_size * 1024 * 1024) {
             toast({
                variant: 'destructive',
                title: 'Files too large',
                description: `Total upload size cannot exceed ${uploadLimits.max_size}MB.`,
            });
            return;
        }

        setFiles(prev => [...prev, ...acceptedFiles]);
    }, [files, uploadLimits, toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

    const removeFile = (fileToRemove: File) => {
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
            formData.append('files', file);
        });

        try {
            const response = await api.post(`/problems/${problemId}/submit`, formData);
            const submissionId = response.data.data.submission_id;
            toast({
                title: 'Submission successful!',
                description: `Your submission ID is ${submissionId}`,
            });
            router.push(`/submissions/${submissionId}`);
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
            <div {...getRootProps()}
                 className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer
                 ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}
            >
                <input {...getInputProps()} />
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    {isDragActive ? 'Drop the files here...' : 'Drag & drop files here, or'}
                </p>
                <Button type="button" variant="link" onClick={() => document.getElementById('file-input-button')?.click()}>
                     click to browse
                </Button>
                <p className="text-xs text-muted-foreground">
                    Max {uploadLimits.max_num} files, up to {uploadLimits.max_size}MB total.
                </p>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-semibold">Selected files:</h4>
                    <ul className="list-disc list-inside bg-muted p-3 rounded-md">
                        {files.map((file, index) => (
                            <li key={index} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <File className="h-4 w-4"/>
                                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => removeFile(file)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <Button onClick={handleSubmit} disabled={isSubmitting || files.length === 0} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
        </div>
    );
}