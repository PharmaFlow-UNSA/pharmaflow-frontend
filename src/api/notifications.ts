import { api } from "./client";
import type {
  NotificationDTO,
  NotificationTriggerDTO,
  TherapyReminderDTO,
} from "@/types/api";

export async function getNotifications(userId?: number): Promise<NotificationDTO[]> {
  const { data } = await api.get<NotificationDTO[]>("/api/notifications", {
    params: userId ? { userId } : undefined,
  });
  return data;
}

export async function getNotification(id: number): Promise<NotificationDTO> {
  const { data } = await api.get<NotificationDTO>(`/api/notifications/${id}`);
  return data;
}

export async function markNotificationRead(id: number): Promise<NotificationDTO> {
  const { data } = await api.patch<NotificationDTO>(`/api/notifications/${id}/mark-read`);
  return data;
}

export async function getNotificationTriggers(id: number): Promise<NotificationTriggerDTO[]> {
  const { data } = await api.get<NotificationTriggerDTO[]>(
    `/api/notifications/${id}/triggers`
  );
  return data;
}

export async function getTherapyReminders(
  patientProfileId?: number
): Promise<TherapyReminderDTO[]> {
  const { data } = await api.get<TherapyReminderDTO[]>("/api/reminders", {
    params: patientProfileId ? { patientProfileId } : undefined,
  });
  return data;
}
