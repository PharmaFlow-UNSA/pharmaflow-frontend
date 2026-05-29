import { api } from "./client";
import type {
  FraudCheckDTO,
  FraudCheckPayload,
  FraudLogDTO,
  FraudRuleDTO,
  FraudRulePayload,
} from "@/types/api";

export interface FraudCheckQuery {
  userId?: number;
  orderId?: number;
}

export async function getFraudRules(): Promise<FraudRuleDTO[]> {
  const { data } = await api.get<FraudRuleDTO[]>("/api/fraud-rules");
  return data;
}

export async function getFraudRule(id: number): Promise<FraudRuleDTO> {
  const { data } = await api.get<FraudRuleDTO>(`/api/fraud-rules/${id}`);
  return data;
}

export async function createFraudRule(payload: FraudRulePayload): Promise<FraudRuleDTO> {
  const { data } = await api.post<FraudRuleDTO>("/api/fraud-rules", payload);
  return data;
}

export async function updateFraudRule(
  id: number,
  payload: FraudRulePayload
): Promise<FraudRuleDTO> {
  const { data } = await api.put<FraudRuleDTO>(`/api/fraud-rules/${id}`, payload);
  return data;
}

export async function deleteFraudRule(id: number): Promise<void> {
  await api.delete(`/api/fraud-rules/${id}`);
}

export async function getFraudChecks(params: FraudCheckQuery = {}): Promise<FraudCheckDTO[]> {
  const { data } = await api.get<FraudCheckDTO[]>("/api/fraud-checks", { params });
  return data;
}

export async function createFraudCheck(payload: FraudCheckPayload): Promise<FraudCheckDTO> {
  const { data } = await api.post<FraudCheckDTO>("/api/fraud-checks", payload);
  return data;
}

export async function getFraudCheckLogs(checkId: number): Promise<FraudLogDTO[]> {
  const { data } = await api.get<FraudLogDTO[]>(`/api/fraud-checks/${checkId}/logs`);
  return data;
}

export async function getFraudRuleLogs(ruleId: number): Promise<FraudLogDTO[]> {
  const { data } = await api.get<FraudLogDTO[]>(`/api/fraud-rules/${ruleId}/logs`);
  return data;
}
