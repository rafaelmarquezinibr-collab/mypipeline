'use client'

import { useEffect } from 'react'

/** Falha ao carregar dados (ex.: banco lento): mostra o erro e um botão para tentar de novo. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="card mx-auto mt-10 max-w-md space-y-3 p-6 text-center">
      <h1 className="h1">Não consegui carregar os dados</h1>
      <p className="text-sm text-slate-600">O banco demorou para responder. Tente de novo em alguns segundos.</p>
      <button className="btn-primary" onClick={() => retry()}>Tentar de novo</button>
    </div>
  )
}
