import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
    content: string;
}

// This component uses prose classes from Tailwind Typography for styling
// To use it, you need to install `@tailwindcss/typography`
// and add `require('@tailwindcss/typography')` to your tailwind.config.js plugins.
export default function MarkdownViewer({ content }: MarkdownViewerProps) {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}