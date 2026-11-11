import { ArrowRight, CalendarCheck, ClipboardList, MessagesSquare, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Disclaimer, PulseLine } from "../components/brand";
import { ButtonLink, Card, Skeleton, Stars } from "../components/ui";
import { useFetch, useDocumentTitle } from "../lib/hooks";
import type { Doctor } from "../lib/types";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Describe your symptoms",
    body: "Pick from 131 symptoms. The trained Naive Bayes model scores 41 conditions in milliseconds.",
  },
  {
    icon: Sparkles,
    title: "Understand the result",
    body: "See the likely condition, how confident the model is, and a plain-language explanation written by AI.",
  },
  {
    icon: CalendarCheck,
    title: "See the right specialist",
    body: "Book the suggested specialist, share your report, and chat securely until the consultation closes.",
  },
];

function SampleResult() {
  return (
    <Card className="relative overflow-hidden p-6 shadow-raised sm:p-7">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Sample result</p>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">Migraine</h2>
        <span className="text-2xl font-semibold text-brand tabular-nums">91%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div className="h-full w-[91%] rounded-full bg-brand" />
      </div>
      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Symptoms">
        {["Headache", "Nausea", "Visual disturbances", "Acidity"].map((s) => (
          <li key={s} className="rounded-full border border-line bg-paper px-3 py-1 text-sm">
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-md bg-brand-soft p-4 text-sm leading-relaxed text-ink">
        <p className="flex items-center gap-1.5 font-semibold text-brand-strong">
          <Sparkles className="size-4" aria-hidden /> In plain language
        </p>
        <p className="mt-1 text-pretty">
          Migraines are recurring headaches, often with nausea or changes in vision. Rest in a dark room, stay
          hydrated, and see a neurologist if attacks become frequent.
        </p>
      </div>
      <p className="mt-4 text-sm text-muted">
        Suggested specialist: <span className="font-semibold text-ink">Neurologist</span>
      </p>
    </Card>
  );
}

export default function Landing() {
  useDocumentTitle("");
  const doctors = useFetch<Doctor[]>("/api/doctors");

  return (
    <div className="space-y-24">
      <section className="grid items-center gap-12 pt-2 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="animate-enter">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-muted">
            <span className="size-2 rounded-full bg-ok" aria-hidden /> ML prediction · AI explanations ·
            Doctor chat
          </p>
          <h1 className="mt-6 font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl">
            Know what your symptoms <em className="text-brand not-italic">might</em> mean, and who to see
            next.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-muted">
            Symptra turns a list of symptoms into a likely condition, explains it without jargon, and connects
            you with the right specialist for a follow-up consultation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/register" size="lg">
              Check my symptoms <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink to="/login?demo=patient" variant="secondary" size="lg">
              Try the demo
            </ButtonLink>
          </div>
          <PulseLine className="mt-10 text-brand/35" />
        </div>
        <SampleResult />
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24">
        <h2 id="how-title" className="font-display text-3xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Card as="li" key={title} className="p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-muted tabular-nums">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-pretty text-muted">{body}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section aria-labelledby="doctors-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="doctors-title" className="font-display text-3xl font-semibold tracking-tight">
              Specialists on Symptra
            </h2>
            <p className="mt-1.5 text-muted">Rated by patients after completed consultations.</p>
          </div>
          <Link
            to="/doctors"
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            All doctors <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.loading &&
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          {doctors.error && (
            <p className="text-muted sm:col-span-2 lg:col-span-3">
              The doctor directory is unavailable right now.{" "}
              <button type="button" className="font-semibold text-brand underline" onClick={doctors.reload}>
                Retry
              </button>
            </p>
          )}
          {doctors.data?.slice(0, 6).map((doctor) => (
            <Link
              key={doctor.id}
              to={`/doctors/${doctor.id}`}
              className="group rounded-lg border border-line bg-surface p-5 shadow-card transition-[box-shadow,border-color] duration-150 hover:border-line-strong hover:shadow-raised"
            >
              <p className="font-semibold group-hover:text-brand-strong">Dr. {doctor.name}</p>
              <p className="text-sm text-muted">
                {doctor.specialization} · {doctor.years_experience} yrs
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                {doctor.rating ? (
                  <>
                    <Stars value={doctor.rating} />{" "}
                    <span className="tabular-nums">{doctor.rating.toFixed(1)}</span>
                  </>
                ) : (
                  "New on Symptra"
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-xl bg-ink p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Already have a report?</h2>
          <p className="mt-2 max-w-lg text-pretty text-white/75">
            Doctors see your symptoms and model output before the visit, so the consultation starts where your
            check left off.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <ButtonLink to="/register" size="lg" variant="secondary" className="border-transparent">
            Create free account
          </ButtonLink>
          <ButtonLink
            to="/login?demo=doctor"
            size="lg"
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <MessagesSquare className="size-4" aria-hidden /> Doctor demo
          </ButtonLink>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
