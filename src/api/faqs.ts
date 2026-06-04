import { api } from "./client";
import type { FaqEntryDTO, FaqEntryPayload, Page } from "@/types/api";

export async function getFaqEntries(): Promise<FaqEntryDTO[]> {
  const { data } = await api.get<FaqEntryDTO[]>("/api/faqs");
  return data;
}

export async function getFaqEntriesPage(params: {
  page?: number;
  size?: number;
} = {}): Promise<Page<FaqEntryDTO>> {
  const { data } = await api.get<Page<FaqEntryDTO>>("/api/admin/faqs/page", { params });
  return data;
}

export async function createFaqEntry(payload: FaqEntryPayload): Promise<FaqEntryDTO> {
  const { data } = await api.post<FaqEntryDTO>("/api/faqs", payload);
  return data;
}

export async function updateFaqEntry(id: number, payload: FaqEntryPayload): Promise<FaqEntryDTO> {
  const { data } = await api.put<FaqEntryDTO>(`/api/faqs/${id}`, payload);
  return data;
}

export async function deleteFaqEntry(id: number): Promise<void> {
  await api.delete(`/api/faqs/${id}`);
}
