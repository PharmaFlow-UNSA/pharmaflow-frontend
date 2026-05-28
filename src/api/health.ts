import { api } from "./client";
import type {
  PatientProfileDTO,
  AllergyDTO,
  TherapyDTO,
  FamilyMemberDTO,
  FamilyMemberCreatePayload,
  Page,
  Severity,
} from "@/types/api";

// ── Patient Profiles ───────────────────────────────────────────────────────

export async function getPatientProfile(id: number): Promise<PatientProfileDTO> {
  const { data } = await api.get<PatientProfileDTO>(`/api/patient-profiles/${id}`);
  return data;
}

export async function createPatientProfile(
  payload: Omit<PatientProfileDTO, "id">
): Promise<PatientProfileDTO> {
  const { data } = await api.post<PatientProfileDTO>("/api/patient-profiles", payload);
  return data;
}

export async function updatePatientProfile(
  id: number,
  payload: PatientProfileDTO
): Promise<PatientProfileDTO> {
  const { data } = await api.put<PatientProfileDTO>(`/api/patient-profiles/${id}`, payload);
  return data;
}

// ── Allergies (standalone catalogue endpoints) ────────────────────────────

export interface AllergySearchParams {
  page?: number;
  size?: number;
  allergen?: string;
  severity?: Severity;
}

export async function getAllergies(params: AllergySearchParams = {}): Promise<Page<AllergyDTO>> {
  const { data } = await api.get<Page<AllergyDTO>>("/api/allergies", {
    params: { page: 0, size: 20, ...params },
  });
  return data;
}

export async function getAllergyById(id: number): Promise<AllergyDTO> {
  const { data } = await api.get<AllergyDTO>(`/api/allergies/${id}`);
  return data;
}

export async function createAllergy(payload: Omit<AllergyDTO, "id">): Promise<AllergyDTO> {
  const { data } = await api.post<AllergyDTO>("/api/allergies", payload);
  return data;
}

export async function updateAllergy(id: number, payload: AllergyDTO): Promise<AllergyDTO> {
  const { data } = await api.put<AllergyDTO>(`/api/allergies/${id}`, payload);
  return data;
}

export async function deleteAllergy(id: number): Promise<void> {
  await api.delete(`/api/allergies/${id}`);
}

// ── Therapies (standalone catalogue endpoints) ────────────────────────────

export interface TherapySearchParams {
  page?: number;
  size?: number;
  medicationName?: string;
}

export async function getTherapies(params: TherapySearchParams = {}): Promise<Page<TherapyDTO>> {
  const { data } = await api.get<Page<TherapyDTO>>("/api/therapies", {
    params: { page: 0, size: 20, ...params },
  });
  return data;
}

export async function createTherapy(payload: Omit<TherapyDTO, "id">): Promise<TherapyDTO> {
  const { data } = await api.post<TherapyDTO>("/api/therapies", payload);
  return data;
}

export async function updateTherapy(id: number, payload: TherapyDTO): Promise<TherapyDTO> {
  const { data } = await api.put<TherapyDTO>(`/api/therapies/${id}`, payload);
  return data;
}

export async function deleteTherapy(id: number): Promise<void> {
  await api.delete(`/api/therapies/${id}`);
}

// ── Family Members ─────────────────────────────────────────────────────────

export async function getFamilyMembersByUserId(userId: number): Promise<FamilyMemberDTO[]> {
  const { data } = await api.get<FamilyMemberDTO[]>(`/api/family-members/user/${userId}`);
  return data;
}

export async function getFamilyMemberById(id: number): Promise<FamilyMemberDTO> {
  const { data } = await api.get<FamilyMemberDTO>(`/api/family-members/${id}`);
  return data;
}

export async function createFamilyMember(
  payload: FamilyMemberCreatePayload
): Promise<FamilyMemberDTO> {
  const { data } = await api.post<FamilyMemberDTO>("/api/family-members", payload);
  return data;
}

export async function updateFamilyMember(
  id: number,
  payload: FamilyMemberCreatePayload
): Promise<FamilyMemberDTO> {
  const { data } = await api.put<FamilyMemberDTO>(`/api/family-members/${id}`, payload);
  return data;
}

export async function deleteFamilyMember(id: number): Promise<void> {
  await api.delete(`/api/family-members/${id}`);
}
