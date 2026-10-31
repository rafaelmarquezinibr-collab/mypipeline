import Link from 'next/link'
import { Suspense } from 'react'
import { getStages } from '@/lib/data'
import { HubspotImport } from '@/components/HubspotImport'
import { Loading } from '@/components/Loading'

export default function ImportPage() {
  return <Suspense fallback={<Loading />}><Import /></Suspense>
}

async function Import() {
  const stages = await getStages()
  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/config" className="text-sm text-slate-500 hover:text-slate-700">← Ajustes</Link>
      <h1 className="h1">Importar do HubSpot</h1>
      <p className="text-sm text-slate-600">
        No HubSpot, abra a lista de Negócios (ou Contatos), clique em Exportar e escolha CSV. Depois envie o arquivo aqui.
      </p>
      <HubspotImport stages={stages} />
    </div>
  )
}
