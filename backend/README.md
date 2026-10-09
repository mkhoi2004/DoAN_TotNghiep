# Dental Clinic ERP API

Node.js/TypeScript API backed by SQL Server. This is an initial implementation
baseline for the v13 workflow, not a production-ready EMR or a complete ERP.

## Prerequisites

- Node.js 22 or later
- SQL Server reachable at `DESKTOP-F5CFA0D\SQLEXPRESS`
- ODBC Driver 18 for SQL Server
- Windows Integrated Authentication for the Windows account running Node.js

The SQL account that owns the database is set to
`DESKTOP-F5CFA0D\ADMIN`. The API connects with Windows Integrated
Authentication; run it under an account granted database access. Avoid running
the application as a SQL Server owner in production; provision a least-privilege
runtime account instead.
Use a trusted SQL Server TLS certificate in production. Setting
`DB_TRUST_SERVER_CERTIFICATE=true` is for local development with a self-signed
certificate only.

## Local setup

1. From `backend`, install dependencies with `npm install`.
2. Copy `.env.example` to `.env`. Generate three independent secrets:
   - `JWT_SECRET`: at least 32 random bytes.
   - `PII_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters.
   - `PII_HASH_KEY`: a separate 32 random bytes encoded as 64 hexadecimal
     characters.
3. Run the one-time schema script from a Windows account permitted to create
   the database and set its owner:

   ```powershell
   sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\001_initial_schema.sql
   ```

   The migration is intended to be run once against an empty database. Back up
   the database before applying later schema changes.
4. Apply the patient-note encryption migration once before creating patient
   records:

   ```powershell
   sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\002_encrypt_patient_notes.sql
   ```

   It refuses to run if patient rows already exist, so it cannot silently
   reinterpret plaintext as ciphertext.
5. Create the first administrator using a strong, non-default password. Set
   `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` in the process
   environment for this one-time command:

   ```powershell
   npm run bootstrap-admin
   ```

   Bootstrap refuses to run if any administrator already exists.
6. Apply the ERP clinical-module migration once after bootstrapping the admin
   account (it creates the initial dental-service catalog for the admin user):

   ```powershell
   sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\003_clinical_and_erp_modules.sql
   ```

   The migration adds electronic medical records, treatment consent,
   treatment-service snapshots, inventory reservations, sterilization, Labo,
   insurance, warranty, HR, and fixed-asset tables, each with a matching
   `Deleted` archive and soft-delete trigger. It also adds payment idempotency
   and cash-shift reconciliation fields.
7. Apply the chart-of-accounts extension for the accounting accounts referenced
   by the supplied accounting PDF:

   ```powershell
   sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\004_tt99_accounting_accounts.sql
   ```

   This adds 1331/1332, 211/2141, 3331, 521, 621/622/627, and 711. Existing
   accounts include 111/112, 131, 152/156, 331, 511, 632, 641/642, and 811.
   The migration is idempotent for these account codes and has been applied to
   the local `DoAnTotNghiep` database.
8. Optional: seed development/test accounts by setting `TEST_USERS_JSON` to a
   JSON array containing each username, role, and password, then run
   `npm run seed-test-users`. For example, use `TiepNhan` with the
   `RECEPTIONIST` role and set the requested password in the process environment.
   The seeder only runs outside production, validates the same password policy
   as account creation, hashes credentials with bcrypt, records audit events,
   and never overwrites an existing account. Do not place real passwords in
   source control or shell history.
9. Run `npm run dev`. The API listens on `http://localhost:3000`.

The web application is in `../frontend`. Run `npm install` and `npm run build`
there to build the React/Vite client. Vite proxies `/api` requests to the API
during local development.

## Implemented API surface

- `POST /api/auth/login`: bcrypt password verification, JWT issuance,
  rate-limited login attempts, and audit events.
- `POST /api/auth/users`: administrator-only account provisioning with
  role validation and a password longer than eight characters that includes
  at least one uppercase and one special character.
- `/api/clinical/*`: clinical service catalog, role/assignment-protected EMR,
  encrypted clinical notes and electronic-consent signatures, consent
  revocation, treatment-service pricing snapshots, and consent-gated visit
  settlement. MySign/Viettel-CA signing is deferred; internal clinical
  settlement does not represent a legally valid digital signature.
- `/api/cashier/*` and `POST /api/visits/:visitId/payments`: cashier shifts,
  idempotent payments, exact-balance collection, discrepancy review and
  separation-of-duties reconciliation. Every closed shift requires approval by
  a different `ADMIN` or `CHIEF_ACCOUNTANT`, even when the cash count matches.
- `GET/POST /api/inventory/reservations`, reservation `/consume`/`/release`
  actions, and `GET /api/inventory/reservation-visits`: FIFO reservations for
  active visits, on-hand consumption, audited release, expiry release when
  consuming, movement history, and transactional stock guards.
- `GET/POST/DELETE /api/patients`: role-gated patient records, encrypted
  national ID, allergy notes, and medical history (AES-256-GCM), keyed
  duplicate-detection hash, duplicate warnings, and audited soft-delete
  archival.
- `GET/POST /api/visits`, `PATCH /api/visits/:visitId/status`: role-gated
  reception workflow with daily visit numbering, validated state transitions,
  and zero-cost follow-up completion.
- `GET /api/inventory`, `POST /api/inventory/receipts`,
  `POST /api/inventory/issues`: lot tracking, expiry checks, transactional
  FIFO split-lot issue, and stock movement records.
- `GET/POST /api/accounting/journals` and
  `POST /api/accounting/journals/:journalId/approve`: balanced journal entries
  with separation-of-duties approval by the chief accountant. MySign/
  Viettel-CA signing is deferred.

All API routes except `/health` and login require a short-lived bearer JWT.
The initial implementation intentionally has no default users or passwords;
create the first admin through the bootstrap command.

## Deletion and retention

Every table created by the initial schema has a corresponding table suffixed
with `Deleted`. A SQL Server `INSTEAD OF DELETE` trigger writes a complete JSON
snapshot of the row to that archive table, including deletion actor/reason from
SQL session context, and marks the original row deleted in the same database
transaction. Foreign keys use restrictive defaults; no `ON DELETE CASCADE` is
used. The application never physically removes archived business rows.

Clinical records and posted accounting records need stricter workflow-specific
correction rules before their deletion endpoints are exposed. Audit records are
captured for patient reads, authentication and implemented mutations.

## Accounting mapping from the supplied PDF

The current chart includes the accounts identified from the supplied reference:

- `111` cash, `112` bank deposits, `131` customer receivables, and `331`
  supplier payables.
- `152` materials held for internal use, `156` goods held for resale, and
  `211`/`2141` fixed-asset cost and accumulated depreciation.
- `1331`/`1332` input VAT for goods/services and fixed assets, and `3331`
  output VAT when applicable.
- `511` service revenue, `521` revenue reductions, `632` cost of goods sold,
  `621` direct materials, `622` direct labor, `627` production overhead,
  `641` selling costs, `642` administration costs, and `711`/`811` other
  income/expenses.

These accounts are a chart-of-accounts foundation, not a complete automated
posting matrix. In particular, do not infer VAT treatment, inventory
classification, or cost recognition from a payment alone; configure and review
the clinic's applicable tax status and accounting policy before enabling
automatic journal creation.

## Current gaps against workflow v13

The browser UI now provides screens for reception, patient records, EMR,
cashier, inventory, sterilization, Labo, insurance, warranties, accounting,
HR, and assets. Implemented foundations include EMR notes and signed consent,
visit settlement gates, cashier payments and independent shift review,
inventory FIFO receipt/issue and reservation/consume/release, plus
list/create APIs for operational modules. Several operational modules still
lack complete update/status lifecycles and end-to-end integration. Refunds and
deposits, the full automatic journal matrix, e-invoicing, payroll,
break-glass access, two-factor authentication, document retention archives,
automated release jobs for expired reservations, and disaster-recovery
automation are not yet complete. Do not treat the application as
production-ready until each workflow has its database schema, authorization,
APIs, user interface, and integration tests.

## Validation

```powershell
npm test
npm run build
```
