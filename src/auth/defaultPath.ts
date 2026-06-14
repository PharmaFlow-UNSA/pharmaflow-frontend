import type { Role } from "@/types/api";

export function defaultPathForRoles(roles: Role[] = []) {
  if (roles.includes("ROLE_ADMIN")) return "/admin";
  if (roles.includes("ROLE_PHARMACIST") || roles.includes("ROLE_DOCTOR")) return "/dashboard";
  return "/";
}
