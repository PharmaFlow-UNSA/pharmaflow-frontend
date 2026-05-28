import { api } from "./client";
import type {
  Page,
  ReservationCreatePayload,
  ReservationDTO,
  ReservationStatus,
} from "@/types/api";

export interface ReservationQuery {
  page?: number;
  size?: number;
  sort?: string;
  userId?: number;
  status?: ReservationStatus;
  pharmacyId?: number;
}

export async function getReservations(params: ReservationQuery = {}): Promise<Page<ReservationDTO>> {
  const { data } = await api.get<Page<ReservationDTO>>("/api/reservations", { params });
  return data;
}

export async function getReservationsByUserId(userId: number): Promise<ReservationDTO[]> {
  const { data } = await api.get<ReservationDTO[]>(`/api/reservations/user/${userId}`);
  return data;
}

export async function getReservationById(id: number): Promise<ReservationDTO> {
  const { data } = await api.get<ReservationDTO>(`/api/reservations/${id}`);
  return data;
}

export async function createReservation(
  payload: ReservationCreatePayload
): Promise<ReservationDTO> {
  const { data } = await api.post<ReservationDTO>("/api/reservations", payload);
  return data;
}

export async function patchReservationStatus(
  id: number,
  status: ReservationStatus
): Promise<ReservationDTO> {
  const patch = [{ op: "replace", path: "/status", value: status }];
  const { data } = await api.patch<ReservationDTO>(`/api/reservations/${id}`, patch, {
    headers: { "Content-Type": "application/json-patch+json" },
  });
  return data;
}
