export type Role = "patient" | "doctor" | "admin";

export type PatientProfile = {
  id: number;
  name: string;
  dob: string;
  age: number;
  gender: string;
  address: string;
  mobile_no: string;
};

export type DoctorProfile = {
  id: number;
  name: string;
  dob: string;
  gender: string;
  address: string;
  mobile_no: string;
  registration_no: string;
  year_of_registration: string;
  qualification: string;
  state_medical_council: string;
  specialization: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role | null;
  profile: PatientProfile | DoctorProfile | null;
};

export type AuthResponse = { access: string; refresh: string; user: User };

export type Symptom = { key: string; label: string };
export type SymptomCatalog = { symptoms: Symptom[]; specializations: string[] };

export type DoctorNote = { id: number; doctor: string; note: string; created_at: string };

export type Prediction = {
  id: number;
  disease_name: string;
  confidence: number;
  specialization: string;
  symptoms: string[];
  symptom_labels: string[];
  ai_explanation: string;
  patient: { id: number; name: string; age: number; gender: string };
  doctor_notes: DoctorNote[];
  created_at: string;
};

export type Doctor = {
  id: number;
  name: string;
  gender: string;
  qualification: string;
  specialization: string;
  state_medical_council: string;
  address: string;
  rating: number | null;
  review_count: number;
  years_experience: number;
  reviews?: { id: number; rating: number; review: string; patient: string; date: string }[];
};

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type Appointment = {
  id: number;
  appointment_date: string;
  status: AppointmentStatus;
  doctor_notes: string;
  rating: number | null;
  review: string;
  doctor: { id: number; name: string; specialization: string; qualification: string };
  patient: { id: number; name: string; age: number; gender: string };
  prediction: {
    id: number;
    disease_name: string;
    confidence: number;
    symptoms: string[];
    specialization: string;
  } | null;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  message: string;
  sender_name: string;
  is_mine: boolean;
  created: string;
};

export const GENDERS = ["Female", "Male", "Other"] as const;
