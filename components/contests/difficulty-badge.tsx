import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTranslations, useLocale } from "next-intl";

const difficultyStyles = {
  platinum: { bg: "bg-slate-300 dark:bg-slate-300", text: "text-slate-700 dark:text-slate-200" },
  gold: { bg: "bg-yellow-400 dark:bg-yellow-300", text: "text-yellow-600 dark:text-yellow-200" },
  silver: { bg: "bg-zinc-400 dark:bg-zinc-300", text: "text-zinc-700 dark:text-zinc-200" },
  bronze: { bg: "bg-orange-800 dark:bg-orange-500", text: "text-orange-800 dark:text-orange-400" },
  hard: { bg: "bg-red-500 dark:bg-red-400", text: "text-red-600 dark:text-red-300" },
  medium: { bg: "bg-yellow-500 dark:bg-yellow-400", text: "text-yellow-600 dark:text-yellow-200" },
  easy: { bg: "bg-green-400 dark:bg-green-300", text: "text-green-600 dark:text-green-200" },
};

const difficultyBadgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 px-3 py-1 text-sm font-medium select-none",
  {
    variants: {
      level: {
        platinum: "",
        gold: "",
        silver: "",
        bronze: "",
        hard: "",
        medium: "",
        easy: "",
        "": "hidden",
      },
    },
    defaultVariants: {
      level: "",
    },
  }
);

export type Level =
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "hard"
  | "medium"
  | "easy"
  | "";

export interface DifficultyBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof difficultyBadgeVariants> {
  level: Level;
}

function DifficultyBadge({ className, level, ...props }: DifficultyBadgeProps) {
  const t = useTranslations("difficulty");
  const locale = useLocale();

  if (!level) return null;

  return (
    <Badge
      variant="flat"
      className={cn(difficultyBadgeVariants({ level }), className, "cursor-pointer")}
      {...props}
      onClick={(e) => {
        if (level === "platinum" || level === "silver" || level === "gold" || level === "bronze") {
            e.preventDefault();
            e.stopPropagation();
            if (locale === "zh") {
                window.open("https://www.intel.cn/content/www/cn/zh/support/articles/000059657/processors/intel-xeon-processors.html");
            } else {
                window.open("https://www.intel.com/content/www/us/en/support/articles/000059657/processors/intel-xeon-processors.html");
            }
        }
      }}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", difficultyStyles[level].bg)} />
      <span className={cn("capitalize font-semibold", difficultyStyles[level].text)}>
        {t(level)}
      </span>
    </Badge>
  );
}

export { DifficultyBadge, difficultyBadgeVariants };
