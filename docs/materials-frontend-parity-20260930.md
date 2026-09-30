# Materials and SDS frontend parity — 2026-09-30

Includes chargeable category/item editing, optional appointment materials and gross totals,
financial revision-aware settlement, technician requests with authenticated photos,
priority request cards and badge, reports with materials/areas/business notes,
station condition/access mutual locking and null readings, catalogue selection and
private SDS ZIP downloads. Super-admin catalogue management remains iOS-only.

Platform-specific auth, upload/download adapters, app identities, API origins and
session-storage namespaces are preserved. No package or lockfile changes.
Admin commercial editing modals retain the existing session overlay. Web uses
browser confirmation for deletion and an authenticated zoomable image viewer.
Android request images use expo/fetch and normalized Expo File parts.

The Lab feature branch targets only Security Lab. Main targets only Production.
Do not deploy a Lab bundle on the Production origin or production mobile channel.

Validation: original security/price tests, catalogue download tests, device form
interaction tests, request/photo tests and platform upload regression tests.
Expo SDK 54 exports use each repository's unchanged lockfile. Exports verify
bundling; a real device/browser acceptance check remains necessary.
