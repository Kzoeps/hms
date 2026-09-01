export type BookingStatus = "confirmed" | "pending" | "checked-in" | "checked-out";
export type PersistedBookingStatus = BookingStatus | "cancelled";
export type GuestType = "tourist" | "local";
export type RateSource = "travel-agent" | "walk-in" | "local-default";

/** PostgreSQL numeric values must be parsed before becoming UI numbers. */
export type DbDecimal = string;

/*
 * Persistence boundary: these records mirror Supabase/PostgREST columns and
 * intentionally use snake_case. They are not the hydrated UI models below.
 * The adapter must join the link tables and parse numeric values explicitly.
 */
export interface DbProfileRecord {
  id: string;
  display_name: string;
  role: "admin";
  created_at: string;
}

export interface DbRoomTypeRecord {
  id: string;
  name: string;
  code: string;
  capacity: number;
  price_per_night_nu: DbDecimal;
  total_rooms: number;
  created_at: string;
}

export interface DbRoomRecord {
  id: string;
  room_type_id: string;
  room_number: string;
  gender: string | null;
  capacity: number;
  active: boolean;
}

export interface DbTravelAgentRecord {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

export interface DbAgentRoomRateRecord {
  agent_id: string;
  room_type_id: string;
  rate_per_night_nu: DbDecimal;
}

export interface DbAgentMealRateRecord {
  agent_id: string;
  breakfast_nu: DbDecimal;
  lunch_nu: DbDecimal;
  dinner_nu: DbDecimal;
}

export interface DbTouristRecord {
  id: string;
  name: string;
  nationality: string | null;
  guest_type: GuestType;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface DbBookingRecord {
  id: string;
  confirmation: string;
  check_in: string;
  check_out: string;
  status: PersistedBookingStatus;
  agent_id: string | null;
  invoice_recipient: string;
  guide_count: number;
  driver_count: number;
  guide_gender: string | null;
  driver_gender: string | null;
  staff_rooms_external: boolean;
  complimentary_staff_accommodation: boolean;
  notes: string | null;
  created_at: string;
}

export interface DbBookingTouristRecord {
  booking_id: string;
  tourist_id: string;
}

export interface DbBookingRoomRecord {
  booking_id: string;
  room_type_id: string;
  quantity: number;
  nights: number;
  assigned_room_ids: string[];
}

export interface DbRateSnapshotRecord {
  id: string;
  booking_id: string;
  source: RateSource;
  agent_id: string | null;
  room_rates: Record<string, number>;
  meal_rates: { breakfast: number; lunch: number; dinner: number };
  captured_at: string;
}

export interface DbBookingStaffRecord {
  id: string;
  booking_id: string;
  staff_type: "guide" | "driver";
  name: string | null;
  gender: string | null;
  accommodation_mode: "complimentary" | "external" | "none";
  meals_complimentary: boolean;
}

export interface DbInvoiceRecord {
  id: string;
  invoice_number: string;
  booking_id: string;
  recipient: string;
  issued_at: string;
  due_at: string | null;
  status: "paid" | "due" | "draft";
  subtotal_nu: DbDecimal;
  service_charge_nu: DbDecimal;
  gst_nu: DbDecimal;
  total_nu: DbDecimal;
}

export interface DbInvoiceLineRecord {
  id: string;
  invoice_id: string;
  description: string;
  quantity: DbDecimal;
  unit_price_nu: DbDecimal;
  guest_type: GuestType | null;
  is_staff_complimentary: boolean;
  line_total_nu: DbDecimal;
}
export type StaffGender = "male" | "female" | "mixed";
export type StaffAccommodation = "complimentary" | "external" | "none";
export type MealPlan = "set-menu" | "a-la-carte";

export interface Tourist {
  id: string;
  name: string;
  nationality: string;
  guestType: GuestType;
  email?: string;
}

export interface RoomType {
  id: string;
  name: string;
  code: string;
  capacity: number;
  pricePerNightNu: number;
  totalRooms: number;
}

export interface TravelAgent {
  id: string;
  name: string;
  contact: string;
  email: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  roomRates: Record<string, number>;
  mealRates: { breakfast: number; lunch: number; dinner: number };
}

export interface MealRates {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface RateSnapshot {
  source: RateSource;
  agentId?: string;
  roomRates: Record<string, number>;
  mealRates: MealRates;
  capturedAt: string;
}

export interface StaffAssignment {
  count: number;
  gender: StaffGender;
  capacity: number;
  accommodation: StaffAccommodation;
  mealsComplimentary: boolean;
}

export interface BookingStaff {
  guide: StaffAssignment;
  driver: StaffAssignment;
}

export interface Booking {
  id: string;
  confirmation: string;
  tourists: Tourist[];
  rooms: { roomTypeId: string; quantity: number; nights: number }[];
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  agentId?: string;
  rateSnapshot: RateSnapshot;
  invoiceRecipient: string;
  staff: BookingStaff;
  notes?: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceNu: number;
  guestType?: GuestType;
  staffComplimentary: boolean;
}

export interface Invoice {
  id: string;
  bookingId: string;
  recipient: string;
  issuedAt: string;
  dueAt: string;
  status: "paid" | "due" | "draft";
  lines: InvoiceLine[];
  subtotalNu: number;
  serviceChargeNu: number;
  gstNu: number;
  totalNu: number;
}
