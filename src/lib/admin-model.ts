import type { FormField, SiteContent } from "./site/model";
export type Ticket = {
  id: string;
  ticket_number: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  grade: string;
  status: "registered" | "checked_in" | "cancelled";
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
  checked_in_at: string | null;
};
export type AdminSettings = {
  id: number;
  event_name: string;
  date_label: string;
  time_label: string;
  venue: string;
  location: string;
  max_seats: number;
  registered_count: number;
  registration_open: boolean;
  version: number;
  form_fields: FormField[];
  content: SiteContent;
};
export type AdminData = {
  settings: AdminSettings;
  tickets: Ticket[];
  messages: {
    id: string;
    name: string;
    email: string;
    question: string;
    role: string;
    grade: number | null;
    status: string;
    created_at: string;
  }[];
  audit: {
    id: string;
    action: string;
    ticket_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }[];
  stats: {
    total: number;
    registered: number;
    checkedIn: number;
    cancelled: number;
    roles: { label: string; count: number }[];
    grades: { label: string; count: number }[];
    daily: { day: string; count: number }[];
  };
};
