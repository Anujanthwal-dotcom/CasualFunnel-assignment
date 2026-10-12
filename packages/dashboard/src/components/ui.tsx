import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-hairline bg-surface-card ${className}`}>
      {children}
    </div>
  );
}

export type Tone =
  | 'slate'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'blue'
  | 'green'
  | 'red'
  | 'purple';

const TONES: Record<Tone, string> = {
  // PostHog / design.md semantic tones
  slate: 'bg-surface-soft text-body border-hairline',
  indigo: 'bg-accent-purple-soft text-accent-purple border-accent-purple/30',
  emerald: 'bg-accent-green-soft text-accent-green border-accent-green/30',
  amber: 'bg-[#fef4db] text-[#b17816] border-primary/40',
  rose: 'bg-accent-red-soft text-accent-red border-accent-red/30',
  sky: 'bg-accent-blue-soft text-link-blue border-accent-blue/30',
  blue: 'bg-accent-blue-soft text-link-blue border-accent-blue/30',
  green: 'bg-accent-green-soft text-accent-green border-accent-green/30',
  red: 'bg-accent-red-soft text-accent-red border-accent-red/30',
  purple: 'bg-accent-purple-soft text-accent-purple border-accent-purple/30',
};

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone] ?? TONES.slate}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-mute">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="w-full px-6 py-20 text-center">
      <div className="mx-auto w-full max-w-4xl">
        {icon && <div className="mb-3 flex justify-center text-mute">{icon}</div>}
        <p className="w-full text-base font-medium text-mute tracking-wide">{title}</p>
        {hint && <div className="mt-2 text-xs leading-relaxed text-mute">{hint}</div>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return (
    <div className="m-4 rounded-md border border-accent-red/30 bg-accent-red-soft p-4 text-sm text-ink">
      <p className="font-bold flex items-center gap-1.5 text-accent-red">
        <span>⚠️</span> Could not reach the API
      </p>
      <p className="mt-1 text-body">{message}</p>
      <p className="mt-2 text-xs text-mute">
        Make sure the backend is running (<code className="rounded-xs bg-surface-soft px-1 py-0.5 text-ink">npm run dev</code>) and MongoDB is up (<code className="rounded-xs bg-surface-soft px-1 py-0.5 text-ink">npm run docker:up</code>).
      </p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'indigo',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-ink">{value}</p>
      {hint && (
        <p className="mt-2 text-xs">
          <Badge tone={tone}>{hint}</Badge>
        </p>
      )}
    </Card>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md';
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeStyles = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm';

  let variantStyles = '';
  if (disabled) {
    variantStyles = 'bg-surface-soft text-ash border border-hairline-soft cursor-not-allowed';
  } else if (variant === 'primary') {
    variantStyles =
      'bg-primary text-on-primary font-bold hover:bg-primary-pressed active:bg-primary-active shadow-none';
  } else if (variant === 'secondary') {
    variantStyles =
      'bg-surface-soft text-ink font-bold border border-hairline hover:bg-hairline-soft active:bg-hairline';
  } else {
    variantStyles =
      'bg-transparent text-ink font-bold hover:bg-surface-soft active:bg-hairline-soft';
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md transition-colors ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
