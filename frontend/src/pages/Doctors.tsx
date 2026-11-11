import { MapPin, Search, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, Stars, cx } from "../components/ui";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import type { Doctor, SymptomCatalog } from "../lib/types";

export default function Doctors() {
  useDocumentTitle("Find a doctor");
  const [params, setParams] = useSearchParams();
  const specialization = params.get("specialization") ?? "";
  const prediction = params.get("prediction");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const catalog = useFetch<SymptomCatalog>("/api/symptoms");
  const query = new URLSearchParams();
  if (specialization) query.set("specialization", specialization);
  if (debounced) query.set("search", debounced);
  const doctors = useFetch<Doctor[]>(`/api/doctors?${query}`);

  const setSpecialization = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("specialization", value);
    else next.delete("specialization");
    setParams(next, { replace: true });
  };

  const chip = (active: boolean) =>
    cx(
      "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,color] duration-150",
      active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink",
    );

  return (
    <>
      <PageHeader
        title="Find a doctor"
        subtitle={
          prediction
            ? "Choose a doctor to share your symptom report with. We've filtered by the suggested specialist."
            : "Verified specialists, rated by patients after completed consultations."
        }
      />
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <label htmlFor="doctor-search" className="sr-only">
            Search doctors
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id="doctor-search"
            type="search"
            placeholder="Search by name or specialty"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
        </div>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          role="group"
          aria-label="Filter by specialization"
        >
          <button
            type="button"
            className={chip(!specialization)}
            aria-pressed={!specialization}
            onClick={() => setSpecialization("")}
          >
            All
          </button>
          {catalog.data?.specializations.map((s) => (
            <button
              key={s}
              type="button"
              className={chip(specialization === s)}
              aria-pressed={specialization === s}
              onClick={() => setSpecialization(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {doctors.loading && (
        <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading doctors">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      )}
      {doctors.error && <ErrorState message={doctors.error.message} onRetry={doctors.reload} />}
      {doctors.data?.length === 0 && (
        <EmptyState
          icon={<Stethoscope className="size-5" />}
          title="No doctors match"
          body="Try another specialization or clear the search."
          action={
            <button
              type="button"
              className="font-semibold text-brand hover:underline"
              onClick={() => {
                setSearch("");
                setSpecialization("");
              }}
            >
              Show all doctors
            </button>
          }
        />
      )}
      {doctors.data && doctors.data.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {doctors.data.map((doctor) => (
            <li key={doctor.id}>
              <Link
                to={`/doctors/${doctor.id}${prediction ? `?prediction=${prediction}` : ""}`}
                className="group flex h-full gap-4 rounded-lg border border-line bg-surface p-5 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-raised"
              >
                <Avatar name={doctor.name} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold group-hover:text-brand-strong">Dr. {doctor.name}</p>
                  <p className="text-sm text-muted">
                    {doctor.specialization} · {doctor.qualification}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="size-4 shrink-0" aria-hidden />{" "}
                    <span className="truncate">{doctor.address}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {doctor.rating ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Stars value={doctor.rating} />
                        <span className="font-semibold tabular-nums">{doctor.rating.toFixed(1)}</span>
                        <span className="text-muted">({doctor.review_count})</span>
                      </span>
                    ) : (
                      <span className="text-muted">No reviews yet</span>
                    )}
                    <span className="text-muted">{doctor.years_experience} years experience</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
