import { ArrowRight, Lock, MessagesSquare, Send, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { ConfidenceMeter } from "../components/lists";
import {
  Avatar,
  BackLink,
  Button,
  Card,
  ErrorState,
  Skeleton,
  StatusBadge,
  Stars,
  Textarea,
  cx,
} from "../components/ui";
import { api, messageOf } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatTime, isOpen } from "../lib/format";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import type { Appointment, AppointmentStatus, ChatMessage } from "../lib/types";

const POLL_MS = 4000;

function Chat({ appointment }: { appointment: Appointment }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const lastId = useRef(0);
  const open = isOpen(appointment.status);

  const poll = useCallback(async () => {
    try {
      const fresh = await api<ChatMessage[]>(
        `/api/appointments/${appointment.id}/messages?after=${lastId.current}`,
      );
      setError(null);
      if (fresh.length) lastId.current = fresh[fresh.length - 1]!.id;
      setMessages((current) => {
        const known = new Set(current?.map((m) => m.id));
        return [...(current ?? []), ...fresh.filter((m) => !known.has(m.id))];
      });
    } catch (err) {
      setError(messageOf(err, "Couldn't load messages."));
    }
  }, [appointment.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- poll() only sets state after the fetch resolves
    void poll();
    if (!open) return;
    const timer = setInterval(() => document.visibilityState === "visible" && void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [poll, open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages?.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const message = await api<ChatMessage>(`/api/appointments/${appointment.id}/messages`, {
        method: "POST",
        body: { message: text },
      });
      lastId.current = Math.max(lastId.current, message.id);
      setMessages((current) => [...(current ?? []), message]);
      setDraft("");
    } catch (err) {
      toast.error(messageOf(err, "Message not sent."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card as="section" className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <MessagesSquare className="size-5 text-brand" aria-hidden />
        <h2 className="font-semibold">Consultation chat</h2>
      </div>
      <ol
        ref={listRef}
        className="flex h-[24rem] flex-col gap-3 overflow-y-auto bg-paper/60 px-4 py-5 sm:px-5"
        aria-live="polite"
        aria-label="Messages"
      >
        {messages === null && !error && (
          <>
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
          </>
        )}
        {error && messages === null && <ErrorState message={error} onRetry={poll} />}
        {messages?.length === 0 && (
          <li className="m-auto max-w-xs text-center text-sm text-muted">
            No messages yet. {open ? "Say hello and describe how you're feeling." : ""}
          </li>
        )}
        {messages?.map((m) => (
          <li
            key={m.id}
            className={cx(
              "flex max-w-[85%] flex-col animate-enter",
              m.is_mine ? "items-end self-end" : "items-start",
            )}
          >
            <div
              className={cx(
                "rounded-lg px-3.5 py-2.5 text-[15px] text-pretty whitespace-pre-wrap",
                m.is_mine
                  ? "rounded-br-sm bg-brand text-white"
                  : "rounded-bl-sm border border-line bg-surface",
              )}
            >
              {m.message}
            </div>
            <span className="mt-1 px-1 text-xs text-muted">
              {m.is_mine ? "You" : m.sender_name} · {formatTime(m.created)}
            </span>
          </li>
        ))}
      </ol>
      {open ? (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3 sm:p-4">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Write a message…"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-line-strong bg-surface px-3 py-2.5 text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
          <Button
            type="submit"
            className="size-11 px-0"
            loading={sending}
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            {!sending && <Send className="size-4" aria-hidden />}
          </Button>
        </form>
      ) : (
        <p className="flex items-center gap-2 border-t border-line px-5 py-4 text-sm text-muted">
          <Lock className="size-4" aria-hidden /> This consultation is {appointment.status}; the chat is
          read-only.
        </p>
      )}
    </Card>
  );
}

function ReviewForm({ appointment, onDone }: { appointment: Appointment; onDone: (a: Appointment) => void }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onDone(
        await api<Appointment>(`/api/appointments/${appointment.id}/review`, {
          method: "POST",
          body: { rating, review },
        }),
      );
      toast.success("Thanks for your review!");
    } catch (err) {
      toast.error(messageOf(err, "Review not saved."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold">How was your consultation?</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded-md p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                className="sr-only"
                checked={rating === n}
                onChange={() => setRating(n)}
              />
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
              <Star
                aria-hidden
                className={cx(
                  "size-7 transition-colors duration-150",
                  n <= rating ? "fill-star text-star" : "text-line-strong",
                )}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea
        label="Review (optional)"
        value={review}
        maxLength={1000}
        onChange={(e) => setReview(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={!rating} loading={busy}>
        Submit review
      </Button>
    </form>
  );
}

function DoctorActions({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone: (a: Appointment) => void;
}) {
  const [notes, setNotes] = useState(appointment.doctor_notes);
  const [busy, setBusy] = useState<string | null>(null);

  async function update(status?: AppointmentStatus) {
    const verb = appointment.status === "pending" ? "Decline" : "Cancel";
    if (status === "cancelled" && !window.confirm(`${verb} this consultation? This can't be undone.`)) return;
    setBusy(status ?? "notes");
    try {
      const body: Record<string, string> = { doctor_notes: notes };
      if (status) body.status = status;
      onDone(await api<Appointment>(`/api/appointments/${appointment.id}`, { method: "PATCH", body }));
      toast.success(status ? `Consultation ${status}` : "Notes saved");
    } catch (err) {
      toast.error(messageOf(err, "Update failed."));
    } finally {
      setBusy(null);
    }
  }

  const open = isOpen(appointment.status);
  return (
    <div className="space-y-4">
      <Textarea
        label="Consultation notes for the patient"
        value={notes}
        maxLength={4000}
        onChange={(e) => setNotes(e.target.value)}
        disabled={!open}
        hint={open ? "Visible to the patient. Saved with any status change." : undefined}
      />
      {open && (
        <div className="flex flex-wrap gap-2">
          {appointment.status === "pending" ? (
            <Button size="sm" loading={busy === "confirmed"} onClick={() => update("confirmed")}>
              Confirm
            </Button>
          ) : (
            <Button size="sm" loading={busy === "completed"} onClick={() => update("completed")}>
              Mark completed
            </Button>
          )}
          <Button size="sm" variant="secondary" loading={busy === "notes"} onClick={() => update()}>
            Save notes
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={busy === "cancelled"}
            onClick={() => update("cancelled")}
          >
            {appointment.status === "pending" ? "Decline" : "Cancel"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    data: appointment,
    error,
    loading,
    reload,
    setData,
  } = useFetch<Appointment>(`/api/appointments/${id}`);
  const asDoctor = user?.role === "doctor";
  useDocumentTitle("Consultation");
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    if (!appointment || !window.confirm("Cancel this consultation? This can't be undone.")) return;
    setCancelling(true);
    try {
      setData(
        await api<Appointment>(`/api/appointments/${appointment.id}`, {
          method: "PATCH",
          body: { status: "cancelled" },
        }),
      );
      toast.success("Consultation cancelled");
    } catch (err) {
      toast.error(messageOf(err, "Could not cancel."));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink to="/app/appointments">Consultations</BackLink>
      {loading && <Skeleton className="h-96 rounded-lg" />}
      {error && (
        <ErrorState
          message={error.status === 404 ? "This consultation doesn't exist or isn't yours." : error.message}
          onRetry={error.status === 404 ? undefined : reload}
        />
      )}
      {appointment && (
        <div className="grid animate-enter gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar
                  name={asDoctor ? appointment.patient.name : appointment.doctor.name}
                  className="size-14 text-lg"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">
                    {asDoctor ? appointment.patient.name : `Dr. ${appointment.doctor.name}`}
                  </h1>
                  <p className="text-muted">
                    {asDoctor
                      ? `${appointment.patient.age} yrs · ${appointment.patient.gender}`
                      : `${appointment.doctor.specialization} · ${appointment.doctor.qualification}`}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={appointment.status} />
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(appointment.appointment_date, { dateStyle: "full" })}
                  </p>
                </div>
              </div>
              {!asDoctor && appointment.status === "pending" && (
                <p className="mt-5 rounded-md bg-warn-soft px-4 py-3 text-sm">
                  Waiting for Dr. {appointment.doctor.name.split(" ")[0]} to confirm. You can already send a
                  message.
                </p>
              )}
            </Card>
            <Chat appointment={appointment} />
          </div>

          <aside className="space-y-6">
            <Card className="p-5">
              <h2 className="font-semibold">Shared report</h2>
              {appointment.prediction ? (
                <Link
                  to={`/app/predictions/${appointment.prediction.id}`}
                  className="group mt-3 block rounded-md border border-line p-4 hover:border-line-strong"
                >
                  <p className="flex items-center justify-between font-semibold group-hover:text-brand-strong">
                    {appointment.prediction.disease_name} <ArrowRight className="size-4" aria-hidden />
                  </p>
                  <div className="mt-3">
                    <ConfidenceMeter value={appointment.prediction.confidence} />
                  </div>
                </Link>
              ) : (
                <p className="mt-2 text-sm text-muted">No symptom report was attached.</p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 font-semibold">{asDoctor ? "Manage consultation" : "Doctor's notes"}</h2>
              {asDoctor ? (
                <DoctorActions appointment={appointment} onDone={setData} />
              ) : (
                <>
                  <p className="text-sm text-pretty whitespace-pre-wrap text-muted">
                    {appointment.doctor_notes || "Your doctor hasn't added notes yet."}
                  </p>
                  {isOpen(appointment.status) && (
                    <Button variant="danger" size="sm" className="mt-4" loading={cancelling} onClick={cancel}>
                      Cancel consultation
                    </Button>
                  )}
                </>
              )}
            </Card>

            {appointment.status === "completed" && (
              <Card className="p-5">
                <h2 className="mb-3 font-semibold">Review</h2>
                {appointment.rating ? (
                  <div>
                    <Stars value={appointment.rating} />
                    {appointment.review && <p className="mt-2 text-sm text-pretty">{appointment.review}</p>}
                  </div>
                ) : asDoctor ? (
                  <p className="text-sm text-muted">The patient hasn't reviewed this consultation yet.</p>
                ) : (
                  <ReviewForm appointment={appointment} onDone={setData} />
                )}
              </Card>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
