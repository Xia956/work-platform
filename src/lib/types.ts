export type InspirationStatus = "inbox" | "developing" | "converted" | "archived";
export type TopicStatus = "backlog" | "ready" | "drafting" | "completed" | "published" | "archived";
export type VersionType = "rough_draft" | "manual_edit" | "ai_generated" | "ai_optimized" | "restored";

export interface Inspiration {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: InspirationStatus;
  is_demo?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Topic {
  id: string;
  title: string;
  angle: string | null;
  audience: string | null;
  pain_point: string | null;
  keywords: string[];
  priority: number;
  status: TopicStatus;
  inspiration_id: string | null;
  is_demo?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Script {
  id: string;
  title: string;
  topic_id: string | null;
  status: string;
  target_duration: number;
  current_version_id: string | null;
  autosave_content: string;
  autosaved_at: string | null;
  is_demo?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ScriptVersion {
  id: string;
  script_id: string;
  parent_version_id: string | null;
  version_number: number;
  version_type: VersionType;
  content: string;
  optimization_type: string | null;
  optimization_prompt: string | null;
  change_summary: string | null;
  estimated_duration: number | null;
  is_demo?: boolean;
  created_at: string;
}

export interface BenchmarkSource {
  id: string;
  original_url: string;
  normalized_url: string | null;
  source_type: "account" | "video" | "unknown";
  parse_status: "pending" | "parsing" | "parsed" | "needs_input" | "failed";
  error_message: string | null;
  parsed_metadata: Record<string, unknown>;
  parsed_at: string | null;
  created_at: string;
}

export interface BenchmarkAccount {
  id: string;
  source_id: string;
  nickname: string | null;
  douyin_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_url: string | null;
  follower_count: number | null;
}

export interface Publication {
  id: string;
  title: string;
  script_id: string | null;
  script_version_id: string | null;
  video_url: string | null;
  published_at: string;
  notes: string | null;
  created_at: string;
}

export interface MetricSnapshot {
  id: string;
  publication_id: string;
  recorded_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
  followers_gained: number;
  completion_rate: number | null;
  avg_watch_time: number | null;
}

export type ContentStage =
  | "idea"
  | "rough_draft"
  | "ai_optimized"
  | "ready"
  | "published";

export interface ContentProject {
  id: string;
  title: string;
  stage: ContentStage;
  stageIndex: number;
  progress: number;
  updatedAt: string;
  inspiration: Inspiration | null;
  topic: Topic | null;
  script: Script | null;
  versions: ScriptVersion[];
  publication: Publication | null;
  snapshots: MetricSnapshot[];
}
