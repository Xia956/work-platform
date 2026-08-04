export const PUBLICATION_URL_INPUT_MAX_LENGTH = 8192;

const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s<>"']+/i;
const TRAILING_SHARE_PUNCTUATION = /[),.;!?，。！？；：）】》]+$/u;

export function normalizePublicationUrlInput(value: string) {
  const trimmed = value.trim();
  const urlInText = trimmed.match(URL_IN_TEXT_PATTERN)?.[0];
  return (urlInText ?? trimmed).replace(TRAILING_SHARE_PUNCTUATION, "");
}

export function getPublicationUrlError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > PUBLICATION_URL_INPUT_MAX_LENGTH) {
    return "内容过长，请确认粘贴的是链接或分享文案。";
  }

  const normalized = normalizePublicationUrlInput(trimmed);
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:") return "仅支持 HTTPS URL。";
    return "";
  } catch {
    return "请输入完整 URL，或包含 URL 的整段分享文案。";
  }
}
