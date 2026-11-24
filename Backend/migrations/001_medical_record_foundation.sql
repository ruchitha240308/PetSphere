-- PetCare AI - migration 001
-- Adds new document/insight tables only. Existing users, pets,
-- appointments and medical_records data are not altered or deleted.
-- Back up the database before applying this migration.

CREATE TABLE IF NOT EXISTS medical_documents (
    document_id INT NOT NULL AUTO_INCREMENT,
    pet_id INT NOT NULL,
    owner_user_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_filename VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    source_clinic VARCHAR(255) NULL,
    document_date DATE NULL,
    document_type VARCHAR(80) NULL,
    processing_status VARCHAR(30) NOT NULL DEFAULT 'uploaded',
    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id),
    UNIQUE KEY uq_medical_documents_storage_filename (storage_filename),
    KEY ix_medical_documents_pet_id (pet_id),
    KEY ix_medical_documents_owner_user_id (owner_user_id),
    KEY ix_medical_documents_sha256 (sha256),
    CONSTRAINT fk_medical_documents_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE,
    CONSTRAINT fk_medical_documents_owner FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS extracted_medical_data (
    extraction_id INT NOT NULL AUTO_INCREMENT,
    document_id INT NOT NULL,
    extracted_text LONGTEXT NULL,
    candidate_diagnosis LONGTEXT NULL,
    candidate_medications LONGTEXT NULL,
    candidate_treatment LONGTEXT NULL,
    confidence_score FLOAT NULL,
    extraction_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
    owner_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    extracted_at DATETIME NULL,
    PRIMARY KEY (extraction_id),
    UNIQUE KEY uq_extracted_medical_data_document_id (document_id),
    CONSTRAINT fk_extracted_data_document FOREIGN KEY (document_id) REFERENCES medical_documents(document_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medical_visits (
    visit_id INT NOT NULL AUTO_INCREMENT,
    pet_id INT NOT NULL,
    visit_date DATE NULL,
    clinic_name VARCHAR(255) NULL,
    visit_summary LONGTEXT NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'owner_import',
    PRIMARY KEY (visit_id),
    KEY ix_medical_visits_pet_id (pet_id),
    CONSTRAINT fk_medical_visits_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pet_behaviour_logs (
    behaviour_log_id INT NOT NULL AUTO_INCREMENT,
    pet_id INT NOT NULL,
    owner_user_id INT NOT NULL,
    observed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    appetite VARCHAR(100) NULL,
    activity VARCHAR(100) NULL,
    sleep VARCHAR(100) NULL,
    anxiety VARCHAR(100) NULL,
    barking VARCHAR(100) NULL,
    repetitive_behaviour VARCHAR(255) NULL,
    notes LONGTEXT NULL,
    PRIMARY KEY (behaviour_log_id),
    KEY ix_pet_behaviour_logs_pet_id (pet_id),
    KEY ix_pet_behaviour_logs_owner_user_id (owner_user_id),
    CONSTRAINT fk_behaviour_logs_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE,
    CONSTRAINT fk_behaviour_logs_owner FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_insights (
    insight_id INT NOT NULL AUTO_INCREMENT,
    pet_id INT NOT NULL,
    insight_type VARCHAR(50) NOT NULL,
    content LONGTEXT NOT NULL,
    source_document_ids LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'generated',
    PRIMARY KEY (insight_id),
    KEY ix_ai_insights_pet_id (pet_id),
    CONSTRAINT fk_ai_insights_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE
) ENGINE=InnoDB;
