/**
 * Shared UI components for Siddhi
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { RATING_LABELS } from '../../lib/utils';

// --- Button ---
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-burnt-amber text-white hover:bg-opacity-90 border-transparent',
  secondary:
    'bg-pale-sage text-ink-black hover:bg-opacity-80 border-transparent',
  outline:
    'bg-transparent text-deep-violet border border-deep-violet hover:bg-pale-sage',
  ghost:
    'bg-transparent text-slate-gray hover:text-ink-black hover:bg-bone border-transparent',
  danger:
    'bg-burgundy text-white hover:bg-opacity-90 border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-full font-medium
        transition-colors duration-150 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-burnt-amber focus-visible:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// --- Card ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function Card({ children, className = '', as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={`bg-white border border-bone rounded-lg p-6 ${className}`}>
      {children}
    </Tag>
  );
}

// --- StatusBadge ---
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-pale-sage text-ink-black',
  approved: 'bg-pale-sage text-ink-black',
  draft: 'bg-bone text-slate-gray',
  in_review: 'bg-lavender-mist text-deep-violet',
  archived: 'bg-bone text-mist-gray',
  not_started: 'bg-bone text-slate-gray',
  in_progress: 'bg-lavender-mist text-deep-violet',
  achieved: 'bg-pale-sage text-ink-black',
  not_achieved: 'bg-dusty-rose text-ink-black',
  on_hold: 'bg-bone text-mist-gray',
  scheduled: 'bg-lavender-mist text-deep-violet',
  revision_required: 'bg-dusty-rose text-ink-black',
  pending: 'bg-lavender-mist text-deep-violet',
  rejected: 'bg-dusty-rose text-ink-black',
  acknowledged: 'bg-pale-sage text-ink-black',
  present: 'bg-pale-sage text-ink-black',
  absent: 'bg-dusty-rose text-ink-black',
  leave: 'bg-lavender-mist text-deep-violet',
  other: 'bg-bone text-slate-gray',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'bg-bone text-slate-gray';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}
    >
      {label}
    </span>
  );
}

// --- EmptyState ---
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-lg font-medium text-slate-gray mb-1">{title}</p>
      {description && (
        <p className="text-sm text-mist-gray max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

// --- LoadingState ---
export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="animate-spin text-burnt-amber mr-2" aria-hidden="true" />
      <span className="text-sm text-slate-gray">{message}</span>
    </div>
  );
}

// --- ErrorState ---
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-burgundy mb-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// --- PageHeader ---
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-medium text-ink-black tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-gray mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// --- DataTable ---
interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, keyExtractor, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-bone">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bone bg-bone/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase tracking-wide ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={`border-b border-bone last:border-0 hover:bg-bone/30 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-ink-black ${col.className || ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Modal / Dialog ---
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-bone">
          <h2 id="modal-title" className="text-lg font-medium text-ink-black">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-gray hover:text-ink-black transition-colors"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-bone">{footer}</div>
        )}
      </div>
    </div>
  );
}

// --- Form Field ---
interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-gray">
        {label}
        {required && <span className="text-burgundy ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-mist-gray">{hint}</p>}
      {error && (
        <p className="text-xs text-burgundy" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className = '',
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-ink-black
        placeholder:text-mist-gray focus:outline-none focus:ring-2 focus:ring-burnt-amber/50
        ${error ? 'border-burgundy' : 'border-bone'} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = '',
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-ink-black
        placeholder:text-mist-gray focus:outline-none focus:ring-2 focus:ring-burnt-amber/50
        resize-y min-h-20
        ${error ? 'border-burgundy' : 'border-bone'} ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = '',
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-ink-black
        focus:outline-none focus:ring-2 focus:ring-burnt-amber/50
        ${error ? 'border-burgundy' : 'border-bone'} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// --- RatingScale ---
export function RatingScale() {
  return (
    <div className="rounded-lg border border-bone p-3 bg-bone/30">
      <p className="text-xs font-medium text-slate-gray mb-2 uppercase tracking-wide">Performance Scale</p>
      <div className="space-y-1">
        {Object.entries(RATING_LABELS).map(([val, label]) => (
          <div key={val} className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-burnt-amber text-white flex items-center justify-center font-medium flex-shrink-0 text-xs">
              {val}
            </span>
            <span className="text-slate-gray">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Avatar ---
export function Avatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' };
  const cls = sizeMap[size];
  const ini = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${cls} rounded-full object-cover border-2 border-white`}
      />
    );
  }

  return (
    <div
      className={`${cls} rounded-full bg-lavender-mist flex items-center justify-center font-medium text-deep-violet border-2 border-white flex-shrink-0`}
      aria-label={name}
    >
      {ini}
    </div>
  );
}

// --- ConfirmDialog ---
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-gray">{message}</p>
    </Modal>
  );
}
