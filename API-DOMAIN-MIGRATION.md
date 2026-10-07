# Stable API domain migration — 2026-10-07

API requests target https://api.pestify.gr, still routed to Railway production.
The owner verified login/MFA, existing floorplans, report images and PDFs on
iOS, Android and Web development clients. Web Network confirmed the API host.
Technician image URLs now derive the URL origin instead of removing the first
/api substring. Legacy Railway upload URLs are canonicalized before attaching
credentials; unknown origins and malformed paths are rejected.

Validation: 203 automated tests passed on this platform.
Android's stale voice configuration test expectations were aligned with existing
continuous voice runtime identifiers; no runtime or voice implementation changed.
Dependencies, native identities, authentication and MFA policies are unchanged.

Release status: source prepared; EAS publication and live Web deployment remain
unconfirmed. Confirm actual installed build channel/runtime before publishing.
Build profile environment variables are not automatically applied by eas update.
Publish only one explicitly selected platform per update: iOS and Android share
an EAS project. Preserve each production voice flag and runtime. Do not publish
from development/security-lab variants. No new native build is included here.

Web: regenerate and commit dist, then use the established Plesk repository
deployment. Verify the served page and network host after deployment.

Old installed versions continue calling Railway until their compatible update
is received. Future Hetzner failover additionally needs api.pestify.gr TLS, a
clean restore, one writable backend, appropriate firewall rules and independent
backups. DNS alone is not a complete failover. See the backend DR runbook.
