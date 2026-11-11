import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { confidenceBand, formatDate } from "../lib/format";
import type { Appointment, Prediction } from "../lib/types";
import { Avatar, StatusBadge, cx } from "./ui";

export function ConfidenceMeter({ value, large = false }: { value: number; large?: boolean }) {
  const band = confidenceBand(value);
  const bar = { ok: "bg-ok", warn: "bg-warn", muted: "bg-muted" }[band.tone];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cx("font-semibold tabular-nums", large ? "text-3xl text-ink" : "text-sm")}>
          {Math.round(value)}%
        </span>
        <span className="text-sm text-muted">{band.label}</span>
      </div>
      <div
        className={cx("mt-2 overflow-hidden rounded-full bg-sunken", large ? "h-2.5" : "h-1.5")}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label="Model confidence"
      >
        <div className={cx("h-full rounded-full", bar)} style={{ width: `${Math.max(4, value)}%` }} />
      </div>
    </div>
  );
}

const rowClass =
  "group flex items-center gap-4 rounded-lg border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-raised";

export function PredictionRow({
  prediction,
  showPatient,
}: {
  prediction: Prediction;
  showPatient?: boolean;
}) {
  return (
    <li>
      <Link to={`/app/predictions/${prediction.id}`} className={rowClass}>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover:text-brand-strong">{prediction.disease_name}</p>
          <p className="truncate text-sm text-muted">
            {showPatient ? `${prediction.patient.name} · ` : ""}
            {formatDate(prediction.created_at)} · {prediction.symptom_labels.slice(0, 3).join(", ")}
            {prediction.symptom_labels.length > 3 ? ` +${prediction.symptom_labels.length - 3}` : ""}
          </p>
        </div>
        <span className="hidden text-sm font-semibold text-brand tabular-nums sm:block">
          {Math.round(prediction.confidence)}%
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

export function AppointmentRow({ appointment, asDoctor }: { appointment: Appointment; asDoctor: boolean }) {
  const who = asDoctor ? appointment.patient.name : `Dr. ${appointment.doctor.name}`;
  const detail = asDoctor
    ? `${appointment.patient.age} yrs · ${appointment.prediction?.disease_name ?? "No report attached"}`
    : appointment.doctor.specialization;
  return (
    <li>
      <Link to={`/app/appointments/${appointment.id}`} className={rowClass}>
        <Avatar name={asDoctor ? appointment.patient.name : appointment.doctor.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover:text-brand-strong">{who}</p>
          <p className="truncate text-sm text-muted">{detail}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={appointment.status} />
          <span className="text-sm text-muted tabular-nums">
            {formatDate(appointment.appointment_date, { day: "numeric", month: "short" })}
          </span>
        </div>
      </Link>
    </li>
  );
}
