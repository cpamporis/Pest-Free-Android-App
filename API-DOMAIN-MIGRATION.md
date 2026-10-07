# Stable API domain — release candidate, not deployed

Changes: production API origin becomes https://api.pestify.gr; legacy absolute
Railway image URLs are canonicalized to this origin before authentication headers
are attached. Only the exact former production origin and validated image paths
are accepted. There is no fallback request to Railway and no arbitrary-origin
allowlist. Dependency manifests/lockfiles, authentication storage keys, MFA,
native identities, runtime versions and EAS channels are unchanged.

Read-only routing audit on 2026-10-07:
- Railway production service field-inspections-backend has api.pestify.gr attached
  to port 8080, verified ownership and a valid certificate.
- Current CNAME: 94q8bcu5.up.railway.app; owner observed TTL 300.
- Owner confirmed HTTP 200 and database health via HTTPS without TLS bypass.

This branch targets REAL production data through the existing Railway service.
Do not use it for synthetic customer/upload writes. No merge, release, DNS change,
EAS Update or production deployment has been performed.

Validation here: 200/202 automated tests.
Android has two pre-existing androidVoiceConfig.test.cjs failures expecting the
old voice runtime identifiers. The tested app.config.js, app.json, eas.json and
voice test are byte-for-byte unchanged from the baseline. Domain and private
upload tests pass. Resolve the existing release-test mismatch before release.

Next gates:
1. Device smoke test of the common upload helper in the isolated Hetzner Dev
   branch test/hetzner-dr-ios-20261007, still using dr-test and restored data.
2. Platform-specific Lab/device checks for Android and Web remain pending.
3. Limited production-domain smoke test of login/MFA, existing images and PDF;
   authentication will create normal auth-session/audit records. No business test
   writes in production. Verify actual network host and Web browser CORS behavior.
4. Review and explicitly approve release per platform; verify store/EAS build
   provenance. Old installed versions still call Railway until updated.
5. Future failover needs a certificate for api.pestify.gr on Hetzner, a clean
   restore and one writable backend. Read the backend FAILOVER-RUNBOOK.el.md.

Do not repoint api.pestify.gr to the test instance for these tests. DNS alone does
not stop old Railway clients or prevent concurrent writes to two databases.
