import { ClipboardList } from "lucide-react";
import { PredictionRow } from "../components/lists";
import { ButtonLink, EmptyState, ErrorState, PageHeader, SkeletonList } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useDocumentTitle, useFetch } from "../lib/hooks";
import type { Prediction } from "../lib/types";

export default function Predictions() {
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";
  useDocumentTitle(isDoctor ? "Patient reports" : "Report history");
  const { data, error, loading, reload } = useFetch<Prediction[]>("/api/predictions");

  return (
    <>
      <PageHeader
        title={isDoctor ? "Patient reports" : "Report history"}
        subtitle={
          isDoctor ? "Symptom reports your patients shared with you." : "Every symptom check you have run."
        }
        actions={!isDoctor && <ButtonLink to="/app/check">New check</ButtonLink>}
      />
      {loading && <SkeletonList rows={4} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data?.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No reports yet"
          body={
            isDoctor
              ? "Reports appear when a patient books you with a symptom check attached."
              : "Run your first symptom check to see it here."
          }
          action={
            !isDoctor && (
              <ButtonLink to="/app/check" size="sm">
                Check symptoms
              </ButtonLink>
            )
          }
        />
      )}
      <ul className="space-y-3">
        {data?.map((p) => (
          <PredictionRow key={p.id} prediction={p} showPatient={isDoctor} />
        ))}
      </ul>
    </>
  );
}
