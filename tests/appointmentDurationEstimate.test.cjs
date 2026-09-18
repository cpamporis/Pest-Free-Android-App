const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAppointmentDurationEstimates,
  formatDurationHhMmSs
} = require("../src/utils/appointmentDurationEstimate");

test("calculates the requested three-appointment average", () => {
  const estimates = buildAppointmentDurationEstimates([
    { visitId: "v1", serviceType: "myocide", duration: 4200 },
    { visitId: "v2", serviceType: "myocide", duration: 4800 },
    { visitId: "v3", serviceType: "myocide", duration: 4500 }
  ]);

  assert.deepEqual(estimates.myocide, {
    estimatedDurationSeconds: 4500,
    sampleSize: 3
  });
  assert.equal(
    formatDurationHhMmSs(
      estimates.myocide.estimatedDurationSeconds
    ),
    "01:15:00"
  );
});

test("recalculates from every completed appointment, not the first three", () => {
  const durations = [3600, 4200, 4800, 5400, 6000, 6600, 7200];
  const estimates = buildAppointmentDurationEstimates(
    durations.map((duration, index) => ({
      visitId: `visit-${index + 1}`,
      serviceType: "insecticide",
      duration
    }))
  );

  assert.deepEqual(estimates.insecticide, {
    estimatedDurationSeconds: 5400,
    sampleSize: 7
  });
});

test("keeps service types separate and hides groups below three samples", () => {
  const estimates = buildAppointmentDurationEstimates([
    { visitId: "m1", service_type: "myocide", duration: 4200 },
    { visitId: "m2", service_type: "myocide", duration: 4800 },
    { visitId: "m3", service_type: "myocide", duration: 4500 },
    { visitId: "d1", serviceType: "disinfection", duration: 1800 },
    { visitId: "d2", serviceType: "disinfection", duration: 2400 }
  ]);

  assert.equal(estimates.myocide.estimatedDurationSeconds, 4500);
  assert.equal(estimates.disinfection, undefined);
});

test("ignores duplicates, unfinished visits and invalid durations", () => {
  const estimates = buildAppointmentDurationEstimates([
    { visitId: "v1", serviceType: "special", duration: 1200 },
    { visitId: "v1", serviceType: "special", duration: 1200 },
    { visitId: "v2", serviceType: "special", duration: "1800" },
    { visitId: "v3", serviceType: "special", duration: 2400 },
    { visitId: "v4", serviceType: "special", duration: 0 },
    {
      visitId: "v5",
      serviceType: "special",
      duration: 3000,
      status: "scheduled"
    }
  ]);

  assert.deepEqual(estimates.special, {
    estimatedDurationSeconds: 1800,
    sampleSize: 3
  });
});

test("normalizes certification aliases and formats long durations", () => {
  const estimates = buildAppointmentDurationEstimates([
    { visitId: "c1", serviceType: "certificate", duration: 3600 },
    { visitId: "c2", serviceType: "certification", duration: 7200 },
    { visitId: "c3", serviceType: "st", duration: 10800 }
  ]);

  assert.deepEqual(estimates.certificate, {
    estimatedDurationSeconds: 7200,
    sampleSize: 3
  });
  assert.equal(formatDurationHhMmSs(90061), "25:01:01");
});

test("AdminTechSchedule renders the estimate from customer history", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const source = fs.readFileSync(
    path.join(root, "src/screens/Admin/AdminTechSchedule.js"),
    "utf8"
  );

  assert.match(source, /getCustomerActualVisits/);
  assert.match(source, /appointmentDurationEstimates\[serviceType\]/);
  assert.match(source, /estimatedDurationDisplay\s*&&/);

  for (const locale of ["en", "gr"]) {
    const translations = JSON.parse(
      fs.readFileSync(
        path.join(root, `src/locales/${locale}.json`),
        "utf8"
      )
    );

    assert.ok(translations.admin.schedule.estimatedDuration.label);
  }
});
