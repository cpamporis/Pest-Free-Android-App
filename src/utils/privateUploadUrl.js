const SAFE_NAME =
  /^[a-z0-9][a-z0-9._-]{0,150}\.(jpg|jpeg|png|webp|gif|heic|heif)$/i;

// Return a canonical API URL. A stored off-origin upload must not cause a
// image request to forward its Authorization header elsewhere.
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

// Accept stored filenames as well as legacy upload URLs; keep the same
// origin and image-name validation used by ProtectedImage.
function uploadedFileUrl(filename, apiBaseUrl) {
  if (typeof filename !== "string" || !filename.trim()) return null;
  const value = filename.trim();
  if (/^https?:\/\//i.test(value)) return privateUploadUrl(value, apiBaseUrl);
  const name = value.replace(/^\/?uploads\//i, "");
  if (!SAFE_NAME.test(name)) return null;
  try {
    return privateUploadUrl(`${new URL(apiBaseUrl).origin}/uploads/${name}`, apiBaseUrl);
  } catch {
    return null;
  }
}

module.exports = { privateUploadUrl, isUploadReference, uploadedFileUrl };
