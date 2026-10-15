/** App mark + name. Matches public/favicon.svg. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
        <rect width="32" height="32" rx="8" className="fill-ink" />
        <path
          d="M10 8h9l4 4v12H10z"
          fill="none"
          className="stroke-onink"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M13.5 17h6M13.5 20.5h4"
          className="stroke-onink"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight">Invoices</span>
    </span>
  )
}
