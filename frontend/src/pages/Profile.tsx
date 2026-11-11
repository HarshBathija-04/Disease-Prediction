import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageHeader, Select, Textarea } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { todayISO } from "../lib/format";
import { useDocumentTitle } from "../lib/hooks";
import type { User } from "../lib/types";

const FIELDS: Record<string, { label: string; type?: string; doctorOnly?: boolean }> = {
  name: { label: "Full name" },
  dob: { label: "Date of birth", type: "date" },
  mobile_no: { label: "Mobile number", type: "tel" },
  address: { label: "City / address" },
  qualification: { label: "Qualification", doctorOnly: true },
  registration_no: { label: "Registration number", doctorOnly: true },
  state_medical_council: { label: "State medical council", doctorOnly: true },
};

function FeedbackForm() {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/feedback", { method: "POST", body: { feedback } });
      setFeedback("");
      toast.success("Thanks! Your feedback was sent to the team.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Feedback not sent.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Textarea
        label="Tell us what to improve"
        value={feedback}
        maxLength={2000}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        loading={busy}
        disabled={feedback.trim().length < 3}
      >
        Send feedback
      </Button>
    </form>
  );
}

export default function Profile() {
  useDocumentTitle("Profile");
  const { user, setUser } = useAuth();
  const profile = (user?.profile ?? {}) as Record<string, string>;
  const isDoctor = user?.role === "doctor";
  const [form, setForm] = useState<Record<string, string>>(() => ({ ...profile }));
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = Object.fromEntries(
      Object.keys(FIELDS)
        .filter((k) => isDoctor || !FIELDS[k]!.doctorOnly)
        .concat("gender")
        .map((k) => [k, form[k]]),
    );
    try {
      setUser(await api<User>("/api/auth/me", { method: "PATCH", body }));
      toast.success("Profile updated");
    } catch (err) {
      setError(err instanceof ApiError ? err : null);
      toast.error(err instanceof ApiError ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!user?.profile) return <PageHeader title="Profile" subtitle="This account has no editable profile." />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Your profile" subtitle={`Signed in as ${user.username} · ${user.email}`} />
      <Card className="p-6 sm:p-8">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {Object.entries(FIELDS)
            .filter(([, f]) => isDoctor || !f.doctorOnly)
            .map(([key, f]) => (
              <Input
                key={key}
                label={f.label}
                type={f.type ?? "text"}
                max={f.type === "date" ? todayISO(-1) : undefined}
                value={form[key] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
                error={error?.field(key)}
              />
            ))}
          <Select
            label="Gender"
            value={form.gender ?? ""}
            onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}
          >
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </Select>
          <div className="sm:col-span-2">
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
      <Card as="section" className="mt-6 p-6 sm:p-8">
        <h2 className="mb-4 text-lg font-semibold">Feedback</h2>
        <FeedbackForm />
      </Card>
    </div>
  );
}
