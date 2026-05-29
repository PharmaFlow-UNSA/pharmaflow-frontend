import { api } from "./client";
import type {
  ChatIntentMatchDTO,
  ChatMessageDTO,
  ChatMessagePayload,
  ChatSessionDTO,
  ChatSessionPayload,
  ChatbotAskPayload,
  ChatbotAskResponse,
} from "@/types/api";

export async function askChatbot(payload: ChatbotAskPayload): Promise<ChatbotAskResponse> {
  const { data } = await api.post<ChatbotAskResponse>("/api/chatbot/ask", payload);
  return data;
}

export async function createChatSession(payload: ChatSessionPayload): Promise<ChatSessionDTO> {
  const { data } = await api.post<ChatSessionDTO>("/api/chat-sessions", payload);
  return data;
}

export async function getChatSessionsByUser(userId: number): Promise<ChatSessionDTO[]> {
  const { data } = await api.get<ChatSessionDTO[]>(`/api/chat-sessions/user/${userId}`);
  return data;
}

export async function createChatMessage(
  sessionId: number,
  payload: ChatMessagePayload
): Promise<ChatMessageDTO> {
  const { data } = await api.post<ChatMessageDTO>(`/api/chat-sessions/${sessionId}/messages`, payload);
  return data;
}

export async function getChatMessages(sessionId: number): Promise<ChatMessageDTO[]> {
  const { data } = await api.get<ChatMessageDTO[]>(`/api/chat-sessions/${sessionId}/messages`);
  return data;
}

export async function getChatIntentMatch(messageId: number): Promise<ChatIntentMatchDTO> {
  const { data } = await api.get<ChatIntentMatchDTO>(`/api/chat-messages/${messageId}/intent-match`);
  return data;
}
