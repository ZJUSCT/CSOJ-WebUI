import { Badge } from "@/components/ui/badge";
import { Status } from "@/lib/types";

interface SubmissionStatusBadgeProps {
  status: Status;
}

export default function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const statusStyles: Record<Status, string> = {
    Queued: "bg-blue-500 hover:bg-blue-600",
    Running: "bg-yellow-500 hover:bg-yellow-600 animate-pulse",
    Success: "bg-green-500 hover:bg-green-600",
    Failed: "bg-red-500 hover:bg-red-600",
  };

  return <Badge className={statusStyles[status]}>{status}</Badge>;
}