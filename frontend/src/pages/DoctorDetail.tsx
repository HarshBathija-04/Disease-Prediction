import { Award, CalendarPlus, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Avatar,
  BackLink,
  Button,
  ButtonLink,
  Card,
  ErrorState,
  Input,
  Select,
  Skeleton,
  Stars,
} from "../components/ui";
import { api, ApiError, messageOf } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, todayISO } from "../lib/format";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import type { Appointment, Doctor, Prediction } from "../lib/types";

function BookingForm({ doctor }: { doctor: Doctor }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const predictions = useFetch<Prediction[]>("/api/predictions");
  const [date, setDate] = useState(todayISO(1));
  const [predictionId, setPredictionId] = useState(params.get("prediction") ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function book(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const appointment = await api<Appointment>("/api/appointments", {
        method: "POST",
        body: {
          doctor_id: doctor.id,
          appointment_date: date,
          prediction_id: predictionId ? Number(predictionId) : null,
        },
      });
      toast.success(`Request sent to Dr. ${doctor.name}`, { description: "You can chat once they confirm." });
      navigate(`/app/appointments/${appointment.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err : null);
      if (!(err instanceof ApiError) || !err.details) toast.error(messageOf(err, "Booking failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={book} className="space-y-4">
      <Input
        label="Preferred date"
        type="date"
        required
        min={todayISO()}
        max={todayISO(180)}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={error?.field("appointment_date")}
      />
      <Select
        label="Share a symptom report"
        value={predictionId}
        onChange={(e) => setPredictionId(e.target.value)}
        hint="The doctor sees your symptoms and the model's result."
        error={error?.field("prediction_id")}
      >
        <option value="">Don't attach a report</option>
        {predictions.data?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.disease_name} · {formatDate(p.created_at)}
          </option>
        ))}
      </Select>
      <Button type="submit" className="w-full" loading={busy}>
        <CalendarPlus className="size-4" aria-hidden /> Request consultation
      </Button>
    </form>
  );
}

export default function DoctorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { data: doctor, error, loading, reload } = useFetch<Doctor>(`/api/doctors/${id}`);
  useDocumentTitle(doctor ? `Dr. ${doctor.name}` : "Doctor");

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink to={`/doctors${params.get("prediction") ? `?prediction=${params.get("prediction")}` : ""}`}>
        All doctors
      </BackLink>
      {loading && <Skeleton className="h-72 rounded-lg" />}
      {error && (
        <ErrorState
          message={error.status === 404 ? "We couldn't find this doctor." : error.message}
          onRetry={error.status === 404 ? undefined : reload}
        />
      )}
      {doctor && (
        <div className="grid animate-enter gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar name={doctor.name} className="size-16 text-xl" />
                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight">Dr. {doctor.name}</h1>
                  <p className="text-muted">
                    {doctor.specialization} · {doctor.qualification}
                  </p>
                </div>
              </div>
              <dl className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted">Rating</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                    {doctor.rating ? (
                      <>
                        <Stars value={doctor.rating} />{" "}
                        <span className="tabular-nums">{doctor.rating.toFixed(1)}</span>
                      </>
                    ) : (
                      "New"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Experience</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                    <Award className="size-4 text-brand" aria-hidden /> {doctor.years_experience} years
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Location</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                    <MapPin className="size-4 text-brand" aria-hidden /> {doctor.address}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-muted">Registered with {doctor.state_medical_council}</p>
            </Card>

            <Card as="section" className="p-6">
              <h2 className="text-lg font-semibold">Patient reviews</h2>
              {doctor.reviews?.length ? (
                <ul className="mt-4 divide-y divide-line">
                  {doctor.reviews.map((r) => (
                    <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Stars value={r.rating} />
                        <span className="text-sm font-semibold">{r.patient}</span>
                        <span className="text-sm text-muted">{formatDate(r.date)}</span>
                      </div>
                      {r.review && <p className="mt-2 text-pretty">{r.review}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  No reviews yet. Reviews appear after completed consultations.
                </p>
              )}
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Book a consultation</h2>
              <div className="mt-4">
                {user?.role === "patient" ? (
                  <BookingForm doctor={doctor} />
                ) : user ? (
                  <p className="text-sm text-muted">Only patient accounts can book consultations.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted">Sign in as a patient to request a consultation.</p>
                    <ButtonLink
                      to={`/login?next=${encodeURIComponent(`/doctors/${doctor.id}`)}`}
                      className="w-full"
                    >
                      Sign in to book
                    </ButtonLink>
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
