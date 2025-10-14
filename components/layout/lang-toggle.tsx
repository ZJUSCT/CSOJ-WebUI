// FILE: components/layout/language-switcher.tsx
"use client";

import { useClientLocale } from '@/providers/i18n-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

const LOCALE_MAP: Record<string, string> = {
    'en': 'English',
    'zh': '中文',
};

export function LanguageToggle() {
    // 使用导出的 Hook
    const { locale, switchLocale } = useClientLocale();

    const currentLabel = locale ? LOCALE_MAP[locale] : 'Lang';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Change Language">
                    <Languages className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Change Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-24" align="end">
                {Object.entries(LOCALE_MAP).map(([code, name]) => (
                    <DropdownMenuItem 
                        key={code} 
                        onClick={() => switchLocale(code)}
                        className={locale === code ? "font-bold text-primary" : ""}
                    >
                        {name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}