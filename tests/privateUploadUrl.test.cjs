const test = require("node:test");
const assert = require("node:assert/strict");
const {
  privateUploadUrl,
  isUploadReference
} = require("../src/utils/privateUploadUrl");

const api = "https://field-inspections-backend-production.up.railway.app/api";
const image = "https://field-inspections-backend-production.up.railway.app/uploads/photo.png";

test("only a canonical image on the Production origin may receive authorization", () => {
  assert.equal(privateUploadUrl(image, api), image);
  assert.equal(privateUploadUrl(image + "?legacy=1", api), image);
  assert.equal(
    privateUploadUrl("https://security-lab-security-lab.up.railway.app/uploads/photo.png", api),
    null
  );
  assert.equal(
    privateUploadUrl(
      "https://field-inspections-backend-production.up.railway.app.evil.test/uploads/photo.png",
      api
    ),
    null
  );
  assert.equal(privateUploadUrl(image.replace(".png", "%2Fsecret.png"), api), null);
  assert.equal(privateUploadUrl(image.replace(".png", ".svg"), api), null);
  assert.equal(isUploadReference("file:///temporary/photo.png"), false);
});
