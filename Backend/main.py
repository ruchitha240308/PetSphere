from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import os
import uuid
import hashlib
import io
from pathlib import Path

import fitz
import pytesseract
from PIL import Image

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from dotenv import load_dotenv

from database import engine, Base, SessionLocal
import models
from ai_service import summarize_medical_document, generate_veterinary_health_insights

from schemas import (
    UserCreate,
    OwnerRegister,
    UserLogin,
    PetCreate,
    AppointmentCreate,
    VeterinarianCreate,
    MedicalRecordCreate
)

# ==========================================
# AUTHENTICATION CONFIGURATION
# ==========================================

load_dotenv(Path(__file__).resolve().parent / ".env")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from .env")

JWT_ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60

password_hash = PasswordHash.recommended()

app = FastAPI()
security = HTTPBearer()

# ==========================================
# PASSWORD HASHING FUNCTIONS
# ==========================================

def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, stored_password: str) -> bool:

    # Verify passwords already stored as Argon2 hashes
    if stored_password.startswith("$argon2"):
        return password_hash.verify(
            password,
            stored_password
        )

    # Temporary compatibility for existing plaintext accounts
    return password == stored_password


# ==========================================
# JWT TOKEN GENERATION
# ==========================================

def create_access_token(user_id: int, role: str):

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return token

# ==========================================
# MEDICAL DOCUMENT UPLOAD CONFIGURATION
# ==========================================

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png"
}

# ===================================================
# TESSERACT OCR CONFIGURATION
# ===================================================

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# ===================================================
# CORS
# ===================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================================================
# DATABASE
# ===================================================

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

# ===================================================
# JWT AUTHENTICATION
# ===================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        user_id = int(user_id)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    current_user = db.query(models.User).filter(
        models.User.user_id == user_id
    ).first()

    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return current_user

# ---------------------------------------------------
# AUTHENTICATED USER TEST
# ---------------------------------------------------

@app.get("/auth/me")
def read_current_user(
    current_user: models.User = Depends(get_current_user)
):
    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }

# ===================================================
# HOME
# ===================================================

@app.get("/")
def home():
    return {
        "message": "Pet Care Veterinary Management System"
    }


# ===================================================
# TEST DATABASE
# ===================================================

@app.get("/test-db")
def test_database():

    try:

        with engine.connect():

            return {
                "message": "MySQL database connected successfully!"
            }

    except Exception as e:

        return {
            "message": "Database connection failed",
            "error": str(e)
        }


# ===================================================
# USERS
# ===================================================


@app.post("/register")
def register_owner(
    user: OwnerRegister,
    db: Session = Depends(get_db)
):
    name = user.name.strip()
    email = user.email.strip().lower()
    password = user.password

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )

    if not email or "@" not in email:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address"
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters"
        )

    existing_user = db.query(models.User).filter(
        models.User.email.ilike(email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists"
        )

    new_user = models.User(
        name=name,
        email=email,
        password=hash_password(password),
        role="owner"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Owner account created successfully",
        "user_id": new_user.user_id
    }



@app.post("/users")
def create_user(
    user: UserCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can create user accounts"
        )

    existing_user = db.query(models.User).filter(
        models.User.email.ilike(user.email.strip())
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists"
        )

    new_user = models.User(
        name=user.name.strip(),
        email=user.email.strip().lower(),
        password=hash_password(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully",
        "user_id": new_user.user_id
    }

# ---------------------------------------------------
# LOGIN
# ---------------------------------------------------

@app.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    entered_email = user.email.strip().lower()

    print("LOGIN EMAIL:", repr(entered_email))

    all_users = db.query(models.User).all()
    print("DATABASE USER EMAILS:", [repr(account.email) for account in all_users])

    existing_user = next(
        (
            account for account in all_users
            if account.email
            and account.email.strip().lower() == entered_email
        ),
        None
    )

    print(
        "MATCHING USER ID:",
        existing_user.user_id if existing_user else None
    )

    if existing_user is None:
        return {"message": "User not found"}

    if not verify_password(user.password, existing_user.password):
        return {"message": "Incorrect password"}

    # Upgrade old plain-text passwords to hashed passwords
    if not existing_user.password.startswith("$argon2"):
        existing_user.password = hash_password(user.password)
        db.commit()

    # Generate JWT access token
    access_token = create_access_token(
        user_id=existing_user.user_id,
        role=existing_user.role
    )

    return {
        "message": "Login successful",
        "user_id": existing_user.user_id,
        "name": existing_user.name,
        "role": existing_user.role,
        "access_token": access_token,
        "token_type": "bearer"
    }
    
# ---------------------------------------------------
# GET ALL USERS
# ---------------------------------------------------

@app.get("/users")
def get_users(
    db: Session = Depends(get_db)
):

    return db.query(
        models.User
    ).all()


# ---------------------------------------------------
# GET ONE USER
# ---------------------------------------------------

@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):

    user = db.query(
        models.User
    ).filter(
        models.User.user_id == user_id
    ).first()

    if user is None:

        return {
            "message": "User not found"
        }

    return user


# ===================================================
# UPDATE USER
# ===================================================

@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: dict,
    db: Session = Depends(get_db)
):

    existing_user = db.query(
        models.User
    ).filter(
        models.User.user_id == user_id
    ).first()

    if existing_user is None:
        return {
            "message": "User not found"
        }

    new_name = str(user_data.get("name", "")).strip()
    new_email = str(user_data.get("email", "")).strip().lower()

    if not new_name or not new_email:
        return {
            "message": "Name and email are required"
        }

    # Check whether another user already uses this email
    all_users = db.query(models.User).all()

    duplicate_email = any(
        account.user_id != user_id
        and account.email
        and account.email.strip().lower() == new_email
        for account in all_users
    )

    if duplicate_email:
        return {
            "message": "Email already exists"
        }

    existing_user.name = new_name
    existing_user.email = new_email

    db.commit()

    return {
        "message": "User updated successfully"
    }

# ===================================================
# PETS
# ===================================================

@app.post("/pets")
def create_pet(
    pet: PetCreate,
    db: Session = Depends(get_db)
):

    new_pet = models.Pet(
        user_id=pet.user_id,
        pet_name=pet.pet_name,
        species=pet.species,
        breed=pet.breed,
        age=pet.age,
        gender=pet.gender
    )

    db.add(new_pet)
    db.commit()
    db.refresh(new_pet)

    return {
        "message": "Pet added successfully",
        "pet_id": new_pet.pet_id
    }


@app.get("/pets")
def get_pets(
    db: Session = Depends(get_db)
):

    return db.query(
        models.Pet
    ).all()


@app.get("/users/{user_id}/pets")
def get_user_pets(
    user_id: int,
    db: Session = Depends(get_db)
):

    return db.query(
        models.Pet
    ).filter(
        models.Pet.user_id == user_id
    ).all()


@app.get("/pets/{pet_id}")
def get_pet(
    pet_id: int,
    db: Session = Depends(get_db)
):

    pet = db.query(
        models.Pet
    ).filter(
        models.Pet.pet_id == pet_id
    ).first()

    if pet is None:

        return {
            "message": "Pet not found"
        }

    return pet


@app.put("/pets/{pet_id}")
def update_pet(
    pet_id: int,
    pet: PetCreate,
    db: Session = Depends(get_db)
):

    existing_pet = db.query(
        models.Pet
    ).filter(
        models.Pet.pet_id == pet_id
    ).first()

    if existing_pet is None:

        return {
            "message": "Pet not found"
        }

    existing_pet.user_id = pet.user_id
    existing_pet.pet_name = pet.pet_name
    existing_pet.species = pet.species
    existing_pet.breed = pet.breed
    existing_pet.age = pet.age
    existing_pet.gender = pet.gender

    db.commit()

    return {
        "message": "Pet updated successfully"
    }


@app.delete("/pets/{pet_id}")
def delete_pet(
    pet_id: int,
    db: Session = Depends(get_db)
):

    pet = db.query(
        models.Pet
    ).filter(
        models.Pet.pet_id == pet_id
    ).first()

    if pet is None:

        return {
            "message": "Pet not found"
        }

    db.delete(pet)
    db.commit()

    return {
        "message": "Pet deleted successfully"
    }


# ===================================================
# VETERINARIANS
# ===================================================

@app.post("/veterinarians")
def create_veterinarian(
    vet: VeterinarianCreate,
    db: Session = Depends(get_db)
):

    new_vet = models.Veterinarian(
        user_id=vet.user_id,
        specialization=vet.specialization,
        phone=vet.phone
    )

    db.add(new_vet)
    db.commit()
    db.refresh(new_vet)

    return {
        "message": "Veterinarian created successfully",
        "vet_id": new_vet.vet_id
    }


@app.get("/veterinarians")
def get_veterinarians(
    db: Session = Depends(get_db)
):

    return db.query(
        models.Veterinarian
    ).all()


@app.get("/veterinarians/user/{user_id}")
def get_veterinarian_by_user(
    user_id: int,
    db: Session = Depends(get_db)
):

    vet = db.query(
        models.Veterinarian
    ).filter(
        models.Veterinarian.user_id == user_id
    ).first()

    if vet is None:

        return {
            "message": "Veterinarian profile not found"
        }

    return vet


# ===================================================
# UPDATE VETERINARIAN
# ===================================================

@app.put("/veterinarians/{vet_id}")
def update_veterinarian(
    vet_id: int,
    vet: VeterinarianCreate,
    db: Session = Depends(get_db)
):

    existing_vet = db.query(
        models.Veterinarian
    ).filter(
        models.Veterinarian.vet_id == vet_id
    ).first()

    if existing_vet is None:
        return {
            "message": "Veterinarian not found"
        }

    existing_vet.specialization = vet.specialization
    existing_vet.phone = vet.phone

    db.commit()

    return {
        "message": "Veterinarian updated successfully"
    }


# ===================================================
# DELETE VETERINARIAN
# ===================================================

@app.delete("/veterinarians/{vet_id}")
def delete_veterinarian(
    vet_id: int,
    db: Session = Depends(get_db)
):

    existing_vet = db.query(
        models.Veterinarian
    ).filter(
        models.Veterinarian.vet_id == vet_id
    ).first()

    if existing_vet is None:
        return {
            "message": "Veterinarian not found"
        }

    # Check for existing appointments
    existing_appointments = db.query(
        models.Appointment
    ).filter(
        models.Appointment.vet_id == vet_id
    ).first()

    if existing_appointments:
        return {
            "message": (
                "Cannot delete veterinarian because "
                "appointments are linked to this profile."
            )
        }

    # Check for existing medical records
    existing_records = db.query(
        models.MedicalRecord
    ).filter(
        models.MedicalRecord.vet_id == vet_id
    ).first()

    if existing_records:
        return {
            "message": (
                "Cannot delete veterinarian because "
                "medical records are linked to this profile."
            )
        }

    db.delete(existing_vet)
    db.commit()

    return {
        "message": "Veterinarian deleted successfully"
    }

# ===================================================
# APPOINTMENTS
# ===================================================

@app.post("/appointments")
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):

    new_appointment = models.Appointment(
        pet_id=appointment.pet_id,
        vet_id=appointment.vet_id,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        reason=appointment.reason,
        status=appointment.status
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    return {
        "message": "Appointment created successfully",
        "appointment_id": new_appointment.appointment_id
    }


@app.get("/appointments")
def get_appointments(
    db: Session = Depends(get_db)
):

    return db.query(
        models.Appointment
    ).all()



# ===================================================
# VETERINARIAN APPOINTMENTS
# ===================================================

@app.get("/veterinarians/{vet_id}/appointments")
def get_vet_appointments(
    vet_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the veterinarian profile linked to the logged-in user
    veterinarian = db.query(models.Veterinarian).filter(
        models.Veterinarian.vet_id == vet_id,
        models.Veterinarian.user_id == current_user.user_id
    ).first()

    # Veterinarians can access only their own appointments
    if current_user.role == "vet" and veterinarian is None:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access these appointments"
        )

    # Only veterinarians and administrators can access this endpoint
    if current_user.role not in ["vet", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return db.query(
        models.Appointment
    ).filter(
        models.Appointment.vet_id == vet_id
    ).all()



@app.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):

    appointment = db.query(
        models.Appointment
    ).filter(
        models.Appointment.appointment_id == appointment_id
    ).first()

    if appointment is None:

        return {
            "message": "Appointment not found"
        }

    return appointment



@app.put("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: int,
    appointment: AppointmentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the appointment
    existing_appointment = db.query(
        models.Appointment
    ).filter(
        models.Appointment.appointment_id == appointment_id
    ).first()

    if existing_appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    # Only veterinarians and administrators can update appointments
    if current_user.role not in ["vet", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update appointments"
        )

    new_status = appointment.status.strip().capitalize()

    allowed_statuses = [
        "Pending",
        "Confirmed",
        "Rejected",
        "Completed"
    ]

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment status"
        )

    # VETERINARIAN PERMISSIONS
    if current_user.role == "vet":

        # Find the veterinarian profile belonging to this user
        veterinarian = db.query(
            models.Veterinarian
        ).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        # Veterinarians can update only their assigned appointments
        if existing_appointment.vet_id != veterinarian.vet_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot update another veterinarian's appointment"
            )

        # Allowed veterinarian status transitions
        current_status = (existing_appointment.status or "Pending").strip().capitalize()

        allowed_transitions = {
            "Pending": ["Confirmed", "Rejected"],
            "Confirmed": ["Completed"]
        }

        if new_status not in allowed_transitions.get(current_status, []):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot change appointment from {current_status} to {new_status}"
            )

        # Veterinarians can change status only.
        # Appointment details remain unchanged.
        existing_appointment.status = new_status

    # ADMIN PERMISSIONS
    elif current_user.role == "admin":

        # Admin can manage all appointment details and statuses
        existing_appointment.pet_id = appointment.pet_id
        existing_appointment.vet_id = appointment.vet_id
        existing_appointment.appointment_date = appointment.appointment_date
        existing_appointment.appointment_time = appointment.appointment_time
        existing_appointment.reason = appointment.reason
        existing_appointment.status = new_status

    try:
        db.commit()
        db.refresh(existing_appointment)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update appointment"
        )

    return {
        "message": "Appointment updated successfully",
        "appointment_id": existing_appointment.appointment_id,
        "status": existing_appointment.status
    }

@app.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):

    appointment = db.query(
        models.Appointment
    ).filter(
        models.Appointment.appointment_id == appointment_id
    ).first()

    if appointment is None:

        return {
            "message": "Appointment not found"
        }

    db.delete(appointment)
    db.commit()

    return {
        "message": "Appointment deleted successfully"
    }



# ===================================================
# MEDICAL RECORDS
# ===================================================



# 1. CREATE MEDICAL RECORD
@app.post("/medical-records")
def create_medical_record(
    record: MedicalRecordCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only veterinarians and administrators can create records
    if current_user.role not in ["vet", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only veterinarians and administrators can create medical records"
        )

    # Verify that the pet exists
    pet = db.query(models.Pet).filter(
        models.Pet.pet_id == record.pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Pet not found"
        )

    # Verify veterinarian authorization
    if current_user.role == "vet":
        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        if record.vet_id != veterinarian.vet_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot create records using another veterinarian's ID"
            )

    else:
        # Verify the submitted veterinarian exists
        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.vet_id == record.vet_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=404,
                detail="Veterinarian not found"
            )

    # OPTIONAL: Validate linked appointment
    linked_appointment = None

    if record.appointment_id is not None:
        linked_appointment = db.query(models.Appointment).filter(
            models.Appointment.appointment_id == record.appointment_id
        ).first()

        if linked_appointment is None:
            raise HTTPException(
                status_code=404,
                detail="Linked appointment not found"
            )

        # Ensure the appointment belongs to the same pet and veterinarian
        if (
            linked_appointment.pet_id != record.pet_id
            or linked_appointment.vet_id != record.vet_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Medical record details do not match the linked appointment"
            )

        # Veterinarians can only complete their own appointments
        if (
            current_user.role == "vet"
            and linked_appointment.vet_id != veterinarian.vet_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You cannot update another veterinarian's appointment"
            )

        # Only confirmed appointments can be completed through this process
        if linked_appointment.status != "Confirmed":
            raise HTTPException(
                status_code=400,
                detail="Only confirmed appointments can be completed through a medical record"
            )

    # Create the medical record
    new_record = models.MedicalRecord(
        pet_id=record.pet_id,
        vet_id=record.vet_id,
        diagnosis=record.diagnosis,
        treatment=record.treatment,
        prescription=record.prescription,
        record_date=record.record_date
    )

    try:
        db.add(new_record)

        # Automatically complete the linked appointment
        if linked_appointment is not None:
            linked_appointment.status = "Completed"

        # Save both changes together
        db.commit()
        db.refresh(new_record)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create medical record"
        )

    return {
        "message": "Medical record created successfully",
        "record_id": new_record.record_id,
        "appointment_id": record.appointment_id,
        "appointment_status": (
            linked_appointment.status
            if linked_appointment is not None
            else None
        )
    }

# 2. GET ALL MEDICAL RECORDS
@app.get("/medical-records")
def get_medical_records(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Administrators can view all medical records
    if current_user.role == "admin":
        return db.query(
            models.MedicalRecord
        ).all()

    # Only veterinarians can access the remaining records
    if current_user.role != "vet":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view medical records"
        )

    # Find the veterinarian profile linked to this user
    veterinarian = db.query(
        models.Veterinarian
    ).filter(
        models.Veterinarian.user_id == current_user.user_id
    ).first()

    if veterinarian is None:
        raise HTTPException(
            status_code=403,
            detail="Veterinarian profile not found"
        )

    # Return records associated with this veterinarian
    return db.query(
        models.MedicalRecord
    ).filter(
        models.MedicalRecord.vet_id == veterinarian.vet_id
    ).all()



# 3. GET MEDICAL RECORDS OF A USER
@app.get("/users/{user_id}/medical-records")
def get_user_medical_records(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Owners can access only their own records
    if current_user.role == "owner":
        if current_user.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access these records"
            )

    # Find the veterinarian profile for veterinarian accounts
    elif current_user.role == "vet":
        veterinarian = db.query(
            models.Veterinarian
        ).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

    # Only owners, veterinarians and admins are allowed
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    # Find pets belonging to the requested owner
    pets = db.query(
        models.Pet
    ).filter(
        models.Pet.user_id == user_id
    ).all()

    pet_ids = [pet.pet_id for pet in pets]

    if not pet_ids:
        return []

    # Build the medical-record query
    query = db.query(
        models.MedicalRecord
    ).filter(
        models.MedicalRecord.pet_id.in_(pet_ids)
    )

    # Veterinarians can view only their associated records
    if current_user.role == "vet":
        query = query.filter(
            models.MedicalRecord.vet_id == veterinarian.vet_id
        )

    return query.all()



# 4. GET MEDICAL RECORDS OF A PET
@app.get("/pets/{pet_id}/medical-records")
def get_pet_medical_records(
    pet_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the requested pet
    pet = db.query(
        models.Pet
    ).filter(
        models.Pet.pet_id == pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Pet not found"
        )

    # Owners can access only their own pets
    if current_user.role == "owner":
        if pet.user_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access this pet's records"
            )

        return db.query(
            models.MedicalRecord
        ).filter(
            models.MedicalRecord.pet_id == pet_id
        ).all()

    # Veterinarians can access records associated with their profile
    elif current_user.role == "vet":
        veterinarian = db.query(
            models.Veterinarian
        ).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        return db.query(
            models.MedicalRecord
        ).filter(
            models.MedicalRecord.pet_id == pet_id,
            models.MedicalRecord.vet_id == veterinarian.vet_id
        ).all()

    # Administrators can access all pet medical records
    elif current_user.role == "admin":
        return db.query(
            models.MedicalRecord
        ).filter(
            models.MedicalRecord.pet_id == pet_id
        ).all()

    raise HTTPException(
        status_code=403,
        detail="Access denied"
    )



# 5. GET A SINGLE MEDICAL RECORD
@app.get("/medical-records/{record_id}")
def get_medical_record(
    record_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = db.query(
        models.MedicalRecord
    ).filter(
        models.MedicalRecord.record_id == record_id
    ).first()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    pet = db.query(
        models.Pet
    ).filter(
        models.Pet.pet_id == record.pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Associated pet not found"
        )

    # Owners can access only records belonging to their pets
    if current_user.role == "owner":
        if pet.user_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access this record"
            )

    # Veterinarians can access records associated with their profile
    elif current_user.role == "vet":
        veterinarian = db.query(
            models.Veterinarian
        ).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None or record.vet_id != veterinarian.vet_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access this record"
            )

    # Administrators can access all records
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return record



# 6. UPDATE MEDICAL RECORD
@app.put("/medical-records/{record_id}")
def update_medical_record(
    record_id: int,
    record: MedicalRecordCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_record = db.query(models.MedicalRecord).filter(
        models.MedicalRecord.record_id == record_id
    ).first()

    if existing_record is None:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    if current_user.role == "vet":

        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        if existing_record.vet_id != veterinarian.vet_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to update this record"
            )

        if record.pet_id != existing_record.pet_id or record.vet_id != existing_record.vet_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot change the pet or veterinarian assigned to this record"
            )

    elif current_user.role == "admin":

        pet = db.query(models.Pet).filter(
            models.Pet.pet_id == record.pet_id
        ).first()

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found"
            )

        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.vet_id == record.vet_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=404,
                detail="Veterinarian not found"
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update medical records"
        )

    existing_record.diagnosis = record.diagnosis
    existing_record.treatment = record.treatment
    existing_record.prescription = record.prescription
    existing_record.record_date = record.record_date

    if current_user.role == "admin":
        existing_record.pet_id = record.pet_id
        existing_record.vet_id = record.vet_id

    try:
        db.commit()
        db.refresh(existing_record)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update medical record"
        )

    return {
        "message": "Medical record updated successfully"
    }



# 7. DELETE MEDICAL RECORD
@app.delete("/medical-records/{record_id}")
def delete_medical_record(
    record_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can delete medical records"
        )

    record = db.query(models.MedicalRecord).filter(
        models.MedicalRecord.record_id == record_id
    ).first()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    try:
        db.delete(record)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete medical record"
        )

    return {
        "message": "Medical record deleted successfully"
    }


# ===================================================
# MEDICAL DOCUMENT UPLOAD
# ===================================================

@app.post("/medical-documents/upload")
async def upload_medical_document(
    pet_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only owners can upload medical documents
    if current_user.role != "owner":
        raise HTTPException(
            status_code=403,
            detail="Only pet owners can upload medical documents"
        )

    # Verify that the pet belongs to the logged-in owner
    pet = db.query(models.Pet).filter(
        models.Pet.pet_id == pet_id,
        models.Pet.user_id == current_user.user_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Pet not found or you do not own this pet"
        )

    # Validate file extension
    original_filename = Path(file.filename or "").name
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG, JPEG and PNG files are allowed"
        )

    # Read at most 10 MB + 1 byte to enforce the size limit
    file_content = await file.read(MAX_FILE_SIZE + 1)

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size cannot exceed 10 MB"
        )

    # Determine content type from the allowed extension
    content_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png"
    }

    content_type = content_types[extension]

    # Generate a unique stored filename
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    storage_path = UPLOAD_DIR / stored_filename

    # Calculate SHA-256 file hash
    file_hash = hashlib.sha256(file_content).hexdigest()

    try:
        # Save file to Backend/uploads
        storage_path.write_bytes(file_content)

        # Save document metadata to MySQL
        new_document = models.MedicalDocument(
            pet_id=pet_id,
            owner_id=current_user.user_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            storage_path=str(storage_path),
            content_type=content_type,
            file_size=len(file_content),
            file_hash=file_hash,
            processing_status="Pending",
            verification_status="Pending"
        )

        db.add(new_document)
        db.commit()
        db.refresh(new_document)

    except Exception:
        db.rollback()

        # Remove saved file if database operation fails
        if storage_path.exists():
            storage_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Unable to upload medical document"
        )

    return {
        "message": "Medical document uploaded successfully",
        "document_id": new_document.document_id,
        "pet_id": new_document.pet_id,
        "filename": new_document.original_filename,
        "file_size": new_document.file_size,
        "processing_status": new_document.processing_status
    }


# ===================================================
# GET MEDICAL DOCUMENTS FOR A PET
# ===================================================

@app.get("/pets/{pet_id}/medical-documents")
def get_pet_medical_documents(
    pet_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify pet exists
    pet = db.query(models.Pet).filter(
        models.Pet.pet_id == pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Pet not found"
        )

    # OWNER: Can view documents of their own pets
    if current_user.role == "owner":
        if pet.user_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot access this pet's documents"
            )

    # VETERINARIAN: Can view documents of assigned pets
    elif current_user.role == "vet":
        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        has_appointment = db.query(models.Appointment).filter(
            models.Appointment.pet_id == pet_id,
            models.Appointment.vet_id == veterinarian.vet_id
        ).first()

        has_medical_record = db.query(models.MedicalRecord).filter(
            models.MedicalRecord.pet_id == pet_id,
            models.MedicalRecord.vet_id == veterinarian.vet_id
        ).first()

        if not has_appointment and not has_medical_record:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this pet"
            )

    # ADMIN: Can view all pet documents
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    documents = db.query(
        models.MedicalDocument
    ).filter(
        models.MedicalDocument.pet_id == pet_id
    ).order_by(
        models.MedicalDocument.uploaded_at.desc()
    ).all()

    return [
        {
            "document_id": document.document_id,
            "pet_id": document.pet_id,
            "owner_id": document.owner_id,
            "filename": document.original_filename,
            "content_type": document.content_type,
            "file_size": document.file_size,
            "document_type": document.document_type,
            "document_date": document.document_date,
            "processing_status": document.processing_status,
            "verification_status": document.verification_status,
            "uploaded_at": document.uploaded_at
        }
        for document in documents
    ]


# ===================================================
# SECURE MEDICAL DOCUMENT DOWNLOAD
# ===================================================

@app.get("/medical-documents/{document_id}/download")
def download_medical_document(
    document_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find document
    document = db.query(
        models.MedicalDocument
    ).filter(
        models.MedicalDocument.document_id == document_id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Medical document not found"
        )

    # Find associated pet
    pet = db.query(models.Pet).filter(
        models.Pet.pet_id == document.pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Associated pet not found"
        )

    # OWNER: Only access documents belonging to their pets
    if current_user.role == "owner":
        if pet.user_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot download this document"
            )

    # VETERINARIAN: Only access documents for assigned pets
    elif current_user.role == "vet":
        veterinarian = db.query(
            models.Veterinarian
        ).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        has_appointment = db.query(
            models.Appointment
        ).filter(
            models.Appointment.pet_id == document.pet_id,
            models.Appointment.vet_id == veterinarian.vet_id
        ).first()

        has_medical_record = db.query(
            models.MedicalRecord
        ).filter(
            models.MedicalRecord.pet_id == document.pet_id,
            models.MedicalRecord.vet_id == veterinarian.vet_id
        ).first()

        if not has_appointment and not has_medical_record:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access this document"
            )

    # ADMIN: Can access all documents
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    # Verify that the stored file path is inside uploads directory
    upload_directory = UPLOAD_DIR.resolve()
    file_path = Path(document.storage_path).resolve()

    if not file_path.is_relative_to(upload_directory):
        raise HTTPException(
            status_code=400,
            detail="Invalid document storage path"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Document file not found on server"
        )

    return FileResponse(
        path=str(file_path),
        media_type=document.content_type,
        filename=document.original_filename
    )


# ===================================================
# EXTRACT TEXT FROM MEDICAL DOCUMENT
# ===================================================

@app.post("/medical-documents/{document_id}/extract")
def extract_medical_document(
    document_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find document
    document = db.query(models.MedicalDocument).filter(
        models.MedicalDocument.document_id == document_id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Medical document not found"
        )

    # Find associated pet
    pet = db.query(models.Pet).filter(
        models.Pet.pet_id == document.pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Associated pet not found"
        )

    # OWNER: Own pet documents only
    if current_user.role == "owner":
        if pet.user_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot process this document"
            )

    # VETERINARIAN: Assigned pets only
    elif current_user.role == "vet":
        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        has_appointment = db.query(models.Appointment).filter(
            models.Appointment.pet_id == document.pet_id,
            models.Appointment.vet_id == veterinarian.vet_id
        ).first()

        has_record = db.query(models.MedicalRecord).filter(
            models.MedicalRecord.pet_id == document.pet_id,
            models.MedicalRecord.vet_id == veterinarian.vet_id
        ).first()

        if not has_appointment and not has_record:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to process this document"
            )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    # Verify stored file path
    upload_directory = UPLOAD_DIR.resolve()
    file_path = Path(document.storage_path).resolve()

    if not file_path.is_relative_to(upload_directory):
        raise HTTPException(
            status_code=400,
            detail="Invalid document storage path"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Document file not found"
        )

    extracted_text = ""
    page_count = 0

    try:
        extension = file_path.suffix.lower()

        # IMAGE EXTRACTION
        if extension in [".jpg", ".jpeg", ".png"]:
            with Image.open(file_path) as image:
                extracted_text = pytesseract.image_to_string(
                    image,
                    lang="eng"
                )

            page_count = 1

        # PDF EXTRACTION
        elif extension == ".pdf":
            with fitz.open(file_path) as pdf:
                page_count = len(pdf)

                if page_count > 20:
                    raise HTTPException(
                        status_code=400,
                        detail="PDF cannot contain more than 20 pages"
                    )

                extracted_pages = []

                for page_number, page in enumerate(pdf):
                    page_text = page.get_text().strip()

                    # Use OCR for scanned pages
                    if not page_text:
                        pixmap = page.get_pixmap(
                            matrix=fitz.Matrix(2, 2),
                            alpha=False
                        )

                        image_bytes = pixmap.tobytes("png")

                        with Image.open(
                            io.BytesIO(image_bytes)
                        ) as image:
                            page_text = pytesseract.image_to_string(
                                image,
                                lang="eng"
                            )

                    extracted_pages.append(
                        f"Page {page_number + 1}\n{page_text}"
                    )

                extracted_text = "\n\n".join(extracted_pages)

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported document format"
            )

        # Prepare extraction information
        extraction_status = (
            "Completed" if extracted_text.strip() else "Failed"
        )

        extracted_fields = {
            "page_count": page_count,
            "file_type": extension,
            "text_available": bool(extracted_text.strip())
        }

        # Check for an existing extraction
        existing_extraction = db.query(
            models.ExtractedMedicalData
        ).filter(
            models.ExtractedMedicalData.document_id == document_id
        ).first()

        if existing_extraction:
            existing_extraction.extracted_text = extracted_text
            existing_extraction.extracted_fields = extracted_fields
            existing_extraction.extraction_status = extraction_status
        else:
            new_extraction = models.ExtractedMedicalData(
                document_id=document_id,
                extracted_text=extracted_text,
                diagnosis=None,
                medications=[],
                treatments=[],
                extracted_fields=extracted_fields,
                confidence_scores=None,
                extraction_status=extraction_status
            )

            db.add(new_extraction)

        document.processing_status = extraction_status

        db.commit()

        if extraction_status == "Failed":
            return {
                "message": "No readable text was detected",
                "document_id": document_id,
                "processing_status": "Failed"
            }

        return {
            "message": "Medical document text extracted successfully",
            "document_id": document_id,
            "processing_status": extraction_status,
            "page_count": page_count,
            "extracted_text": extracted_text
        }

    except HTTPException:
        raise

    except Exception as error:
        db.rollback()

        try:
            document.processing_status = "Failed"
            db.commit()
        except Exception:
            db.rollback()

        print("DOCUMENT EXTRACTION ERROR:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to extract medical document text"
        )


# ===================================================
# AI MEDICAL DOCUMENT SUMMARIZATION
# ===================================================

@app.post("/medical-documents/{document_id}/summarize")
def summarize_document(
    document_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find document
    document = db.query(models.MedicalDocument).filter(
        models.MedicalDocument.document_id == document_id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Medical document not found"
        )

    # Find associated pet
    pet = db.query(models.Pet).filter(
        models.Pet.pet_id == document.pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Associated pet not found"
        )

    # OWNER: Own pet documents only
    if current_user.role == "owner":
        if pet.user_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot summarize this document"
            )

    # VETERINARIAN: Assigned pets only
    elif current_user.role == "vet":
        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        has_appointment = db.query(models.Appointment).filter(
            models.Appointment.pet_id == document.pet_id,
            models.Appointment.vet_id == veterinarian.vet_id
        ).first()

        has_record = db.query(models.MedicalRecord).filter(
            models.MedicalRecord.pet_id == document.pet_id,
            models.MedicalRecord.vet_id == veterinarian.vet_id
        ).first()

        if not has_appointment and not has_record:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to summarize this document"
            )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    # Find extracted medical text
    extraction = db.query(
        models.ExtractedMedicalData
    ).filter(
        models.ExtractedMedicalData.document_id == document_id
    ).first()

    if extraction is None or not extraction.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Extract the document text before generating a summary"
        )

    if extraction.extraction_status != "Completed":
        raise HTTPException(
            status_code=400,
            detail="Document extraction has not completed successfully"
        )

    try:
        # Generate AI summary
        summary = summarize_medical_document(
            extraction.extracted_text
        )

        # Store document reference with the insight
        insight = models.AIInsight(
            pet_id=document.pet_id,
            insight_type="Medical Document Summary",
            summary=summary,
            recommendations=None,
            source_references={
                "document_id": document_id,
                "original_filename": document.original_filename
            },
            confidence_score=None
        )

        db.add(insight)
        db.commit()
        db.refresh(insight)

        return {
            "message": "AI medical summary generated successfully",
            "document_id": document_id,
            "insight_id": insight.insight_id,
            "summary": summary
        }

    except HTTPException:
        raise

    except Exception as error:
        db.rollback()

        print("AI SUMMARIZATION ERROR:", str(error))

        raise HTTPException(
            status_code=502,
            detail="Unable to generate medical summary. Please try again later."
        )


# ===================================================
# GET SAVED AI SUMMARIES FOR A MEDICAL DOCUMENT
# ===================================================

@app.get("/medical-documents/{document_id}/summaries")
def get_document_summaries(
    document_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the requested document
    document = db.query(models.MedicalDocument).filter(
        models.MedicalDocument.document_id == document_id
    ).first()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Medical document not found"
        )

    # Find the associated pet
    pet = db.query(models.Pet).filter(
        models.Pet.pet_id == document.pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Associated pet not found"
        )

    # OWNER: Own pet documents only
    if current_user.role == "owner":
        if pet.user_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot access these summaries"
            )

    # VETERINARIAN: Assigned pets only
    elif current_user.role == "vet":
        veterinarian = db.query(models.Veterinarian).filter(
            models.Veterinarian.user_id == current_user.user_id
        ).first()

        if veterinarian is None:
            raise HTTPException(
                status_code=403,
                detail="Veterinarian profile not found"
            )

        has_appointment = db.query(models.Appointment).filter(
            models.Appointment.pet_id == document.pet_id,
            models.Appointment.vet_id == veterinarian.vet_id
        ).first()

        has_record = db.query(models.MedicalRecord).filter(
            models.MedicalRecord.pet_id == document.pet_id,
            models.MedicalRecord.vet_id == veterinarian.vet_id
        ).first()

        if not has_appointment and not has_record:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access these summaries"
            )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    # Retrieve saved insights belonging to this pet
    insights = db.query(models.AIInsight).filter(
        models.AIInsight.pet_id == document.pet_id,
        models.AIInsight.insight_type == "Medical Document Summary"
    ).order_by(
        models.AIInsight.created_at.desc()
    ).all()

    # Keep only summaries belonging to this document
    document_summaries = [
        {
            "insight_id": insight.insight_id,
            "document_id": document_id,
            "pet_id": insight.pet_id,
            "summary": insight.summary,
            "created_at": insight.created_at
        }
        for insight in insights
        if isinstance(insight.source_references, dict)
        and insight.source_references.get("document_id") == document_id
    ]

    return {
        "document_id": document_id,
        "total_summaries": len(document_summaries),
        "summaries": document_summaries
    }


# ===================================================
# AI VETERINARY HEALTH INSIGHTS
# ===================================================

@app.post("/medical-records/{record_id}/veterinary-health-insights")
def create_veterinary_health_insights(
    record_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only pet owners can generate these reports
    if current_user.role != "owner":
        raise HTTPException(
            status_code=403,
            detail="Only pet owners can generate veterinary health insights"
        )

    # Find the medical record
    medical_record = db.query(
        models.MedicalRecord
    ).filter(
        models.MedicalRecord.record_id == record_id
    ).first()

    if medical_record is None:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    # Find the associated pet
    pet = db.query(
        models.Pet
    ).filter(
        models.Pet.pet_id == medical_record.pet_id
    ).first()

    if pet is None:
        raise HTTPException(
            status_code=404,
            detail="Associated pet not found"
        )

    # Verify that this pet belongs to the logged-in owner
    if pet.user_id != current_user.user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this pet's record"
        )

    # Check whether insights already exist for this record
    existing_insight = db.query(
        models.AIInsight
    ).filter(
        models.AIInsight.pet_id == pet.pet_id,
        models.AIInsight.insight_type == "Veterinary Health Insights"
    ).all()

    for insight in existing_insight:
        references = insight.source_references or {}

        if references.get("record_id") == record_id:
            return {
                "message": "Veterinary health insights already exist",
                "record_id": record_id,
                "report": insight.summary,
                "sources": references.get("sources", []),
                "created_at": insight.created_at
            }

    # Prepare pet and medical record details for Gemini
    pet_details = {
        "pet_name": pet.pet_name,
        "species": pet.species,
        "breed": pet.breed,
        "age": pet.age,
        "gender": pet.gender
    }

    medical_record_details = {
        "record_id": medical_record.record_id,
        "diagnosis": medical_record.diagnosis,
        "treatment": medical_record.treatment,
        "prescription": medical_record.prescription,
        "record_date": str(medical_record.record_date)
    }

    # Generate AI insights
    try:
        result = generate_veterinary_health_insights(
            pet_details,
            medical_record_details
        )

        report = result.get("report")
        sources = result.get("sources", [])

        if not report:
            raise RuntimeError("The AI returned an empty report.")

    except Exception as e:
        print("Veterinary health insight generation error:", str(e))
        raise HTTPException(
            status_code=502,
            detail="Unable to generate veterinary health insights"
        )

    # Save the generated report
    new_insight = models.AIInsight(
        pet_id=pet.pet_id,
        insight_type="Veterinary Health Insights",
        summary=report,
        recommendations="See the full veterinary health insights report.",
        source_references={
            "record_id": record_id,
            "sources": sources
        },
        confidence_score=None
    )

    try:
        db.add(new_insight)
        db.commit()
        db.refresh(new_insight)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save veterinary health insights"
        )

    return {
        "message": "Veterinary health insights generated successfully",
        "record_id": record_id,
        "report": new_insight.summary,
        "sources": sources,
        "created_at": new_insight.created_at
    }


# ===================================================
# ADMIN
# ===================================================

# ---------------------------------------------------
# ADMIN DASHBOARD STATISTICS
# ---------------------------------------------------

@app.get("/admin/stats")
def admin_stats(
    db: Session = Depends(get_db)
):

    total_users = db.query(
        models.User
    ).count()

    total_pets = db.query(
        models.Pet
    ).count()

    total_vets = db.query(
        models.Veterinarian
    ).count()

    total_appointments = db.query(
        models.Appointment
    ).count()

    total_records = db.query(
        models.MedicalRecord
    ).count()

    return {
        "total_users": total_users,
        "total_pets": total_pets,
        "total_veterinarians": total_vets,
        "total_appointments": total_appointments,
        "total_medical_records": total_records
    }