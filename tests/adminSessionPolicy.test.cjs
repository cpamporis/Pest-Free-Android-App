const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeAdminSession,
  validateRefreshedSession,
  remainingSessionSeconds,
  canApplySessionRefresh
} = require("../src/security/adminSessionPolicy");
const {
  normalizeMfaFlow,
  initialMfaStep
} = require("../src/security/adminMfaUiPolicy");

const NOW = Date.parse("2026-09-15T12:00:00.000Z");

function session(overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    accessTokenExpiresAt: "2026-09-15T12:15:00.000Z",
    absoluteExpiresAt: "2026-09-15T20:00:00.000Z",
    refreshVersion: 0,
    ...overrides
  };
}

test("normalizes a valid regular-admin session", () => {
  const result = normalizeAdminSession("admin", session(), NOW);

  assert.equal(result.role, "admin");
  assert.equal(result.refreshVersion, 0);
  assert.equal(result.accessExpiresAtMs, NOW + 15 * 60 * 1000);
});
test("rejects non-admin roles and invalid windows", () => {
  for (const role of ["tech", "customer", "super_admin"]) {
    assert.throws(() => normalizeAdminSession(role, session(), NOW));
  }

  assert.throws(() =>
    normalizeAdminSession(
      "admin",
      session({ accessTokenExpiresAt: "2026-09-15T11:59:59Z" }),
      NOW
    )
  );
  assert.throws(() =>
    normalizeAdminSession(
      "admin",
      session({ absoluteExpiresAt: "2026-09-15T12:10:00Z" }),
      NOW
    )
  );
});

test("accepts only rotation of the same immutable session", () => {
  const current = normalizeAdminSession("admin", session(), NOW);
  const refreshed = validateRefreshedSession(
    current,
    "admin",
    session({
      accessTokenExpiresAt: "2026-09-15T12:16:00.000Z",
      refreshVersion: 1
    }),
    NOW + 60 * 1000
  );

  assert.equal(refreshed.id, current.id);
  assert.equal(refreshed.refreshVersion, 1);

  assert.throws(() =>
    validateRefreshedSession(
      current,
      "admin",
      session({ refreshVersion: 0 }),
      NOW
    )
  );
  assert.throws(() =>
    validateRefreshedSession(
      current,
      "admin",
      session({ id: "another-session", refreshVersion: 1 }),
      NOW
    )
  );
  assert.throws(() =>
    validateRefreshedSession(
      current,
      "admin",
      session({
        absoluteExpiresAt: "2026-09-15T20:00:01.000Z",
        refreshVersion: 1
      }),
      NOW
    )
  );
});

test("countdown follows the server deadline and never goes negative", () => {
  const normalized = normalizeAdminSession("admin", session(), NOW);

  assert.equal(remainingSessionSeconds(normalized, NOW), 900);
  assert.equal(remainingSessionSeconds(normalized, NOW + 899500), 1);
  assert.equal(remainingSessionSeconds(normalized, NOW + 901000), 0);
});

test("regular-admin MFA challenges route to the expected screen", () => {
  const token = "A".repeat(43);
  const offer = normalizeMfaFlow(
    {
      success: true,
      role: "admin",
      mfaAction: "enrollment_offer",
      challengeToken: token,
      canSkipMfa: true
    },
    "ADMIN@example.com"
  );
  const verify = normalizeMfaFlow({
    success: true,
    role: "admin",
    mfaAction: "login_challenge",
    challengeToken: token
  });

  assert.equal(initialMfaStep(offer), "offer");
  assert.equal(offer.canSkipMfa, true);
  assert.equal(offer.deviceAccount, "admin@example.com");
  assert.equal(initialMfaStep(verify), "verify");
  assert.equal(verify.canSkipMfa, false);
});

test("MFA rejects SuperAdmin and malformed mixed responses", () => {
  assert.throws(() =>
    normalizeMfaFlow({
      success: true,
      role: "super_admin",
      mfaAction: "enrollment_challenge",
      challengeToken: "B".repeat(43)
    })
  );
  assert.throws(() =>
    normalizeMfaFlow({
      success: true,
      role: "admin",
      mfaAction: "login_challenge",
      challengeToken: "B".repeat(43),
      token: "header.payload.signature"
    })
  );
});

test("a late refresh cannot resurrect a logged-out or expired session", () => {
  const normalized = normalizeAdminSession("admin", session(), NOW);
  const expected = { role: "admin", session: normalized };

  assert.equal(canApplySessionRefresh(expected, expected, NOW), true);
  assert.equal(canApplySessionRefresh(expected, null, NOW), false);
  assert.equal(
    canApplySessionRefresh(expected, expected, NOW + 901000),
    false
  );
  assert.equal(
    canApplySessionRefresh(
      expected,
      {
        role: "admin",
        session: { ...normalized, id: "another-session" }
      },
      NOW
    ),
    false
  );
});
