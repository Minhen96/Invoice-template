import {
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react'

import { cn } from '@/lib/cn'

export const inputClass =
  'w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-text placeholder:text-muted/70 transition-colors hover:border-line-strong focus:border-ink focus:outline-none aria-invalid:border-danger'

interface FieldShellProps {
  label: ReactNode
  hint?: ReactNode
  error?: string | undefined
  /** Optional element shown at the right of the label (e.g. "Forgot?"). */
  labelAside?: ReactNode
  className?: string
  id: string
  children: (aria: {
    id: string
    'aria-invalid': true | undefined
    'aria-describedby': string | undefined
  }) => ReactNode
}

/**
 * Label + control + hint/error. The hint and error are linked with aria-describedby and the
 * control is marked aria-invalid when there is an error (WCAG 3.3.1 / 4.1.2).
 */
function FieldShell({ label, hint, error, labelAside, className, id, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-muted">
          {label}
        </label>
        {labelAside}
      </div>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && !error ? (
        <span id={hintId} className="text-[13px] text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </span>
      ) : null}
    </div>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string | undefined
  labelAside?: ReactNode
  wrapperClassName?: string
  ref?: Ref<HTMLInputElement>
}

export function Field({
  label,
  hint,
  error,
  labelAside,
  wrapperClassName,
  id,
  className,
  ...props
}: FieldProps) {
  const autoId = useId()
  return (
    <FieldShell
      id={id ?? autoId}
      label={label}
      hint={hint}
      error={error}
      labelAside={labelAside}
      className={wrapperClassName}
    >
      {(aria) => <input {...aria} className={cn(inputClass, 'h-11', className)} {...props} />}
    </FieldShell>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string | undefined
  wrapperClassName?: string
  ref?: Ref<HTMLTextAreaElement>
}

export function TextAreaField({
  label,
  hint,
  error,
  wrapperClassName,
  id,
  className,
  rows = 3,
  ...props
}: TextAreaFieldProps) {
  const autoId = useId()
  return (
    <FieldShell
      id={id ?? autoId}
      label={label}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      {(aria) => (
        <textarea
          {...aria}
          rows={rows}
          className={cn(inputClass, 'resize-y py-2.5 leading-relaxed', className)}
          {...props}
        />
      )}
    </FieldShell>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string | undefined
  wrapperClassName?: string
  ref?: Ref<HTMLSelectElement>
}

export function SelectField({
  label,
  hint,
  error,
  wrapperClassName,
  id,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const autoId = useId()
  return (
    <FieldShell
      id={id ?? autoId}
      label={label}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      {(aria) => (
        <select {...aria} className={cn(inputClass, 'h-11 pr-8', className)} {...props}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}
