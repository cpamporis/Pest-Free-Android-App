# Security Lab functional parity — 2026-10-01

Branch: `security-lab-production-parity-20261001`.
Lab parent: `1b3439d95fa0d14e7662851c77cc8ee681f73587`.
Production source: `71c0262104545970b3b51a477c2eebe2a4f0661b`.

Includes current station numbering across maps, map-specific log identity and reports,
weekly calendar date selection, customer classification and recurrence fixes, request
cleanup behavior, commercial editing and current private image helpers as applicable.

Lab API origin, authentication storage namespace, session channel, app/build profiles,
package.json and lockfile are retained. No production code or live server was modified.
No voice feature or native dependency is included. Voice development will start on iOS
once this baseline is active and validated.

Validation: 81; source tests used existing Babel tooling; no Android native build.

Requires the corresponding backend Lab parity candidate and its guarded database
migration. Do not assume the deployed Lab server has been upgraded merely because
this branch exists. Read backend docs/lab-production-parity-20261001.md before rollout.

The iOS Windows checkout supplied by the owner is:
`C:\Users\chris\PestFree\Security iOS Lab`.
Use a clean checkout (inspect `git status --short --branch`), fetch origin and switch
this branch. Never discard local changes to force a switch. For the iOS dev variant,
set `APP_VARIANT=development` before starting Expo. A future native microphone/wake-word
implementation will require separate native-build validation; this export does not
prove locked-screen voice capability.
