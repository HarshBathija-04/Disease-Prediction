import { ArrowRight, NotebookPen, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { Disclaimer } from "../components/brand";
import { ConfidenceMeter } from "../components/lists";
import { BackLink, Button, ButtonLink, Card, ErrorState, Skeleton, Textarea } from "../components/ui";
import { api, messageOf } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/format";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import { Markdown } from "../lib/markdown";
import type { DoctorNote, Prediction } from "../lib/types";

function Explanation({ prediction }: { prediction: Prediction }) {
  const [text, setText] = useState(prediction.ai_explanation);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<{ ai_explanation: string }>(`/api/predictions/${prediction.id}/explain`, {
        method: "POST",
      });
      setText(data.ai_explanation);
    } catch (err) {
      setError(messageOf(err, "Could not load the explanation."));
    }
  }, [prediction.id]);

  useEffect(() => {
    if (text || requested.current) return;
    requested.current = true;
    void load();
  }, [text, load]);

  return (
    <Card as="section" className="p-6 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="size-5 text-brand" aria-hidden /> In plain language
      </h2>
      <p className="mt-1 text-sm text-muted">Written by AI from the model's result. It may be imperfect.</p>
      <div className="mt-5" aria-live="polite" aria-busy={!text && !error}>
        {text ? (
          <Markdown source={text} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <div className="space-y-3" role="status" aria-label="Writing explanation">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-4 h-5 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
      </div>
    </Card>
  );
}

function Notes({ prediction, canWrite }: { prediction: Prediction; canWrite: boolean }) {
  const [notes, setNotes] = useState<DoctorNote[]>(prediction.doctor_notes);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const note = await api<DoctorNote>(`/api/predictions/${prediction.id}/notes`, {
        method: "POST",
        body: { note: draft },
      });
      setNotes((n) => [note, ...n]);
      setDraft("");
      toast.success("Note added to the patient's report");
    } catch (err) {
      toast.error(messageOf(err, "Could not save the note."));
    } finally {
      setBusy(false);
    }
  }

  if (!canWrite && notes.length === 0) return null;
  return (
    <Card as="section" className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <NotebookPen className="size-5 text-brand" aria-hidden /> Doctor's notes
      </h2>
      {canWrite && (
        <form onSubmit={add} className="mt-4 space-y-3">
          <Textarea
            label="Add a clinical note"
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" size="sm" loading={busy} disabled={!draft.trim()}>
            Save note
          </Button>
        </form>
      )}
      <ul className="mt-4 divide-y divide-line">
        {notes.map((note) => (
          <li key={note.id} className="py-3">
            <p className="text-pretty">{note.note}</p>
            <p className="mt-1 text-sm text-muted">
              Dr. {note.doctor} · {formatDate(note.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function PredictionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: prediction, error, loading, reload } = useFetch<Prediction>(`/api/predictions/${id}`);
  useDocumentTitle(prediction ? prediction.disease_name : "Report");
  const isDoctor = user?.role === "doctor";

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink to={isDoctor ? "/app/predictions" : "/app"}>
        {isDoctor ? "Patient reports" : "Dashboard"}
      </BackLink>
      {loading && (
        <div className="space-y-4" role="status" aria-label="Loading report">
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}
      {error && (
        <ErrorState
          message={
            error.status === 404 ? "This report doesn't exist or isn't shared with you." : error.message
          }
          onRetry={error.status === 404 ? undefined : reload}
        />
      )}
      {prediction && (
        <div className="space-y-6 animate-enter">
          <Card as="section" className="p-6 sm:p-8">
            <p className="text-sm text-muted">
              {isDoctor ? `${prediction.patient.name}, ${prediction.patient.age} · ` : ""}Report from{" "}
              {formatDate(prediction.created_at, { dateStyle: "long" })}
            </p>
            <div className="mt-2 grid gap-6 md:grid-cols-[1fr_260px] md:items-end">
              <div>
                <h1 className="font-display text-4xl font-semibold tracking-tight">
                  {prediction.disease_name}
                </h1>
                <p className="mt-2 text-muted">
                  Suggested specialist:{" "}
                  <strong className="font-semibold text-ink">{prediction.specialization}</strong>
                </p>
              </div>
              <ConfidenceMeter value={prediction.confidence} large />
            </div>
            <h2 className="mt-6 text-sm font-semibold text-muted">Reported symptoms</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {prediction.symptom_labels.map((s) => (
                <li key={s} className="rounded-full border border-line bg-paper px-3 py-1 text-sm">
                  {s}
                </li>
              ))}
            </ul>
            {!isDoctor && (
              <div className="mt-7 flex flex-wrap gap-3 border-t border-line pt-6">
                <ButtonLink
                  to={`/doctors?specialization=${encodeURIComponent(prediction.specialization)}&prediction=${prediction.id}`}
                >
                  Book {/^[AEIOU]/.test(prediction.specialization) ? "an" : "a"} {prediction.specialization}{" "}
                  <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink to="/app/check" variant="secondary">
                  New check
                </ButtonLink>
              </div>
            )}
          </Card>
          <Explanation prediction={prediction} />
          <Notes prediction={prediction} canWrite={isDoctor} />
          <Disclaimer />
        </div>
      )}
    </div>
  );
}
