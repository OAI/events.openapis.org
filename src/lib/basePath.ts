export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function asset(path: string): string {
  // Pass through absolute/remote URLs and data URIs unchanged — only repo-hosted
  // paths need the GitHub Pages basePath prefix.
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
