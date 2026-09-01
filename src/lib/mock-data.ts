import type { Booking, Invoice, InvoiceLine, MealRates, RateSnapshot, RateSource, RoomType, Tourist, TravelAgent } from "./types";

export const roomTypes: RoomType[] = [
  { id: "deluxe", name: "Deluxe king", code: "DK", capacity: 2, pricePerNightNu: 4200, totalRooms: 18 },
  { id: "twin", name: "Garden twin", code: "GT", capacity: 2, pricePerNightNu: 3600, totalRooms: 14 },
  { id: "suite", name: "Hillside suite", code: "HS", capacity: 3, pricePerNightNu: 6800, totalRooms: 8 },
  { id: "family", name: "Family loft", code: "FL", capacity: 4, pricePerNightNu: 7800, totalRooms: 8 },
];

const localRoomRates = { deluxe: 4200, twin: 3600, suite: 6800, family: 7800 };
export const walkInRates = { roomRates: { ...localRoomRates }, mealRates: { breakfast: 650, lunch: 850, dinner: 1100 } };
export const localDefaultRates = { roomRates: { ...localRoomRates }, mealRates: { breakfast: 500, lunch: 700, dinner: 900 } };

export const agents: TravelAgent[] = [
  {
    id: "himalayan-trails",
    name: "Himalayan Trails Co.",
    contact: "Pema Choden",
    email: "bookings@himalayantrails.bt",
    active: true,
    effectiveFrom: "2024-10-01",
    roomRates: { deluxe: 3500, twin: 3000, suite: 5800, family: 6800 },
    mealRates: { breakfast: 450, lunch: 600, dinner: 700 },
  },
  {
    id: "druk-discovery",
    name: "Druk Discovery",
    contact: "Tashi Wangmo",
    email: "ops@drukdiscovery.bt",
    active: true,
    effectiveFrom: "2025-01-01",
    roomRates: { deluxe: 3700, twin: 3200, suite: 6200, family: 7100 },
    mealRates: { breakfast: 500, lunch: 650, dinner: 750 },
  },
  {
    id: "north-star",
    name: "North Star Journeys",
    contact: "Sonam Dorji",
    email: "sonam@northstar.bt",
    active: false,
    effectiveFrom: "2023-04-01",
    effectiveTo: "2024-12-31",
    roomRates: { deluxe: 3400, twin: 2900, suite: 5500, family: 6600 },
    mealRates: { breakfast: 400, lunch: 550, dinner: 650 },
  },
];

const tourists: Tourist[] = [
  { id: "t1", name: "Maya & Oliver Chen", nationality: "Singapore", guestType: "tourist", email: "maya.chen@example.com" },
  { id: "t2", name: "Jürgen Falk", nationality: "Germany", guestType: "tourist", email: "j.falk@example.com" },
  { id: "t3", name: "Asha Patel", nationality: "India", guestType: "tourist" },
  { id: "t4", name: "Rohan Patel", nationality: "India", guestType: "tourist" },
  { id: "t5", name: "Karma Tshering", nationality: "Bhutan", guestType: "local" },
  { id: "t6", name: "Isabella Rossi", nationality: "Italy", guestType: "tourist" },
];

type RateDefaults = { roomRates: Record<string, number>; mealRates: MealRates };
const copyRates = (rates: RateDefaults): RateDefaults => ({ roomRates: { ...rates.roomRates }, mealRates: { ...rates.mealRates } });

/** Resolve and copy prices before a booking is persisted; callers must never retain agent rate objects. */
export function resolveRateSnapshot(agentId: string | undefined, guestType: Tourist["guestType"], stayDate: string, capturedAt = stayDate, requestedSource?: RateSource): RateSnapshot {
  const agent = agentId ? agents.find((candidate) => candidate.id === agentId) : undefined;
  const inValidityWindow = agent && agent.active && stayDate >= agent.effectiveFrom && (!agent.effectiveTo || stayDate <= agent.effectiveTo);
  const fallback = requestedSource === "local-default" || (!requestedSource && guestType === "local") ? localDefaultRates : walkInRates;
  const useAgent = Boolean(inValidityWindow && agent) && !requestedSource;
  const rates: RateDefaults = useAgent ? agent! : fallback;
  const copied = copyRates(rates);
  return { source: useAgent ? "travel-agent" : requestedSource ?? (guestType === "local" ? "local-default" : "walk-in"), ...(useAgent ? { agentId: agent!.id } : {}), ...copied, capturedAt };
}

const complimentaryStaff = {
  guide: { count: 1, gender: "male" as const, capacity: 8, accommodation: "complimentary" as const, mealsComplimentary: true },
  driver: { count: 1, gender: "male" as const, capacity: 4, accommodation: "complimentary" as const, mealsComplimentary: true },
};
const noStaff = {
  guide: { count: 0, gender: "male" as const, capacity: 8, accommodation: "none" as const, mealsComplimentary: true },
  driver: { count: 0, gender: "male" as const, capacity: 4, accommodation: "none" as const, mealsComplimentary: true },
};

export const bookings: Booking[] = [
  {
    id: "b1", confirmation: "TH-2408", tourists: [tourists[0]], rooms: [{ roomTypeId: "deluxe", quantity: 1, nights: 3 }], checkIn: "2025-08-14", checkOut: "2025-08-17", status: "confirmed", agentId: "himalayan-trails", rateSnapshot: resolveRateSnapshot("himalayan-trails", "tourist", "2025-08-14", "2025-06-02"), invoiceRecipient: "Himalayan Trails Co.", staff: structuredClone(complimentaryStaff),
  },
  {
    id: "b2", confirmation: "TH-2411", tourists: [tourists[1]], rooms: [{ roomTypeId: "suite", quantity: 1, nights: 4 }], checkIn: "2025-08-14", checkOut: "2025-08-18", status: "confirmed", agentId: "druk-discovery", rateSnapshot: resolveRateSnapshot("druk-discovery", "tourist", "2025-08-14", "2025-06-10"), invoiceRecipient: "Druk Discovery", staff: structuredClone(complimentaryStaff),
  },
  {
    id: "b3", confirmation: "TH-2415", tourists: [tourists[2], tourists[3]], rooms: [{ roomTypeId: "twin", quantity: 4, nights: 2 }], checkIn: "2025-08-15", checkOut: "2025-08-17", status: "pending", agentId: "himalayan-trails", rateSnapshot: resolveRateSnapshot("himalayan-trails", "tourist", "2025-08-15", "2025-06-12"), invoiceRecipient: "Himalayan Trails Co.", staff: structuredClone(complimentaryStaff),
  },
  {
    id: "b4", confirmation: "WI-0832", tourists: [tourists[4]], rooms: [{ roomTypeId: "twin", quantity: 1, nights: 1 }], checkIn: "2025-08-15", checkOut: "2025-08-16", status: "checked-in", rateSnapshot: resolveRateSnapshot(undefined, "local", "2025-08-15", "2025-08-15"), invoiceRecipient: "Karma Tshering", staff: structuredClone(noStaff),
  },
  {
    id: "b5", confirmation: "TH-2403", tourists: [tourists[5]], rooms: [{ roomTypeId: "family", quantity: 1, nights: 3 }], checkIn: "2025-08-16", checkOut: "2025-08-19", status: "confirmed", rateSnapshot: resolveRateSnapshot(undefined, "tourist", "2025-08-16", "2025-07-21"), invoiceRecipient: "Isabella Rossi", staff: structuredClone(complimentaryStaff),
  },
];

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const nightsBetween = (checkIn: string, checkOut: string) => Math.max(1, Math.round((Date.parse(`${checkOut}T12:00:00Z`) - Date.parse(`${checkIn}T12:00:00Z`)) / 86_400_000));

/** Customer charges only: staff meals and accommodation are intentionally not invoice lines. */
export function invoiceForBooking(booking: Booking, details: Pick<Invoice, "id" | "issuedAt" | "dueAt" | "status">): Invoice {
  const lines: InvoiceLine[] = booking.rooms.map((room) => {
    const roomType = roomTypes.find((candidate) => candidate.id === room.roomTypeId);
    const unitPriceNu = booking.rateSnapshot.roomRates[room.roomTypeId];
    if (unitPriceNu === undefined) throw new Error(`Missing snapshotted rate for room type ${room.roomTypeId}`);
    return { description: `${roomType?.name ?? room.roomTypeId} · room / night`, quantity: room.quantity * room.nights, unitPriceNu, staffComplimentary: false };
  });
  const mealRateEntries: [keyof MealRates, string][] = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"]];
  for (const guestType of ["tourist", "local"] as const) {
    const guestCount = booking.tourists.filter((tourist) => tourist.guestType === guestType).length;
    if (!guestCount) continue;
    const mealPlan = guestType === "local" ? "a-la-carte" : "set-menu";
    for (const [meal, label] of mealRateEntries) {
      lines.push({ description: `${label} · ${mealPlan}`, quantity: guestCount * nightsBetween(booking.checkIn, booking.checkOut), unitPriceNu: booking.rateSnapshot.mealRates[meal], guestType, staffComplimentary: false });
    }
  }
  const subtotalNu = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPriceNu, 0));
  const serviceChargeNu = roundMoney(subtotalNu * 0.1);
  const gstNu = roundMoney((subtotalNu + serviceChargeNu) * 0.05);
  return { ...details, bookingId: booking.id, recipient: booking.invoiceRecipient, lines, subtotalNu, serviceChargeNu, gstNu, totalNu: roundMoney(subtotalNu + serviceChargeNu + gstNu) };
}

export const invoices: Invoice[] = [
  invoiceForBooking(bookings[0], { id: "INV-2025-071", issuedAt: "2025-08-01", dueAt: "2025-08-14", status: "paid" }),
  invoiceForBooking(bookings[1], { id: "INV-2025-072", issuedAt: "2025-08-01", dueAt: "2025-08-14", status: "due" }),
  invoiceForBooking(bookings[3], { id: "INV-2025-073", issuedAt: "2025-08-15", dueAt: "2025-08-15", status: "paid" }),
];

export const arrivalTimes: Record<string, string> = { b1: "09:30", b2: "11:15", b3: "14:00", b4: "Now", b5: "16:40" };
