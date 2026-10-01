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


test("request images accept filenames and reject unsafe references", () => {
  const { uploadedFileUrl } = require("../src/utils/privateUploadUrl");
  for (const input of ["photo.png", "uploads/photo.png", "/uploads/photo.png", image]) {
    assert.equal(uploadedFileUrl(input, api), image);
  }
  for (const input of [null, undefined, {}, "", "../photo.png", "//evil.test/photo.png",
    "https://evil.test/uploads/photo.png", "photo.svg", "photo.png?token=secret"]) {
    assert.equal(uploadedFileUrl(input, api), null);
  }
});

test("the default API service exposes the upload resolver used by request thumbnails", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require.resolve("../src/services/apiService.js"), "utf8");
  const match = source.match(/getUploadedFileUrl: ([^\n]+),/);
  assert.ok(match, "getUploadedFileUrl must exist on apiService");
  assert.match(source, /export default \{\s*API_BASE_URL,\s*\.\.\.apiService\s*\}/);
  const resolve = vm.runInNewContext(`(${match[1]})`, {
    uploadedFileUrl: require("../src/utils/privateUploadUrl").uploadedFileUrl,
    API_BASE_URL: api
  });
  assert.equal(resolve("photo.png"), image);
  assert.equal(resolve("https://evil.test/uploads/photo.png"), null);
});
