import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { AppointmentRow } from "../components/lists";
import { ButtonLink, EmptyState, ErrorState, PageHeader, SkeletonList, cx } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import type { Appointment } from "../lib/types";

const TABS = [
  {
    key: "open",
    label: "Upcoming & active",
    match: (a: Appointment) => a.status === "pending" || a.status === "confirmed",
  },
  {
    key: "past",
    label: "Past",
    match: (a: Appointment) => a.status === "completed" || a.status === "cancelled",
  },
] as const;

export default function Appointments() {
  useDocumentTitle("Consultations");
  const { user } = useAuth();
  const asDoctor = user?.role === "doctor";
  const { data, error, loading, reload } = useFetch<Appointment[]>("/api/appointments");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");
  const current = TABS.find((t) => t.key === tab)!;
  const items = data?.filter(current.match) ?? [];

  return (
    <>
      <PageHeader
        title="Consultations"
        subtitle={
          asDoctor
            ? "Requests and consultations with your patients."
            : "Your bookings and chats with doctors."
        }
        actions={
          !asDoctor && (
            <ButtonLink to="/doctors" variant="secondary">
              Book a doctor
            </ButtonLink>
          )
        }
      />
      <div
        role="tablist"
        aria-label="Consultation status"
        className="mb-6 inline-flex rounded-md bg-sunken p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              "h-9 rounded-[7px] px-4 text-sm font-semibold transition-[background-color,box-shadow,color] duration-150",
              tab === t.key ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {data && <span className="ml-1.5 text-muted tabular-nums">{data.filter(t.match).length}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {loading && <SkeletonList rows={3} />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && items.length === 0 && (
          <EmptyState
            icon={<CalendarClock className="size-5" />}
            title={tab === "open" ? "Nothing scheduled" : "No past consultations"}
            body={
              asDoctor
                ? "Bookings from patients will show up here."
                : "Book a specialist after a symptom check, or browse the directory."
            }
            action={
              !asDoctor &&
              tab === "open" && (
                <ButtonLink to="/doctors" size="sm">
                  Find a doctor
                </ButtonLink>
              )
            }
          />
        )}
        <ul className="space-y-3">
          {items.map((a) => (
            <AppointmentRow key={a.id} appointment={a} asDoctor={asDoctor} />
          ))}
        </ul>
      </div>
    </>
  );
}
