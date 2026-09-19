# Changelog

## Phase 1 – security hardening

- Created the `hardening-and-cleanup` branch and committed the pre-hardening
  snapshot as `111be90`.
- Added safe environment placeholders and broader ignore coverage.
- Backed up the ignored local environment and model weights outside Git.
- Moved original uploads to `data/uploads`, added random upload names, and
  enforced image pixel and video frame limits.
- Removed browser `localStorage` persistence for JWTs; tokens now live only in
  memory for the active page session.
- Pinned Python dependency versions and documented audit limitations.
- Added security findings and verification evidence to `SECURITY_REPORT.md`.
