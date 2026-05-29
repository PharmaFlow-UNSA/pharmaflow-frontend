import { useContext } from "react";
import { NotificationCtx } from "./context";

export function useNotifications() {
  const value = useContext(NotificationCtx);
  if (!value) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return value;
}
