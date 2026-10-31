'use client'

import { useState, type ReactNode } from 'react'

/** Formulário de server action que mostra o erro e avisa quando terminou (para fechar modais). */
export function ActionForm({ action, onDone, children, className }: {
  action: (fd: FormData) => Promise<void>; onDone?: () => void; children: ReactNode; className?: string
}) {
  const [error, setError] = useState<string | null>(null)
  return (
    <form className={className} action={async (fd) => {
      setError(null)
      try {
        await action(fd)
        onDone?.()
      } catch (e) {
        // erros de redirect() precisam seguir adiante
        if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
        setError((e as Error).message || 'Não foi possível salvar')
      }
    }}>
      {children}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}
