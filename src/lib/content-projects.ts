import type {
  ContentProject,
  ContentStage,
  Inspiration,
  MetricSnapshot,
  Publication,
  Script,
  ScriptVersion,
  Topic,
} from "@/lib/types";

export const contentStages: Array<{ value: ContentStage; label: string }> = [
  { value: "idea", label: "新灵感" },
  { value: "rough_draft", label: "添加粗稿" },
  { value: "ai_optimized", label: "AI 文案优化" },
  { value: "ready", label: "待发布" },
  { value: "published", label: "已发布" },
];

export function advanceProjectToDraft(
  project: ContentProject,
  topic: Topic,
  inspirationContent = project.inspiration?.content,
): ContentProject {
  return {
    ...project,
    stage: "rough_draft",
    stageIndex: 1,
    progress: 40,
    updatedAt: topic.updated_at ?? topic.created_at,
    inspiration: project.inspiration
      ? {
          ...project.inspiration,
          content: inspirationContent ?? project.inspiration.content,
          status: "converted",
          updated_at: topic.updated_at ?? topic.created_at,
        }
      : null,
    topic,
  };
}

function newest<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0] ?? null;
}

function stageFor(
  script: Script | null,
  versions: ScriptVersion[],
  publication: Publication | null,
): { stage: ContentStage; stageIndex: number } {
  if (publication || script?.status === "published") return { stage: "published", stageIndex: 4 };
  if (script?.status === "ready") return { stage: "ready", stageIndex: 3 };
  if (versions.some((version) => ["manual_edit", "ai_optimized"].includes(version.version_type))) {
    return { stage: "ai_optimized", stageIndex: 2 };
  }
  if (script || versions.length) return { stage: "rough_draft", stageIndex: 1 };
  return { stage: "idea", stageIndex: 0 };
}

function projectId(
  inspiration: Inspiration | null,
  topic: Topic | null,
  script: Script | null,
  publication: Publication | null,
) {
  if (inspiration) return `inspiration-${inspiration.id}`;
  if (topic) return `topic-${topic.id}`;
  if (script) return `script-${script.id}`;
  return `publication-${publication!.id}`;
}

function buildProject(
  inspiration: Inspiration | null,
  topic: Topic | null,
  script: Script | null,
  publication: Publication | null,
  allVersions: ScriptVersion[],
  allSnapshots: MetricSnapshot[],
): ContentProject {
  const versions = script
    ? allVersions
        .filter((version) => version.script_id === script.id)
        .sort((a, b) => b.version_number - a.version_number)
    : [];
  const snapshots = publication
    ? allSnapshots
        .filter((snapshot) => snapshot.publication_id === publication.id)
        .sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at))
    : [];
  const { stage, stageIndex } = stageFor(script, versions, publication);
  const dates = [
    inspiration?.created_at,
    inspiration?.updated_at,
    topic?.created_at,
    topic?.updated_at,
    script?.autosaved_at,
    script?.created_at,
    versions[0]?.created_at,
    publication?.published_at,
    publication?.created_at,
    snapshots[0]?.recorded_at,
  ].filter((value): value is string => Boolean(value));

  return {
    id: projectId(inspiration, topic, script, publication),
    title: publication?.title ?? script?.title ?? topic?.title ?? inspiration?.title ?? "未命名内容",
    stage,
    stageIndex,
    progress: (stageIndex + 1) * 20,
    updatedAt: dates.sort((a, b) => +new Date(b) - +new Date(a))[0] ?? new Date(0).toISOString(),
    inspiration,
    topic,
    script,
    versions,
    publication,
    snapshots,
  };
}

export function buildContentProjects({
  inspirations,
  topics,
  scripts,
  versions,
  publications,
  snapshots = [],
}: {
  inspirations: Inspiration[];
  topics: Topic[];
  scripts: Script[];
  versions: ScriptVersion[];
  publications: Publication[];
  snapshots?: MetricSnapshot[];
}) {
  const projects: ContentProject[] = [];
  const usedTopics = new Set<string>();
  const usedScripts = new Set<string>();
  const usedPublications = new Set<string>();

  for (const inspiration of inspirations.filter((item) => item.status !== "archived")) {
    const topic = newest(topics.filter((item) => item.inspiration_id === inspiration.id && item.status !== "archived"));
    if (topic) usedTopics.add(topic.id);
    const script = topic
      ? newest(scripts.filter((item) => item.topic_id === topic.id && item.status !== "archived"))
      : null;
    if (script) usedScripts.add(script.id);
    const publication = script
      ? newest(publications.filter((item) => item.script_id === script.id))
      : null;
    if (publication) usedPublications.add(publication.id);
    projects.push(buildProject(inspiration, topic, script, publication, versions, snapshots));
  }

  for (const topic of topics.filter((item) => item.status !== "archived" && !usedTopics.has(item.id))) {
    const script = newest(scripts.filter((item) => item.topic_id === topic.id && item.status !== "archived"));
    if (script) usedScripts.add(script.id);
    const publication = script ? newest(publications.filter((item) => item.script_id === script.id)) : null;
    if (publication) usedPublications.add(publication.id);
    projects.push(buildProject(null, topic, script, publication, versions, snapshots));
  }

  for (const script of scripts.filter((item) => item.status !== "archived" && !usedScripts.has(item.id))) {
    const publication = newest(publications.filter((item) => item.script_id === script.id));
    if (publication) usedPublications.add(publication.id);
    projects.push(buildProject(null, null, script, publication, versions, snapshots));
  }

  for (const publication of publications.filter((item) => !usedPublications.has(item.id))) {
    projects.push(buildProject(null, null, null, publication, versions, snapshots));
  }

  return projects.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}
