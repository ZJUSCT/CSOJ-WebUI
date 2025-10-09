import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';

interface MarkdownViewerProps {
    content: string;
    assetContext?: 'contest' | 'problem';
    assetContextId?: string;
}

// Custom Hook to fetch a protected asset and return a blob URL
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

// Component to display the authenticated image
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

// Component to create a downloadable link for an authenticated asset
const AuthenticatedLink = ({ apiUrl, children, ...props }: { apiUrl: string; children: React.ReactNode; [key: string]: any }) => {
    const { assetUrl, isLoading, error } = useAuthenticatedAsset(apiUrl);

    // Try to get a filename from the original href
    const filename = props.href?.split('/').pop();

    if (isLoading) return <span className={cn('inline-flex items-center', props.className)}><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {children}</span>;
    if (error || !assetUrl) return <span className={cn('text-destructive', props.className)}>{children} [Failed to load]</span>;

    return <a href={assetUrl} download={filename || true} {...props}>{children}</a>;
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
            // After urlTransform, props.src is the API path.
            // We destructure it out to prevent it from being passed down and overriding the blob src.
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
                return <AuthenticatedLink apiUrl={href} href={node.properties.href} {...rest}>{children}</AuthenticatedLink>;
            }

            // Let Next.js handle internal links. Use the original href to avoid issues.
            const originalHref = node.properties.href;
            if (originalHref && !/^(https?|mailto|tel):/.test(originalHref)) {
                return <Link href={originalHref} {...rest}>{children}</Link>;
            }

            // Handle external links
            return <a href={originalHref} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
        }
    };

    return (
        <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={components}
                urlTransform={transformUri}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}