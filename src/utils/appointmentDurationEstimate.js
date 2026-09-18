const MINIMUM_DURATION_SAMPLES = 3;
const MAX_DURATION_SECONDS = 7 * 24 * 60 * 60;

function normalizeServiceType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (["certificate", "certification", "st"].includes(normalized)) {
    return "certificate";
  }

  return normalized;
}

function getCompletedVisitDurationSeconds(visit) {
  if (!visit || typeof visit !== "object") {
    return null;
  }

  const status = String(visit.status || "")
    .trim()
    .toLowerCase();

  if (status && status !== "completed") {
    return null;
  }

  const numericDuration = Number(
    visit.duration ??
    visit.durationSeconds ??
    visit.duration_seconds
  );

  if (!Number.isFinite(numericDuration)) {
    return null;
  }

  const seconds = Math.floor(numericDuration);

  return seconds > 0 && seconds <= MAX_DURATION_SECONDS
    ? seconds
    : null;
}

function buildAppointmentDurationEstimates(
  visits,
  minimumSamples = MINIMUM_DURATION_SAMPLES
) {
  const requiredSamples =
    Number.isSafeInteger(minimumSamples) && minimumSamples > 0
      ? minimumSamples
      : MINIMUM_DURATION_SAMPLES;
  const groupedDurations = new Map();
  const seenVisits = new Set();

  for (const visit of Array.isArray(visits) ? visits : []) {
    const serviceType = normalizeServiceType(
      visit?.serviceType ??
      visit?.service_type ??
      visit?.serviceCategory ??
      visit?.service_category
    );
    const durationSeconds = getCompletedVisitDurationSeconds(visit);

    if (!serviceType || durationSeconds === null) {
      continue;
    }

    const visitId =
      visit.visitId ??
      visit.visit_id ??
      visit.logId ??
      visit.log_id ??
      visit.id;

    if (visitId !== null && visitId !== undefined && visitId !== "") {
      const visitKey = `${serviceType}:${String(visitId)}`;

      if (seenVisits.has(visitKey)) {
        continue;
      }

      seenVisits.add(visitKey);
    }

    const current = groupedDurations.get(serviceType) || {
      totalSeconds: 0,
      sampleSize: 0
    };

    current.totalSeconds += durationSeconds;
    current.sampleSize += 1;
    groupedDurations.set(serviceType, current);
  }

  const estimates = {};

  for (const [serviceType, group] of groupedDurations.entries()) {
    if (group.sampleSize < requiredSamples) {
      continue;
    }

    estimates[serviceType] = {
      estimatedDurationSeconds: Math.round(
        group.totalSeconds / group.sampleSize
      ),
      sampleSize: group.sampleSize
    };
  }

  return estimates;
}

function formatDurationHhMmSs(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  const totalSeconds = Math.floor(numericValue);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(part => String(part).padStart(2, "0"))
    .join(":");
}

module.exports = {
  MINIMUM_DURATION_SAMPLES,
  buildAppointmentDurationEstimates,
  formatDurationHhMmSs,
  normalizeServiceType
};
