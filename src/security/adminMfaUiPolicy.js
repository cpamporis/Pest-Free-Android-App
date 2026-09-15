const ADMIN_ROLES = new Set(["admin"]);
const MFA_ACTIONS = new Set([
  "enrollment_offer",
  "enrollment_challenge",
  "login_challenge"
]);

function normalizeMfaFlow(result, deviceAccount = null) {
  const role = result?.role;
  const action = result?.mfaAction;
  const challengeToken =
    typeof result?.challengeToken === "string"
      ? result.challengeToken
      : "";

  if (
    !ADMIN_ROLES.has(role) ||
    !MFA_ACTIONS.has(action) ||
    !/^[A-Za-z0-9_-]{40,128}$/.test(challengeToken) ||
    typeof result?.token === "string"
  ) {
    throw new Error("Invalid administrator MFA flow");
  }

  const canSkipMfa =
    role === "admin" &&
    action === "enrollment_offer" &&
    result.canSkipMfa === true;

  return Object.freeze({
    ...result,
    role,
    mfaAction: action,
    challengeToken,
    canSkipMfa,
    deviceAccount:
      typeof deviceAccount === "string"
        ? deviceAccount.trim().toLowerCase()
        : null
  });
}

function initialMfaStep(flow) {
  return flow?.mfaAction === "login_challenge"
    ? "verify"
    : "offer";
}

module.exports = {
  normalizeMfaFlow,
  initialMfaStep
};
