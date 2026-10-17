import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'soft' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) => (
  <button
    {...props}
    className={clsx(
      'app-button',
      variant === 'primary' && 'bg-primary text-cream hover:bg-blue-700',
      variant === 'outline' && 'border border-slate-500/80 bg-cream text-ink hover:bg-sand',
      variant === 'soft' && 'bg-sand text-ink hover:bg-line',
      variant === 'ghost' && 'bg-transparent px-2 text-primary hover:bg-paleBlue',
      size === 'sm' && 'min-h-10 rounded-[10px] px-4 text-xs',
      size === 'lg' && 'min-h-14 px-7 text-base',
      className,
    )}
  >
    {children}
  </button>
);

export const Card = ({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) => (
  <Tag className={clsx('app-card', className)}>{children}</Tag>
);

export const Breadcrumb = ({ current }: { current: string }) => (
  <div className="mb-8 flex items-center gap-2 text-xs font-medium text-textMuted" aria-label="Breadcrumb">
    <span>Workspace</span>
    <span aria-hidden="true">/</span>
    <span>{current}</span>
  </div>
);

export const PageHeader = ({
  current,
  title,
  description,
  actions,
}: {
  current: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <header className="mb-10">
    <Breadcrumb current={current} />
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-[38px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-textMuted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  </header>
);

export const Field = ({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: ReactNode }) => (
  <div className={clsx('space-y-2', className)}>
    <label className="block text-sm font-bold text-ink">{label}</label>
    {children}
    {error ? <p className="text-xs leading-5 text-danger">{error}</p> : hint ? <p className="text-xs leading-5 text-textMuted">{hint}</p> : null}
  </div>
);

export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={clsx('app-input', props.className)} />
);

export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select {...props} className={clsx('app-input appearance-none pr-10', className)}>{children}</select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
  </div>
);

export const StatusBadge = ({ status }: { status: string }) => {
  const normalized = status.toUpperCase();
  return (
    <span className={clsx(
      'inline-flex rounded-lg px-3 py-1.5 text-xs font-bold',
      normalized === 'ACTIVE' && 'bg-paleGreen text-success',
      normalized === 'EXPIRED' && 'bg-paleOrange text-danger',
      normalized === 'DISABLED' && 'bg-sand text-textMuted',
      normalized === 'UPCOMING' && 'bg-paleBlue text-primary',
      normalized === 'ENDED' && 'bg-sand text-textMuted',
      normalized === 'ARCHIVED' && 'bg-sand text-textMuted',
    )}>{normalized.charAt(0) + normalized.slice(1).toLowerCase()}</span>
  );
};

export const StatCard = ({ label, value, delta, helper, highlight = false }: { label: string; value: ReactNode; delta?: string; helper?: string; highlight?: boolean }) => (
  <Card className={clsx('min-h-[138px] p-5 sm:p-6', highlight ? 'bg-paleBlue' : 'bg-cream')}>
    <div className="text-sm text-textMuted">{label}</div>
    <div className={clsx('mt-4 truncate text-[28px] font-extrabold leading-none', highlight ? 'text-primary' : 'text-ink')}>{value}</div>
    {delta && <div className="mt-3 text-xs font-bold text-success">{delta}</div>}
    {helper && <div className="mt-1 text-xs text-textMuted">{helper}</div>}
  </Card>
);

export const EmptyState = ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
  <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-paleBlue text-primary">
      <ArrowRight className="h-6 w-6 -rotate-45" aria-hidden="true" />
    </div>
    <h2 className="text-2xl font-extrabold">{title}</h2>
    <p className="mt-3 max-w-md text-sm leading-6 text-textMuted">{description}</p>
    {action && <div className="mt-7">{action}</div>}
  </div>
);

export const SuccessIcon = () => (
  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paleGreen text-success">
    <Check className="h-6 w-6" aria-hidden="true" />
  </span>
);
