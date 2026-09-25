const test = require("node:test");
const assert = require("node:assert/strict");
const {
  privateUploadUrl,
  isUploadReference
} = require("../src/utils/privateUploadUrl");

const lab = "https://security-lab-security-lab.up.railway.app/api";
const image = "https://security-lab-security-lab.up.railway.app/uploads/photo.png";

test("only a canonical image on the Lab origin may receive authorization", () => {
  assert.equal(privateUploadUrl(image, lab), image);
  assert.equal(privateUploadUrl(image + "?legacy=1", lab), image);
  assert.equal(
    privateUploadUrl("https://api.pestify.gr/uploads/photo.png", lab),
    null
  );
  assert.equal(
    privateUploadUrl(
      "https://security-lab-security-lab.up.railway.app.evil.test/uploads/photo.png",
      lab
    ),
    null
  );
  assert.equal(privateUploadUrl(image.replace(".png", "%2Fsecret.png"), lab), null);
  assert.equal(privateUploadUrl(image.replace(".png", ".svg"), lab), null);
  assert.equal(isUploadReference("file:///temporary/photo.png"), false);
});
