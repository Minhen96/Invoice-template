export type CodePurpose = 'verify' | 'reset'

const COPY: Record<CodePurpose, { subject: string; lead: string }> = {
  verify: {
    subject: 'Your sign-up code',
    lead: 'Use this code to confirm your email address:',
  },
  reset: {
    subject: 'Your password reset code',
    lead: 'Use this code to choose a new password:',
  },
}

/** Plain, single-purpose email. The code is digits only, so it needs no HTML escaping. */
export function renderCodeEmail(
  purpose: CodePurpose,
  code: string,
): { subject: string; text: string; html: string } {
  if (!/^\d{6}$/.test(code)) throw new Error('Code must be 6 digits')
  const { subject, lead } = COPY[purpose]
  const footer = "It expires in 15 minutes. If you didn't ask for it, you can ignore this email."
  return {
    subject,
    text: `${lead}\n\n${code}\n\n${footer}`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#18181b;max-width:420px">
<p>${lead}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:24px 0">${code}</p>
<p style="color:#52525b;font-size:13px">${footer}</p>
</div>`,
  }
}
