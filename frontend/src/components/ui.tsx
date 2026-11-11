import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Search, Star } from "lucide-react";
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link, type LinkProps } from "react-router";
import { initials } from "../lib/format";
import type { AppointmentStatus } from "../lib/types";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-card hover:bg-brand-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-sunken",
  ghost: "text-ink hover:bg-sunken",
  danger: "border border-accent/30 bg-surface text-accent hover:bg-accent-soft",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap",
    "transition-[background-color,box-shadow,transform,color] duration-150 ease-out active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-55",
    variants[variant],
    sizes[size],
    extra,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({ variant, size, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Card({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag className={cx("rounded-lg border border-line bg-surface shadow-card", className)}>{children}</Tag>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-[2.1rem]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-pretty text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type FieldShell = { label: string; error?: string; hint?: string; className?: string };
type ControlProps = { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/** Label + message around a control; hands the control its id and aria wiring. */
function Field({
  label,
  error,
  hint,
  className,
  children,
}: FieldShell & { children: (control: ControlProps) => ReactNode }) {
  const id = useId();
  const message = error || hint;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error) || undefined,
        "aria-describedby": message ? `${id}-msg` : undefined,
      })}
      {message && (
        <p id={`${id}-msg`} className={cx("text-sm", error ? "text-accent" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}

const controlClass = (error?: string) =>
  cx(
    "w-full rounded-md border bg-surface px-3 text-[15px] text-ink placeholder:text-muted",
    "transition-[border-color,box-shadow] duration-150 focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none",
    "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted",
    error ? "border-accent" : "border-line-strong",
  );

export function Input({
  label,
  error,
  hint,
  className,
  ...rest
}: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(control) => <input {...control} className={cx(controlClass(error), "h-11")} {...rest} />}
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  className,
  ...rest
}: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(control) => <select {...control} className={cx(controlClass(error), "h-11 pr-8")} {...rest} />}
    </Field>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  ...rest
}: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(control) => (
        <textarea {...control} className={cx(controlClass(error), "min-h-24 py-2.5")} {...rest} />
      )}
    </Field>
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        className="h-11 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-[15px] text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        {...props}
      />
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-muted transition-colors duration-150 hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden /> {children}
    </Link>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-shimmer rounded-md bg-sunken", className)} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-pretty text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-accent/25 bg-accent-soft p-5 sm:flex-row sm:items-center"
    >
      <AlertTriangle className="size-5 shrink-0 text-accent" aria-hidden />
      <p className="flex-1 text-sm text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "bg-warn-soft text-warn",
  confirmed: "bg-brand-soft text-brand-strong",
  completed: "bg-ok-soft text-ok",
  cancelled: "bg-sunken text-muted",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}

export function Stars({ value, label }: { value: number; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={label ?? `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cx("size-4", n <= Math.round(value) ? "fill-star text-star" : "text-line-strong")}
        />
      ))}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand-strong",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
