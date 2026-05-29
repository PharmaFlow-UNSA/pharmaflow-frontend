import { api } from "./client";
import type {
  RecommendationDTO,
  RecommendationEventDTO,
  RecommendationEventType,
  RecommendationGeneratePayload,
  RecommendationInteractionPayload,
  RecommendationPayload,
  RecommendationReservationPayload,
  RecommendationReservationSagaDTO,
} from "@/types/api";

export interface RecommendationQuery {
  userId?: number;
  patientProfileId?: number;
}

export async function getRecommendations(
  params: RecommendationQuery = {}
): Promise<RecommendationDTO[]> {
  const { data } = await api.get<RecommendationDTO[]>("/api/recommendations", { params });
  return data;
}

export async function getRecommendation(id: number): Promise<RecommendationDTO> {
  const { data } = await api.get<RecommendationDTO>(`/api/recommendations/${id}`);
  return data;
}

export async function createRecommendation(
  payload: RecommendationPayload
): Promise<RecommendationDTO> {
  const { data } = await api.post<RecommendationDTO>("/api/recommendations", payload);
  return data;
}

export async function generateRecommendations(
  payload: RecommendationGeneratePayload
): Promise<RecommendationDTO[]> {
  const { data } = await api.post<RecommendationDTO[]>("/api/recommendations/generate", payload);
  return data;
}

export async function updateRecommendation(
  id: number,
  payload: RecommendationPayload
): Promise<RecommendationDTO> {
  const { data } = await api.put<RecommendationDTO>(`/api/recommendations/${id}`, payload);
  return data;
}

export async function logRecommendationInteraction(
  id: number,
  interactionType: RecommendationEventType
): Promise<RecommendationEventDTO> {
  const payload: RecommendationInteractionPayload = { interactionType };
  const { data } = await api.post<RecommendationEventDTO>(
    `/api/recommendations/${id}/interactions`,
    payload
  );
  return data;
}

export async function reserveRecommendation(
  id: number,
  payload: RecommendationReservationPayload
): Promise<RecommendationReservationSagaDTO> {
  const { data } = await api.post<RecommendationReservationSagaDTO>(
    `/api/recommendations/${id}/reserve`,
    payload
  );
  return data;
}

export async function getRecommendationInteractions(
  id: number
): Promise<RecommendationEventDTO[]> {
  const { data } = await api.get<RecommendationEventDTO[]>(
    `/api/recommendations/${id}/interactions`
  );
  return data;
}
