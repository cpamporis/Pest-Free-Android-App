const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("administrator technician cards expose the opt-in price toggle", () => {
  const source = read("src/screens/Admin/TechniciansScreen.js");

  assert.match(source, /canViewAppointmentPrices/);
  assert.match(source, /confirmPriceVisibilityChange/);
  assert.match(source, /apiService\.updateTechnician/);
  assert.match(source, /window\.confirm/);
});

test("technician appointment cards render only backend-provided gross price", () => {
  const source = read(
    "src/screens/Technician/TechnicianHomeScreen.js"
  );
  const normalizer = read("src/services/normalizeAppointment.js");

  assert.match(source, /resolveAppointmentGrossPrice/);
  assert.match(source, /priceWithVat/);
  assert.match(normalizer, /a\.service_price/);
  assert.match(normalizer, /servicePrice/);
});

test("price visibility copy exists in both supported languages", () => {
  for (const locale of ["en", "gr"]) {
    const translations = JSON.parse(
      read(`src/locales/${locale}.json`)
    );

    assert.ok(translations.admin.technicians.priceVisibility.label);
    assert.ok(translations.admin.technicians.priceVisibility.enableAlert);
    assert.ok(translations.technician.home.appointments.priceWithVat);
  }
});
