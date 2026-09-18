# Security Lab client synchronization — 2026-09-18

Source baseline: `bb5245d58a5aaebe04a940f2251b8ac4e8dae14c` from this repository's `main`.
Branch: `security-lab-encryption-m0-sync-20260918`.

This branch includes the current Production features, including technician price
permissions and appointment duration estimates. It targets only
`https://security-lab-security-lab.up.railway.app/api`. Authentication storage
and administrator session broadcasts use `pestify.security-lab.*` names.
Uploaded-image URLs in customer requests derive from that same API origin.
Package manifests, lockfiles, SDK/runtime versions, native app identities and
EAS configuration are unchanged from the source baseline. No native build,
OTA publication, store submission, or public Web deployment was performed.

## Deployment gate

This is a source preparation, not evidence that an installed client is isolated.
Before using it, identify the actual installed Lab app, local checkout and runtime.
iOS already has a separate `Pestify Dev` variant: the existing configuration
requires `APP_VARIANT=development` to select `com.cpamporis.pestfree.dev`.
The name alone does not prove which source/API the running app uses.
Android still needs a confirmed separate Lab app identity/profile.
Web requires a distinct Lab origin and freshly generated assets; never serve this
branch on the Production origin.
Do not use Production EAS profiles/channels, upload to Production hosting, or merge
this branch into `main`. Existing Production build profiles have not been changed
or approved for Lab use. Confirm Lab targeting before any build or publication.

The prior Web `dist` directory, if present, is removed from this Lab branch because
it embeds the Production API. Generate a fresh Lab bundle only after confirming
the isolated Web target. This does not remove any Production artifact.

## Tests and limits

The existing client policy/regression suite is retained. Its target assertions
are explicitly adapted from Production to Lab. These source tests do not replace
a device/browser check of login, refresh, upload/download, report URLs or cache
isolation. No application encryption, E2EE or private-file cutover is included.

Verification: 26 tests passed, 0 failed, 0 skipped on Node 24.19.0.
No dependency installation was required for these tests.
