// "Enums" como strings (portables SQLite <-> Postgres).

export const LEAD_STATUSES = [
  "nuevo",
  "en_conversacion",
  "cotizado",
  "ganado",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  en_conversacion: "En conversación",
  cotizado: "Cotizado",
  ganado: "Ganado",
  perdido: "Perdido",
};

// clases de badge (Tailwind) por estado
export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  nuevo: "bg-sky-100 text-sky-800 border-sky-200",
  en_conversacion: "bg-amber-100 text-amber-800 border-amber-200",
  cotizado: "bg-violet-100 text-violet-800 border-violet-200",
  ganado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  perdido: "bg-rose-100 text-rose-800 border-rose-200",
};

export const DELIVERY_TYPES = ["envio", "local"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];
export const DELIVERY_TYPE_LABEL: Record<DeliveryType, string> = {
  envio: "Envío",
  local: "Retiro en local",
};

export const USER_ROLES = ["admin", "vendedor"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v);
}
export function isDeliveryType(v: string): v is DeliveryType {
  return (DELIVERY_TYPES as readonly string[]).includes(v);
}
