export const suggestedContentTags = [
  "女性成长",
  "两性关系",
  "星座",
  "MBTI",
  "职场成长",
  "情绪管理",
  "自我提升",
  "生活方式",
] as const;

export function collectContentTagHistory(values: string[]) {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const tag = value.trim().replace(/^#+/, "").slice(0, 24);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function normalizeContentTags(values: string[]) {
  return collectContentTagHistory(values).slice(0, 12);
}
