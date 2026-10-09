export interface CurrentUser {
  id: string;
  username: string;
  role: string;
}

export interface Patient {
  PatientId: string;
  PatientCode: string;
  FullName: string;
  DateOfBirth: string;
  Gender: string;
  Phone: string;
  Address: string;
  AllergyNotes: string | null;
  MedicalHistory: string | null;
  CreatedAt: string;
}

export interface Visit {
  VisitId: string;
  VisitCode: string;
  VisitType: string;
  Status: number;
  TotalAmount: number;
  CreatedAt: string;
  PatientCode: string;
  PatientName: string;
  DoctorUsername: string;
}

export interface Product {
  ProductId: string;
  ProductCode: string;
  ProductName: string;
  Category: string;
  Unit: string;
  MinimumStock: number;
}

export interface InventoryLot {
  ProductId: string;
  ProductCode: string;
  ProductName: string;
  Category: string;
  Unit: string;
  LotId: string;
  LotNumber: string;
  SerialNumber: string | null;
  ExpiresAt: string;
  UnitCost: number;
  QuantityOnHand: number;
  QuantityReserved: number;
  QuantityBlocked: number;
  QuantityAvailable: number;
  WarehouseCode: string;
  WarehouseName: string;
}

export type Section =
  | "dashboard"
  | "reception"
  | "patients"
  | "emr"
  | "cashier"
  | "inventory"
  | "sterilization"
  | "lab"
  | "insurance"
  | "warranty"
  | "finance"
  | "hr"
  | "assets";

export class ApiError extends Error {
  status: number;
  code?: string;
  matches?: unknown[];

  constructor(message: string, status: number, code?: string, matches?: unknown[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.matches = matches;
  }
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null, unauthorized?: () => void): void {
  accessToken = token;
  onUnauthorized = unauthorized ?? null;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  });
  if (response.status === 401 && accessToken) {
    setAccessToken(null);
    onUnauthorized?.();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Không thể kết nối hệ thống." }));
    const message = typeof body?.error === "string" ? body.error : `Lỗi ${response.status}`;
    const code = typeof body?.code === "string" ? body.code : undefined;
    const matches = Array.isArray(body?.matches) ? body.matches : undefined;
    throw new ApiError(message, response.status, code, matches);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function money(value: number | string): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function shortDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
