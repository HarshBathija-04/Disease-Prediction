import { ArrowRight, CalendarClock, ClipboardList, Stethoscope } from "lucide-react";
import { Link } from "react-router";
import { Disclaimer } from "../components/brand";
import { AppointmentRow, PredictionRow } from "../components/lists";
import { ButtonLink, Card, EmptyState, ErrorState, PageHeader, SkeletonList } from "../components/ui";
import { useAuth } from "../lib/auth";
import { isOpen } from "../lib/format";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import type { Appointment, Prediction } from "../lib/types";

function Section({
  title,
  link,
  children,
}: {
  title: string;
  link?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {link && (
          <Link
            to={link.to}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            {link.label} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function PatientDashboard({ name }: { name: string }) {
  const predictions = useFetch<Prediction[]>("/api/predictions");
  const appointments = useFetch<Appointment[]>("/api/appointments");
  const upcoming = appointments.data?.filter((a) => isOpen(a.status)) ?? [];

  return (
    <>
      <PageHeader
        title={`Hello, ${name.split(" ")[0]}`}
        subtitle="Here's your health activity at a glance."
      />
      <Card className="mb-10 flex flex-col gap-5 overflow-hidden bg-brand p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div className="flex-1">
          <h2 className="font-display text-2xl font-semibold">Feeling unwell?</h2>
          <p className="mt-1 max-w-lg text-pretty text-white/80">
            Select your symptoms to get a likely condition, a plain-language explanation and the right
            specialist.
          </p>
        </div>
        <ButtonLink
          to="/app/check"
          size="lg"
          variant="secondary"
          className="border-transparent text-brand-strong"
        >
          Check symptoms <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </Card>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Upcoming consultations" link={{ to: "/app/appointments", label: "All" }}>
          {appointments.loading && <SkeletonList rows={2} />}
          {appointments.error && (
            <ErrorState message={appointments.error.message} onRetry={appointments.reload} />
          )}
          {appointments.data && upcoming.length === 0 && (
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title="No upcoming consultations"
              body="After a symptom check you can book the suggested specialist in one step."
              action={
                <ButtonLink to="/doctors" variant="secondary" size="sm">
                  Browse doctors
                </ButtonLink>
              }
            />
          )}
          <ul className="space-y-3">
            {upcoming.slice(0, 4).map((a) => (
              <AppointmentRow key={a.id} appointment={a} asDoctor={false} />
            ))}
          </ul>
        </Section>

        <Section title="Recent reports" link={{ to: "/app/predictions", label: "History" }}>
          {predictions.loading && <SkeletonList rows={2} />}
          {predictions.error && (
            <ErrorState message={predictions.error.message} onRetry={predictions.reload} />
          )}
          {predictions.data?.length === 0 && (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No reports yet"
              body="Your symptom checks are saved here so you and your doctor can refer back to them."
              action={
                <ButtonLink to="/app/check" size="sm">
                  Start a check
                </ButtonLink>
              }
            />
          )}
          <ul className="space-y-3">
            {predictions.data?.slice(0, 4).map((p) => (
              <PredictionRow key={p.id} prediction={p} />
            ))}
          </ul>
        </Section>
      </div>
      <div className="mt-12">
        <Disclaimer compact />
      </div>
    </>
  );
}

function DoctorDashboard({ name }: { name: string }) {
  const appointments = useFetch<Appointment[]>("/api/appointments");
  const all = appointments.data ?? [];
  const pending = all.filter((a) => a.status === "pending");
  const confirmed = all.filter((a) => a.status === "confirmed");
  const completed = all.filter((a) => a.status === "completed");
  const rated = completed.filter((a) => a.rating);
  const rating = rated.length
    ? (rated.reduce((sum, a) => sum + (a.rating ?? 0), 0) / rated.length).toFixed(1)
    : "—";
  const stats = [
    ["New requests", pending.length],
    ["Active", confirmed.length],
    ["Completed", completed.length],
    ["Average rating", rating],
  ] as const;

  return (
    <>
      <PageHeader
        title={`Good day, Dr. ${name.split(" ")[0]}`}
        subtitle="Review new requests and continue active consultations."
      />
      {appointments.error && (
        <div className="mb-6">
          <ErrorState message={appointments.error.message} onRetry={appointments.reload} />
        </div>
      )}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Stat key={label} label={label} value={appointments.loading ? "…" : value} />
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Awaiting your confirmation">
          {appointments.loading && <SkeletonList rows={2} />}
          {appointments.data && pending.length === 0 && (
            <EmptyState
              icon={<Stethoscope className="size-5" />}
              title="You're all caught up"
              body="New booking requests from patients will appear here."
            />
          )}
          <ul className="space-y-3">
            {pending.map((a) => (
              <AppointmentRow key={a.id} appointment={a} asDoctor />
            ))}
          </ul>
        </Section>
        <Section title="Active consultations" link={{ to: "/app/appointments", label: "All" }}>
          {appointments.loading && <SkeletonList rows={2} />}
          {appointments.data && confirmed.length === 0 && (
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title="No active consultations"
              body="Confirmed consultations with an open chat show up here."
            />
          )}
          <ul className="space-y-3">
            {confirmed.map((a) => (
              <AppointmentRow key={a.id} appointment={a} asDoctor />
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const name = user?.profile?.name ?? user?.username ?? "";
  if (user?.role === "doctor") return <DoctorDashboard name={name} />;
  if (user?.role === "patient") return <PatientDashboard name={name} />;
  return (
    <EmptyState
      icon={<Stethoscope className="size-5" />}
      title="Admin account"
      body="This account has no patient or doctor profile. Use the Django admin to manage the platform."
    />
  );
}
