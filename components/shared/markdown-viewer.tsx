import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import rehypePrettyCode from 'rehype-pretty-code';
import type { Options } from 'rehype-pretty-code';

interface MarkdownViewerProps {
    content: string;
    assetContext?: 'contest' | 'problem';
    assetContextId?: string;
}

// Custom Hook to fetch a protected asset and return a blob URL (for images on mount)
const useAuthenticatedAsset = (apiUrl: string | null) => {
    const [assetUrl, setAssetUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;

        const fetchAsset = async () => {
            if (!apiUrl) {
                setIsLoading(false);
                return;
            }

            setAssetUrl(null);
            setError(null);
            setIsLoading(true);

            try {
                const response = await api.get(apiUrl, { responseType: 'blob' });
                if (isMounted) {
                    objectUrl = URL.createObjectURL(response.data);
                    setAssetUrl(objectUrl);
                }
            } catch (err: any) {
                console.error(`Failed to fetch asset from ${apiUrl}:`, err);
                if (isMounted) {
                    setError(err.message || 'Failed to load resource.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchAsset();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [apiUrl]);

    return { assetUrl, isLoading, error };
};

// Component to display the authenticated image (Working correctly)
const AuthenticatedImage = ({ apiUrl, ...props }: { apiUrl: string; [key: string]: any }) => {
    const { assetUrl, isLoading, error } = useAuthenticatedAsset(apiUrl);

    if (isLoading) return <Skeleton className="h-32 w-full my-4" />;
    if (error || !assetUrl) return (
        <div className="my-4 flex items-center justify-center p-4 bg-muted rounded-md text-destructive">
             <AlertCircle className="mr-2 h-4 w-4" />
            <span>Failed to load image: {props.alt || apiUrl}</span>
        </div>
    );
    
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={assetUrl} {...props} alt={props.alt || ''} />;
};

const AuthenticatedLink = ({ apiUrl, children, ...props }: { apiUrl: string; children: React.ReactNode; [key: string]: any }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();

    const handleDownloadClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (isDownloading) return;

        setIsDownloading(true);
        try {
            const response = await api.get(apiUrl, { responseType: 'blob' });
            const blob = new Blob([response.data]);
            
            // Create a temporary link to trigger the download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Attempt to get a filename from Content-Disposition header, falling back to URL parsing
            const contentDisposition = response.headers['content-disposition'];
            let filename = props.href?.split('/').pop() || 'download'; // Fallback filename
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                if (filenameMatch && filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }
            link.setAttribute('download', filename);

            document.body.appendChild(link);
            link.click();
            
            // Clean up the temporary link and object URL
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download failed:', error);
            toast({
                variant: "destructive",
                title: "Download Failed",
                description: "Could not download the requested file.",
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <a href={apiUrl} onClick={handleDownloadClick} {...props}>
            {isDownloading ? (
                <span className="inline-flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {children}
                </span>
            ) : (
                children
            )}
        </a>
    );
};

const rehypePrettyCodeOptions: Partial<Options> = {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    keepBackground: false,
};

// Main Markdown Viewer component
export default function MarkdownViewer({ content, assetContext, assetContextId }: MarkdownViewerProps) {
    // This function transforms relative asset URLs into API paths
    const transformUri = (uri: string) => {
        if (assetContext && assetContextId && (uri.startsWith('./index.assets/') || uri.startsWith('index.assets/'))) {
            const assetPath = uri.replace('./', '');
            return `/assets/${assetContext}s/${assetContextId}/${assetPath}`;
        }
        return uri;
    };

    const components = {
        img: ({ node, ...props }: any) => {
            const { src, ...rest } = props;
            if (src && src.startsWith('/assets/')) {
                return <AuthenticatedImage apiUrl={src} {...rest} />;
            }
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} {...rest} alt={props.alt || ''} />;
        },
        a: ({ node, ...props }: any) => {
            const { href, children, ...rest } = props;
            
            // After urlTransform, href is the API path for assets
            if (href && href.startsWith('/assets/')) {
                // Pass the original href to help determine the filename
                return <AuthenticatedLink apiUrl={href} href={node.properties.href} {...rest}>{children}</AuthenticatedLink>;
            }

            // Let Next.js handle internal links. Use the original href.
            const originalHref = node.properties.href;
            if (originalHref && !/^(https?|mailto|tel):/.test(originalHref)) {
                return <Link href={originalHref} {...rest}>{children}</Link>;
            }

            // Handle external links
            return <a href={originalHref} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
        }
    };

    return (
        <div className={cn("prose prose-tight dark:prose-invert max-w-none", "leading-normal")}>
            <ReactMarkdown 
            	remarkPlugins={[remarkGfm]}
				rehypePlugins={[[rehypePrettyCode, rehypePrettyCodeOptions]]}
                components={components}
                urlTransform={transformUri}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}