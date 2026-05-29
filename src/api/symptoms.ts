import { api } from "./client";
import type {
  SymptomDTO,
  SymptomPayload,
  SymptomProductMatchDTO,
  SymptomProductMatchPayload,
  SymptomSearchDTO,
  SymptomSearchItemDTO,
  SymptomSearchItemPayload,
  SymptomSearchPayload,
} from "@/types/api";

export interface SymptomSearchQuery {
  userId?: number;
  patientProfileId?: number;
}

export async function getSymptoms(): Promise<SymptomDTO[]> {
  const { data } = await api.get<SymptomDTO[]>("/api/symptoms");
  return data;
}

export async function searchSymptoms(query: string): Promise<SymptomDTO[]> {
  const { data } = await api.get<SymptomDTO[]>("/api/symptoms/search", {
    params: { query },
  });
  return data;
}

export async function getSymptom(id: number): Promise<SymptomDTO> {
  const { data } = await api.get<SymptomDTO>(`/api/symptoms/${id}`);
  return data;
}

export async function createSymptom(payload: SymptomPayload): Promise<SymptomDTO> {
  const { data } = await api.post<SymptomDTO>("/api/symptoms", payload);
  return data;
}

export async function updateSymptom(id: number, payload: SymptomPayload): Promise<SymptomDTO> {
  const { data } = await api.put<SymptomDTO>(`/api/symptoms/${id}`, payload);
  return data;
}

export async function deleteSymptom(id: number): Promise<void> {
  await api.delete(`/api/symptoms/${id}`);
}

export async function getSymptomSearches(
  params: SymptomSearchQuery = {}
): Promise<SymptomSearchDTO[]> {
  const { data } = await api.get<SymptomSearchDTO[]>("/api/symptom-searches", { params });
  return data;
}

export async function createSymptomSearch(
  payload: SymptomSearchPayload
): Promise<SymptomSearchDTO> {
  const { data } = await api.post<SymptomSearchDTO>("/api/symptom-searches", payload);
  return data;
}

export async function getSymptomSearchItems(searchId: number): Promise<SymptomSearchItemDTO[]> {
  const { data } = await api.get<SymptomSearchItemDTO[]>(
    `/api/symptom-searches/${searchId}/items`
  );
  return data;
}

export async function addSymptomSearchItem(
  searchId: number,
  payload: SymptomSearchItemPayload
): Promise<SymptomSearchItemDTO> {
  const { data } = await api.post<SymptomSearchItemDTO>(
    `/api/symptom-searches/${searchId}/items`,
    payload
  );
  return data;
}

export async function deleteSymptomSearchItem(searchId: number, itemId: number): Promise<void> {
  await api.delete(`/api/symptom-searches/${searchId}/items/${itemId}`);
}

export async function getSymptomSearchMatches(
  searchId: number
): Promise<SymptomProductMatchDTO[]> {
  const { data } = await api.get<SymptomProductMatchDTO[]>(
    `/api/symptom-searches/${searchId}/matches`
  );
  return data;
}

export async function getSymptomMatches(symptomId: number): Promise<SymptomProductMatchDTO[]> {
  const { data } = await api.get<SymptomProductMatchDTO[]>(
    `/api/symptoms/${symptomId}/matches`
  );
  return data;
}

export async function createSymptomMatch(
  symptomId: number,
  payload: SymptomProductMatchPayload
): Promise<SymptomProductMatchDTO> {
  const { data } = await api.post<SymptomProductMatchDTO>(
    `/api/symptoms/${symptomId}/matches`,
    payload
  );
  return data;
}

export async function updateSymptomMatch(
  symptomId: number,
  matchId: number,
  payload: SymptomProductMatchPayload
): Promise<SymptomProductMatchDTO> {
  const { data } = await api.put<SymptomProductMatchDTO>(
    `/api/symptoms/${symptomId}/matches/${matchId}`,
    payload
  );
  return data;
}

export async function deleteSymptomMatch(symptomId: number, matchId: number): Promise<void> {
  await api.delete(`/api/symptoms/${symptomId}/matches/${matchId}`);
}
