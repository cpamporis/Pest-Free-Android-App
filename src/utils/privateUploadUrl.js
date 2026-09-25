const SAFE_NAME =
  /^[a-z0-9][a-z0-9._-]{0,150}\.(jpg|jpeg|png|webp|gif|heic|heif)$/i;

// Return a canonical Lab URL. A stored off-origin upload must not cause a
// native image request to forward its Authorization header elsewhere.
function privateUploadUrl(uri, apiBaseUrl) {
  if (typeof uri !== "string") return null;
  try {
    const url = new URL(uri);
    const api = new URL(apiBaseUrl);
    if (
      url.protocol !== "https:" ||
      url.origin !== api.origin ||
      url.username ||
      url.password
    ) return null;

    const parts = url.pathname.match(/^\/uploads\/([^/]+)$/);
    if (!parts || !SAFE_NAME.test(parts[1])) return null;
    return `${url.origin}/uploads/${parts[1]}`;
  } catch {
    return null;
  }
}

function isUploadReference(uri) {
  return typeof uri === "string" && /\/uploads\//i.test(uri);
}

module.exports = { privateUploadUrl, isUploadReference };
