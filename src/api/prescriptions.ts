import { api } from "./client";
import type {
  Page,
  PrescriptionCreatePayload,
  PrescriptionDTO,
  PrescriptionStatus,
} from "@/types/api";

export interface PrescriptionQuery {
  page?: number;
  size?: number;
  sort?: string;
  userId?: number;
  status?: PrescriptionStatus;
}

export async function getPrescriptions(params: PrescriptionQuery = {}): Promise<Page<PrescriptionDTO>> {
  const { data } = await api.get<Page<PrescriptionDTO>>("/api/prescriptions", { params });
  return data;
}

export async function getPrescriptionsForUser(userId: number): Promise<PrescriptionDTO[]> {
  const { data } = await api.get<PrescriptionDTO[]>(`/api/prescriptions/user/${userId}`);
  return data;
}

export async function getPrescriptionsByStatus(status: PrescriptionStatus): Promise<PrescriptionDTO[]> {
  const { data } = await api.get<PrescriptionDTO[]>(`/api/prescriptions/status/${status}`);
  return data;
}

export async function getPrescriptionById(id: number): Promise<PrescriptionDTO> {
  const { data } = await api.get<PrescriptionDTO>(`/api/prescriptions/${id}`);
  return data;
}

export async function createPrescription(payload: PrescriptionCreatePayload): Promise<PrescriptionDTO> {
  const { data } = await api.post<PrescriptionDTO>("/api/prescriptions", payload);
  return data;
}

/**
 * Doctor/Pharmacist review action — sets status + reviewerNotes via JSON Patch.
 * Backend stamps `reviewedAt` server-side.
 */
export async function reviewPrescription(
  id: number,
  status: Exclude<PrescriptionStatus, "PENDING">,
  reviewerNotes?: string
): Promise<PrescriptionDTO> {
  const patch: Array<{ op: string; path: string; value: unknown }> = [
    { op: "replace", path: "/status", value: status },
  ];
  if (reviewerNotes !== undefined) {
    patch.push({ op: "replace", path: "/reviewerNotes", value: reviewerNotes });
  }
  const { data } = await api.patch<PrescriptionDTO>(`/api/prescriptions/${id}`, patch, {
    headers: { "Content-Type": "application/json-patch+json" },
  });
  return data;
}

export async function deletePrescription(id: number): Promise<void> {
  await api.delete(`/api/prescriptions/${id}`);
}
