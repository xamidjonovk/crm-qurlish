export type User = {
  id: number;
  username: string;
  role: "admin" | "seller" | "viewer";
  company_id: number;
  permissions: string[];
};
export type Lead = {
  id: number;
  full_name: string;
  phone: string;
  apartment_id: number;
  stage: string;
  version: number;
};
export type Complex = { id: number; name: string };
export type Apartment = {
  id: number;
  complex_id: number;
  number: string;
  rooms: number;
  price_uzs: number;
  availability: string;
};
export type TeamUser = {
  id: number;
  username: string;
  role: string;
  active: boolean;
};
export type Audit = {
  id: number;
  actor_id: number;
  action: string;
  resource_id: number;
  created_at: string;
};
export const stages: Record<string, string> = {
  new: "Yangi",
  contacted: "Bog‘lanildi",
  viewing: "Ko‘rik",
  won: "Sotilgan",
  lost: "Yopilgan",
};
export const availability: Record<string, string> = {
  available: "Mavjud",
  reserved: "Bron qilingan",
  sold: "Sotilgan",
};
export const roles: Record<string, string> = {
  admin: "Administrator",
  seller: "Sotuvchi",
  viewer: "Kuzatuvchi",
};
export const money = (value: number) =>
  new Intl.NumberFormat("uz-UZ").format(value) + " so‘m";
