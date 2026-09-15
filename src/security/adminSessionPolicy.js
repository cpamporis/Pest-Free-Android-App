const ADMIN_ROLES = new Set(["admin"]);

function timestamp(value, fieldName) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return parsed;
}

function normalizeAdminSession(role, session, now = Date.now()) {
  if (!ADMIN_ROLES.has(role)) {
    throw new Error("Invalid administrator role");
  }

  const id =
    typeof session?.id === "string"
      ? session.id.trim()
      : "";
  const refreshVersion = Number(session?.refreshVersion);
  const accessExpiresAtMs = timestamp(
    session?.accessTokenExpiresAt,
    "access token expiry"
  );
  const absoluteExpiresAtMs = timestamp(
    session?.absoluteExpiresAt,
    "absolute session expiry"
  );

  if (
    !id ||
    !Number.isSafeInteger(refreshVersion) ||
    refreshVersion < 0 ||
    accessExpiresAtMs <= now ||
    absoluteExpiresAtMs <= now ||
    accessExpiresAtMs > absoluteExpiresAtMs
  ) {
    throw new Error("Invalid administrator session");
  }

  return Object.freeze({
    id,
    role,
    refreshVersion,
    accessTokenExpiresAt: new Date(
      accessExpiresAtMs
    ).toISOString(),
    absoluteExpiresAt: new Date(
      absoluteExpiresAtMs
    ).toISOString(),
    accessExpiresAtMs,
    absoluteExpiresAtMs
  });
}

function validateRefreshedSession(
  currentSession,
  role,
  nextSession,
  now = Date.now()
) {
  if (!currentSession) {
    throw new Error("No active administrator session");
  }

  const normalized = normalizeAdminSession(
    role,
    nextSession,
    now
  );

  if (
    normalized.id !== currentSession.id ||
    normalized.absoluteExpiresAtMs !==
      currentSession.absoluteExpiresAtMs ||
    normalized.refreshVersion <=
      currentSession.refreshVersion
  ) {
    throw new Error("Invalid refreshed administrator session");
  }

  return normalized;
}

function remainingSessionSeconds(session, now = Date.now()) {
  if (!session) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((session.accessExpiresAtMs - now) / 1000)
  );
}

function canApplySessionRefresh(
  expectedActive,
  liveActive,
  now = Date.now()
) {
  return Boolean(
    expectedActive &&
    liveActive &&
    liveActive.role === expectedActive.role &&
    liveActive.session?.id === expectedActive.session?.id &&
    remainingSessionSeconds(liveActive.session, now) > 0
  );
}

module.exports = {
  normalizeAdminSession,
  validateRefreshedSession,
  remainingSessionSeconds,
  canApplySessionRefresh
};
