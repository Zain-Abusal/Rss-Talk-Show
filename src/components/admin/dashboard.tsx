"use client";
import Link from "@/components/motion/transition-link";
import { useState, useEffect, useCallback, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  Users,
  ScanLine,
  Settings2,
  ListPlus,
  FilePenLine,
  Mail,
  LogOut,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Save,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
const ContentEditor = dynamic(() => import("./content-editor").then((module) => module.ContentEditor), { loading: () => <p role="status">Loading content editor…</p> });
import { QrScanner } from "./qr-scanner";
import type { AdminData, Ticket } from "@/lib/admin-model";
import {
  defaultContent,
  type SiteContent,
  type FormField,
} from "@/lib/site/model";
const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "tickets", label: "Registrations", icon: Users },
  { id: "scanner", label: "QR check-in", icon: ScanLine },
  { id: "settings", label: "Event settings", icon: Settings2 },
  { id: "forms", label: "Form builder", icon: ListPlus },
  { id: "content", label: "Site content", icon: FilePenLine },
  { id: "messages", label: "Messages", icon: Mail },
] as const;
type Tab = (typeof tabs)[number]["id"];
function time(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}
function draftFrom(data: AdminData) {
  const s = data.settings;
  return {
    version: s.version,
    eventName: s.event_name,
    date: s.date_label,
    time: s.time_label,
    venue: s.venue,
    location: s.location,
    maxSeats: s.max_seats,
    registrationOpen: s.registration_open,
    fields: structuredClone(s.form_fields),
    content: structuredClone(s.content),
  };
}
async function api(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (response.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Your session has expired.");
  }
  if (!response.ok) throw new Error(result.error ?? "The request failed.");
  return result;
}
export function AdminDashboard({ initial }: { initial: AdminData }) {
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState(() => draftFrom(initial));
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(initial.tickets.slice(0, 50));
  const [total, setTotal] = useState(initial.stats.total);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [code, setCode] = useState("");
  const scanLock = useRef(false);
  const scanResult = useRef<HTMLDivElement>(null);
  const [checking, setChecking] = useState(false);
  const [scan, setScan] = useState<{
    result: string;
    ticket?: {
      name: string;
      ticketNumber: string;
      role: string;
      grade: string;
      checkedInAt: string;
    };
  } | null>(null);
  const [contentSection, setContentSection] =
    useState<keyof SiteContent>("home");
  const refresh = useCallback(async (resetDraft = false) => {
    const result = (await api("/api/admin/dashboard")) as AdminData;
    setData(result);
    if (resetDraft) setDraft(draftFrom(result));
    return result;
  }, []);
  useEffect(() => {
    if (tab !== "tickets") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/tickets?q=${encodeURIComponent(query)}&page=${page}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (response.status === 401) {
          window.location.assign("/admin/login");
          return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setRows(result.tickets);
        setTotal(result.total);
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load tickets.",
          );
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tab, query, page, data.tickets]);
  async function task(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings() {
    await task(async () => {
      await api("/api/admin/settings", "PUT", draft);
      await refresh(true);
      setNotice("Settings saved. Public pages use the updated content.");
    });
  }
  async function saveTicket() {
    if (!editing) return;
    await task(async () => {
      await api("/api/admin/tickets", "PUT", {
        id: editing.id,
        status: editing.status,
        answers: editing.answers,
      });
      setEditing(null);
      await refresh();
      setNotice(
        "Registration updated. Seat availability has been recalculated.",
      );
    });
  }
  async function checkIn(value: string) {
    if (scanLock.current || !value.trim()) return;
    scanLock.current = true;
    setChecking(true);
    setCode(value);
    setScan(null);
    setError("");
    setNotice("");
    try {
      const result = await api("/api/admin/check-in", "POST", { code: value });
      setScan(result);
      // A refresh failure must never hide a server-confirmed admission.
      void refresh().catch(() => setNotice("Check-in result saved. Refresh the overview to update counts."));
    } catch (reason) {
      setScan({ result: "error" });
      setError(reason instanceof Error ? reason.message : "Unable to check this ticket. Try again.");
    } finally {
      scanLock.current = false;
      setChecking(false);
      requestAnimationFrame(() => scanResult.current?.focus({ preventScroll: false }));
    }
  }
  async function validate(event: React.FormEvent) {
    event.preventDefault();
    await checkIn(code);
  }
  const occupied = data.settings.registered_count;
  const remaining = Math.max(0, data.settings.max_seats - occupied);
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          RSS <span>Talk Show</span>
        </Link>
        <span className="detail-label">Event administration</span>
        <nav aria-label="Admin navigation">
          {tabs.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => {
                setTab(item.id);
                setError("");
                setNotice("");
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noopener noreferrer">
            View public site
            <ArrowUpRight size={15} />
          </a>
          <button
            type="button"
            onClick={() =>
              void task(async () => {
                await api("/api/admin/logout", "POST", {});
                window.location.assign("/admin/login");
              })
            }
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <span className="detail-label">{data.settings.event_name}</span>
            <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void task(async () => {
                await refresh();
                setNotice("Dashboard refreshed.");
              })
            }
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </header>
        {notice && (
          <p className="admin-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {tab === "overview" && (
          <>
            <div className="admin-metrics">
              {[
                {
                  label: "Seats reserved",
                  value: `${occupied} / ${data.settings.max_seats}`,
                },
                { label: "Available seats", value: remaining },
                { label: "Checked in", value: data.stats.checkedIn },
                { label: "Cancelled tickets", value: data.stats.cancelled },
              ].map((metric) => (
                <Card key={metric.label} className="metric-card">
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                </Card>
              ))}
            </div>
            <Card className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Registration status</h2>
                  <p>
                    {data.settings.registration_open
                      ? remaining
                        ? "Registration is open."
                        : "Capacity reached. The form is closed automatically."
                      : "Registration is paused by the admin."}
                  </p>
                </div>
                <span className="status-tag">
                  {data.settings.registration_open && remaining
                    ? "Open"
                    : "Closed"}
                </span>
              </div>
              <progress
                value={occupied}
                max={Math.max(1, data.settings.max_seats)}
                aria-label="Reserved seats"
              />
              <p className="admin-caption">
                A cancelled ticket releases one seat. Checked-in attendees
                continue to occupy their seats.
              </p>
            </Card>
            <div className="admin-two-col">
              <Card className="admin-panel">
                <h2>Registrations by role</h2>
                {data.stats.roles.length ? (
                  data.stats.roles.map((row) => (
                    <div className="analytics-row" key={row.label}>
                      <div>
                        <span>{row.label || "Not specified"}</span>
                        <strong>{row.count}</strong>
                      </div>
                      <progress
                        value={row.count}
                        max={Math.max(1, occupied)}
                        aria-label={`${row.label} registrations`}
                      />
                    </div>
                  ))
                ) : (
                  <p>No registrations yet.</p>
                )}
              </Card>
              <Card className="admin-panel">
                <h2>Recent registration days</h2>
                {data.stats.daily.length ? (
                  data.stats.daily.map((row) => (
                    <div className="analytics-row" key={row.day}>
                      <div>
                        <span>{row.day}</span>
                        <strong>{row.count}</strong>
                      </div>
                      <progress
                        value={row.count}
                        max={Math.max(
                          ...data.stats.daily.map((d) => d.count),
                          1,
                        )}
                        aria-label={`Registrations on ${row.day}`}
                      />
                    </div>
                  ))
                ) : (
                  <p>Registration activity will appear here.</p>
                )}
              </Card>
            </div>
            <Card className="admin-panel">
              <h2>Recent activity</h2>
              <div className="audit-list">
                {data.audit.slice(0, 12).map((item) => (
                  <div key={item.id}>
                    <strong>{item.action.replaceAll(".", " / ")}</strong>
                    <span>
                      {typeof item.details.result === "string"
                        ? item.details.result.replaceAll("_", " ")
                        : ""}
                    </span>
                    <time>{time(item.created_at)}</time>
                  </div>
                ))}
                {!data.audit.length && <p>No admin activity yet.</p>}
              </div>
            </Card>
          </>
        )}
        {tab === "tickets" && (
          <Card className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Attendee registrations</h2>
                <p>Search, edit details or change the ticket status.</p>
              </div>
              <Input
                aria-label="Search registrations"
                placeholder="Search name, email or ticket number"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Role / grade</th>
                    <th>Ticket</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <strong>{ticket.name}</strong>
                        <small>{ticket.email}</small>
                        <small>{ticket.phone}</small>
                      </td>
                      <td>
                        {ticket.role}
                        <small>{ticket.grade}</small>
                      </td>
                      <td>
                        <code>{ticket.ticket_number}</code>
                      </td>
                      <td>
                        <span className="status-tag" data-status={ticket.status}>
                          {ticket.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-action"
                          onClick={() => setEditing(structuredClone(ticket))}
                        >
                          Edit<span className="sr-only"> {ticket.name}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="admin-empty">No registrations found.</p>
              )}
            </div>
            <div className="admin-pagination">
              <span>{total} registrations</span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span>Page {page + 1}</span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * 50 >= total}
              >
                Next
              </Button>
            </div>
          </Card>
        )}
        {tab === "scanner" && (
          <div className="admin-scan-layout">
            <Card className="admin-panel">
              <h2>Validate and check in</h2>
              <p>
                Scan a QR code, paste its contents or enter the ticket number. A
                valid ticket is checked in automatically after scanning. Each ticket admits one person.
              </p>
              <QrScanner disabled={checking || busy} onStart={() => { setScan(null); setError(""); }} onRead={(value) => void checkIn(value)} />
              <form
                method="post"
                action="/api/admin/check-in"
                onSubmit={validate}
              >
                <label htmlFor="scan-code">Ticket code or number</label>
                <Textarea
                  id="scan-code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setScan(null); }}
                  required
                  rows={3}
                  placeholder="RSS1:… or RSS-…"
                />
                <Button type="submit" disabled={checking || busy || !code.trim()}>
                  <ScanLine size={17} />
                  {checking ? "Checking ticket…" : "Validate and check in"}
                </Button>
              </form>
            </Card>
            <Card
              ref={scanResult}
              tabIndex={-1}
              className={`admin-panel scan-result scan-result-${checking ? "pending" : scan?.result ?? "idle"}`}
              aria-live="polite"
              aria-atomic="true"
              aria-busy={checking}
            >
              {scan ? (
                <>
                  <span className="scan-status-icon" aria-hidden="true">
                    {scan.result === "checked_in" ? <CheckCircle2 size={32} /> : scan.result === "already_checked_in" ? <AlertTriangle size={32} /> : <XCircle size={32} />}
                  </span>
                  <span className="detail-label">
                    {scan.result === "checked_in"
                      ? "Admission confirmed"
                      : "Admission not recorded"}
                  </span>
                  <h2>
                    {
                      (
                        {
                          checked_in: "Check-in recorded",
                          already_checked_in: "Already checked in",
                          cancelled: "Ticket cancelled",
                          invalid: "Ticket not found",
                          error: "Check-in not confirmed",
                        } as Record<string, string>
                      )[scan.result]
                    }
                  </h2>
                  {scan.ticket && (
                    <>
                      <h3>{scan.ticket.name}</h3>
                      <p>
                        {[scan.ticket.role, scan.ticket.grade].filter(Boolean).join(" · ")}
                      </p>
                      <code>{scan.ticket.ticketNumber}</code>
                      {scan.ticket.checkedInAt && (
                        <p>Checked in {time(scan.ticket.checkedInAt)}</p>
                      )}
                    </>
                  )}
                  {scan.result !== "checked_in" && (
                    <p>
                      {scan.result === "error" ? "Check the connection and scan again. Do not admit anyone without a confirmed result." : "Do not admit this ticket. Confirm the details with the event team."}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <ScanLine size={40} />
                  <h2>{checking ? "Checking ticket…" : "Ready for a ticket"}</h2>
                  <p>{checking ? "Waiting for the server to confirm admission." : "Scan a ticket to check it in automatically, or enter its code manually."}</p>
                </>
              )}
            </Card>
          </div>
        )}
        {tab === "settings" && (
          <Card className="admin-panel admin-settings">
            <h2>Event details and capacity</h2>
            <p>Changes apply to public event pages and new registrations.</p>
            <div className="admin-form-grid">
              {(
                ["eventName", "date", "time", "venue", "location"] as const
              ).map((key) => (
                <div className="form-field" key={key}>
                  <label htmlFor={`setting-${key}`}>
                    {
                      {
                        eventName: "Event name",
                        date: "Date",
                        time: "Time",
                        venue: "Venue",
                        location: "Location",
                      }[key]
                    }
                  </label>
                  <Input
                    id={`setting-${key}`}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="form-field">
                <label htmlFor="max-seats">Maximum seats</label>
                <Input
                  id="max-seats"
                  type="number"
                  min={occupied}
                  max={100000}
                  value={draft.maxSeats}
                  onChange={(e) =>
                    setDraft((s) => ({
                      ...s,
                      maxSeats: Number(e.target.value),
                    }))
                  }
                />
                <p className="admin-caption">
                  {occupied} active tickets. Capacity cannot be set below this
                  count.
                </p>
              </div>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.registrationOpen}
                onChange={(e) =>
                  setDraft((s) => ({
                    ...s,
                    registrationOpen: e.target.checked,
                  }))
                }
              />
              <span>
                Registration is open. The form still closes automatically when
                all seats are reserved.
              </span>
            </label>
            <Button onClick={() => void saveSettings()} disabled={busy}>
              <Save size={16} />
              Save event settings
            </Button>
          </Card>
        )}
        {tab === "forms" && (
          <Card className="admin-panel">
            <h2>Registration form builder</h2>
            <p>
              Edit labels, required fields, placeholders and role or grade
              options. Name and email stay required. Field keys identify saved
              answers and cannot be changed.
            </p>
            <div className="admin-fields">
              {draft.fields.map((field, index) => (
                <div className="admin-editor-group" key={field.key}>
                  <div className="admin-group-title">
                    <h3>{field.key}</h3>
                    {!["name", "email", "phone", "role", "grade"].includes(
                      field.key,
                    ) && (
                      <button
                        className="text-action"
                        onClick={() =>
                          setDraft((s) => ({
                            ...s,
                            fields: s.fields.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove field
                      </button>
                    )}
                  </div>
                  <div className="admin-form-grid">
                    <div className="form-field">
                      <label htmlFor={`field-label-${field.key}`}>Label</label>
                      <Input
                        id={`field-label-${field.key}`}
                        value={field.label}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            fields: s.fields.map((f, i) =>
                              i === index ? { ...f, label: e.target.value } : f,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`field-type-${field.key}`}>
                        Input type
                      </label>
                      <Select
                        id={`field-type-${field.key}`}
                        value={field.type}
                        disabled={field.key === "email"}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            fields: s.fields.map((f, i) =>
                              i === index
                                ? {
                                    ...f,
                                    type: e.target.value as FormField["type"],
                                  }
                                : f,
                            ),
                          }))
                        }
                      >
                        {[
                          "text",
                          "email",
                          "tel",
                          "select",
                          "textarea",
                          "range",
                        ].map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`field-placeholder-${field.key}`}>
                        Placeholder
                      </label>
                      <Input
                        id={`field-placeholder-${field.key}`}
                        value={field.placeholder}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            fields: s.fields.map((f, i) =>
                              i === index
                                ? { ...f, placeholder: e.target.value }
                                : f,
                            ),
                          }))
                        }
                      />
                    </div>
                    {field.type === "select" && (
                      <div className="form-field">
                        <label htmlFor={`field-options-${field.key}`}>
                          Options, one per line
                        </label>
                        <Textarea
                          id={`field-options-${field.key}`}
                          rows={4}
                          value={field.options.join("\n")}
                          onChange={(e) =>
                            setDraft((s) => ({
                              ...s,
                              fields: s.fields.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      options: e.target.value.split("\n"),
                                    }
                                  : f,
                              ),
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="admin-checks">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        disabled={["name", "email"].includes(field.key)}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            fields: s.fields.map((f, i) =>
                              i === index
                                ? { ...f, enabled: e.target.checked }
                                : f,
                            ),
                          }))
                        }
                      />
                      Show this field
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={["name", "email"].includes(field.key)}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            fields: s.fields.map((f, i) =>
                              i === index
                                ? { ...f, required: e.target.checked }
                                : f,
                            ),
                          }))
                        }
                      />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="actions">
              <Button
                variant="outline"
                onClick={() =>
                  setDraft((s) => ({
                    ...s,
                    fields: [
                      ...s.fields,
                      {
                        key: `extra_${crypto.randomUUID().slice(0, 8)}`,
                        label: "New field",
                        type: "text",
                        placeholder: "",
                        required: false,
                        enabled: true,
                        options: [],
                      },
                    ],
                  }))
                }
              >
                <Plus size={16} />
                Add field
              </Button>
              <Button disabled={busy} onClick={() => void saveSettings()}>
                <Save size={16} />
                Save form
              </Button>
            </div>
          </Card>
        )}
        {tab === "content" && (
          <Card className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Public site content</h2>
                <p>
                  Plain text only. Team members, FAQs and schedule entries can
                  be added or removed.
                </p>
              </div>
              <div>
                <label htmlFor="content-section">Page or section</label>
                <Select
                  id="content-section"
                  value={contentSection}
                  onChange={(e) =>
                    setContentSection(e.target.value as keyof SiteContent)
                  }
                >
                  {Object.keys(defaultContent).map((key) => (
                    <option key={key} value={key}>
                      {key.replace(/([A-Z])/g, " $1")}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <ContentEditor
              value={draft.content[contentSection]}
              template={defaultContent[contentSection]}
              path={contentSection}
              onChange={(value) =>
                setDraft((s) => ({
                  ...s,
                  content: { ...s.content, [contentSection]: value },
                }))
              }
            />
            <Button onClick={() => void saveSettings()} disabled={busy}>
              <Save size={16} />
              Save site content
            </Button>
          </Card>
        )}
        {tab === "messages" && (
          <Card className="admin-panel">
            <h2>Questions from the contact form</h2>
            <div className="message-list">
              {data.messages.map((message) => (
                <article key={message.id}>
                  <div className="admin-panel-heading">
                    <div>
                      <h3>{message.name}</h3>
                      <p>
                        {message.email} · {time(message.created_at)}
                        {message.role && ` · ${message.role}`}
                        {message.grade && ` · Grade ${message.grade}`}
                      </p>
                    </div>
                    <Select
                      aria-label={`Status for ${message.name}`}
                      value={message.status}
                      disabled={busy}
                      onChange={(e) =>
                        void task(async () => {
                          await api("/api/admin/messages", "PUT", {
                            id: message.id,
                            status: e.target.value,
                          });
                          await refresh();
                          setNotice("Message status updated.");
                        })
                      }
                    >
                      {["new", "read", "resolved"].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </Select>
                  </div>
                  <p className="multiline">{message.question}</p>
                </article>
              ))}
              {!data.messages.length && <p>No messages yet.</p>}
            </div>
          </Card>
        )}
      </div>
      <Dialog.Root
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="menu-overlay" />
          <Dialog.Content className="admin-edit-dialog">
            <Dialog.Close
              className="menu-close"
              aria-label="Close registration editor"
            >
              <X />
            </Dialog.Close>
            <Dialog.Title>Edit registration</Dialog.Title>
            <Dialog.Description>
              Update attendee details or cancel a ticket to release its seat.
            </Dialog.Description>
            {editing && (
              <>
                <code>{editing.ticket_number}</code>
                <div className="admin-form-grid">
                  {draft.fields
                    .filter((f) => f.enabled)
                    .map((field) => (
                      <div className="form-field" key={field.key}>
                        <label htmlFor={`edit-${field.key}`}>
                          {field.label}
                        </label>
                        <Input
                          id={`edit-${field.key}`}
                          value={editing.answers[field.key] ?? ""}
                          onChange={(e) =>
                            setEditing((t) =>
                              t
                                ? {
                                    ...t,
                                    answers: {
                                      ...t.answers,
                                      [field.key]: e.target.value,
                                    },
                                  }
                                : null,
                            )
                          }
                        />
                      </div>
                    ))}
                </div>
                <label htmlFor="edit-status">Ticket status</label>
                <Select
                  id="edit-status"
                  value={editing.status}
                  onChange={(e) =>
                    setEditing((t) =>
                      t
                        ? { ...t, status: e.target.value as Ticket["status"] }
                        : null,
                    )
                  }
                >
                  <option value="registered">Registered</option>
                  {editing.status === "checked_in" && (
                    <option value="checked_in">Checked in</option>
                  )}
                  <option value="cancelled">Cancelled</option>
                </Select>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <div className="actions">
                  <Button disabled={busy} onClick={() => void saveTicket()}>
                    Save registration
                  </Button>
                  <Dialog.Close asChild>
                    <Button variant="outline">Close</Button>
                  </Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
