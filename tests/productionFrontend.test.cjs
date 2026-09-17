const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(absolute);
    return entry.isFile() && entry.name.endsWith(".js") ? [absolute] : [];
  });
}

test("Android authentication uses the production API and SecureStore", () => {
  const source = read("src/services/apiService.js");
  const pkg = JSON.parse(read("package.json"));
  const app = JSON.parse(read("app.json"));

  assert.match(
    source,
    /https:\/\/field-inspections-backend-production\.up\.railway\.app/
  );
  assert.match(source, /SecureStore\.setItemAsync/);
  assert.match(source, /SecureStore\.WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(source, /pestify\.production\.auth-token\.v1/);
  assert.match(source, /pestify\.production\.mfa-device\.v1/);
  assert.doesNotMatch(source, /localStorage/);
  assert.equal(pkg.dependencies["expo-secure-store"], "~15.0.8");
  assert.ok(app.expo.plugins.includes("expo-secure-store"));
});
test("Android exposes the complete regular-admin MFA/session API", () => {
  const source = read("src/services/apiService.js");

  for (const endpoint of [
    "/auth/mfa/enrollment/start",
    "/auth/mfa/enrollment/confirm",
    "/auth/mfa/enrollment/decline",
    "/auth/mfa/verify",
    "/auth/session/refresh",
    "/auth/session/logout"
  ]) {
    assert.ok(source.includes(endpoint), endpoint);
  }

  assert.match(
    source,
    /Super admin access is available only in Pestify iOS\./
  );
  assert.match(read("src/security/adminSessionPolicy.js"), /new Set\(\["admin"\]\)/);
  assert.match(read("src/security/adminMfaUiPolicy.js"), /new Set\(\["admin"\]\)/);
});

test("administrator session refresh is manual and all admin headers show it", () => {
  const context = read("src/security/AdminSessionContext.js");
  const intervalStart = context.indexOf("setInterval(");
  const intervalEnd = context.indexOf(");", intervalStart);
  const intervalBody = context.slice(intervalStart, intervalEnd + 2);

  assert.ok(intervalStart >= 0);
  assert.doesNotMatch(intervalBody, /refreshAdminSession/);
  assert.match(
    read("src/components/AdminSessionTimer.js"),
    /onPress={refreshAdminSession}/
  );
  assert.match(read("App.js"), /<AdminSessionProvider>/);

  for (const relativePath of [
    "src/screens/Admin/AdminHomeScreen.js",
    "src/screens/Admin/AdminNotifications.js",
    "src/screens/Admin/AdminTechCalendarPreview.js",
    "src/screens/Admin/AdminTechSchedule.js",
    "src/screens/Admin/CustomerProfile.js",
    "src/screens/Admin/CustomerRequestScreen.js",
    "src/screens/Admin/CustomersScreen.js",
    "src/screens/Admin/MaterialsScreen.js",
    "src/screens/Admin/Statistics.js",
    "src/screens/Admin/TechniciansScreen.js",
    "src/screens/Technician/ReportScreen.js"
  ]) {
    assert.match(
      read(relativePath),
      /AdminHeaderSessionActions/,
      relativePath + " is missing the session timer"
    );
  }
});

test("legacy token storage is purged and Security Lab is unreachable", () => {
  const apiSource = read("src/services/apiService.js");

  assert.match(apiSource, /LEGACY_AUTH_TOKEN_KEY = "authToken"/);
  assert.match(apiSource, /AsyncStorage\.removeItem\(LEGACY_AUTH_TOKEN_KEY\)/);
  assert.doesNotMatch(apiSource, /AsyncStorage\.setItem/);

  const violations = javascriptFiles(path.join(root, "src"))
    .filter(file =>
      fs.readFileSync(file, "utf8").includes(
        "security-lab-security-lab.up.railway.app"
      )
    )
    .map(file => path.relative(root, file));

  assert.deepEqual(violations, []);
});

test("customer map uploads use the active secure administrator token", () => {
  const apiSource = read("src/services/apiService.js");
  const customersSource = read("src/screens/Admin/CustomersScreen.js");

  assert.match(apiSource, /async function uploadCustomerMap\(formData\)/);
  assert.match(apiSource, /Authorization: `Bearer \$\{authToken\}`/);
  assert.equal(
    (customersSource.match(/apiService\.uploadCustomerMap\(formData\)/g) || []).length,
    2
  );
  assert.doesNotMatch(customersSource, /AsyncStorage|getItem\("authToken"\)/);
  assert.match(
    customersSource,
    /formData\.append\('customerId', createdCustomer\.customerId\)/
  );
});

test("Android multipart uploads use expo/fetch with Expo File parts", () => {
  const source = read("src/services/apiService.js");

  assert.match(
    source,
    /import \{ fetch as expoFetch \} from "expo\/fetch"/
  );
  assert.match(
    source,
    /import \{ File as ExpoFile \} from "expo-file-system"/
  );
  assert.match(
    source,
    /function normalizeNativeMultipartBody\(formData\)/
  );
  assert.match(source, /new ExpoFile\(value\.uri\)/);
  assert.match(source, /const requestFn = isMultipart \? expoFetch : fetch/);
  assert.doesNotMatch(
    source,
    /body: formData[,\n]/,
    "multipart requests must not bypass URI-part normalization"
  );
  assert.equal(
    (source.match(/normalizeNativeMultipartBody\(/g) || []).length,
    4,
    "the helper and all three Android multipart request paths must be present"
  );
});

test("CustomerProfile requests reports only from actual visit history", () => {
  const source = read("src/screens/Admin/CustomerProfile.js");

  assert.match(source, /apiService\.getCustomerActualVisits\(custId\)/);
  assert.doesNotMatch(
    source,
    /`\/appointments\/customer\/\$\{custId\}`/
  );
  assert.match(source, /visitSummary\.visitId[\s\S]*visitSummary\.id/);
});
