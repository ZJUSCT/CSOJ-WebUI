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
    workflow: any[]; // Define more strictly if needed
    description: string;
}

export interface Container {
  id: string;
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
  total_score: number;
}