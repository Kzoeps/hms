"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { agents, arrivalTimes, bookings as seedBookings, invoiceForBooking, invoices as seedInvoices, nightsBetween, resolveRateSnapshot, roomTypes } from "@/lib/mock-data";
import type { Booking, BookingStatus, Invoice, StaffAccommodation, StaffGender } from "@/lib/types";

type View = "dashboard" | "bookings" | "agents" | "invoices" | "guests";

type IconName = "grid" | "calendar" | "users" | "receipt" | "settings" | "plus" | "arrow" | "more" | "bed" | "trend" | "clock" | "download" | "print" | "close" | "check" | "search" | "chevron" | "sun";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9h18" /></>,
    users: <><path d="M16 20v-1.7a3.3 3.3 0 0 0-3.3-3.3H6.3A3.3 3.3 0 0 0 3 18.3V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M16 4.2a3.5 3.5 0 0 1 0 6.6M21 20v-1.7a3.3 3.3 0 0 0-2.5-3.2" /></>,
    receipt: <><path d="M5 3.5h14v17l-2.4-1.6-2.4 1.6-2.3-1.6-2.4 1.6-2.3-1.6L5 20.5z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.5-1H6.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1A1.7 1.7 0 0 0 8.1 8L8 7.9l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.4h-.2a1.7 1.7 0 0 0-1.5 1.6z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    bed: <><path d="M3 18v-5.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V18M3 15h18M6 10.5V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3.5" /></>,
    trend: <><path d="M3 17l6-6 4 4 7-8" /><path d="M15 7h5v5" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
    print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" /></>,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="M16 16l5 5" /></>,
    chevron: <path d="M9 5l7 7-7 7" />,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const statusLabels: Record<BookingStatus, string> = { confirmed: "Confirmed", pending: "Pending", "checked-in": "Checked in", "checked-out": "Checked out" };
const statusClass: Record<BookingStatus, string> = { confirmed: "status-confirmed", pending: "status-pending", "checked-in": "status-checked", "checked-out": "status-out" };
const money = (value: number) => `Nu. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const roomCount = (booking: Booking) => booking.rooms.reduce((sum, room) => sum + room.quantity, 0);
const guestLabel = (booking: Booking) => booking.tourists.length === 1 ? booking.tourists[0].name : `${booking.tourists[0].name} + ${booking.tourists.length - 1} guests`;
const invoiceText = (invoice: Invoice) => [
  `THE TIMBERLINE · INVOICE ${invoice.id}`,
  `Recipient: ${invoice.recipient}`,
  `Issued: ${shortDate(invoice.issuedAt)} · Due: ${shortDate(invoice.dueAt)}`,
  "",
  ...invoice.lines.map((line) => `${line.description}: ${line.quantity} × ${money(line.unitPriceNu)} = ${money(line.quantity * line.unitPriceNu)}`),
  "",
  `Subtotal: ${money(invoice.subtotalNu)}`,
  `Service charge (10%): ${money(invoice.serviceChargeNu)}`,
  `GST (5%): ${money(invoice.gstNu)}`,
  `TOTAL: ${money(invoice.totalNu)}`,
].join("\n");

const downloadFile = (filename: string, contents: string, type: string) => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the object URL alive until the browser has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const downloadInvoice = (invoice: Invoice) => downloadFile(`${invoice.id}.txt`, invoiceText(invoice), "text/plain;charset=utf-8");

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const downloadBookingCsv = (bookings: Booking[]) => {
  const rows = [
    ["Booking", "Guest", "Agent", "Check-in", "Check-out", "Rooms", "Status"],
    ...bookings.map((booking) => [
      booking.confirmation,
      booking.tourists[0]?.name ?? "",
      booking.agentId ? agents.find((agent) => agent.id === booking.agentId)?.name ?? "" : "Direct booking",
      booking.checkIn,
      booking.checkOut,
      roomCount(booking),
      statusLabels[booking.status],
    ]),
  ];
  downloadFile("timberline-bookings.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
};

const printInvoice = (invoice: Invoice) => {
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) {
    // Popup blockers should not make the button a no-op.
    window.print();
    return;
  }
  printWindow.opener = null;
  printWindow.document.title = `Invoice ${invoice.id}`;
  const style = printWindow.document.createElement("style");
  style.textContent = "body { font: 16px/1.5 monospace; white-space: pre-wrap; padding: 32px; }";
  const content = printWindow.document.createElement("pre");
  content.textContent = invoiceText(invoice);
  printWindow.document.head.append(style);
  printWindow.document.body.append(content);
  printWindow.document.close();
  printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 0);
};

function StatusPill({ status }: { status: BookingStatus }) {
  return <span className={`status-pill ${statusClass[status]}`}><i />{statusLabels[status]}</span>;
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: IconName; tone: string }) {
  return <article className="metric-card">
    <div className={`metric-icon ${tone}`} aria-hidden="true"><Icon name={icon} size={19} /></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    <Icon name="more" size={18} />
  </article>;
}

function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <header className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>{children}</header>;
}

function Dashboard({ onNewBooking, onNavigate, bookings, invoiceList }: { onNewBooking: () => void; onNavigate: (view: View) => void; bookings: Booking[]; invoiceList: Invoice[] }) {
  const occupancy = 38;
  const paidTotal = invoiceList.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.totalNu, 0);
  const dueTotal = invoiceList.filter((invoice) => invoice.status === "due").reduce((sum, invoice) => sum + invoice.totalNu, 0);
  return <>
    <PageHeading eyebrow="Thursday · 14 August 2025" title="Good morning, Dorji.">
      <button className="button-primary" onClick={onNewBooking}><Icon name="plus" size={16} /> New booking</button>
    </PageHeading>
    <section className="welcome-strip" aria-labelledby="today-strip-title">
      <div><span className="strip-mark" aria-hidden="true"><Icon name="sun" size={16} /></span><div><strong id="today-strip-title">Today at The Timberline</strong><p>Clear skies in Paro · 21°C · 7 arrivals, 4 departures</p></div></div>
      <span className="quiet-label">OPERATIONS LIVE <b /></span>
    </section>
    <section className="metric-grid" aria-label="Property metrics">
      <Metric label="Occupancy" value="79%" detail="38 of 48 rooms" icon="bed" tone="sage" />
      <Metric label="Arrivals today" value="7" detail="2 still to check in" icon="arrow" tone="coral" />
      <Metric label="In-house guests" value="64" detail="+8 from yesterday" icon="users" tone="blue" />
      <Metric label="Revenue this month" value="Nu. 1.24M" detail="↑ 12.8% vs July" icon="trend" tone="gold" />
    </section>
    <section className="top-grid" aria-label="Front desk overview">
      <article className="panel occupancy-panel">
        <div className="panel-head"><div><span className="eyebrow">Room board</span><h2>House at a glance</h2></div><button className="text-button" onClick={() => onNavigate("bookings")}>View room board <Icon name="arrow" size={14} /></button></div>
        <div className="occupancy-content">
          <div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(#d96b48 0 79%, #e6e4dd 79% 100%)` }}><div><strong>{occupancy}%</strong><span>occupied</span></div></div><div className="donut-caption"><span><i className="dot coral" />Occupied <b>38</b></span><span><i className="dot pale" />Available <b>10</b></span></div></div>
          <div className="room-bars">{roomTypes.map((room, index) => { const used = [15, 11, 7, 5][index]; return <div className="room-bar" key={room.id}><div><span>{room.name}</span><b>{used}/{room.totalRooms}</b></div><div className="bar-track"><i style={{ width: `${(used / room.totalRooms) * 100}%`, background: ["#d96b48", "#8fa99c", "#cfad63", "#68848b"][index] }} /></div></div>; })}</div>
        </div>
        <div className="panel-foot"><span><b className="legend-square available" /> 10 rooms available</span><span><b className="legend-square cleaning" /> 3 being turned</span><span className="sync"><Icon name="clock" size={13} /> Updated just now</span></div>
      </article>
      <article className="panel arrivals-panel">
        <div className="panel-head"><div><span className="eyebrow">Front desk</span><h2>Arrivals today <em>7</em></h2></div><button className="circle-button" aria-label="More arrival options"><Icon name="more" /></button></div>
        <div className="arrival-list">{bookings.slice(0, 4).map((booking, index) => <div className="arrival-row" key={booking.id}><div className={`avatar avatar-${index}`} aria-hidden="true">{booking.tourists[0].name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="arrival-person"><strong>{guestLabel(booking)}</strong><span>{booking.confirmation} · {roomCount(booking)} {roomCount(booking) === 1 ? "room" : "rooms"} · {booking.tourists.length} {booking.tourists.length === 1 ? "guest" : "guests"}</span></div><div className="arrival-time"><b>{arrivalTimes[booking.id]}</b><small>{booking.status === "checked-in" ? "Checked in" : "Arrival"}</small></div><Icon name="chevron" size={15} /></div>)}</div>
        <button className="panel-link" onClick={() => onNavigate("bookings")}>See all arrivals <Icon name="arrow" size={14} /></button>
      </article>
    </section>
    <section className="bottom-grid" aria-label="Recent activity">
      <article className="panel booking-panel">
        <div className="panel-head"><div><span className="eyebrow">Live ledger</span><h2>Recent bookings</h2></div><button className="text-button" onClick={() => onNavigate("bookings")}>All bookings <Icon name="arrow" size={14} /></button></div>
        <BookingTable compact bookings={bookings} />
      </article>
      <article className="panel invoice-panel">
        <div className="panel-head"><div><span className="eyebrow">Money in motion</span><h2>Invoice pulse</h2></div><button className="circle-button" onClick={() => onNavigate("invoices")} aria-label="View invoices"><Icon name="arrow" size={16} /></button></div>
        <div className="invoice-total"><div><span>Outstanding</span><strong>{money(invoiceList.filter((invoice) => invoice.status === "due").reduce((sum, invoice) => sum + invoice.totalNu, 0))}</strong></div><span className="invoice-change">{invoiceList.filter((invoice) => invoice.status === "due").length} invoices due</span></div>
        <div className="mini-chart"><div className="chart-labels"><span>Aug 01</span><span>Aug 14</span></div><div className="chart-area"><i className="chart-line" /><b className="chart-point p1" /><b className="chart-point p2" /><b className="chart-point p3" /></div></div>
        <div className="invoice-foot"><span><i className="dot blue" />Paid <b>{money(paidTotal)}</b></span><span><i className="dot coral" />Due <b>{money(dueTotal)}</b></span></div>
      </article>
    </section>
  </>;
}

function BookingTable({ compact = false, bookings = seedBookings }: { compact?: boolean; bookings?: Booking[] }) {
  return <div className="table-scroll"><table className="data-table" aria-label={compact ? "Recent bookings" : "Bookings"}><thead><tr><th scope="col">Booking</th><th scope="col">Guest / agent</th><th scope="col">Stay</th><th scope="col">Rooms</th><th scope="col">Status</th><th scope="col" aria-label="Actions" /></tr></thead><tbody>{(compact ? bookings.slice(0, 4) : bookings).map((booking) => <tr key={booking.id}><td><strong className="booking-id">{booking.confirmation}</strong></td><td><div className="guest-cell"><span className="tiny-avatar" aria-hidden="true">{booking.tourists[0].name[0]}</span><div><strong>{guestLabel(booking)}</strong><small>{booking.agentId ? agents.find((agent) => agent.id === booking.agentId)?.name : "Direct booking"}</small></div></div></td><td><strong>{shortDate(booking.checkIn)} – {shortDate(booking.checkOut)}</strong><small>{nightsBetween(booking.checkIn, booking.checkOut)} nights</small></td><td>{roomCount(booking)}</td><td><StatusPill status={booking.status} /></td><td><button className="row-more" aria-label={`More options for ${booking.confirmation}`}><Icon name="more" size={16} /></button></td></tr>)}</tbody></table></div>;
}

function BookingsView({ onNewBooking, bookings }: { onNewBooking: () => void; bookings: Booking[] }) {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = bookings.filter((booking) => {
    const matchesFilter = filter === "all" || booking.status === filter;
    const agentName = booking.agentId ? agents.find((agent) => agent.id === booking.agentId)?.name ?? "" : "Direct booking";
    const matchesQuery = !normalizedQuery || [booking.confirmation, agentName, ...booking.tourists.map((tourist) => tourist.name)].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesFilter && matchesQuery;
  });
  return <><PageHeading eyebrow="Reservations · 24 active" title="Bookings"><button className="button-primary" onClick={onNewBooking}><Icon name="plus" size={16} /> New booking</button></PageHeading><div className="toolbar"><div className="search-box"><Icon name="search" size={17} /><label className="visually-hidden" htmlFor="booking-search">Search bookings</label><input id="booking-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search confirmation, guest or agent" /></div><div className="filter-tabs" role="group" aria-label="Filter bookings">{(["all", "confirmed", "pending", "checked-in"] as const).map((item) => <button type="button" className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)} key={item}>{item === "all" ? "All bookings" : statusLabels[item]}</button>)}</div></div><article className="panel full-panel"><div className="panel-head"><div><span className="eyebrow">August 2025</span><h2>{filtered.length} booking records</h2></div><button type="button" className="outline-button" onClick={() => downloadBookingCsv(filtered)}><Icon name="download" size={15} /> Export CSV</button></div><BookingTable bookings={filtered} /></article></>;
}

function AgentsView() {
  return <><PageHeading eyebrow="Commercial desk · 3 profiles" title="Agent rate desk"><button className="button-primary"><Icon name="plus" size={16} /> Add agent</button></PageHeading><div className="rate-notice"><div className="notice-icon">Nu.</div><div><strong>Rates are snapshotted at booking time</strong><p>Changing a preset never changes an existing reservation or invoice. Effective dates keep your negotiated rates tidy.</p></div><Icon name="check" size={19} /></div><article className="panel full-panel rates-panel"><div className="panel-head"><div><span className="eyebrow">Saved profiles</span><h2>Negotiated room rates</h2></div><div className="rate-legend"><span><i className="dot sage" />Active</span><span><i className="dot pale" />Inactive</span></div></div><div className="table-scroll"><table className="data-table rates-table" aria-label="Negotiated room rates"><thead><tr><th scope="col">Travel agent</th>{roomTypes.map((room) => <th scope="col" key={room.id}>{room.code}<small>{room.name}</small></th>)}<th scope="col">Meals / person</th><th scope="col">Validity</th><th scope="col" aria-label="Actions" /></tr></thead><tbody>{agents.map((agent) => <tr key={agent.id} className={!agent.active ? "inactive-row" : ""}><td><div className="agent-cell"><span className="agent-avatar" aria-hidden="true">{agent.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{agent.name}</strong><small>{agent.contact} · {agent.email}</small></div></div></td>{roomTypes.map((room) => <td key={room.id}><strong>{money(agent.roomRates[room.id])}</strong><small>/ room / night</small></td>)}<td><strong>{money(agent.mealRates.breakfast + agent.mealRates.lunch + agent.mealRates.dinner)}</strong><small>per person / day</small></td><td><span className={`active-state ${agent.active ? "on" : "off"}`}><i />{agent.active ? "Active" : "Inactive"}</span><small>{shortDate(agent.effectiveFrom)}{agent.effectiveTo ? ` – ${shortDate(agent.effectiveTo)}` : " · onward"}</small></td><td><button className="row-more" aria-label={`Edit ${agent.name}`}><Icon name="more" size={16} /></button></td></tr>)}</tbody></table></div><div className="fallback-row"><span><b>Fallback chain</b> · Agent preset → Walk-in rate → Local default</span><button className="text-button">Manage defaults <Icon name="arrow" size={14} /></button></div></article></>;
}

function InvoicesView({ invoiceList }: { invoiceList: Invoice[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleInvoices = invoiceList.filter((invoice) => !normalizedQuery || [invoice.id, invoice.recipient, invoice.bookingId].some((value) => value.toLowerCase().includes(normalizedQuery)));
  const paidTotal = invoiceList.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.totalNu, 0);
  const dueInvoices = invoiceList.filter((invoice) => invoice.status === "due");
  return <><PageHeading eyebrow="Finance · Nu. ngultrum" title="Invoices"><button type="button" className="outline-button" onClick={() => downloadFile("timberline-invoice-report.csv", ["Invoice,Recipient,Issued,Due,Status,Total", ...invoiceList.map((invoice) => [invoice.id, invoice.recipient, invoice.issuedAt, invoice.dueAt, invoice.status, invoice.totalNu].map(csvCell).join(","))].join("\n"), "text/csv;charset=utf-8")}><Icon name="download" size={15} /> Export report</button></PageHeading><section className="invoice-summary"><div><span>Collected this month</span><strong>{money(paidTotal)}</strong><small>Paid customer invoices</small></div><div><span>Outstanding</span><strong>{money(dueInvoices.reduce((sum, invoice) => sum + invoice.totalNu, 0))}</strong><small className="coral-text">{dueInvoices.length} invoices need attention</small></div><div><span>Service charge</span><strong>10%</strong><small>GST applied at 5% after charge</small></div></section><article className="panel full-panel"><div className="panel-head"><div><span className="eyebrow">Invoice register</span><h2>Recent invoices</h2></div><div className="search-box small"><Icon name="search" size={16} /><label className="visually-hidden" htmlFor="invoice-search">Search invoices</label><input id="invoice-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find invoice" /></div></div><div className="table-scroll"><table className="data-table invoice-table" aria-label="Recent invoices"><thead><tr><th scope="col">Invoice</th><th scope="col">Recipient</th><th scope="col">Issued / due</th><th scope="col">Subtotal</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col" aria-label="Actions" /></tr></thead><tbody>{visibleInvoices.map((invoice) => <tr key={invoice.id}><td><strong className="booking-id">{invoice.id}</strong><small>{invoice.bookingId.toUpperCase()}</small></td><td><strong>{invoice.recipient}</strong><small>Customer invoice</small></td><td><strong>{shortDate(invoice.issuedAt)}</strong><small>Due {shortDate(invoice.dueAt)}</small></td><td>{money(invoice.subtotalNu)}</td><td><strong>{money(invoice.totalNu)}</strong><small>incl. 10% + 5%</small></td><td><span className={`invoice-status invoice-${invoice.status}`}><i />{invoice.status}</span></td><td><div className="invoice-actions"><button className="icon-button" aria-label={`Download ${invoice.id}`} onClick={() => downloadInvoice(invoice)}><Icon name="download" size={16} /></button><button type="button" className="icon-button" aria-label={`Print ${invoice.id}`} onClick={() => printInvoice(invoice)}><Icon name="print" size={16} /></button></div></td></tr>)}</tbody></table></div></article></>;
}

function GuestsView() {
  const [query, setQuery] = useState("");
  const names = ["Maya & Oliver Chen", "Jürgen Falk", "Asha Patel group", "Karma Tshering", "Isabella Rossi"];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleNames = names.filter((name) => !normalizedQuery || name.toLowerCase().includes(normalizedQuery));
  return <><PageHeading eyebrow="People · guest book" title="Guests"><button className="button-primary"><Icon name="plus" size={16} /> Add guest</button></PageHeading><div className="guest-cards"><article className="panel guest-stat"><span className="eyebrow">In-house now</span><strong>64</strong><p>Across 31 rooms</p></article><article className="panel guest-stat"><span className="eyebrow">Tourists</span><strong>52</strong><p>Set-menu meal plan</p></article><article className="panel guest-stat"><span className="eyebrow">Locals</span><strong>12</strong><p>A-la-carte dining</p></article></div><article className="panel full-panel"><div className="panel-head"><div><span className="eyebrow">Guest directory</span><h2>Recent guests</h2></div><div className="search-box small"><Icon name="search" size={16} /><label className="visually-hidden" htmlFor="guest-search">Search guests</label><input id="guest-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest" /></div></div><div className="guest-directory">{visibleNames.map((name) => { const index = names.indexOf(name); return <div className="directory-row" key={name}><span className={`avatar avatar-${index}`} aria-hidden="true">{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{name}</strong><small>{index === 3 ? "Bhutan · Local" : ["Singapore", "Germany", "India", "Bhutan", "Italy"][index] + " · Tourist"}</small></div><span className="directory-booking">{seedBookings[index]?.confirmation}</span><button className="row-more" aria-label={`More options for ${name}`}><Icon name="more" size={16} /></button></div>; })}</div></article></>;
}

function BookingModal({ onClose, onSaved }: { onClose: () => void; onSaved: (booking: Booking) => void }) {
  const [guestType, setGuestType] = useState<"tourist" | "local">("tourist");
  const [touristNames, setTouristNames] = useState([""]);
  const [checkIn, setCheckIn] = useState("2025-08-20");
  const [checkOut, setCheckOut] = useState("2025-08-22");
  const [rooms, setRooms] = useState([{ roomTypeId: "deluxe", quantity: 1 }]);
  const [agent, setAgent] = useState("himalayan-trails");
  const [guideCount, setGuideCount] = useState(1);
  const [driverCount, setDriverCount] = useState(1);
  const [guideGender, setGuideGender] = useState<StaffGender>("male");
  const [driverGender, setDriverGender] = useState<StaffGender>("male");
  const [guideCapacity, setGuideCapacity] = useState(8);
  const [driverCapacity, setDriverCapacity] = useState(4);
  const [guideAccommodation, setGuideAccommodation] = useState<StaffAccommodation>("complimentary");
  const [driverAccommodation, setDriverAccommodation] = useState<StaffAccommodation>("complimentary");
  const [staffIncluded, setStaffIncluded] = useState(true);
  const [invoiceRecipient, setInvoiceRecipient] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const getFocusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button, input, select, [tabindex]:not([tabindex=\"-1\"])") ?? []).filter((element) => !element.hasAttribute("disabled"));
    const initialFocus = dialog?.querySelector<HTMLElement>("[autofocus]") ?? getFocusable()[0];
    initialFocus?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [onClose]);

  const selectedAgentId = agents.some((candidate) => candidate.id === agent) ? agent : undefined;
  const requestedSource = agent === "local-default" ? "local-default" : agent === "walk-in" ? "walk-in" : undefined;
  const previewSnapshot = resolveRateSnapshot(selectedAgentId, guestType, checkIn, checkIn, requestedSource);
  const defaultRecipient = previewSnapshot.source === "travel-agent" ? agents.find((candidate) => candidate.id === previewSnapshot.agentId)?.name ?? "" : touristNames.filter(Boolean).join(", ");

  const selectGuestType = (nextType: "tourist" | "local") => {
    setGuestType(nextType);
    if (nextType === "local" && agents.some((candidate) => candidate.id === agent)) setAgent("local-default");
    if (nextType === "tourist" && agent === "local-default") setAgent("walk-in");
  };
  const save = () => {
    const names = touristNames.map((name) => name.trim()).filter(Boolean);
    const stayNights = nightsBetween(checkIn, checkOut);
    if (!names.length) return setError("Add at least one guest.");
    if (!checkIn || !checkOut) return setError("Check-in and check-out are required.");
    if (checkOut <= checkIn) return setError("Check-out must be after check-in.");
    if (rooms.some((room) => room.quantity < 1)) return setError("Each room selection needs at least one room.");
    const capacity = rooms.reduce((sum, room) => sum + (roomTypes.find((candidate) => candidate.id === room.roomTypeId)?.capacity ?? 0) * room.quantity, 0);
    if (capacity < names.length) return setError(`Add enough rooms for ${names.length} guest${names.length === 1 ? "" : "s"}.`);
    const requestedAgentId = agents.some((candidate) => candidate.id === agent) ? agent : undefined;
    const snapshot = resolveRateSnapshot(requestedAgentId, guestType, checkIn, new Date().toISOString(), agent === "local-default" ? "local-default" : agent === "walk-in" ? "walk-in" : undefined);
    const appliedAgentId = snapshot.source === "travel-agent" ? requestedAgentId : undefined;
    const guestRecords = names.map((name, index) => ({ id: `new-tourist-${Date.now()}-${index}`, name, nationality: "Not recorded", guestType }));
    const newBooking: Booking = {
      id: `b-new-${Date.now()}`, confirmation: `TH-${String(Date.now()).slice(-4)}`, tourists: guestRecords,
      rooms: rooms.map((room) => ({ ...room, nights: stayNights })), checkIn, checkOut, status: "pending",
      ...(appliedAgentId ? { agentId: appliedAgentId } : {}), rateSnapshot: snapshot,
      invoiceRecipient: invoiceRecipient.trim() || (appliedAgentId && guestType === "tourist" ? agents.find((candidate) => candidate.id === appliedAgentId)?.name ?? names.join(", ") : names.join(", ")),
      staff: {
        guide: { count: staffIncluded ? guideCount : 0, gender: guideGender, capacity: guideCapacity, accommodation: staffIncluded && guideCount > 0 ? guideAccommodation : "none", mealsComplimentary: true },
        driver: { count: staffIncluded ? driverCount : 0, gender: driverGender, capacity: driverCapacity, accommodation: staffIncluded && driverCount > 0 ? driverAccommodation : "none", mealsComplimentary: true },
      },
    };
    onSaved(newBooking);
  };
  const addRoomType = () => {
    const nextRoomType = roomTypes.find((candidate) => !rooms.some((room) => room.roomTypeId === candidate.id));
    if (nextRoomType) setRooms((current) => [...current, { roomTypeId: nextRoomType.id, quantity: 1 }]);
  };
  const roomOptions = rooms.map((room) => <div className="form-row" key={room.roomTypeId}><label>Room type<select value={room.roomTypeId} onChange={(event) => setRooms((current) => current.map((item) => item === room ? { ...item, roomTypeId: event.target.value } : item))}>{roomTypes.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={rooms.some((item) => item !== room && item.roomTypeId === candidate.id)}>{candidate.name} · {money(previewSnapshot.roomRates[candidate.id])} / room</option>)}</select></label><label>Rooms<input type="number" min="1" value={room.quantity} onChange={(event) => setRooms((current) => current.map((item) => item === room ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) } : item))} /></label>{rooms.length > 1 && <button type="button" className="row-more" aria-label="Remove room type" onClick={() => setRooms((current) => current.filter((item) => item !== room))}><Icon name="close" size={15} /></button>}</div>);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" aria-describedby="booking-modal-description"><div className="modal-head"><div><span className="eyebrow">Reservation intake</span><h2 id="booking-modal-title">New booking</h2></div><button type="button" className="circle-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" size={18} /></button></div><div className="modal-body"><div className="form-row"><div><span className="eyebrow">Guests</span>{touristNames.map((name, index) => <label key={index}>Guest {index + 1}<input autoFocus={index === 0} value={name} onChange={(event) => setTouristNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="e.g. Tenzin Wangchuk" /></label>)}<button type="button" className="text-button" onClick={() => setTouristNames((current) => [...current, ""])}><Icon name="plus" size={14} /> Add guest</button></div><label>Guest type<select value={guestType} onChange={(event) => selectGuestType(event.target.value as "tourist" | "local")}><option value="tourist">Tourist · set-menu plan</option><option value="local">Local · a-la-carte</option></select></label></div><div className="form-row"><label>Check-in<input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label><label>Check-out<input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label></div>{roomOptions}<button type="button" className="text-button" onClick={addRoomType} disabled={rooms.length >= roomTypes.length}><Icon name="plus" size={14} /> Add room type</button><label>Rate profile<select value={agent} onChange={(event) => setAgent(event.target.value)}><option value="himalayan-trails">Himalayan Trails Co.</option><option value="druk-discovery">Druk Discovery</option><option value="walk-in">Walk-in rate</option><option value="local-default">Local default</option></select><small className="field-help">{guestType === "local" ? "Local food is charged per person, a-la-carte." : "Breakfast, lunch and dinner are fixed set menus per person."} Rates are snapshotted per room and guest at creation.</small></label><label>Invoice recipient<input value={invoiceRecipient} onChange={(event) => setInvoiceRecipient(event.target.value)} placeholder={defaultRecipient || "Guest or agent"} /><small className="field-help">Defaults from the rate source; editable for billing.</small></label><div className="staff-options"><div><span className="eyebrow">Group setup</span><strong>Guide + driver</strong><small>Optional staff · complimentary meals and accommodation stay off the customer invoice.</small></div><div className="staff-fields"><label>Guides<input type="number" min="0" value={guideCount} onChange={(event) => setGuideCount(Math.max(0, Number(event.target.value) || 0))} /></label><label>Drivers<input type="number" min="0" value={driverCount} onChange={(event) => setDriverCount(Math.max(0, Number(event.target.value) || 0))} /></label><label>Guide gender<select value={guideGender} onChange={(event) => setGuideGender(event.target.value as StaffGender)}><option value="male">Male</option><option value="female">Female</option><option value="mixed">Mixed</option></select></label><label>Driver gender<select value={driverGender} onChange={(event) => setDriverGender(event.target.value as StaffGender)}><option value="male">Male</option><option value="female">Female</option><option value="mixed">Mixed</option></select></label><label>Guide capacity<input type="number" min="1" value={guideCapacity} onChange={(event) => setGuideCapacity(Math.max(1, Number(event.target.value) || 1))} /></label><label>Driver capacity<input type="number" min="1" value={driverCapacity} onChange={(event) => setDriverCapacity(Math.max(1, Number(event.target.value) || 1))} /></label><label>Guide accommodation<select value={guideAccommodation} onChange={(event) => setGuideAccommodation(event.target.value as StaffAccommodation)}><option value="complimentary">Complimentary</option><option value="external">External</option><option value="none">None</option></select></label><label>Driver accommodation<select value={driverAccommodation} onChange={(event) => setDriverAccommodation(event.target.value as StaffAccommodation)}><option value="complimentary">Complimentary</option><option value="external">External</option><option value="none">None</option></select></label></div><label className="switch"><input type="checkbox" checked={staffIncluded} onChange={(event) => setStaffIncluded(event.target.checked)} aria-label="Include guide and driver" /><span aria-hidden="true" /></label></div><div className="modal-note" id="booking-modal-description"><Icon name="receipt" size={16} /><span>Invoice recipient defaults to <b>{previewSnapshot.source === "travel-agent" ? "the travel agent" : "the tourist"}</b>, and can be changed later.</span></div></div><div className="modal-foot">{error && <p className="form-error" role="alert">{error}</p>}<button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="button" className="button-primary" onClick={save}>Create booking <Icon name="arrow" size={15} /></button></div></div></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [bookingList, setBookingList] = useState<Booking[]>(seedBookings);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>(seedInvoices);
  const toastTimer = useRef<number | null>(null);
  const pageTitle = useMemo(() => ({ dashboard: "Overview", bookings: "Bookings", agents: "Rate desk", invoices: "Invoices", guests: "Guests" })[view], [view]);
  const dismissToast = () => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(false);
  };
  const showToast = () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(true);
    toastTimer.current = window.setTimeout(() => {
      toastTimer.current = null;
      setToast(false);
    }, 3200);
  };
  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);
  const saveBooking = (booking: Booking) => {
    setBookingList((current) => [booking, ...current]);
    setInvoiceList((current) => [invoiceForBooking(booking, { id: `INV-${booking.confirmation}`, issuedAt: new Date().toISOString().slice(0, 10), dueAt: booking.checkIn, status: "draft" }), ...current]);
    setModalOpen(false);
    showToast();
  };
  const navigate = (next: View) => setView(next);
  const navigation: { id: View; label: string; icon: IconName }[] = [{ id: "dashboard", label: "Overview", icon: "grid" }, { id: "bookings", label: "Bookings", icon: "calendar" }, { id: "guests", label: "Guests", icon: "users" }, { id: "agents", label: "Agent rates", icon: "receipt" }];
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-symbol">T</span><div><strong>timberline</strong><small>PARO · BHUTAN</small></div></div><div className="property-switcher"><span className="property-avatar">T</span><span><b>The Timberline</b><small>Operations</small></span><Icon name="chevron" size={14} /></div><nav className="main-nav"><span className="nav-label">Workspace</span>{navigation.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === "bookings" && <b className="nav-count">{bookingList.length}</b>}</button>)}<span className="nav-label nav-label-lower">Finance</span><button className={view === "invoices" ? "nav-item active" : "nav-item"} aria-current={view === "invoices" ? "page" : undefined} onClick={() => navigate("invoices")}><Icon name="receipt" size={18} /><span>Invoices</span><b className="nav-count warm">2</b></button><button className="nav-item" onClick={showToast}><Icon name="settings" size={18} /><span>Settings</span></button></nav><div className="sidebar-bottom"><div className="help-card"><span>Need a hand?</span><strong>Open the desk guide <Icon name="arrow" size={13} /></strong></div><div className="user-profile"><span className="profile-avatar" aria-hidden="true">DD</span><span><b>Dorji Dema</b><small>Administrator</small></span><Icon name="more" size={16} /></div></div></aside>
    <main className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-symbol">T</span><strong>timberline</strong></div><div className="breadcrumb"><span>THE TIMBERLINE</span><Icon name="chevron" size={12} /><b>{pageTitle}</b></div><div className="top-actions"><span className="last-sync"><i /> Synced 2m ago</span><button type="button" className="icon-button" aria-label="Search bookings" onClick={() => navigate("bookings")}><Icon name="search" /></button><button className="notification-button" aria-label="Notifications"><Icon name="clock" size={18} /><i /></button><span className="top-avatar" role="img" aria-label="Signed in as Dorji Dema">DD</span></div></header><div className="content-wrap">{view === "dashboard" && <Dashboard onNewBooking={() => setModalOpen(true)} onNavigate={navigate} bookings={bookingList} invoiceList={invoiceList} />}{view === "bookings" && <BookingsView onNewBooking={() => setModalOpen(true)} bookings={bookingList} />}{view === "agents" && <AgentsView />}{view === "invoices" && <InvoicesView invoiceList={invoiceList} />}{view === "guests" && <GuestsView />}</div></main>
    {modalOpen && <BookingModal onClose={() => setModalOpen(false)} onSaved={saveBooking} />}{toast && <div className="toast" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true"><Icon name="check" size={16} /></span><div><strong>Booking created</strong><small>Rate snapshot saved successfully.</small></div><button type="button" onClick={dismissToast} aria-label="Dismiss notification"><Icon name="close" size={14} /></button></div>}
  </div>;
}
