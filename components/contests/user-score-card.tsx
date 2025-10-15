"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { Contest, LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Star, ChevronDown } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getScoreColor } from "@/lib/utils";

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

export default function UserScoreCard({ contestId }: { contestId: string }) {
  const t = useTranslations("contests.userScoreCard");
  const { user } = useAuth();

  const { data: contest, isLoading: isContestLoading } = useSWR<Contest>(
    `/contests/${contestId}`,
    fetcher
  );
  const {
    data: leaderboard,
    isLoading: isLeaderboardLoading,
  } = useSWR<LeaderboardEntry[]>(
    `/contests/${contestId}/leaderboard`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const isLoading = isContestLoading || isLeaderboardLoading || !user;
  const [open, setOpen] = React.useState(false);

  // Correctly calculate user rank by respecting disable_rank
  const { userRank, userEntry } = useMemo(() => {
    if (!leaderboard || !user) {
      return { userRank: 0, userEntry: null };
    }

    let visibleRank = 0;
    for (const entry of leaderboard) {
      if (!entry.disable_rank) {
        visibleRank++;
      }
      if (entry.user_id === user.id) {
        // If the user's own ranking is disabled, they are not ranked.
        const rank = entry.disable_rank ? 0 : visibleRank;
        return { userRank: rank, userEntry: entry };
      }
    }
    
    return { userRank: 0, userEntry: null };
  }, [leaderboard, user]);


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star /> {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!contest) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star />
          {t("title")}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {userEntry && userRank > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground font-bold mb-1">{t("rank")}</span>
                <span className="text-2xl font-bold flex items-center gap-3">
                  <Trophy className="text-yellow-500" /> #{userRank}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground font-bold mb-1">{t("totalScore")}</span>
                <span className="text-2xl font-bold">{userEntry.total_score}</span>
              </div>
            </div>

            <button
              onClick={() => setOpen(!open)}
              className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              {t("scoreBreakdown")}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("problem")}</TableHead>
                          <TableHead className="text-right">{t("score")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contest.problem_ids.map((problemId, index) => (
                          <TableRow key={problemId} className="border-t">
                            <TableCell>
                              <Link
                                href={`/problems?id=${problemId}`}
                                className="hover:underline"
                                title={problemId}
                              >
                                P{index + 1}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-mono"
                              style={{
                                color: getScoreColor(userEntry.problem_scores[problemId])
                              }}
                            >
                              {userEntry.problem_scores[problemId] ?? "–"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("notRanked")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
