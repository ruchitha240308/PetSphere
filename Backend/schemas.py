from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str


class OwnerRegister(BaseModel):
    name: str
    email: str
    password: str

class PetCreate(BaseModel):
    user_id: int
    pet_name: str
    species: str
    breed: str | None = None
    age: int | None = None
    gender: str | None = None

class AppointmentCreate(BaseModel):
    pet_id: int
    vet_id: int
    appointment_date: str
    appointment_time: str
    reason: str
    status: str = "Pending"

class VeterinarianCreate(BaseModel):
    user_id: int
    specialization: str
    phone: str


class MedicalRecordCreate(BaseModel):
    pet_id: int
    vet_id: int
    diagnosis: str
    treatment: str
    prescription: str
    record_date: str
    appointment_id: int | None = None

class UserLogin(BaseModel):
    email: str
    password: str