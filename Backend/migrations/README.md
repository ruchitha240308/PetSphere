# PetCare AI database migration 001

This migration adds the five new tables described in the PetCare AI proposal:

- `medical_documents`
- `extracted_medical_data`
- `medical_visits`
- `pet_behaviour_logs`
- `ai_insights`

It does not alter or delete the existing `medical_records` table or its data.

## Apply it

1. Back up your MySQL database first.
2. Open MySQL Workbench and select the database used by your `DATABASE_URL`.
3. Open `001_medical_record_foundation.sql` and execute it.
4. Refresh the schema and confirm all five tables exist.

The SQL uses `CREATE TABLE IF NOT EXISTS`, so running it again will not recreate existing tables.

## Important

These are schema foundations only. Upload endpoints and the React upload interface are not included in this first increment. They must be connected to real authentication and backend pet-ownership checks before they are exposed. Do not treat a user ID supplied by a browser as proof of identity.
