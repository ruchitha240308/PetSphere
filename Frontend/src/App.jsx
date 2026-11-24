import { useState } from 'react';
import './App.css';

function App() {

  // ===================================================
  // GENERAL
  // ===================================================

  const [page, setPage] = useState('home');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // ===================================================
  // LOGIN
  // ===================================================

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const passwordStrength = (() => {
  if (!password) return '';

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Medium';
  return 'Strong';
})();

  const [signupName, setSignupName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');

  // ===================================================
  // VETERINARIAN
  // ===================================================

  const [vetId, setVetId] = useState(null);
  const [vetSpecialization, setVetSpecialization] = useState('');

  // ===================================================
  // PETS
  // ===================================================

  const [pets, setPets] = useState([]);

  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  // ===================================================
  // VETERINARIANS
  // ===================================================

  const [vets, setVets] = useState([]);

  // ===================================================
  // APPOINTMENTS
  // ===================================================

  const [appointments, setAppointments] = useState([]);

  const [selectedPet, setSelectedPet] = useState('');
  const [selectedVet, setSelectedVet] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [reason, setReason] = useState('');

  // ===================================================
  // MEDICAL RECORDS
  // ===================================================

  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalDocuments, setMedicalDocuments] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(null);
  const [aiSummaries, setAiSummaries] = useState({});


  const [recordPetId, setRecordPetId] = useState('');
  const [recordAppointmentId, setRecordAppointmentId] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');
  const [recordDate, setRecordDate] = useState('');

  // ===================================================
  // ADMIN
  // ===================================================

  const [adminStats, setAdminStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allVets, setAllVets] = useState([]);
  const [editingVetId, setEditingVetId] = useState(null);
  const [editVetSpecialization, setEditVetSpecialization] = useState('');
  const [editVetPhone, setEditVetPhone] = useState('');
  const [allPets, setAllPets] = useState([]);
  const [editingPetId, setEditingPetId] = useState(null);

  const [editPetName, setEditPetName] = useState('');
  const [editSpecies, setEditSpecies] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [allAppointments, setAllAppointments] = useState([]);
  const [allRecords, setAllRecords] = useState([]);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');

  // ===================================================
  // OWNER LOGIN
  // ===================================================

  const handleLogin = async () => {

    try {

      const response = await fetch(
        'http://localhost:8000/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.user_id) {
        sessionStorage.setItem("access_token", data.access_token);

        if (data.role !== 'owner') {

          setMessage(
            'This account is not a pet owner account.'
          );

          return;
        }

        
setUserId(data.user_id);
setUserName(data.name);

// Load dashboard information immediately after login
try {
  const token = data.access_token;

  const [petsResponse, appointmentsResponse, recordsResponse] =
    await Promise.all([
      fetch(`http://localhost:8000/users/${data.user_id}/pets`),

      fetch('http://localhost:8000/appointments'),

      fetch(
        `http://localhost:8000/users/${data.user_id}/medical-records`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
    ]);

  const petsData = petsResponse.ok
    ? await petsResponse.json()
    : [];

  const appointmentsData = appointmentsResponse.ok
    ? await appointmentsResponse.json()
    : [];

  const recordsData = recordsResponse.ok
    ? await recordsResponse.json()
    : [];

  const ownerPets = Array.isArray(petsData) ? petsData : [];

  const ownerPetIds = ownerPets.map(pet => pet.pet_id);

  const ownerAppointments = Array.isArray(appointmentsData)
    ? appointmentsData.filter(appointment =>
        ownerPetIds.includes(appointment.pet_id)
      )
    : [];

  const ownerRecords = Array.isArray(recordsData)
    ? recordsData
    : [];

  setPets(ownerPets);
  setAppointments(ownerAppointments);
  setMedicalRecords(ownerRecords);

} catch (error) {
  console.error('Dashboard data loading error:', error);
}

setMessage('Login successful');
setPage('dashboard');


      } else {

        setMessage(
          data.message ||
          'Invalid email or password'
        );
      }

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  // ===================================================
  // OWNER SIGNUP
  // ===================================================

  const handleSignup = async () => {
    setMessage('');

    const name = signupName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!name || !cleanEmail || !password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(cleanEmail)) {
  setMessage('Please enter a valid email address.');
  return;
}

    if (password.length < 8) {
      setMessage('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessageType('error');
      setMessageType('error');
      setMessage('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch(
        'http://localhost:8000/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: name,
            email: cleanEmail,
            password: password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail || data.message || 'Registration failed.'
        );
        return;
      }

      setMessageType('success');

      setMessageType('success');
      setMessage('Account created successfully! You can now log in.');

      setSignupName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);

      setTimeout(() => {
        setMessage('');
        setPage('login');
      }, 1800);

    } catch (error) {
      console.error('Signup error:', error);
      setMessage('Cannot connect to server. Please try again.');
    }
  };

  
// ===================================================
// VET LOGIN
// ===================================================

const handleVetLogin = async () => {
    try {
        const response = await fetch(
            'http://localhost:8000/login',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.user_id) {
            setMessage(
                data.message || 'Invalid email or password'
            );
            return;
        }

        if (data.role !== 'vet') {
            setMessage(
                'This account is not a veterinarian account.'
            );
            return;
        }

        const vetResponse = await fetch(
            `http://localhost:8000/veterinarians/user/${data.user_id}`
        );

        const vetData = await vetResponse.json();

        if (!vetResponse.ok || !vetData.vet_id) {
            setMessage(
                'Veterinarian profile not found.'
            );
            return;
        }

        // Store JWT token after successful verification
        sessionStorage.setItem(
            "access_token",
            data.access_token
        );

        setUserId(data.user_id);
        setUserName(data.name);

        setVetId(vetData.vet_id);
        setVetSpecialization(
            vetData.specialization
        );

        setMessage('Login successful');

        setPage('vet-dashboard');

    } catch (error) {
        console.error("Veterinarian login error:", error);
        setMessage('Cannot connect to server');
    }
};



  // ===================================================
  // ADMIN LOGIN
  // ===================================================

  const handleAdminLogin = async () => {

    try {

      const response = await fetch(
        'http://localhost:8000/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.user_id) {

        setMessage(
          data.message ||
          'Invalid email or password'
        );

        return;
      }

      if (data.role !== 'admin') {

        setMessage(
          'This account is not an admin account.'
        );

        return;
      }

      setUserId(data.user_id);
      setUserName(data.name);

      // Save authentication token for dashboard API requests
if (data.access_token) {
  sessionStorage.setItem('access_token', data.access_token);
}

      setMessage('Login successful');
      
      await loadAdminDashboard();

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  // ===================================================
  // ADD PET
  // ===================================================

  const handleAddPet = async () => {

    if (!userId) {

      setMessage('Please login first');
      return;
    }

    if (!petName || !species) {

      setMessage(
        'Please enter pet name and species'
      );

      return;
    }

    try {

      const response = await fetch(
        'http://localhost:8000/pets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            pet_name: petName,
            species: species,
            breed: breed,
            age: age ? Number(age) : null,
            gender: gender
          })
        }
      );

      const data = await response.json();

      if (response.ok) {

        setMessage(
          'Pet added successfully! Pet ID: ' +
          data.pet_id
        );

        setPetName('');
        setSpecies('');
        setBreed('');
        setAge('');
        setGender('');

      } else {

        setMessage('Failed to add pet');
      }

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  // ===================================================
  // OWNER PETS
  // ===================================================

  const handleViewPets = async () => {

    try {

      const response = await fetch(
        `http://localhost:8000/users/${userId}/pets`
      );

      const data = await response.json();

      if (response.ok) {

        setPets(data);
        setPage('view-pets');

      }

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  // ===================================================
  // BOOK APPOINTMENT PAGE
  // ===================================================

  const openAppointmentPage = async () => {

    try {

      const petResponse = await fetch(
        `http://localhost:8000/users/${userId}/pets`
      );

      const petData = await petResponse.json();

      if (petResponse.ok) {
        setPets(petData);
      }

      const vetResponse = await fetch(
        'http://localhost:8000/veterinarians'
      );

      const vetData = await vetResponse.json();

      if (vetResponse.ok) {
        setVets(vetData);
      }

      setPage('book-appointment');

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  // ===================================================
  // BOOK APPOINTMENT
  // ===================================================

  const handleBookAppointment = async () => {

    if (
      !selectedPet ||
      !selectedVet ||
      !appointmentDate ||
      !appointmentTime ||
      !reason
    ) {

      setMessage(
        'Please fill all appointment details'
      );

      return;
    }

    try {

      const response = await fetch(
        'http://localhost:8000/appointments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pet_id: Number(selectedPet),
            vet_id: Number(selectedVet),
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            reason: reason,
            status: 'Pending'
          })
        }
      );

      const data = await response.json();

      if (response.ok) {

        setMessage(
          'Appointment booked successfully! Appointment ID: ' +
          data.appointment_id
        );

        setSelectedPet('');
        setSelectedVet('');
        setAppointmentDate('');
        setAppointmentTime('');
        setReason('');

      } else {

        setMessage(
          'Failed to book appointment'
        );
      }

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  // ===================================================
  // OWNER APPOINTMENTS
  // ===================================================

  const handleViewAppointments = async () => {

    try {

      const petResponse = await fetch(
        `http://localhost:8000/users/${userId}/pets`
      );

      const myPets = await petResponse.json();

      setPets(myPets);

      const appointmentResponse = await fetch(
        'http://localhost:8000/appointments'
      );

      const data = await appointmentResponse.json();

      if (appointmentResponse.ok) {

        const myPetIds = myPets.map(
          (pet) => pet.pet_id
        );

        const myAppointments = data.filter(
          (appointment) =>
            myPetIds.includes(
              appointment.pet_id
            )
        );

        setAppointments(myAppointments);

        setPage('view-appointments');
      }

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  
// ===================================================
// OWNER MEDICAL RECORDS
// ===================================================


const handleViewMedicalRecords = async () => {
  try {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setMessage("Please login again. Authentication token not found.");
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // Fetch owner's pets and existing medical records
    const [petsResponse, recordsResponse] = await Promise.all([
      fetch(`http://localhost:8000/users/${userId}/pets`, {
        headers
      }),
      fetch(`http://localhost:8000/users/${userId}/medical-records`, {
        headers
      })
    ]);

    if (!petsResponse.ok || !recordsResponse.ok) {
      throw new Error("Unable to load medical records.");
    }

    const petsData = await petsResponse.json();
    const recordsData = await recordsResponse.json();

    const ownerPets = Array.isArray(petsData) ? petsData : [];

    // Fetch uploaded documents belonging to each of the owner's pets
    const documentResponses = await Promise.all(
      ownerPets.map(pet =>
        fetch(
          `http://localhost:8000/pets/${pet.pet_id}/medical-documents`,
          { headers }
        )
      )
    );

    const documentLists = await Promise.all(
      documentResponses.map(async response => {
        if (!response.ok) {
          throw new Error("Unable to load uploaded medical documents.");
        }

        return response.json();
      })
    );

    const allDocuments = documentLists.flat();

      // Retrieve previously saved AI summaries
      const summaryResponses = await Promise.all(
        allDocuments.map(async (document) => {
          try {
            const response = await fetch(
              `http://localhost:8000/medical-documents/${document.document_id}/summaries`,
              { headers }
            );

            if (!response.ok) {
              console.error(
                "Unable to retrieve summaries for document:",
                document.document_id
              );
              return {
                documentId: document.document_id,
                summary: null
              };
            }

            const data = await response.json();

            // API returns summaries newest first
            const latestSummary = data.summaries?.[0];

            return {
              documentId: document.document_id,
              summary: latestSummary?.summary || null
            };

          } catch (error) {
            console.error("Summary retrieval error:", error);

            return {
              documentId: document.document_id,
              summary: null
            };
          }
        })
      );

      const savedSummaries = {};

      summaryResponses.forEach(item => {
        if (item.summary) {
          savedSummaries[item.documentId] = item.summary;
        }
      });


    setPets(ownerPets);
    setMedicalRecords(Array.isArray(recordsData) ? recordsData : []);
    setMedicalDocuments(allDocuments);
    setAiSummaries(savedSummaries);

    setPage("medical-records");

  } catch (error) {
    console.error("Medical records error:", error);
    setMessage(error.message || "Cannot connect to server");
  }
};  


const handleGenerateAISummary = async (documentId) => {
  try {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setMessage("Please log in again. Authentication token missing.");
      return;
    }

    setSummaryLoading(documentId);
    setMessage("");

    const response = await fetch(
      `http://localhost:8000/medical-documents/${documentId}/summarize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to generate AI medical summary."
      );
    }

    setAiSummaries(previous => ({
      ...previous,
      [documentId]: data.summary
    }));

    setMessage("AI medical summary generated successfully.");

  } catch (error) {
    console.error("AI summary generation error:", error);
    setMessage(error.message || "Unable to generate AI summary.");
  } finally {
    setSummaryLoading(null);
  }
};

  
// ===================================================
// OWNER MEDICAL RECORDS
// ===================================================



  // ===================================================
  // VET APPOINTMENTS
  // ===================================================

  
// ===================================================
// VET APPOINTMENTS
// ===================================================

const handleVetAppointments = async () => {
    try {
        const token = sessionStorage.getItem("access_token");

        if (!token) {
            setMessage("Please login again. Authentication token not found.");
            return;
        }

        const response = await fetch(
            `http://localhost:8000/veterinarians/${vetId}/appointments`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (response.ok) {
            setAppointments(data);
            setPage("vet-appointments");
        } else {
            setMessage(data.detail || "Unable to load appointments");
        }

    } catch (error) {
        console.error("Vet appointments error:", error);
        setMessage("Cannot connect to server");
    }
};


  // ===================================================
  // VET PET DETAILS
  // ===================================================

  const handleVetPetDetails = async (petId) => {

    try {

      const response = await fetch(
        `http://localhost:8000/pets/${petId}`
      );

      const data = await response.json();

      if (response.ok) {

        setPets([data]);

        setPage('vet-pet-details');
      }

    } catch (error) {

      setMessage('Cannot connect to server');
    }
  };


  // ===================================================
  // ADD MEDICAL RECORD PAGE
  // ===================================================

  
const openMedicalRecordPage = (petId, appointmentId = null) => {

  setRecordPetId(String(petId));
  setRecordAppointmentId(appointmentId);

  setDiagnosis('');
  setTreatment('');
  setPrescription('');

  setRecordDate(
    new Date()
      .toISOString()
      .split('T')[0]
  );

  setMessage('');
  setPage('add-medical-record');
};


// ===================================================
// VETERINARIAN UPDATE APPOINTMENT STATUS
// ===================================================

const handleVetAppointmentStatus = async (appointment, newStatus) => {
  try {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      setMessage('Please log in again. Authentication token missing.');
      return;
    }

    const response = await fetch(
      `http://localhost:8000/appointments/${appointment.appointment_id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pet_id: appointment.pet_id,
          vet_id: appointment.vet_id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          reason: appointment.reason || '',
          status: newStatus
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || data.message || 'Failed to update appointment.');
      return;
    }

    // Refresh the veterinarian's appointments
    const refreshResponse = await fetch(
      `http://localhost:8000/veterinarians/${vetId}/appointments`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!refreshResponse.ok) {
      setMessage('Status updated, but appointments could not be refreshed.');
      return;
    }

    const refreshedAppointments = await refreshResponse.json();

    setAppointments(refreshedAppointments);

    setMessage(
      `Appointment #${appointment.appointment_id} updated to ${newStatus}.`
    );

  } catch (error) {
    console.error('Veterinarian appointment update error:', error);
    setMessage('Cannot connect to server while updating appointment.');
  }
};



// ===================================================
// ADD MEDICAL RECORD
// ===================================================

const handleAddMedicalRecord = async () => {
  if (!diagnosis || !treatment || !prescription || !recordDate) {
    setMessage('Please fill all medical record details');
    return;
  }

  try {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      setMessage('Authentication token missing. Please log in again.');
      return;
    }

    const response = await fetch(
      'http://localhost:8000/medical-records',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pet_id: Number(recordPetId),
          vet_id: Number(vetId),
          diagnosis: diagnosis.trim(),
          treatment: treatment.trim(),
          prescription: prescription.trim(),
          record_date: recordDate,
          appointment_id: recordAppointmentId
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Medical record creation failed:', data);

      setMessage(
        data.detail || data.message ||
        `Failed to add medical record. HTTP ${response.status}`
      );

      return;
    }

    // Refresh appointments only when this record
    // belongs to an existing appointment.
    if (recordAppointmentId !== null) {
      const refreshResponse = await fetch(
        `http://localhost:8000/veterinarians/${vetId}/appointments`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (refreshResponse.ok) {
        const refreshedAppointments = await refreshResponse.json();
        setAppointments(refreshedAppointments);
      }
    }

    setMessage(
      recordAppointmentId !== null
        ? `Medical record added successfully! Appointment #${recordAppointmentId} is now completed.`
        : `Medical record added successfully! Record ID: ${data.record_id}`
    );

    setDiagnosis('');
    setTreatment('');
    setPrescription('');

  } catch (error) {
    console.error('Medical record error:', error);
    setMessage('Cannot connect to server');
  }
};


  // ===================================================
  // VET MEDICAL RECORDS
  // ===================================================

  
const handleVetMedicalRecords = async () => {
  try {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      setMessage('Your session has expired. Please log in again.');
      return;
    }

    if (!vetId) {
      setMessage('Veterinarian profile not found. Please log in again.');
      return;
    }

    const response = await fetch(
      'http://localhost:8000/medical-records',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Medical records API error:', data);
      setMessage(data.detail || 'Unable to load medical records.');
      return;
    }

    if (!Array.isArray(data)) {
      console.error('Unexpected medical records response:', data);
      setMessage('Unexpected response received from the server.');
      return;
    }

    const myRecords = data.filter(
      record => Number(record.vet_id) === Number(vetId)
    );

    setMedicalRecords(myRecords);
    setMessage('');

    setPage('vet-medical-records');

  } catch (error) {
    console.error('Veterinarian medical records error:', error);
    setMessage('Cannot connect to server. Please try again.');
  }
};


  
  // ===================================================
  // ADMIN DASHBOARD DATA
  // ===================================================

  
const loadAdminDashboard = async () => {
  try {
    setMessage('Loading admin dashboard...');

    const token = sessionStorage.getItem('access_token');

    if (!token) {
      throw new Error('Authentication token missing. Please log in again.');
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const endpoints = [
      { key: 'stats', url: 'http://localhost:8000/admin/stats' },
      { key: 'users', url: 'http://localhost:8000/users' },
      { key: 'vets', url: 'http://localhost:8000/veterinarians' },
      { key: 'pets', url: 'http://localhost:8000/pets' },
      { key: 'appointments', url: 'http://localhost:8000/appointments' },
      { key: 'records', url: 'http://localhost:8000/medical-records' }
    ];

    const results = await Promise.all(
      endpoints.map(async endpoint => {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `${endpoint.key}: HTTP ${response.status} - ${errorText}`
          );
        }

        return {
          key: endpoint.key,
          data: await response.json()
        };
      })
    );

    const dashboardData = {};

    results.forEach(result => {
      dashboardData[result.key] = result.data;
    });

    setAdminStats(dashboardData.stats);
    setAllUsers(dashboardData.users);
    setAllVets(dashboardData.vets);
    setAllPets(dashboardData.pets);
    setAllAppointments(dashboardData.appointments);
    setAllRecords(dashboardData.records);

    setMessage('');
    setPage('admin-dashboard');

    console.log('Admin dashboard data loaded:', dashboardData);

  } catch (error) {
    console.error('Admin dashboard loading error:', error);
    setMessage(`Dashboard loading failed: ${error.message}`);
  }
};

  
  // ===================================================
  // ADMIN EDIT PET
  // ===================================================

  const handleEditPet = (pet) => {
    setEditingPetId(pet.pet_id);
    setEditPetName(pet.pet_name || '');
    setEditSpecies(pet.species || '');
    setEditBreed(pet.breed || '');
    setEditAge(pet.age ?? '');
    setEditGender(pet.gender || '');
    setMessage('');
  };

  const handleSavePet = async (pet) => {
    try {
      const response = await fetch(
        `http://localhost:8000/pets/${pet.pet_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: pet.user_id,
            pet_name: editPetName,
            species: editSpecies,
            breed: editBreed,
            age: editAge === '' ? null : Number(editAge),
            gender: editGender
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.message === 'Pet updated successfully') {
        const refreshResponse = await fetch(
          'http://localhost:8000/pets'
        );

        if (!refreshResponse.ok) {
          setMessage('Pet updated, but refresh failed.');
          return;
        }

        const refreshedPets = await refreshResponse.json();

        setAllPets(refreshedPets);
        setEditingPetId(null);
        setMessage('Pet updated successfully!');
      } else {
        setMessage(data.message || 'Failed to update pet.');
      }

    } catch (error) {
      setMessage('Cannot connect to server.');
    }
  };


  // ===================================================
  // ADMIN DELETE PET
  // ===================================================

  const handleDeletePet = async (petId) => {

    const confirmed = window.confirm(
      'Are you sure you want to delete this pet?'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `http://localhost:8000/pets/${petId}`,
        {
          method: 'DELETE'
        }
      );

      const data = await response.json();

      if (response.ok && data.message === 'Pet deleted successfully') {
        setAllPets((previousPets) =>
          previousPets.filter(
            (pet) => pet.pet_id !== petId
          )
        );

        setMessage('Pet deleted successfully!');
      } else {
        setMessage(
          data.message || 'Failed to delete pet.'
        );
      }

    } catch (error) {
      setMessage('Cannot connect to server.');
    }
  };

  
  // ===================================================
  // ADMIN EDIT VETERINARIAN
  // ===================================================

  const handleEditVet = (vet) => {
    setEditingVetId(vet.vet_id);
    setEditVetSpecialization(vet.specialization || '');
    setEditVetPhone(vet.phone || '');
    setMessage('');
  };

  const handleSaveVet = async (vet) => {
    try {
      const response = await fetch(
        `http://localhost:8000/veterinarians/${vet.vet_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: vet.user_id,
            specialization: editVetSpecialization,
            phone: editVetPhone
          })
        }
      );

      const data = await response.json();

      if (
        response.ok &&
        data.message === 'Veterinarian updated successfully'
      ) {
        const refreshResponse = await fetch(
          'http://localhost:8000/veterinarians'
        );

        if (!refreshResponse.ok) {
          setMessage('Updated, but failed to refresh the list.');
          return;
        }

        const refreshedVets = await refreshResponse.json();

        setAllVets(refreshedVets);
        setEditingVetId(null);
        setMessage('Veterinarian updated successfully!');
      } else {
        setMessage(
          data.message || 'Failed to update veterinarian.'
        );
      }

    } catch (error) {
      setMessage('Cannot connect to server.');
    }
  };

  
  // ===================================================
  // ADMIN DELETE VETERINARIAN
  // ===================================================

  const handleDeleteVet = async (vet) => {

    const confirmed = window.confirm(
      `Are you sure you want to delete Veterinarian #${vet.vet_id}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `http://localhost:8000/veterinarians/${vet.vet_id}`,
        {
          method: 'DELETE'
        }
      );

      const data = await response.json();

      if (
        response.ok &&
        data.message === 'Veterinarian deleted successfully'
      ) {
        setAllVets((previousVets) =>
          previousVets.filter(
            (item) => item.vet_id !== vet.vet_id
          )
        );

        setMessage('Veterinarian deleted successfully!');
      } else {
        setMessage(
          data.message || 'Unable to delete veterinarian.'
        );
      }

    } catch (error) {
      setMessage('Cannot connect to server.');
    }
  };


// ===================================================
// ADMIN UPDATE APPOINTMENT STATUS
// ===================================================

const handleUpdateAppointmentStatus = async (appointment, newStatus) => {
  try {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      setMessage('Please log in again. Authentication token missing.');
      return;
    }

    const response = await fetch(
      `http://localhost:8000/appointments/${appointment.appointment_id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pet_id: appointment.pet_id,
          vet_id: appointment.vet_id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          reason: appointment.reason,
          status: newStatus
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || data.message || 'Failed to update appointment.');
      return;
    }

    await loadAdminDashboard();

    setMessage(
      `Appointment #${appointment.appointment_id} updated to ${newStatus}.`
    );

  } catch (error) {
    console.error('Appointment update error:', error);
    setMessage('Cannot connect to server while updating appointment.');
  }
};


  // ===================================================
  // UPDATE USER
  // ===================================================
  const handleSaveUser = async (user) => {
    
    if (!editUserName.trim() || !editUserEmail.trim()) {
    setMessage('Please enter both name and email');
    return;
    }
    
    try {
      
      const response = await fetch(
      `http://localhost:8000/users/${user.user_id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editUserName.trim(),
          email: editUserEmail.trim()
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.message === 'User updated successfully') {

      const usersResponse = await fetch(
        'http://localhost:8000/users'
      );

      const updatedUsers = await usersResponse.json();

      setAllUsers(updatedUsers);
      setEditingUserId(null);
      setMessage('User updated successfully!');

    } else {

      setMessage(data.message || 'Failed to update user');
    }

  } catch (error) {

    setMessage('Cannot connect to server');
  }
};

  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = () => {

    setPage('home');

    setEmail('');
    setPassword('');

    setUserId(null);
    setUserName('');

    setVetId(null);
    setVetSpecialization('');

    setMessage('');

    setPets([]);
    setVets([]);
    setAppointments([]);
    setMedicalRecords([]);

    setAdminStats(null);
    setAllUsers([]);
    setAllVets([]);
    setAllAppointments([]);
    setAllRecords([]);
  };


  // ===================================================
  // HOME
  // ===================================================

  
  if (page === 'home') {
    return (
      <div className="ps-home-page">
        <header className="ps-home-header">
          <div className="ps-home-brand">
            <span className="ps-home-logo">🐾</span>
            <span>PetSphere</span>
          </div>
          <span className="ps-home-tagline">Smarter care. Happier pets.</span>
        </header>

        <main className="ps-home-main">
          <section className="ps-home-hero">
            <div className="ps-home-pill">
              🐶 A smarter way to care for your pets
            </div>

            <h1>
              Every pet deserves
              <span> a healthier life.</span>
            </h1>

            <p>
              Keep your pet's health records, appointments and
              everyday care organised in one simple place.
            </p>

            <button
              className="ps-home-owner-button"
              onClick={() => {
                setMessage('');
                setEmail('');
                setPassword('');
                setPage('login');
              }}
            >
              Pet Owner Login <span>→</span>
            </button>
          </section>

          <section className="ps-home-access">
            <div className="ps-home-access-heading">
              <h2>Professional access</h2>
              <p>Choose your workspace to continue</p>
            </div>

            <div className="ps-home-access-grid">
              <button
                className="ps-home-access-card"
                onClick={() => {
                  setMessage('');
                  setEmail('');
                  setPassword('');
                  setPage('vet-login');
                }}
              >
                <span className="ps-home-card-icon">🩺</span>
                <span className="ps-home-card-title">Veterinarian</span>
                <span className="ps-home-card-description">
                  Manage appointments, pets and medical records.
                </span>
                <span className="ps-home-card-link">Vet Login →</span>
              </button>

              <button
                className="ps-home-access-card"
                onClick={() => {
                  setMessage('');
                  setEmail('');
                  setPassword('');
                  setPage('admin-login');
                }}
              >
                <span className="ps-home-card-icon">⚙️</span>
                <span className="ps-home-card-title">Administrator</span>
                <span className="ps-home-card-description">
                  Manage users, veterinarians and platform activity.
                </span>
                <span className="ps-home-card-link">Admin Login →</span>
              </button>
            </div>
          </section>
        </main>

        <footer className="ps-home-footer">
          Made with care for every paw 🐾
        </footer>
      </div>
    );
  }

  
  if (page === 'login') {
    return (
      <div className="ps-auth-page">
        <div className="ps-auth-card">

          <button
            className="ps-auth-back"
            onClick={() => {
              setMessage('');
              setPage('home');
            }}
          >
            ← Back to home
          </button>

          <div className="ps-auth-logo">🐾</div>

          <h1>Welcome back!</h1>
          <p className="ps-auth-subtitle">
            Sign in to continue caring for your pet.
          </p>

          <div className="ps-auth-form">

            <label htmlFor="owner-email">Email address</label>
            <input
              id="owner-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="owner-password">Password</label>
            <div className="ps-auth-password-wrap">
              <input
                id="owner-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="ps-auth-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              className="ps-auth-submit"
              onClick={handleLogin}
            >
              Login to PetSphere →
            </button>

          </div>

          {message && (
            <p className="ps-auth-message">{message}</p>
          )}

          <div className="ps-auth-divider">
            <span>New to PetSphere?</span>
          </div>

          <button
            className="ps-auth-signup"
            onClick={() => {
              setMessage('');
              setSignupName('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setShowPassword(false);
              setShowConfirmPassword(false);
              setPage('signup');
            }}
          >
            Create an Owner Account
          </button>

          <p className="ps-auth-footer">
            Your pet's care journey starts here 🐾
          </p>

        </div>
      </div>
    );
  }

  // ===================================================
// OWNER SIGNUP
// ===================================================

if (page === 'signup') {
  return (
    <div className="ps-auth-page">
      <div className="ps-auth-card">

        <button
          className="ps-auth-back"
          onClick={() => {
            setMessage('');
            setPage('login');
          }}
        >
          ← Back to login
        </button>

        <div className="ps-auth-logo">🐾</div>

        <h1>Create account</h1>

        <p className="ps-auth-subtitle">
          Join PetSphere and manage your pet's care in one place.
        </p>

        <div className="ps-auth-form">

          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Enter your full name"
            value={signupName}
            onChange={(e) => setSignupName(e.target.value)}
          />

          <label htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="signup-password">Password</label>
          <div className="ps-auth-password-wrap">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="ps-auth-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <label htmlFor="signup-confirm-password">Confirm password</label>
          {password && (
  <div className={`ps-password-strength ${passwordStrength.toLowerCase()}`}>
    <span>
      Password strength: <strong>{passwordStrength}</strong>
    </span>
  </div>
)}
          <div className="ps-auth-password-wrap">
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="ps-auth-toggle"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button
            className="ps-auth-submit"
            onClick={handleSignup}
          >
            Create My Account →
          </button>

        </div>

        {message && (
  <p className={`ps-auth-message ${messageType}`}>
    {message}
  </p>
)}

        <p className="ps-auth-footer">
          Your pet's care journey starts here 🐾
        </p>

      </div>
    </div>
  );
}

  // ===================================================
  // VET LOGIN
  // ===================================================

  if (page === 'vet-login') {

    return (
      <div className="container">

        <h1>
          🩺 Veterinarian Login
        </h1>

        <input
          type="email"
          placeholder="Enter veterinarian email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <br />

        <button onClick={handleVetLogin}>
          Login
        </button>

        <button
          onClick={() => setPage('home')}
        >
          Back
        </button>

        <p>
          {message}
        </p>

      </div>
    );
  }


  // ===================================================
  // ADMIN LOGIN
  // ===================================================

  if (page === 'admin-login') {

    return (
      <div className="container">

        <h1>
          🛠️ Admin Login
        </h1>

        <input
          type="email"
          placeholder="Enter admin email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <br />

        <button
          onClick={async () => {

            await handleAdminLogin();

          }}
        >
          Login
        </button>

        <button
          onClick={() => setPage('home')}
        >
          Back
        </button>

        <p>
          {message}
        </p>

      </div>
    );
  }


  
  // ===================================================
  // OWNER DASHBOARD
  // ===================================================

  if (page === 'dashboard') {
    return (
      <div className="ps-dashboard-shell">
        <aside className="ps-sidebar">
          <div className="ps-brand">
            <span className="ps-brand-mark">🐾</span>
            <span>
              PetSphere
              <small>SMART PET CARE</small>
            </span>
          </div>

          <div className="ps-sidebar-label">OWNER MENU</div>

          <button className="ps-nav-item active" onClick={() => setPage('dashboard')}>
            <span>⌂</span> Overview
          </button>
          <button className="ps-nav-item" onClick={handleViewPets}>
            <span>🐶</span> My Pets
          </button>
          <button className="ps-nav-item" onClick={openAppointmentPage}>
            <span>＋</span> Book Appointment
          </button>
          <button className="ps-nav-item" onClick={handleViewAppointments}>
            <span>▣</span> Appointments
          </button>
          <button className="ps-nav-item" onClick={handleViewMedicalRecords}>
            <span>♡</span> Medical Records
          </button>

          <div className="ps-sidebar-bottom">
            <div className="ps-help-card">
              <div className="ps-help-icon">💚</div>
              <strong>Care starts here</strong>
              <p>Keep your pet's health journey organized in one place.</p>
            </div>
            <button className="ps-logout" onClick={handleLogout}>
              <span>↪</span> Log out
            </button>
          </div>
        </aside>

        <main className="ps-main">
          <header className="ps-topbar">
            <div>
              <span className="ps-eyebrow">PET OWNER PORTAL</span>
              <h1>Your pet care hub</h1>
            </div>

            <div className="ps-profile-chip">
              <div className="ps-avatar">
                {(userName || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{userName || 'Pet Parent'}</strong>
                <small>Pet Parent</small>
              </div>
            </div>
          </header>

          <section className="ps-welcome-banner">
            <div className="ps-welcome-copy">
              <span className="ps-welcome-tag">A LITTLE MORE LOVE, EVERY DAY</span>
              <h2>
                Welcome back, {userName || 'Pet Parent'}! <span>🐾</span>
              </h2>
              <p>
                Happy pets, healthy lives. Everything you need to care for
                your furry family is right here.
              </p>
              <button className="ps-primary-action" onClick={openAppointmentPage}>
                ＋ Book a vet visit
              </button>
            </div>

            <div className="ps-welcome-art" aria-label="Happy dog and cat illustration">
              <div className="ps-sunburst"></div>
              <div className="ps-pet-emoji">🐕</div>
              <div className="ps-pet-emoji ps-cat-emoji">🐈</div>
              <span className="ps-floating-heart">♥</span>
              <span className="ps-floating-paw">🐾</span>
            </div>
          </section>

          <section className="ps-stats-grid">
            <article className="ps-stat-card">
              <div className="ps-stat-icon mint">🐾</div>
              <div>
                <span>My pets</span>
                <strong>{pets.length}</strong>
                <small>Registered companions</small>
              </div>
            </article>

            <article className="ps-stat-card">
              <div className="ps-stat-icon peach">📅</div>
              <div>
                <span>Appointments</span>
                <strong>{appointments.length}</strong>
                <small>Your care schedule</small>
              </div>
            </article>

            <article className="ps-stat-card">
              <div className="ps-stat-icon lavender">🩺</div>
              <div>
                <span>Medical records</span>
                <strong>{medicalRecords.length}</strong>
                <small>Health history entries</small>
              </div>
            </article>
          </section>

          <section className="ps-section-heading">
            <div>
              <span className="ps-eyebrow">YOUR PET'S WORLD</span>
              <h2>What would you like to do?</h2>
            </div>
            <span className="ps-section-note">
              All your care tools, one happy place
            </span>
          </section>

          <section className="ps-actions-grid">
            <button className="ps-action-card" onClick={() => setPage('add-pet')}>
              <span className="ps-action-illustration add">🐕‍🦺</span>
              <span className="ps-action-title">Add a pet</span>
              <span className="ps-action-description">
                Welcome a new furry friend to your family profile.
              </span>
              <span className="ps-action-link">Add pet <b>→</b></span>
            </button>

            <button className="ps-action-card" onClick={handleViewPets}>
              <span className="ps-action-illustration pets">🐈</span>
              <span className="ps-action-title">View my pets</span>
              <span className="ps-action-description">
                See your companions and keep their details up to date.
              </span>
              <span className="ps-action-link">Explore pets <b>→</b></span>
            </button>

            <button className="ps-action-card" onClick={openAppointmentPage}>
              <span className="ps-action-illustration appointment">🩺</span>
              <span className="ps-action-title">Book an appointment</span>
              <span className="ps-action-description">
                Find veterinary care and plan your next visit.
              </span>
              <span className="ps-action-link">Book a visit <b>→</b></span>
            </button>

            <button className="ps-action-card" onClick={handleViewAppointments}>
              <span className="ps-action-illustration schedule">🗓️</span>
              <span className="ps-action-title">My appointments</span>
              <span className="ps-action-description">
                Check your upcoming and previous vet visits.
              </span>
              <span className="ps-action-link">View schedule <b>→</b></span>
            </button>

            <button className="ps-action-card" onClick={handleViewMedicalRecords}>
              <span className="ps-action-illustration records">📋</span>
              <span className="ps-action-title">Medical records</span>
              <span className="ps-action-description">
                Keep diagnoses, treatments and health history close.
              </span>
              <span className="ps-action-link">View records <b>→</b></span>
            </button>
          </section>

          <footer className="ps-dashboard-footer">
            Made with <span>♥</span> for the pets who make our lives brighter.
          </footer>
        </main>
      </div>
    );
  }


  // ===================================================
  // ADD PET
  // ===================================================

  if (page === 'add-pet') {

    return (
      <div className="container ps-page-shell ps-form-page">

        <h1>
          🐾 Add Your Pet
        </h1>

        <input
          type="text"
          placeholder="Pet Name"
          value={petName}
          onChange={(e) =>
            setPetName(e.target.value)
          }
        />

        <input
          type="text"
          placeholder="Species (Dog/Cat/etc.)"
          value={species}
          onChange={(e) =>
            setSpecies(e.target.value)
          }
        />

        <input
          type="text"
          placeholder="Breed"
          value={breed}
          onChange={(e) =>
            setBreed(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Age"
          value={age}
          onChange={(e) =>
            setAge(e.target.value)
          }
        />

        <input
          type="text"
          placeholder="Gender"
          value={gender}
          onChange={(e) =>
            setGender(e.target.value)
          }
        />

        <br />

        <button onClick={handleAddPet}>
          Add Pet
        </button>

        <button
          onClick={() => setPage('dashboard')}
        >
          Back
        </button>

        <p>
          {message}
        </p>

      </div>
    );
  }


  // ===================================================
  // VIEW PETS
  // ===================================================

  if (page === 'view-pets') {

    return (
      <div className="container ps-page-shell ps-pets-page">

        <h1>
          🐾 My Pets
        </h1>

        {pets.length === 0 ? (

          <p>
            You have not added any pets yet.
          </p>

        ) : (

          pets.map((pet) => (

            <div
              key={pet.pet_id}
              className="pet-card"
            >

              <h2>
                {pet.pet_name}
              </h2>

              <p>
                Pet ID: {pet.pet_id}
              </p>

              <p>
                Species: {pet.species}
              </p>

              <p>
                Breed: {pet.breed || 'Not specified'}
              </p>

              <p>
                Age: {pet.age || 'Not specified'}
              </p>

              <p>
                Gender: {pet.gender || 'Not specified'}
              </p>

            </div>
          ))
        )}

        <button
          onClick={() => setPage('dashboard')}
        >
          Back to Dashboard
        </button>

      </div>
    );
  }


  
  // ===================================================
  // BOOK APPOINTMENT
  // ===================================================

  if (page === 'book-appointment') {
    return (
      <div className="ps-booking-page">
        <div className="ps-booking-header">
          <span className="ps-eyebrow">PETSPHERE · VETERINARY CARE</span>
          <h1>🐾 Book a Veterinary Appointment</h1>
          <p>
            Schedule a visit for your furry friend. Choose your pet,
            veterinarian and preferred appointment time.
          </p>
        </div>

        <div className="ps-booking-layout">
          <section className="ps-booking-form-card">
            <div className="ps-booking-section-title">
              <span className="ps-booking-step">1</span>
              <div>
                <h2>Appointment details</h2>
                <p>Complete the information below</p>
              </div>
            </div>

            <div className="ps-booking-field">
              <label htmlFor="booking-pet">Select your pet</label>
              <select
                id="booking-pet"
                value={selectedPet}
                onChange={(e) => setSelectedPet(e.target.value)}
              >
                <option value="">Choose your pet</option>
                {pets.map((pet) => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.pet_name} - {pet.species}
                  </option>
                ))}
              </select>
            </div>

            <div className="ps-booking-field">
              <label htmlFor="booking-vet">Select veterinarian</label>
              <select
                id="booking-vet"
                value={selectedVet}
                onChange={(e) => setSelectedVet(e.target.value)}
              >
                <option value="">Choose a veterinarian</option>
                {vets.map((vet) => (
                  <option key={vet.vet_id} value={vet.vet_id}>
                    Vet ID {vet.vet_id} - {vet.specialization}
                  </option>
                ))}
              </select>
            </div>

            <div className="ps-booking-date-grid">
              <div className="ps-booking-field">
                <label htmlFor="booking-date">Appointment date</label>
                <input
                  id="booking-date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                />
              </div>

              <div className="ps-booking-field">
                <label htmlFor="booking-time">Appointment time</label>
                <input
                  id="booking-time"
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                />
              </div>
            </div>

            <div className="ps-booking-field">
              <label htmlFor="booking-reason">Reason for visit</label>
              <input
                id="booking-reason"
                type="text"
                placeholder="Example: Regular checkup"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="ps-booking-actions">
              <button
                className="ps-book-submit"
                onClick={handleBookAppointment}
              >
                Confirm Appointment →
              </button>

              <button
                className="ps-book-back"
                onClick={() => setPage('dashboard')}
              >
                Back to Dashboard
              </button>
            </div>

            {message && (
              <p className="ps-booking-message">{message}</p>
            )}
          </section>

          <aside className="ps-booking-aside">
            <div className="ps-booking-illustration">🐶 🩺 🐱</div>
            <span className="ps-eyebrow">A HEALTHIER, HAPPIER PET</span>
            <h2>Every little checkup matters.</h2>
            <p>
              Regular veterinary visits help keep your companion
              healthy. Book a convenient time and stay on top of
              your pet's care.
            </p>

            <div className="ps-booking-tip">
              <span>💚</span>
              <div>
                <strong>Before your visit</strong>
                <p>Keep your pet's previous medical information handy.</p>
              </div>
            </div>

            <div className="ps-booking-tip">
              <span>📋</span>
              <div>
                <strong>Stay organized</strong>
                <p>Check your appointments and medical records in PetSphere.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }



  
  // ===================================================
  // OWNER APPOINTMENTS
  // ===================================================

  if (page === 'view-appointments') {
    return (
      <div className="ps-appointments-page">
        <header className="ps-appointments-header">
          <span className="ps-eyebrow">PETSPHERE · YOUR PET'S CARE</span>
          <h1>📅 My Appointments</h1>
          <p>Keep track of your pet's veterinary visits and care schedule.</p>
        </header>

        <div className="ps-appointments-summary">
          <div>
            <span className="ps-appointments-summary-icon">🗓️</span>
            <div>
              <strong>{appointments.length}</strong>
              <small>Total appointments</small>
            </div>
          </div>
          <button
            className="ps-appointment-book-button"
            onClick={() => setPage('book-appointment')}
          >
            + Book another visit
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="ps-appointments-empty">
            <div className="ps-empty-illustration">🐶 📅</div>
            <h2>No appointments yet</h2>
            <p>
              Your pet's upcoming veterinary visits will appear here.
              Book an appointment to get started.
            </p>
            <button
              className="ps-appointment-book-button"
              onClick={() => setPage('book-appointment')}
            >
              Book an appointment
            </button>
          </div>
        ) : (
          <div className="ps-appointments-grid">
            {appointments.map((appointment) => (
              <article
                key={appointment.appointment_id}
                className="ps-appointment-card"
              >
                <div className="ps-appointment-card-top">
                  <span className="ps-appointment-number">
                    APPOINTMENT #{appointment.appointment_id}
                  </span>

                  <span
                    className={`ps-appointment-status ${String(
                      appointment.status || 'unknown'
                    ).toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {appointment.status || 'Status unavailable'}
                  </span>
                </div>

                <h2>🐾 Veterinary Visit</h2>

                <div className="ps-appointment-details">
                  <div className="ps-appointment-detail">
                    <span>🐶</span>
                    <div>
                      <small>Pet ID</small>
                      <strong>{appointment.pet_id}</strong>
                    </div>
                  </div>

                  <div className="ps-appointment-detail">
                    <span>🩺</span>
                    <div>
                      <small>Veterinarian ID</small>
                      <strong>{appointment.vet_id}</strong>
                    </div>
                  </div>

                  <div className="ps-appointment-detail">
                    <span>📅</span>
                    <div>
                      <small>Date</small>
                      <strong>{appointment.appointment_date}</strong>
                    </div>
                  </div>

                  <div className="ps-appointment-detail">
                    <span>🕒</span>
                    <div>
                      <small>Time</small>
                      <strong>{appointment.appointment_time}</strong>
                    </div>
                  </div>
                </div>

                <div className="ps-appointment-reason">
                  <small>Reason for visit</small>
                  <p>{appointment.reason || 'Not specified'}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        <button
          className="ps-appointments-back"
          onClick={() => setPage('dashboard')}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }



  
  // ===================================================
  // OWNER MEDICAL RECORDS
  // ===================================================

  if (page === 'medical-records') {
    return (
      <div className="ps-medical-page">
        <header className="ps-medical-header">
          <span className="ps-eyebrow">PETSPHERE · HEALTH LIBRARY</span>
          <h1>🩺 My Pet Medical Records</h1>
          <p>
            Keep your pet's health history organized and accessible
            whenever you need it.
          </p>
        </header>

        <section className="ps-medical-summary">
          <div className="ps-medical-summary-icon">📋</div>
          <div>
            <strong>{medicalRecords.length}</strong>
            <span>Medical record{medicalRecords.length === 1 ? '' : 's'} available</span>
          </div>
          <span className="ps-medical-summary-note">
            Your pet's healthcare history
          </span>
        </section>


{/* UPLOADED MEDICAL DOCUMENTS */}
<section className="ps-medical-documents-section">
  <div className="ps-section-heading">
    <div>
      <span className="ps-eyebrow">AI DOCUMENT INTELLIGENCE</span>
      <h2>Uploaded Medical Documents</h2>
      <p>Generate AI-powered explanations of your pet's medical documents.</p>
    </div>
  </div>

  {medicalDocuments.length === 0 ? (
    <p>No uploaded medical documents available yet.</p>
  ) : (
    <div className="ps-medical-grid">
      {medicalDocuments.map((document) => (
        <article
          key={document.document_id}
          className="ps-medical-card"
        >
          <div className="ps-medical-card-header">
            <div className="ps-medical-card-icon">📄</div>
            <div>
              <span>UPLOADED DOCUMENT</span>
              <h2>{document.filename}</h2>
            </div>
          </div>

          <div className="ps-medical-meta">
            <div>
              <small>Pet ID</small>
              <strong>{document.pet_id}</strong>
            </div>

            <div>
              <small>Document ID</small>
              <strong>{document.document_id}</strong>
            </div>

            <div>
              <small>Extraction status</small>
              <strong>{document.processing_status || "Unknown"}</strong>
            </div>
          </div>

          <button
            className="ps-primary-action"
            onClick={() =>
              handleGenerateAISummary(document.document_id)
            }
            disabled={
              document.processing_status !== "Completed" ||
              summaryLoading === document.document_id
            }
          >
            {summaryLoading === document.document_id
              ? "Generating Summary..."
              : aiSummaries[document.document_id]
                ? "Regenerate AI Summary"
                : "✨ Generate AI Summary"}
          </button>

          {document.processing_status !== "Completed" && (
            <p>
              Document extraction must be completed before generating a summary.
            </p>
          )}

          {aiSummaries[document.document_id] && (
            <div className="ps-medical-information">
              <h3>✨ AI-Generated Medical Summary</h3>

              <p
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.7"
                }}
              >
                {aiSummaries[document.document_id]}
              </p>

              <small>
                AI-generated information for reference only.
                Consult a qualified veterinarian for medical decisions.
              </small>
            </div>
          )}
        </article>
      ))}
    </div>
  )}
</section>


        {medicalRecords.length === 0 ? (
          <section className="ps-medical-empty">
            <div className="ps-medical-empty-icon">🐾 🩺</div>
            <h2>No medical records yet</h2>
            <p>
              Your pet's diagnoses, treatments and prescriptions
              will appear here when a veterinarian adds a medical record.
            </p>
            <button
              className="ps-medical-back"
              onClick={() => setPage('dashboard')}
            >
              ← Back to Dashboard
            </button>
          </section>
        ) : (
          <section className="ps-medical-grid">
            {medicalRecords.map((record) => (
              <article
                key={record.record_id}
                className="ps-medical-card"
              >
                <div className="ps-medical-card-header">
                  <div className="ps-medical-card-icon">🩺</div>
                  <div>
                    <span>HEALTH RECORD</span>
                    <h2>Record #{record.record_id}</h2>
                  </div>
                </div>

                <div className="ps-medical-meta">
                  <div>
                    <small>Pet ID</small>
                    <strong>{record.pet_id}</strong>
                  </div>
                  <div>
                    <small>Veterinarian ID</small>
                    <strong>{record.vet_id}</strong>
                  </div>
                  <div>
                    <small>Record date</small>
                    <strong>{record.record_date || 'Not specified'}</strong>
                  </div>
                </div>

                <div className="ps-medical-information">
                  <div className="ps-medical-info-item">
                    <span>Diagnosis</span>
                    <p>{record.diagnosis || 'Not specified'}</p>
                  </div>

                  <div className="ps-medical-info-item">
                    <span>Treatment</span>
                    <p>{record.treatment || 'Not specified'}</p>
                  </div>

                  <div className="ps-medical-info-item">
                    <span>Prescription</span>
                    <p>{record.prescription || 'Not specified'}</p>
                  </div>
                </div>

                <div className="ps-medical-card-footer">
                  <span>♥ PetSphere Health History</span>
                  <span>#{record.record_id}</span>
                </div>
              </article>
            ))}
          </section>
        )}

        {medicalRecords.length > 0 && (
          <button
            className="ps-medical-back"
            onClick={() => setPage('dashboard')}
          >
            ← Back to Dashboard
          </button>
        )}
      </div>
    );
  }

 
  // ===================================================
  // VETERINARIAN DASHBOARD
  // ===================================================

  if (page === 'vet-dashboard') {
    return (
      <div className="ps-dashboard-shell ps-vet-dashboard">
        <aside className="ps-sidebar">
          <div className="ps-brand">
            <span className="ps-brand-mark">🐾</span>
            <span>
              PetSphere
              <small>VETERINARY PORTAL</small>
            </span>
          </div>

          <div className="ps-sidebar-label">VETERINARIAN MENU</div>

          <button
            className="ps-nav-item active"
            onClick={() => setPage('vet-dashboard')}
          >
            <span>⌂</span> Overview
          </button>

          <button
            className="ps-nav-item"
            onClick={handleVetAppointments}
          >
            <span>▣</span> My Appointments
          </button>

          <button
            className="ps-nav-item"
            onClick={handleVetMedicalRecords}
          >
            <span>♡</span> Medical Records
          </button>

          <div className="ps-sidebar-bottom">
            <div className="ps-help-card">
              <div className="ps-help-icon">🩺</div>
              <strong>Care that matters</strong>
              <p>Every visit is a chance to make a pet's life healthier.</p>
            </div>

            <button className="ps-logout" onClick={handleLogout}>
              <span>↪</span> Log out
            </button>
          </div>
        </aside>

        <main className="ps-main">
          <header className="ps-topbar">
            <div>
              <span className="ps-eyebrow">VETERINARY PORTAL</span>
              <h1>Your clinical workspace</h1>
            </div>

            <div className="ps-profile-chip">
              <div className="ps-avatar">🩺</div>
              <div>
                <strong>Dr. {userName}</strong>
                <small>Veterinarian</small>
              </div>
            </div>
          </header>

          <section className="ps-welcome-banner ps-vet-banner">
            <div className="ps-welcome-copy">
              <span className="ps-welcome-tag">HERE FOR EVERY PAW</span>
              <h2>Welcome, Dr. {userName}! 🩺</h2>
              <p>
                Your veterinary workspace is ready. Manage appointments,
                review patient health histories and keep every pet moving
                towards a healthier life.
              </p>

              <button
                className="ps-primary-action"
                onClick={handleVetAppointments}
              >
                View my appointments →
              </button>
            </div>

            <div className="ps-vet-art" aria-hidden="true">
              <div className="ps-vet-circle">🩺</div>
              <span className="ps-vet-paw paw-one">🐾</span>
              <span className="ps-vet-paw paw-two">♥</span>
              <span className="ps-vet-paw paw-three">✚</span>
            </div>
          </section>

          <section className="ps-vet-info-grid">
            <article className="ps-vet-info-card">
              <div className="ps-vet-info-icon">👩‍⚕️</div>
              <div>
                <span>Professional profile</span>
                <strong>Dr. {userName}</strong>
                <small>Veterinarian account</small>
              </div>
            </article>

            <article className="ps-vet-info-card">
              <div className="ps-vet-info-icon specialty">🩺</div>
              <div>
                <span>Specialization</span>
                <strong>{vetSpecialization || 'General Veterinary Care'}</strong>
                <small>Your area of practice</small>
              </div>
            </article>
          </section>

          <section className="ps-section-heading">
            <div>
              <span className="ps-eyebrow">WORKSPACE</span>
              <h2>Manage your veterinary work</h2>
            </div>
            <span className="ps-section-note">
              Your essential tools in one place
            </span>
          </section>

          <section className="ps-actions-grid ps-vet-actions-grid">
            <button
              className="ps-action-card"
              onClick={handleVetAppointments}
            >
              <span className="ps-action-illustration appointment">📅</span>
              <span className="ps-action-title">My appointments</span>
              <span className="ps-action-description">
                Review scheduled visits and access appointment details.
              </span>
              <span className="ps-action-link">
                View appointments <b>→</b>
              </span>
            </button>

            <button
              className="ps-action-card"
              onClick={handleVetMedicalRecords}
            >
              <span className="ps-action-illustration records">📋</span>
              <span className="ps-action-title">Medical records</span>
              <span className="ps-action-description">
                Review patient diagnoses, treatments and medical history.
              </span>
              <span className="ps-action-link">
                View records <b>→</b>
              </span>
            </button>
          </section>

          <footer className="ps-dashboard-footer">
            Caring for animals, supporting the people who love them. <span>♥</span>
          </footer>
        </main>
      </div>
    );
  }



  
  // ===================================================
  // VET APPOINTMENTS
  // ===================================================

  if (page === 'vet-appointments') {
    return (
      <div className="ps-vet-appointments-page">
        <header className="ps-vet-appointments-header">
          <span className="ps-eyebrow">PETSPHERE · VETERINARY PORTAL</span>
          <h1>📅 My Veterinary Appointments</h1>
          <p>Review your assigned visits and manage your patients' care.</p>
        </header>

        <section className="ps-vet-appointment-summary">
          <div className="ps-vet-summary-icon">🩺</div>
          <div>
            <strong>{appointments.length}</strong>
            <span>Assigned appointments</span>
          </div>
        </section>

        {appointments.length === 0 ? (
          <section className="ps-vet-appointments-empty">
            <div>🐾 📅</div>
            <h2>No appointments assigned</h2>
            <p>Your assigned veterinary appointments will appear here.</p>
          </section>
        ) : (
          <section className="ps-vet-appointments-grid">
            {appointments.map((appointment) => (
              <article
                key={appointment.appointment_id}
                className="ps-vet-appointment-card"
              >
                <div className="ps-vet-appointment-top">
                  <span>APPOINTMENT #{appointment.appointment_id}</span>
                  <span
                    className={`ps-vet-status ${String(
                      appointment.status || 'unknown'
                    ).toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {appointment.status || 'Status unavailable'}
                  </span>
                </div>

                <h2>🐶 Patient Visit</h2>

                <div className="ps-vet-appointment-details">
                  <div>
                    <span>🐾</span>
                    <section>
                      <small>Pet ID</small>
                      <strong>{appointment.pet_id}</strong>
                    </section>
                  </div>

                  <div>
                    <span>📅</span>
                    <section>
                      <small>Appointment date</small>
                      <strong>{appointment.appointment_date}</strong>
                    </section>
                  </div>

                  <div>
                    <span>🕒</span>
                    <section>
                      <small>Appointment time</small>
                      <strong>{appointment.appointment_time}</strong>
                    </section>
                  </div>
                </div>

                <div className="ps-vet-appointment-reason">
                  <small>Reason for visit</small>
                  <p>{appointment.reason || 'Not specified'}</p>
                </div>

                <div className="ps-vet-appointment-actions">
                  <button
                  onClick={() => handleVetPetDetails(appointment.pet_id)}
                  >
                    View Pet
                  </button>
                  
                {appointment.status === 'Pending' && (
                  <>
                  <button
                  onClick={() =>
                    handleVetAppointmentStatus(appointment, 'Confirmed')
                  }
                  >
                    ✓ Confirm
                  </button>
                  
                  <button
                  onClick={() =>
                    handleVetAppointmentStatus(appointment, 'Rejected')
                  }
                  >
                    ✕ Reject
                  </button>
                  </>
                )}

  {appointment.status === 'Confirmed' && (
    <>
      <button
  onClick={() =>
    openMedicalRecordPage(
      appointment.pet_id,
      appointment.appointment_id
    )
  }
>
  + Add Medical Record
</button>

      <button
        onClick={() =>
          handleVetAppointmentStatus(appointment, 'Completed')
        }
      >
        ✓ Mark Completed
      </button>
    </>
  )}

  {appointment.status === 'Rejected' && (
    <span>Appointment rejected</span>
  )}

  {appointment.status === 'Completed' && (
    <span>✓ Checkup completed</span>
  )}

</div>

              </article>
            ))}
          </section>
        )}

        <button
          className="ps-vet-appointments-back"
          onClick={() => setPage('vet-dashboard')}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }



  // ===================================================
  // VET PET DETAILS
  // ===================================================

  if (page === 'vet-pet-details') {

    return (
      <div className="container">

        <h1>
          🐾 Pet Information
        </h1>

        {pets.map((pet) => (

          <div
            key={pet.pet_id}
            className="pet-card"
          >

            <h2>
              {pet.pet_name}
            </h2>

            <p>
              Pet ID: {pet.pet_id}
            </p>

            <p>
              Species: {pet.species}
            </p>

            <p>
              Breed: {pet.breed || 'Not specified'}
            </p>

            <p>
              Age: {pet.age || 'Not specified'}
            </p>

            <p>
              Gender: {pet.gender || 'Not specified'}
            </p>

            <button
              onClick={() =>
                openMedicalRecordPage(
                  pet.pet_id
                )
              }
            >
              Add Medical Record
            </button>

          </div>
        ))}

        <button
          onClick={() => setPage('vet-appointments')}
        >
          Back to Appointments
        </button>

      </div>
    );
  }


  // ===================================================
  // ADD MEDICAL RECORD
  // ===================================================

  if (page === 'add-medical-record') {

    return (
      <div className="container">

        <h1>
          🩺 Add Medical Record
        </h1>

        <p>
          Pet ID: {recordPetId}
        </p>

        <input
          type="text"
          placeholder="Diagnosis"
          value={diagnosis}
          onChange={(e) =>
            setDiagnosis(e.target.value)
          }
        />

        <input
          type="text"
          placeholder="Treatment"
          value={treatment}
          onChange={(e) =>
            setTreatment(e.target.value)
          }
        />

        <input
          type="text"
          placeholder="Prescription"
          value={prescription}
          onChange={(e) =>
            setPrescription(e.target.value)
          }
        />

        <input
          type="date"
          value={recordDate}
          onChange={(e) =>
            setRecordDate(e.target.value)
          }
        />

        <br />

        <button
          onClick={handleAddMedicalRecord}
        >
          Save Medical Record
        </button>

        <button
          onClick={() =>
            setPage('vet-appointments')
          }
        >
          Back
        </button>

        <p>
          {message}
        </p>

      </div>
    );
  }



  // ===================================================
  // VET MEDICAL RECORDS
  // ===================================================

  if (page === 'vet-medical-records') {
    return (
      <div className="ps-vet-medical-page">
        <header className="ps-vet-medical-header">
          <span className="ps-eyebrow">PETSPHERE · CLINICAL WORKSPACE</span>
          <h1>🩺 My Medical Records</h1>
          <p>
            Review the medical records you have created for your patients.
          </p>
        </header>

        <section className="ps-vet-medical-summary">
          <div className="ps-vet-medical-summary-icon">📋</div>
          <div>
            <strong>{medicalRecords.length}</strong>
            <span>Medical records created</span>
          </div>
          <small>Patient healthcare history</small>
        </section>

        {medicalRecords.length === 0 ? (
          <section className="ps-vet-medical-empty">
            <div>🩺 🐾</div>
            <h2>No medical records yet</h2>
            <p>
              Medical records you create for your patients will appear here.
            </p>
          </section>
        ) : (
          <section className="ps-vet-medical-grid">
            {medicalRecords.map((record) => (
              <article
                key={record.record_id}
                className="ps-vet-medical-card"
              >
                <div className="ps-vet-medical-card-header">
                  <div className="ps-vet-medical-icon">🩺</div>
                  <div>
                    <span>CLINICAL RECORD</span>
                    <h2>Record #{record.record_id}</h2>
                  </div>
                  <span className="ps-vet-record-badge">Created by you</span>
                </div>

                <div className="ps-vet-medical-meta">
                  <div>
                    <small>Pet ID</small>
                    <strong>{record.pet_id}</strong>
                  </div>
                  <div>
                    <small>Record date</small>
                    <strong>{record.record_date || 'Not specified'}</strong>
                  </div>
                </div>

                <div className="ps-vet-medical-content">
                  <div>
                    <span>Diagnosis</span>
                    <p>{record.diagnosis || 'Not specified'}</p>
                  </div>

                  <div>
                    <span>Treatment</span>
                    <p>{record.treatment || 'Not specified'}</p>
                  </div>

                  <div>
                    <span>Prescription</span>
                    <p>{record.prescription || 'Not specified'}</p>
                  </div>
                </div>

                <footer className="ps-vet-medical-footer">
                  <span>PetSphere · Veterinary Records</span>
                  <span>#{record.record_id}</span>
                </footer>
              </article>
            ))}
          </section>
        )}

        <button
          className="ps-vet-medical-back"
          onClick={() => setPage('vet-dashboard')}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  
  // ===================================================
  // ADMIN DASHBOARD
  // ===================================================

  if (page === 'admin-dashboard') {
    return (
      <div className="ps-dashboard-shell ps-admin-dashboard">
        <aside className="ps-sidebar">
          <div className="ps-brand">
            <span className="ps-brand-mark">🐾</span>
            <span>
              PetSphere
              <small>ADMINISTRATION</small>
            </span>
          </div>

          <div className="ps-sidebar-label">ADMIN MENU</div>

          <button
            className="ps-nav-item active"
            onClick={() => setPage('admin-dashboard')}
          >
            <span>⌂</span> Overview
          </button>

          <button
            className="ps-nav-item"
            onClick={() => setPage('admin-users')}
          >
            <span>👥</span> Manage Users
          </button>

          <button
            className="ps-nav-item"
            onClick={async () => {
              try {
                const [usersResponse, petsResponse] = await Promise.all([
                  fetch('http://localhost:8000/users'),
                  fetch('http://localhost:8000/pets')
                ]);

                if (!usersResponse.ok || !petsResponse.ok) {
                  setMessage('Failed to load users or pets.');
                  return;
                }

                const usersData = await usersResponse.json();
                const petsData = await petsResponse.json();

                setAllUsers(usersData);
                setAllPets(petsData);
                setMessage('');
                setPage('admin-pets');
              } catch (error) {
                console.error('Admin pets loading error:', error);
                setMessage('Cannot connect to server.');
              }
            }}
          >
            <span>🐾</span> Manage Pets
          </button>

          <button
            className="ps-nav-item"
            onClick={async () => {
              try {
                const [usersResponse, vetsResponse] = await Promise.all([
                  fetch('http://localhost:8000/users'),
                  fetch('http://localhost:8000/veterinarians')
                ]);

                if (!usersResponse.ok || !vetsResponse.ok) {
                  setMessage('Failed to load veterinarian information.');
                  return;
                }

                const usersData = await usersResponse.json();
                const vetsData = await vetsResponse.json();

                setAllUsers(usersData);
                setAllVets(vetsData);
                setMessage('');
                setPage('admin-vets');
              } catch (error) {
                console.error('Admin veterinarians loading error:', error);
                setMessage('Cannot connect to server.');
              }
            }}
          >
            <span>🩺</span> Manage Veterinarians
          </button>

          <button
            className="ps-nav-item"
            onClick={() => setPage('admin-appointments')}
          >
            <span>📅</span> Appointments
          </button>

          <button
            className="ps-nav-item"
            onClick={() => setPage('admin-records')}
          >
            <span>📋</span> Medical Records
          </button>

          <div className="ps-sidebar-bottom">
            <div className="ps-help-card">
              <div className="ps-help-icon">⚙️</div>
              <strong>System control</strong>
              <p>Manage the platform and keep pet care running smoothly.</p>
            </div>

            <button className="ps-logout" onClick={handleLogout}>
              <span>↪</span> Log out
            </button>
          </div>
        </aside>

        <main className="ps-main">
          <header className="ps-topbar">
            <div>
              <span className="ps-eyebrow">PLATFORM MANAGEMENT</span>
              <h1>Admin control center</h1>
            </div>

            <div className="ps-profile-chip">
              <div className="ps-avatar">⚙️</div>
              <div>
                <strong>{userName || 'Administrator'}</strong>
                <small>System Administrator</small>
              </div>
            </div>
          </header>

          <section className="ps-welcome-banner ps-admin-banner">
            <div className="ps-welcome-copy">
              <span className="ps-welcome-tag">PETS PHERE PLATFORM OVERVIEW</span>
              <h2>Welcome, {userName || 'Admin'}! 🐾</h2>
              <p>
                Here's your platform overview. Monitor activity and manage
                the people, pets and healthcare information that power
                PetSphere.
              </p>

              <button
                className="ps-primary-action"
                onClick={loadAdminDashboard}
              >
                ↻ Refresh dashboard
              </button>
            </div>

            <div className="ps-admin-art" aria-hidden="true">
              <div className="ps-admin-circle">⚙️</div>
              <span className="ps-admin-symbol symbol-one">🐾</span>
              <span className="ps-admin-symbol symbol-two">✚</span>
              <span className="ps-admin-symbol symbol-three">♥</span>
            </div>
          </section>

          <section className="ps-section-heading ps-admin-heading">
            <div>
              <span className="ps-eyebrow">SYSTEM OVERVIEW</span>
              <h2>Platform statistics</h2>
            </div>
            <span className="ps-section-note">
              Live values from your admin dashboard API
            </span>
          </section>

          <section className="ps-admin-stats-grid">
            <article className="ps-admin-stat-card">
              <div className="ps-admin-stat-icon users">👥</div>
              <div>
                <span>Total users</span>
                <strong>{adminStats?.total_users ?? '—'}</strong>
                <small>Registered platform users</small>
              </div>
            </article>

            <article className="ps-admin-stat-card">
              <div className="ps-admin-stat-icon pets">🐾</div>
              <div>
                <span>Total pets</span>
                <strong>{adminStats?.total_pets ?? '—'}</strong>
                <small>Registered pet profiles</small>
              </div>
            </article>

            <article className="ps-admin-stat-card">
              <div className="ps-admin-stat-icon vets">🩺</div>
              <div>
                <span>Veterinarians</span>
                <strong>{adminStats?.total_veterinarians ?? '—'}</strong>
                <small>Veterinary professionals</small>
              </div>
            </article>

            <article className="ps-admin-stat-card">
              <div className="ps-admin-stat-icon appointments">📅</div>
              <div>
                <span>Appointments</span>
                <strong>{adminStats?.total_appointments ?? '—'}</strong>
                <small>Platform appointments</small>
              </div>
            </article>

            <article className="ps-admin-stat-card">
              <div className="ps-admin-stat-icon records">📋</div>
              <div>
                <span>Medical records</span>
                <strong>{adminStats?.total_medical_records ?? '—'}</strong>
                <small>Healthcare record entries</small>
              </div>
            </article>
          </section>

          <section className="ps-section-heading">
            <div>
              <span className="ps-eyebrow">ADMINISTRATION</span>
              <h2>Manage your platform</h2>
            </div>
            <span className="ps-section-note">
              Choose a management area
            </span>
          </section>

          <section className="ps-admin-actions-grid">
            <button
              className="ps-action-card"
              onClick={() => setPage('admin-users')}
            >
              <span className="ps-action-illustration add">👥</span>
              <span className="ps-action-title">Manage users</span>
              <span className="ps-action-description">
                View and manage registered platform users.
              </span>
              <span className="ps-action-link">Open users <b>→</b></span>
            </button>

            <button
              className="ps-action-card"
              onClick={async () => {
                try {
                  const [usersResponse, petsResponse] = await Promise.all([
                    fetch('http://localhost:8000/users'),
                    fetch('http://localhost:8000/pets')
                  ]);

                  if (!usersResponse.ok || !petsResponse.ok) {
                    setMessage('Failed to load users or pets.');
                    return;
                  }

                  const usersData = await usersResponse.json();
                  const petsData = await petsResponse.json();

                  setAllUsers(usersData);
                  setAllPets(petsData);
                  setMessage('');
                  setPage('admin-pets');
                } catch (error) {
                  console.error('Admin pets loading error:', error);
                  setMessage('Cannot connect to server.');
                }
              }}
            >
              <span className="ps-action-illustration pets">🐕</span>
              <span className="ps-action-title">Manage pets</span>
              <span className="ps-action-description">
                Review registered pets and their owner information.
              </span>
              <span className="ps-action-link">Open pets <b>→</b></span>
            </button>

            <button
              className="ps-action-card"
              onClick={async () => {
                try {
                  const [usersResponse, vetsResponse] = await Promise.all([
                    fetch('http://localhost:8000/users'),
                    fetch('http://localhost:8000/veterinarians')
                  ]);

                  if (!usersResponse.ok || !vetsResponse.ok) {
                    setMessage('Failed to load veterinarian information.');
                    return;
                  }

                  const usersData = await usersResponse.json();
                  const vetsData = await vetsResponse.json();

                  setAllUsers(usersData);
                  setAllVets(vetsData);
                  setMessage('');
                  setPage('admin-vets');
                } catch (error) {
                  console.error('Admin veterinarians loading error:', error);
                  setMessage('Cannot connect to server.');
                }
              }}
            >
              <span className="ps-action-illustration appointment">🩺</span>
              <span className="ps-action-title">Manage veterinarians</span>
              <span className="ps-action-description">
                Review veterinarian profiles and professional details.
              </span>
              <span className="ps-action-link">Open veterinarians <b>→</b></span>
            </button>

            <button
              className="ps-action-card"
              onClick={() => setPage('admin-appointments')}
            >
              <span className="ps-action-illustration schedule">🗓️</span>
              <span className="ps-action-title">View appointments</span>
              <span className="ps-action-description">
                Monitor appointments across the PetSphere platform.
              </span>
              <span className="ps-action-link">View appointments <b>→</b></span>
            </button>

            <button
              className="ps-action-card"
              onClick={() => setPage('admin-records')}
            >
              <span className="ps-action-illustration records">📋</span>
              <span className="ps-action-title">Medical records</span>
              <span className="ps-action-description">
                Access the platform's veterinary medical records.
              </span>
              <span className="ps-action-link">View records <b>→</b></span>
            </button>
          </section>

          <footer className="ps-dashboard-footer">
            PetSphere administration · Helping every pet live healthier. <span>♥</span>
          </footer>
        </main>
      </div>
    );
  }

  
  

  // ===================================================
  // ADMIN USERS
  // ===================================================

  if (page === 'admin-users') {
    return (
      <div className="ps-admin-users-page">
        <header className="ps-admin-users-header">
          <span className="ps-eyebrow">PETSPHERE · ADMINISTRATION</span>
          <h1>👥 Manage Users</h1>
          <p>View and manage registered PetSphere accounts.</p>
        </header>

        <section className="ps-admin-users-summary">
          <div className="ps-admin-users-summary-icon">👤</div>
          <div>
            <strong>{allUsers.length}</strong>
            <span>Registered users</span>
          </div>
        </section>

        <div className="ps-admin-users-list">
          {allUsers.length === 0 ? (
            <div className="ps-admin-users-empty">
              <div>👥</div>
              <h2>No users found</h2>
              <p>Registered accounts will appear here.</p>
            </div>
          ) : (
            allUsers.map((user) => {
              const isEditing = editingUserId === user.user_id;

              return (
                <article
                  key={user.user_id}
                  className="ps-admin-user-card"
                >
                  {isEditing ? (
                    <div className="ps-admin-user-edit">
                      <div className="ps-admin-user-card-heading">
                        <span className="ps-admin-user-avatar">✏️</span>
                        <div>
                          <small>EDIT ACCOUNT</small>
                          <h2>User #{user.user_id}</h2>
                        </div>
                      </div>

                      <div className="ps-admin-user-fields">
                        <label>
                          User name
                          <input
                            type="text"
                            placeholder="User Name"
                            value={editUserName}
                            onChange={(e) =>
                              setEditUserName(e.target.value)
                            }
                          />
                        </label>

                        <label>
                          Email address
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={editUserEmail}
                            onChange={(e) =>
                              setEditUserEmail(e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="ps-admin-user-readonly">
                        <span>User ID: {user.user_id}</span>
                        <span>Role: {user.role}</span>
                      </div>

                      <div className="ps-admin-user-actions">
                        <button
                          className="ps-admin-user-save"
                          onClick={() => handleSaveUser(user)}
                          disabled={
                            !editUserName.trim() ||
                            !editUserEmail.trim()
                          }
                        >
                          Save Changes
                        </button>

                        <button
                          className="ps-admin-user-cancel"
                          onClick={() => setEditingUserId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="ps-admin-user-card-heading">
                        <span className="ps-admin-user-avatar">👤</span>
                        <div>
                          <small>USER ACCOUNT #{user.user_id}</small>
                          <h2 className="user-name">
                            {user.name || 'Unnamed User'}
                          </h2>
                        </div>
                        <span
                          className={`ps-admin-role ${String(
                            user.role || 'unknown'
                          ).toLowerCase()}`}
                        >
                          {user.role || 'Unknown'}
                        </span>
                      </div>

                      <div className="ps-admin-user-information">
                        <div>
                          <small>Email address</small>
                          <strong>{user.email || 'Not available'}</strong>
                        </div>
                        <div>
                          <small>User ID</small>
                          <strong>{user.user_id}</strong>
                        </div>
                      </div>

                      <div className="ps-admin-user-actions">
                        <button
                          className="ps-admin-user-edit-button"
                          onClick={() => {
                            setEditingUserId(user.user_id);
                            setEditUserName(user.name || '');
                            setEditUserEmail(user.email || '');
                            setMessage('');
                          }}
                        >
                          ✏️ Edit User
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })
          )}
        </div>

        <div className="ps-admin-users-footer">
          <button
            className="ps-admin-users-refresh"
            onClick={async () => {
              try {
                const token = sessionStorage.getItem('access_token');

                const response = await fetch(
                  'http://localhost:8000/users',
                  {
                    headers: {
                      Authorization: `Bearer ${token}`
                    }
                  }
                );

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                setAllUsers(data);
                setMessage('Users refreshed successfully');
              } catch (error) {
                console.error('Refresh users error:', error);
                setMessage(`Cannot refresh users: ${error.message}`);
              }
            }}
          >
            ↻ Refresh Users
          </button>

          <button
            className="ps-admin-users-back"
            onClick={() => {
              setEditingUserId(null);
              setPage('admin-dashboard');
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {message && (
          <p className="ps-admin-users-message">{message}</p>
        )}
      </div>
    );
  }

  

  // ===================================================
  // ADMIN PET MANAGEMENT
  // ===================================================

  if (page === 'admin-pets') {
    return (
      <div className="ps-admin-pets-page">
        <header className="ps-admin-pets-header">
          <span className="ps-eyebrow">PETSPHERE · ADMINISTRATION</span>
          <h1>🐾 Manage Registered Pets</h1>
          <p>View, update and manage all pets registered on PetSphere.</p>
        </header>

        <section className="ps-admin-pets-summary">
          <div className="ps-admin-pets-summary-icon">🐾</div>
          <div>
            <strong>{allPets.length}</strong>
            <span>Registered pets</span>
          </div>
        </section>

        {message && (
          <p className="ps-admin-pets-message">{message}</p>
        )}

        <section className="ps-admin-pets-grid">
          {allPets.length === 0 ? (
            <div className="ps-admin-pets-empty">
              <div>🐶 🐱</div>
              <h2>No registered pets found</h2>
              <p>Pets registered by owners will appear here.</p>
            </div>
          ) : (
            allPets.map((pet) => {
              const owner = allUsers.find(
                (user) => Number(user.user_id) === Number(pet.user_id)
              );

              const isEditing = editingPetId === pet.pet_id;

              return (
                <article
                  key={pet.pet_id}
                  className="ps-admin-pet-card"
                >
                  {isEditing ? (
                    <div className="ps-admin-pet-edit">
                      <div className="ps-admin-pet-heading">
                        <span className="ps-admin-pet-avatar">✏️</span>
                        <div>
                          <small>EDIT PET PROFILE</small>
                          <h2>Pet #{pet.pet_id}</h2>
                        </div>
                      </div>

                      <div className="ps-admin-pet-fields">
                        <label>
                          Pet name
                          <input
                            type="text"
                            placeholder="Pet Name"
                            value={editPetName}
                            onChange={(e) =>
                              setEditPetName(e.target.value)
                            }
                          />
                        </label>

                        <label>
                          Species
                          <input
                            type="text"
                            placeholder="Species"
                            value={editSpecies}
                            onChange={(e) =>
                              setEditSpecies(e.target.value)
                            }
                          />
                        </label>

                        <label>
                          Breed
                          <input
                            type="text"
                            placeholder="Breed"
                            value={editBreed}
                            onChange={(e) =>
                              setEditBreed(e.target.value)
                            }
                          />
                        </label>

                        <label>
                          Age
                          <input
                            type="number"
                            min="0"
                            placeholder="Age"
                            value={editAge}
                            onChange={(e) =>
                              setEditAge(e.target.value)
                            }
                          />
                        </label>

                        <label>
                          Gender
                          <input
                            type="text"
                            placeholder="Gender"
                            value={editGender}
                            onChange={(e) =>
                              setEditGender(e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="ps-admin-pet-actions">
                        <button
                          className="ps-admin-pet-save"
                          onClick={() => handleSavePet(pet)}
                          disabled={
                            !editPetName.trim() ||
                            !editSpecies.trim()
                          }
                        >
                          Save Changes
                        </button>

                        <button
                          className="ps-admin-pet-cancel"
                          onClick={() => setEditingPetId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="ps-admin-pet-heading">
                        <span className="ps-admin-pet-avatar">
                          {String(pet.species || '').toLowerCase().includes('cat')
                            ? '🐱'
                            : String(pet.species || '').toLowerCase().includes('dog')
                              ? '🐶'
                              : '🐾'}
                        </span>

                        <div>
                          <small>PET PROFILE #{pet.pet_id}</small>
                          <h2>{pet.pet_name || 'Unnamed Pet'}</h2>
                        </div>
                      </div>

                      <div className="ps-admin-pet-owner">
                        <span>👤</span>
                        <div>
                          <small>Pet parent</small>
                          <strong>
                            {owner?.name || 'Owner not found'}
                          </strong>
                        </div>
                      </div>

                      <div className="ps-admin-pet-details">
                        <div>
                          <small>Owner ID</small>
                          <strong>{pet.user_id}</strong>
                        </div>
                        <div>
                          <small>Species</small>
                          <strong>{pet.species || 'Not specified'}</strong>
                        </div>
                        <div>
                          <small>Breed</small>
                          <strong>{pet.breed || 'Not specified'}</strong>
                        </div>
                        <div>
                          <small>Age</small>
                          <strong>
                            {pet.age ?? 'Not specified'}
                            {pet.age !== null && pet.age !== undefined ? ' years' : ''}
                          </strong>
                        </div>
                        <div>
                          <small>Gender</small>
                          <strong>{pet.gender || 'Not specified'}</strong>
                        </div>
                      </div>

                      <div className="ps-admin-pet-actions">
                        <button
                          className="ps-admin-pet-edit-button"
                          onClick={() => handleEditPet(pet)}
                        >
                          ✏️ Edit Pet
                        </button>

                        <button
                          className="ps-admin-pet-delete"
                          onClick={() => handleDeletePet(pet.pet_id)}
                        >
                          🗑 Delete Pet
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })
          )}
        </section>

        <div className="ps-admin-pets-footer">
          <button
            className="ps-admin-pets-refresh"
            onClick={async () => {
              try {
                const token = sessionStorage.getItem('access_token');

                const response = await fetch(
                  'http://localhost:8000/pets',
                  {
                    headers: {
                      Authorization: `Bearer ${token}`
                    }
                  }
                );

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                setAllPets(await response.json());
                setMessage('Pet list refreshed successfully.');
              } catch (error) {
                console.error('Refresh pets error:', error);
                setMessage(`Cannot refresh pets: ${error.message}`);
              }
            }}
          >
            ↻ Refresh Pets
          </button>

          <button
            className="ps-admin-pets-back"
            onClick={() => {
              setEditingPetId(null);
              setPage('admin-dashboard');
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }


  

// ===================================================
// ADMIN VETERINARIANS
// ===================================================

if (page === 'admin-vets') {
  return (
    <div className="container ps-page-shell ps-admin-vets">

      <div className="ps-admin-vets-header">
        <div>
          <span className="ps-admin-vets-eyebrow">ADMINISTRATION</span>
          <h1>Manage Veterinarians</h1>
          <p>View, update and manage registered veterinarians.</p>
        </div>

        <div className="ps-admin-vets-icon">🩺</div>
      </div>

      <div className="ps-admin-vets-summary">
        <div>
          <span className="ps-admin-vets-summary-icon">👨‍⚕️</span>
          <div>
            <strong>{allVets.length}</strong>
            <span>Registered Veterinarians</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="ps-admin-vets-message">
          {message}
        </div>
      )}

      {allVets.length === 0 ? (
        <div className="ps-admin-vets-empty">
          <div>🩺</div>
          <h2>No veterinarians found</h2>
          <p>Registered veterinarian profiles will appear here.</p>
        </div>
      ) : (
        <div className="ps-admin-vets-grid">
          {allVets.map((vet) => {
            const linkedUser = allUsers.find(
              (user) =>
                Number(user.user_id) === Number(vet.user_id)
            );

            const isEditing = editingVetId === vet.vet_id;

            return (
              <div
                key={vet.vet_id}
                className="ps-admin-vet-card"
              >
                <div className="ps-admin-vet-card-top">
                  <div className="ps-admin-vet-avatar">🩺</div>
                  <span className="ps-admin-vet-badge">
                    Veterinarian
                  </span>
                </div>

                {isEditing ? (
                  <div className="ps-admin-vet-edit">
                    <h2>Edit Veterinarian</h2>
                    <p className="ps-admin-vet-id">
                      Veterinarian #{vet.vet_id}
                    </p>

                    <label>Name</label>
                    <div className="ps-admin-vet-readonly">
                      {linkedUser?.name || 'Name not found'}
                    </div>

                    <label>Specialization</label>
                    <input
                      type="text"
                      placeholder="Enter specialization"
                      value={editVetSpecialization}
                      onChange={(e) =>
                        setEditVetSpecialization(e.target.value)
                      }
                    />

                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="Enter phone number"
                      value={editVetPhone}
                      onChange={(e) =>
                        setEditVetPhone(e.target.value)
                      }
                    />

                    <div className="ps-admin-vet-actions">
                      <button
                        className="ps-admin-vet-save"
                        onClick={() => handleSaveVet(vet)}
                        disabled={!editVetSpecialization.trim()}
                      >
                        Save Changes
                      </button>

                      <button
                        className="ps-admin-vet-cancel"
                        onClick={() => setEditingVetId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ps-admin-vet-details">
                    <h2>{linkedUser?.name || 'Name not found'}</h2>

                    <p className="ps-admin-vet-specialization">
                      {vet.specialization || 'Specialization not provided'}
                    </p>

                    <div className="ps-admin-vet-info">
                      <div>
                        <span>Veterinarian ID</span>
                        <strong>#{vet.vet_id}</strong>
                      </div>

                      <div>
                        <span>User ID</span>
                        <strong>#{vet.user_id}</strong>
                      </div>

                      <div>
                        <span>Email</span>
                        <strong>{linkedUser?.email || 'Not found'}</strong>
                      </div>

                      <div>
                        <span>Phone</span>
                        <strong>{vet.phone || 'Not provided'}</strong>
                      </div>
                    </div>

                    <div className="ps-admin-vet-actions">
                      <button
                        className="ps-admin-vet-save"
                        onClick={() => handleEditVet(vet)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="ps-admin-vet-delete"
                        onClick={() => handleDeleteVet(vet)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="ps-admin-vets-footer">
        <button
          className="ps-admin-vets-refresh"
          onClick={async () => {
            try {
              const token = sessionStorage.getItem('access_token');

              const response = await fetch(
                'http://localhost:8000/veterinarians',
                {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              );

              if (!response.ok) {
                setMessage('Failed to refresh veterinarians.');
                return;
              }

              setAllVets(await response.json());
              setMessage('Veterinarian list refreshed.');
            } catch (error) {
              setMessage('Cannot connect to server.');
            }
          }}
        >
          ↻ Refresh Veterinarians
        </button>

        <button
          className="ps-admin-vets-back"
          onClick={() => {
            setEditingVetId(null);
            setPage('admin-dashboard');
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

    </div>
  );
}



  // ===================================================
  // ADMIN APPOINTMENTS
  // ===================================================

  if (page === 'admin-appointments') {
    return (
      <div className="container ps-page-shell ps-admin-appointments">

        <div className="ps-admin-appt-header">
          <div>
            <span className="ps-admin-appt-eyebrow">ADMINISTRATION</span>
            <h1>Manage Appointments</h1>
            <p>Monitor and manage veterinary appointments.</p>
          </div>
          <div className="ps-admin-appt-icon">📅</div>
        </div>

        <div className="ps-admin-appt-summary">
          <div className="ps-admin-appt-stat">
            <span>📋</span>
            <div>
              <strong>{allAppointments.length}</strong>
              <small>Total Appointments</small>
            </div>
          </div>

          <div className="ps-admin-appt-stat">
            <span>🟢</span>
            <div>
              <strong>
                {allAppointments.filter(
                  (a) => a.status === 'Confirmed'
                ).length}
              </strong>
              <small>Confirmed</small>
            </div>
          </div>

          <div className="ps-admin-appt-stat">
            <span>🟡</span>
            <div>
              <strong>
                {allAppointments.filter(
                  (a) => a.status === 'Pending'
                ).length}
              </strong>
              <small>Pending</small>
            </div>
          </div>

          <div className="ps-admin-appt-stat">
            <span>🔴</span>
            <div>
              <strong>
                {allAppointments.filter(
                  (a) => a.status === 'Rejected'
                ).length}
              </strong>
              <small>Rejected</small>
            </div>
          </div>
        </div>

        {message && (
          <div className="ps-admin-appt-message">
            {message}
          </div>
        )}

        {allAppointments.length === 0 ? (
          <div className="ps-admin-appt-empty">
            <div>📅</div>
            <h2>No appointments found</h2>
            <p>Appointments booked by pet owners will appear here.</p>
          </div>
        ) : (
          <div className="ps-admin-appt-grid">
            {allAppointments.map((appointment) => {
              const statusClass =
                appointment.status === 'Confirmed'
                  ? 'confirmed'
                  : appointment.status === 'Rejected'
                  ? 'rejected'
                  : 'pending';

              return (
                <div
                  key={appointment.appointment_id}
                  className="ps-admin-appt-card"
                >
                  <div className="ps-admin-appt-card-header">
                    <div className="ps-admin-appt-card-icon">🐾</div>
                    <div>
                      <span>APPOINTMENT</span>
                      <h2>#{appointment.appointment_id}</h2>
                    </div>
                    <span className={`ps-admin-appt-status ${statusClass}`}>
                      {appointment.status || 'Pending'}
                    </span>
                  </div>

                  <div className="ps-admin-appt-details">
                    <div>
                      <span>Pet ID</span>
                      <strong>#{appointment.pet_id}</strong>
                    </div>

                    <div>
                      <span>Veterinarian ID</span>
                      <strong>#{appointment.vet_id}</strong>
                    </div>

                    <div>
                      <span>Date</span>
                      <strong>{appointment.appointment_date}</strong>
                    </div>

                    <div>
                      <span>Time</span>
                      <strong>{appointment.appointment_time}</strong>
                    </div>
                  </div>

                  <div className="ps-admin-appt-reason">
                    <span>Appointment Reason</span>
                    <p>{appointment.reason || 'No reason provided'}</p>
                  </div>

                  <div className="ps-admin-appt-actions">
                    <button
                      className="ps-admin-appt-confirm"
                      onClick={() =>
                        handleUpdateAppointmentStatus(
                          appointment,
                          'Confirmed'
                        )
                      }
                      disabled={appointment.status === 'Confirmed'}
                    >
                      ✓ Confirm
                    </button>

                    <button
                      className="ps-admin-appt-reject"
                      onClick={() =>
                        handleUpdateAppointmentStatus(
                          appointment,
                          'Rejected'
                        )
                      }
                      disabled={appointment.status === 'Rejected'}
                    >
                      ✕ Reject
                    </button>

                    <button
                      className="ps-admin-appt-pending"
                      onClick={() =>
                        handleUpdateAppointmentStatus(
                          appointment,
                          'Pending'
                        )
                      }
                      disabled={appointment.status === 'Pending'}
                    >
                      ↻ Pending
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="ps-admin-appt-footer">
          <button
            className="ps-admin-appt-refresh"
            onClick={loadAdminDashboard}
          >
            ↻ Refresh Appointments
          </button>

          <button
            className="ps-admin-appt-back"
            onClick={() => setPage('admin-dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>

      </div>
    );
  }



  // ===================================================
  // ADMIN MEDICAL RECORDS
  // ===================================================

  if (page === 'admin-records') {
    return (
      <div className="container ps-page-shell ps-admin-records">

        <div className="ps-admin-records-header">
          <div>
            <span className="ps-admin-records-eyebrow">
              ADMINISTRATION
            </span>
            <h1>Medical Records</h1>
            <p>Centralized overview of registered pet medical records.</p>
          </div>

          <div className="ps-admin-records-icon">📋</div>
        </div>

        <div className="ps-admin-records-summary">
          <span>📁</span>
          <div>
            <strong>{allRecords.length}</strong>
            <small>Total Medical Records</small>
          </div>
        </div>

        {allRecords.length === 0 ? (
          <div className="ps-admin-records-empty">
            <div>📋</div>
            <h2>No medical records found</h2>
            <p>Medical records created by veterinarians will appear here.</p>
          </div>
        ) : (
          <div className="ps-admin-records-grid">
            {allRecords.map((record) => (
              <div
                key={record.record_id}
                className="ps-admin-record-card"
              >
                <div className="ps-admin-record-card-header">
                  <div className="ps-admin-record-card-icon">🐾</div>
                  <div>
                    <span>MEDICAL RECORD</span>
                    <h2>#{record.record_id}</h2>
                  </div>
                  <span className="ps-admin-record-badge">
                    Record
                  </span>
                </div>

                <div className="ps-admin-record-identifiers">
                  <div>
                    <span>Pet ID</span>
                    <strong>#{record.pet_id}</strong>
                  </div>

                  <div>
                    <span>Veterinarian ID</span>
                    <strong>#{record.vet_id}</strong>
                  </div>

                  <div>
                    <span>Record Date</span>
                    <strong>{record.record_date || 'Not provided'}</strong>
                  </div>
                </div>

                <div className="ps-admin-record-content">
                  <div>
                    <span>Diagnosis</span>
                    <p>{record.diagnosis || 'Not provided'}</p>
                  </div>

                  <div>
                    <span>Treatment</span>
                    <p>{record.treatment || 'Not provided'}</p>
                  </div>

                  <div>
                    <span>Prescription</span>
                    <p>{record.prescription || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ps-admin-records-footer">
          <button
            onClick={() => setPage('admin-dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>

      </div>
    );
  }


  return null;
}

export default App;