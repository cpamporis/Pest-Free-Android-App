function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isIdentifier(value) {
  return (
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isJwt(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  );
}

function isValidAuthenticatedPrincipal(result) {
  if (!result?.success || !isJwt(result.token)) {
    return false;
  }

  if (result.role === "admin") {
    return isRecord(result.session);
  }

  if (result.role === "tech") {
    return (
      isRecord(result.technician) &&
      isIdentifier(result.technician.id)
    );
  }

  if (result.role === "customer") {
    return (
      isRecord(result.customer) &&
      isIdentifier(result.customer.customerId)
    );
  }

  return false;
}

module.exports = {
  isValidAuthenticatedPrincipal
};
