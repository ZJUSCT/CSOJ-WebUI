"use client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { Contest } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => api.get(url).then(res => res.data.data);

export default function ContestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const contestId = params.contestId as string;
  const { toast } = useToast();

  const { data: contest } = useSWR<Contest>(`/contests/${contestId}`, fetcher);

  const handleRegister = async () => {
    try {
      await api.post(`/contests/${contestId}/register`);
      toast({
        title: "Success",
        description: "You have successfully registered for the contest.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.response?.data?.message || "An unexpected error occurred.",
      });
    }
  };

  const currentTab = pathname.includes("leaderboard") ? "leaderboard" : "problems";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{contest?.name || "Contest"}</h1>
        <Button onClick={handleRegister}>Register for Contest</Button>
      </div>
      <Tabs value={currentTab} className="w-full">
        <TabsList>
          <TabsTrigger value="problems" asChild>
            <Link href={`/contests/${contestId}`}>Problems</Link>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" asChild>
            <Link href={`/contests/${contestId}/leaderboard`}>Leaderboard</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div>{children}</div>
    </div>
  );
}