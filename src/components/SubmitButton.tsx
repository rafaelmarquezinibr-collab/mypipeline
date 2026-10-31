'use client'

import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'

export function SubmitButton({ children, className = 'btn-primary' }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className={className}>{pending ? 'Salvando…' : children}</button>
}
