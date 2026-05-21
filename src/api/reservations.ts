import { api } from "./client";
import type { ReservationCreatePayload, ReservationDTO } from "@/types/api";

export async function createReservation(
  payload: ReservationCreatePayload
): Promise<ReservationDTO> {
  const { data } = await api.post<ReservationDTO>("/api/reservations", payload);
  return data;
}

export async function getReservationsByUserId(userId: number): Promise<ReservationDTO[]> {
  const { data } = await api.get<ReservationDTO[]>(`/api/reservations/user/${userId}`);
  return data;
}
