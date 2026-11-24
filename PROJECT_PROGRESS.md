# PetCare AI — Development Progress

Baseline: uploaded project ZIP and `PetCare_AI_Investor_Proposal.pdf` (31 October 2026).

## Current increment: Phase 1 — database foundation

### Added in this increment
- Added SQLAlchemy models for `medical_documents` and `extracted_medical_data`.
- Added SQLAlchemy models for `medical_visits`, `pet_behaviour_logs`, and `ai_insights` to match the proposal's planned data model.
- Added MySQL migration `Backend/migrations/001_medical_record_foundation.sql`.
- Added migration instructions in `Backend/migrations/README.md`.
- Kept the existing `MedicalRecord` model/table unchanged.

### Not implemented yet
- Secure document upload and private file storage API.
- Owner-facing upload, preview, document list and timeline UI.
- PDF text extraction and OCR.
- Document classification, structured extraction and duplicate detection.
- Owner review/verification workflow.
- AI health assistant and behaviour summaries.

### Important implementation gate
The existing prototype's login returns a user ID but does not establish a secure authenticated session. Do not expose document upload/download endpoints until authentication and server-side pet ownership authorization are implemented. A user ID sent by the browser is not proof of identity.

### Apply the database migration
1. Back up the existing MySQL database.
2. Open MySQL Workbench and select the database configured by `Backend/.env`'s `DATABASE_URL`.
3. Execute `Backend/migrations/001_medical_record_foundation.sql`.
4. Refresh the schema and confirm the five new tables exist.
5. Do not delete or rename the existing `medical_records` table.

This increment is a source-code/schema change. It has not been tested against the user's live MySQL database or browser application.
