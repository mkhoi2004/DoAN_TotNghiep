import type { Section } from "../api";

export const roleNames: Record<string, string> = {
  ADMIN: "Quản trị viên",
  RECEPTIONIST: "Tiếp nhận",
  DOCTOR: "Bác sĩ",
  ASSISTANT: "Phụ tá",
  ACCOUNTANT: "Kế toán viên",
  CHIEF_ACCOUNTANT: "Kế toán trưởng",
  INVENTORY_MANAGER: "Quản lý kho",
  CLINIC_MANAGER: "Quản lý phòng khám"
};

export const sectionRoles: Record<Section, readonly string[]> = {
  dashboard: ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"],
  reception: ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"],
  patients: ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"],
  emr: ["ADMIN", "DOCTOR", "ASSISTANT"],
  cashier: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"],
  inventory: ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"],
  sterilization: ["ADMIN", "ASSISTANT", "INVENTORY_MANAGER"],
  lab: ["ADMIN", "DOCTOR", "ASSISTANT"],
  insurance: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"],
  warranty: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
  finance: ["ADMIN", "ACCOUNTANT", "CHIEF_ACCOUNTANT"],
  hr: ["ADMIN", "ACCOUNTANT"],
  assets: ["ADMIN", "ACCOUNTANT", "INVENTORY_MANAGER"]
};

export const sectionCreateRoles: Record<Section, readonly string[]> = {
  dashboard: [],
  reception: ["ADMIN", "RECEPTIONIST"],
  patients: ["ADMIN", "RECEPTIONIST"],
  emr: [],
  cashier: [],
  inventory: ["ADMIN", "INVENTORY_MANAGER"],
  sterilization: ["ADMIN", "ASSISTANT", "INVENTORY_MANAGER"],
  lab: ["ADMIN", "DOCTOR", "ASSISTANT"],
  insurance: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"],
  warranty: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
  finance: ["ACCOUNTANT"],
  hr: ["ADMIN", "ACCOUNTANT"],
  assets: ["ADMIN", "ACCOUNTANT", "INVENTORY_MANAGER"]
};

export function canAccessSection(role: string, section: Section): boolean {
  return sectionRoles[section].includes(role);
}

export function canCreateInSection(role: string, section: Section): boolean {
  return sectionCreateRoles[section].includes(role);
}
