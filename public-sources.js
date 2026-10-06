export function isPrivateChatSource(value) {
  return typeof value === 'string' && /https?:\/\/(?:[^/]+\.)?(?:chatgpt\.com|chat\.openai\.com)(?:\/|$)/i.test(value);
}

export function publicSourceData(value) {
  if (typeof value === 'string') return isPrivateChatSource(value) ? null : value;
  if (Array.isArray(value)) return value.map(publicSourceData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, publicSourceData(item)]));
  return value;
}
