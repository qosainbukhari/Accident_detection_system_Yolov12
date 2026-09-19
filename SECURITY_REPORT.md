# Security report

Phase 1 was performed on `hardening-and-cleanup` after the pre-hardening
snapshot. Secret values were never printed or committed.

| ID | Severity | Area | Finding and fix | Status |
|---|---|---|---|---|
| SEC-001 | High | Secrets | Local `.env` is ignored and backed up outside Git. Added `backend/.env.example` with placeholders and expanded ignore rules for keys, credentials, dumps, and runtime artifacts. | Done |
| SEC-002 | High | Uploads | Uploads are bounded by byte size, extension/content type, decoded image validity, image pixel count, and video frame count. Filenames are replaced with random names and original uploads live under `data/uploads`, outside the public static root. | Done |
| SEC-003 | High | Background jobs | Alert and agent tasks create their own `SessionLocal` session instead of retaining a request-scoped session. | Done in snapshot; verified by code inspection |
| SEC-004 | Medium | Browser auth | Removed JWT and serialized user persistence from `localStorage`; the token is held only in an in-memory module store and cleared on 401/logout. | Done |
| SEC-005 | Medium | Container | Backend image creates and uses a non-root `app` user; runtime directories are owned by that user. | Done in snapshot; verified by Dockerfile inspection |
| SEC-006 | Medium | Dependencies | Replaced open-ended Python dependency ranges with exact versions. | Done; vulnerability database audit remains blocked because `pip-audit` is not installed in the environment |
| SEC-007 | Medium | Public media | Generated annotated outputs remain under `/static` for dashboard compatibility. Original uploads are not publicly mounted. A future release should add authenticated media downloads for sensitive snapshots. | Partial |
| SEC-008 | Medium | Auth/session | JWTs remain bearer tokens returned by the API and are intentionally non-persistent in the browser. Short expiration and refresh-token rotation are not implemented. | Partial |
| SEC-009 | Low | Supply chain | `npm ci` and production build completed; npm reported deprecated transitive ESLint-era packages. | Partial; frontend dependency upgrade deferred to a dedicated compatibility change |

## Verification evidence

- Branch: `hardening-and-cleanup`
- Snapshot commit: `111be90`
- `git diff --check`: passed
- `python3 -m compileall -q backend/app backend/tests`: passed
- `npm ci --ignore-scripts --no-audit --no-fund`: passed
- `npm run build`: passed (Vite emitted only a bundle-size warning)
- Staged scan found no known credential signatures, private-key markers, or
  suspicious nonempty credential literals.

## Remaining manual actions

- Rotate any real credentials that may have existed in the pre-existing local
  `.env`, especially database, SMTP, Twilio, Gemini, and JWT secrets.
- Install and run `pip-audit` in a network-enabled environment, then review
  the pinned versions against the current vulnerability database.
- Configure authenticated media delivery before deploying snapshots containing
  personally identifiable information.
