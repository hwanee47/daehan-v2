import "server-only";

export function resolveSiteUrl(value: string | undefined, environment: string | undefined) {
  if (!value) throw new Error("SITE_URL must be set for password recovery.");
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (environment === "production" && (url.protocol !== "https:" || local))
  ) {
    throw new Error("SITE_URL must be an HTTPS production origin without a path.");
  }
  return url.origin;
}

export function getSiteUrl() {
  return resolveSiteUrl(process.env.SITE_URL, process.env.NODE_ENV);
}
