import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

import { inputClass } from '@/components/ui/field'
import { cn } from '@/lib/cn'

interface ParsedInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  /** The stored value (e.g. sen). */
  value: number
  onValueChange: (value: number) => void
  /** Text → value, or null when the text isn't valid. */
  parse: (text: string) => number | null
  /** Value → text shown when not typing. */
  format: (value: number) => string
  invalidMessage?: string
}

/**
 * A text box for numbers (money, quantity, percent). People can type freely ("1,200", "0.5");
 * valid input updates the value as they type, invalid input is flagged and never saved, and the
 * text is tidied when they leave the box.
 */
export function ParsedInput({
  value,
  onValueChange,
  parse,
  format,
  invalidMessage = 'Enter a number',
  className,
  onBlur,
  ...props
}: ParsedInputProps) {
  const [text, setText] = useState(() => format(value))
  const [invalid, setInvalid] = useState(false)
  // The value this box last produced; a different incoming value came from elsewhere (reset,
  // reorder) and replaces the text.
  const produced = useRef(value)

  useEffect(() => {
    if (value !== produced.current) {
      produced.current = value
      setText(format(value))
      setInvalid(false)
    }
  }, [value, format])

  return (
    <input
      type="text"
      autoComplete="off"
      aria-invalid={invalid || undefined}
      title={invalid ? invalidMessage : undefined}
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        const parsed = parse(next)
        if (parsed === null) {
          setInvalid(true)
          return
        }
        setInvalid(false)
        produced.current = parsed
        onValueChange(parsed)
      }}
      onBlur={(e) => {
        if (!invalid) setText(format(value))
        onBlur?.(e)
      }}
      className={cn(inputClass, 'h-11 tabular', className)}
      {...props}
    />
  )
}
