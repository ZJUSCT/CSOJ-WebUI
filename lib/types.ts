// FILE: lib/types.ts

export type Status = "Queued" | "Running" | "Success" | "Failed";

export interface User {
  id: string;
  username: string;
  nickname: string;
  signature: string;
  avatar_url: string;
}

export interface Contest {
  id: string;
  name: string;
  starttime: string;
  endtime: string;
  problem_ids: string[];
  description: string;
}

export interface WorkflowStep {
  name: string;
  show: boolean;
}

export interface Problem {
    id: string;
    name: string;
    starttime: string;
    endtime: string;
    cluster: string;
    cpu: number;
    memory: number;
    upload: {
        max_num: number;
        max_size: number;
    };
    workflow: WorkflowStep[];
    description: string;
}

export interface Container {
  id: string;
  submission_id: string;
  image: string;
  status: Status;
  exit_code: number;
  started_at: string;
  finished_at: string;
  log_file_path: string;
}

export interface Submission {
  id: string;
  CreatedAt: string;
  UpdatedAt: string;
  problem_id: string;
  user_id: string;
  user: User;
  status: Status;
  current_step: number;
  cluster: string;
  node: string;
  score: number;
  info: { [key: string]: any };
  is_valid: boolean;
  containers: Container[];
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  nickname: string;
  avatar_url: string;
  total_score: number;
  problem_scores: Record<string, number>;
}

export interface ScoreHistoryPoint {
  time: string;
  score: number;
  problem_id: string;
}

export interface TrendEntry {
  user_id: string;
  username: string;
  nickname: string;
  history: ScoreHistoryPoint[];
}

export interface Attempts {
    limit: number | null;
    used: number;
    remaining: number | null;
}

export interface LinkItem {
    name: string;
    url: string;
}