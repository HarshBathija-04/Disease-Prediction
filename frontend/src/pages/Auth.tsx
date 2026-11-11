import { Stethoscope, UserRound } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { PulseLine } from "../components/brand";
import { Button, Card, Input, Select, cx } from "../components/ui";
import { ApiError, messageOf } from "../lib/api";
import { useAuth } from "../lib/auth";
import { todayISO } from "../lib/format";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import { GENDERS, type SymptomCatalog } from "../lib/types";

// Public demo accounts created by `python manage.py seed_demo`.
const DEMO = {
  patient: { username: "demo_patient", password: "DemoPass#2024" },
  doctor: { username: "dr_mehta", password: "DemoPass#2024" },
};

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl animate-enter">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
      <PulseLine className="my-4 h-8 text-brand/30" />
      <Card className="p-6 sm:p-8">{children}</Card>
    </div>
  );
}

export function Login() {
  useDocumentTitle("Sign in");
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const demo =
    params.get("demo") === "doctor" ? DEMO.doctor : params.get("demo") === "patient" ? DEMO.patient : null;
  const [username, setUsername] = useState(demo?.username ?? "");
  const [password, setPassword] = useState(demo?.password ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={safeNext(params.get("next"))} replace />;

  async function signIn(name: string, secret: string) {
    setBusy(true);
    setError("");
    try {
      const signedIn = await login(name, secret);
      toast.success(`Welcome back, ${signedIn.profile?.name.split(" ")[0] ?? signedIn.username}`);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      setError(messageOf(err, "Sign in failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void signIn(username, password);
        }}
      >
        <Input
          label="Username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm font-semibold">Explore with a demo account</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => signIn(DEMO.patient.username, DEMO.patient.password)}
          >
            <UserRound className="size-4" aria-hidden /> Patient demo
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => signIn(DEMO.doctor.username, DEMO.doctor.password)}
          >
            <Stethoscope className="size-4" aria-hidden /> Doctor demo
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}

const EMPTY = {
  username: "",
  email: "",
  password: "",
  name: "",
  dob: "",
  gender: "",
  address: "",
  mobile_no: "",
  registration_no: "",
  year_of_registration: "",
  qualification: "",
  state_medical_council: "",
  specialization: "",
};

export function Register() {
  useDocumentTitle("Create account");
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const catalog = useFetch<SymptomCatalog>("/api/symptoms");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const bind = (name: keyof typeof EMPTY) => ({
    name,
    value: form[name],
    error: error?.field(name),
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: Record<string, string> = { role, ...form };
    if (role === "patient")
      [
        "registration_no",
        "year_of_registration",
        "qualification",
        "state_medical_council",
        "specialization",
      ].forEach((k) => delete payload[k]);
    try {
      await register(payload);
      toast.success("Account created. Welcome to Symptra!");
      navigate(role === "patient" ? "/app/check" : "/app", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "error", "Registration failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <fieldset>
          <legend className="text-sm font-semibold">I am a</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-sunken p-1">
            {(["patient", "doctor"] as const).map((value) => (
              <label
                key={value}
                className={cx(
                  "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[7px] text-sm font-semibold capitalize transition-[background-color,box-shadow] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                  role === value ? "bg-surface text-ink shadow-card" : "text-muted",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                {value === "patient" ? (
                  <UserRound className="size-4" aria-hidden />
                ) : (
                  <Stethoscope className="size-4" aria-hidden />
                )}
                {value}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" autoComplete="name" required {...bind("name")} className="sm:col-span-2" />
          <Input label="Username" autoComplete="username" required {...bind("username")} />
          <Input label="Email" type="email" autoComplete="email" required {...bind("email")} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, not too common."
            required
            {...bind("password")}
            className="sm:col-span-2"
          />
          <Input label="Date of birth" type="date" max={todayISO(-1)} required {...bind("dob")} />
          <Select label="Gender" required {...bind("gender")}>
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
          <Input label="Mobile number" type="tel" autoComplete="tel" required {...bind("mobile_no")} />
          <Input label="City / address" autoComplete="address-level2" required {...bind("address")} />
        </div>

        {role === "doctor" && (
          <fieldset className="grid animate-enter gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <legend className="sr-only">Professional details</legend>
            <p className="text-sm font-semibold sm:col-span-2">Professional details</p>
            <Select label="Specialization" required {...bind("specialization")}>
              <option value="">Select…</option>
              {catalog.data?.specializations.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Input
              label="Qualification"
              placeholder="e.g. MD (Dermatology)"
              required
              {...bind("qualification")}
            />
            <Input label="Registration number" required {...bind("registration_no")} />
            <Input
              label="Registered on"
              type="date"
              max={todayISO(-1)}
              required
              {...bind("year_of_registration")}
            />
            <Input
              label="State medical council"
              required
              {...bind("state_medical_council")}
              className="sm:col-span-2"
            />
          </fieldset>
        )}

        {error && !error.details && (
          <p role="alert" className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
            {error.message}
          </p>
        )}
        {error?.details && (
          <p role="alert" className="text-sm text-accent">
            Please fix the highlighted fields.
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
