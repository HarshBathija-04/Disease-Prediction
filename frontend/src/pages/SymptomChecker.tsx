import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Disclaimer } from "../components/brand";
import { Button, Card, ErrorState, PageHeader, Skeleton, cx } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import type { Prediction, SymptomCatalog } from "../lib/types";

const MAX = 17;
const COMMON = [
  "headache",
  "high_fever",
  "cough",
  "fatigue",
  "nausea",
  "vomiting",
  "skin_rash",
  "itching",
  "joint_pain",
  "stomach_pain",
];

export default function SymptomChecker() {
  useDocumentTitle("Check symptoms");
  const navigate = useNavigate();
  const catalog = useFetch<SymptomCatalog>("/api/symptoms");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const labels = useMemo(
    () => new Map(catalog.data?.symptoms.map((s) => [s.key, s.label]) ?? []),
    [catalog.data],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalog.data?.symptoms ?? []).filter((s) => !q || s.label.toLowerCase().includes(q));
  }, [catalog.data, query]);

  function toggle(key: string) {
    setSelected((current) => {
      if (current.includes(key)) return current.filter((k) => k !== key);
      if (current.length >= MAX) {
        toast.warning(`You can select up to ${MAX} symptoms.`);
        return current;
      }
      return [...current, key];
    });
  }

  async function submit() {
    setBusy(true);
    try {
      const prediction = await api<Prediction>("/api/predictions", {
        method: "POST",
        body: { symptoms: selected },
      });
      navigate(`/app/predictions/${prediction.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Prediction failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Check your symptoms"
        subtitle="Choose everything you're experiencing. More symptoms usually means a more reliable result."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <Card className="p-5 sm:p-6">
          <label htmlFor="symptom-search" className="text-sm font-semibold">
            Search symptoms
          </label>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="symptom-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. fever, rash, back pain"
              className="h-11 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
            />
          </div>

          {!query && catalog.data && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-muted">Common</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON.filter((k) => labels.has(k)).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected.includes(key)}
                    onClick={() => toggle(key)}
                    className={cx(
                      "h-9 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,color] duration-150",
                      selected.includes(key)
                        ? "border-brand bg-brand text-white"
                        : "border-line-strong bg-surface hover:border-brand hover:text-brand-strong",
                    )}
                  >
                    {labels.get(key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-muted">
              {query ? `${filtered.length} matching symptoms` : "All symptoms (A–Z)"}
            </legend>
            {catalog.loading && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2" role="status" aria-label="Loading symptoms">
                {Array.from({ length: 10 }, (_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            )}
            {catalog.error && (
              <div className="mt-3">
                <ErrorState message={catalog.error.message} onRetry={catalog.reload} />
              </div>
            )}
            {catalog.data && filtered.length === 0 && (
              <p className="mt-3 rounded-md bg-sunken p-4 text-sm text-muted">
                No symptom matches “{query}”. Try a simpler word, like “pain” or “skin”.
              </p>
            )}
            <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filtered.map((symptom) => {
                const checked = selected.includes(symptom.key);
                return (
                  <label
                    key={symptom.key}
                    className={cx(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-[15px] transition-[background-color,border-color] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                      checked
                        ? "border-brand bg-brand-soft"
                        : "border-line hover:border-line-strong hover:bg-paper",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(symptom.key)}
                    />
                    <span
                      aria-hidden
                      className={cx(
                        "grid size-5 shrink-0 place-items-center rounded-[5px] border transition-colors duration-150",
                        checked ? "border-brand bg-brand text-white" : "border-line-strong bg-surface",
                      )}
                    >
                      {checked && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    {symptom.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Card>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Your symptoms</h2>
              <span className="text-sm text-muted tabular-nums" aria-live="polite">
                {selected.length}/{MAX}
              </span>
            </div>
            {selected.length === 0 ? (
              <p className="mt-3 text-sm text-pretty text-muted">
                Nothing selected yet. Pick at least one symptom; three or more gives better results.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {selected.map((key) => (
                  <li key={key} className="animate-enter">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-soft pr-2 pl-3 text-sm font-medium text-brand-strong hover:bg-brand/15"
                      aria-label={`Remove ${labels.get(key)}`}
                    >
                      {labels.get(key)} <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              className="mt-5 w-full"
              size="lg"
              disabled={selected.length === 0}
              loading={busy}
              onClick={submit}
            >
              {busy ? "Analysing…" : "Analyse symptoms"}
            </Button>
            {selected.length > 0 && (
              <button
                type="button"
                className="mt-2 w-full rounded-md py-2 text-sm font-medium text-muted hover:text-ink"
                onClick={() => setSelected([])}
              >
                Clear all
              </button>
            )}
          </Card>
          <div className="mt-4">
            <Disclaimer compact />
          </div>
        </aside>
      </div>
    </>
  );
}
