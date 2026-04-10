// Spanish-language labels for Prisma enums.
// Keep this as the single source of truth so the UI stays consistent.
import type {
  Department,
  PermitStatus,
  PermitType,
  PunchKind,
  Role,
  UserStatus,
  VacationStatus,
  VacationType,
} from "@/generated/prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
};

export const DEPARTMENT_LABEL: Record<Department, string> = {
  PRODUCCION: "Producción",
  ADMINISTRACION: "Administración",
};

export const PUNCH_KIND_LABEL: Record<PunchKind, string> = {
  CHECK_IN: "Entrada",
  CHECK_OUT: "Salida",
  BREAK_OUT: "Inicio almuerzo",
  BREAK_IN: "Fin almuerzo",
  OT_IN: "Inicio extra",
  OT_OUT: "Fin extra",
  OTHER: "Otro",
};

export const PERMIT_TYPE_LABEL: Record<PermitType, string> = {
  MEDICAL: "Médico",
  EARLY_LEAVE: "Salida anticipada",
  LATE_ARRIVAL: "Llegada tarde",
  FAMILY: "Familiar",
  PERSONAL: "Personal",
  OTHER: "Otro",
};

export const PERMIT_STATUS_LABEL: Record<PermitStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  DENIED: "Rechazado",
};

export const VACATION_TYPE_LABEL: Record<VacationType, string> = {
  ANUAL: "Anual",
  PERSONAL: "Personal",
  SICK: "Por enfermedad",
};

export const VACATION_STATUS_LABEL: Record<VacationStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export type StatusVariant = "default" | "secondary" | "destructive" | "outline";

export const PERMIT_STATUS_VARIANT: Record<PermitStatus, StatusVariant> = {
  PENDING: "secondary",
  APPROVED: "default",
  DENIED: "destructive",
};

export const VACATION_STATUS_VARIANT: Record<VacationStatus, StatusVariant> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export const USER_STATUS_VARIANT: Record<UserStatus, StatusVariant> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  ARCHIVED: "outline",
};
