import { PulseLine } from "../components/brand";
import { ButtonLink } from "../components/ui";
import { useDocumentTitle } from "../lib/hooks";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <PulseLine className="text-brand/40" />
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted">The page you're looking for doesn't exist or has moved.</p>
      <ButtonLink to="/" className="mt-8">
        Back to home
      </ButtonLink>
    </div>
  );
}
