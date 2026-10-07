const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {privateUploadUrl, uploadedFileUrl} = require("../src/utils/privateUploadUrl");
const api = "https://api.pestify.gr/api";
const legacy = "https://field-inspections-backend-production.up.railway.app";
test("production API is fixed to the owner domain without a Railway fallback", () => {
 const source = fs.readFileSync(require.resolve("../src/services/apiService"), "utf8");
 assert.match(source, /const PRODUCTION_API_ORIGIN =\s*"https:\/\/api\.pestify\.gr"/);
 assert.doesNotMatch(source, /field-inspections-backend-production\.up\.railway\.app/);
});
test("legacy images resolve to the stable origin before authenticated requests", () => {
 for (const input of [legacy+"/uploads/photo.png", legacy+"/uploads/photo.png?old=1#fragment", "https://api.pestify.gr/uploads/photo.png", "photo.png", "uploads/photo.png", "/uploads/photo.png"]) {
   assert.equal(uploadedFileUrl(input,api), "https://api.pestify.gr/uploads/photo.png");
 }
 assert.equal(privateUploadUrl(legacy+"/uploads/photo.png",api),"https://api.pestify.gr/uploads/photo.png");
});
test("untrusted origins and malformed legacy image paths fail closed", () => {
 for (const input of [legacy+".evil.test/uploads/photo.png", "https://evil.test/uploads/photo.png", "http://field-inspections-backend-production.up.railway.app/uploads/photo.png", "https://user:secret@field-inspections-backend-production.up.railway.app/uploads/photo.png", legacy+"/uploads/%2fsecret.png", legacy+"/uploads/../secret.png", legacy+"/uploads/photo.svg", legacy+":8443/uploads/photo.png", legacy+"/uploads/a/photo.png", "../photo.png", "//evil.test/uploads/photo.png"]) assert.equal(uploadedFileUrl(input,api),null,input);
 assert.equal(privateUploadUrl(legacy+"/uploads/photo.png","https://other.test/api"),null);
 assert.equal(privateUploadUrl("http://api.pestify.gr/uploads/photo.png", "http://api.pestify.gr/api"),null);
});

test("technician image origins preserve the api subdomain", () => {
 const path = require("node:path");
 const names = ["ReportScreen", "DisinfectionScreen", "CertificationServiceScreen", "InsecticideScreen", "MyocideScreen", "SpecialServicesScreen"];
 for (const name of names) {
  const source = fs.readFileSync(path.join(__dirname, "../src/screens/Technician", name + ".js"), "utf8");
  assert.doesNotMatch(source, /\.replace\(["']\/api["']/);
  const expressions = source.match(/new URL\((?:apiService\.)?API_BASE_URL\)\.origin/g);
  assert.ok(expressions?.length, name);
  for (const expression of expressions) {
   const origin = new Function("API_BASE_URL", "apiService", "return " + expression)(api, {API_BASE_URL:api});
   assert.equal(origin + "/uploads/photo.jpg", "https://api.pestify.gr/uploads/photo.jpg", name);
  }
 }
});
