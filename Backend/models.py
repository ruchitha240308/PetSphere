from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Time,
    ForeignKey,
    DateTime,
    Text,
    Float,
    JSON
)

from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)


class Pet(Base):
    __tablename__ = "pets"

    pet_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    pet_name = Column(String(100), nullable=False)
    species = Column(String(50), nullable=False)
    breed = Column(String(100))
    age = Column(Integer)
    gender = Column(String(20))


class Veterinarian(Base):
    __tablename__ = "veterinarians"

    vet_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    specialization = Column(String(100))
    phone = Column(String(20))


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    vet_id = Column(Integer, ForeignKey("veterinarians.vet_id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    reason = Column(String(255))
    status = Column(String(30), default="Pending")


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    record_id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    vet_id = Column(Integer, ForeignKey("veterinarians.vet_id"), nullable=False)
    diagnosis = Column(String(255))
    treatment = Column(String(255))
    prescription = Column(String(255))
    record_date = Column(Date, nullable=False)

# =====================================================
# 1. MEDICAL DOCUMENTS
# =====================================================

class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    document_id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)

    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)

    document_type = Column(String(100))
    source_clinic = Column(String(255))
    document_date = Column(Date)

    file_hash = Column(String(64), index=True)

    processing_status = Column(String(30), default="Pending")
    verification_status = Column(String(30), default="Pending")

    uploaded_at = Column(DateTime, server_default=func.now())


# =====================================================
# 2. EXTRACTED MEDICAL DATA
# =====================================================

class ExtractedMedicalData(Base):
    __tablename__ = "extracted_medical_data"

    extraction_id = Column(Integer, primary_key=True, index=True)

    document_id = Column(
        Integer,
        ForeignKey("medical_documents.document_id"),
        nullable=False
    )

    extracted_text = Column(Text)
    diagnosis = Column(Text)
    medications = Column(JSON)
    treatments = Column(JSON)

    extracted_fields = Column(JSON)
    confidence_scores = Column(JSON)

    extraction_status = Column(String(30), default="Pending")

    extracted_at = Column(DateTime, server_default=func.now())


# =====================================================
# 3. MEDICAL VISITS
# =====================================================

class MedicalVisit(Base):
    __tablename__ = "medical_visits"

    visit_id = Column(Integer, primary_key=True, index=True)

    pet_id = Column(
        Integer,
        ForeignKey("pets.pet_id"),
        nullable=False
    )

    vet_id = Column(
        Integer,
        ForeignKey("veterinarians.vet_id"),
        nullable=True
    )

    visit_date = Column(Date, nullable=False)
    clinic_name = Column(String(255))

    visit_reason = Column(Text)
    visit_notes = Column(Text)

    created_at = Column(DateTime, server_default=func.now())


# =====================================================
# 4. PET BEHAVIOUR LOGS
# =====================================================

class PetBehaviourLog(Base):
    __tablename__ = "pet_behaviour_logs"

    log_id = Column(Integer, primary_key=True, index=True)

    pet_id = Column(
        Integer,
        ForeignKey("pets.pet_id"),
        nullable=False
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    appetite = Column(String(100))
    activity_level = Column(String(100))
    sleep_pattern = Column(String(100))

    anxiety_level = Column(String(100))
    aggression = Column(String(100))

    repetitive_behaviour = Column(Text)
    additional_notes = Column(Text)

    recorded_at = Column(DateTime, server_default=func.now())


# =====================================================
# 5. AI INSIGHTS
# =====================================================

class AIInsight(Base):
    __tablename__ = "ai_insights"

    insight_id = Column(Integer, primary_key=True, index=True)

    pet_id = Column(
        Integer,
        ForeignKey("pets.pet_id"),
        nullable=False
    )

    insight_type = Column(String(100))
    summary = Column(Text)
    recommendations = Column(Text)

    source_references = Column(JSON)
    confidence_score = Column(Float)

    created_at = Column(DateTime, server_default=func.now())