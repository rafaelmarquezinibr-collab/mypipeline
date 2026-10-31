'use client'

import { useState } from 'react'
import { Modal } from './Modal'
import { LeadForm } from './Forms'

export function NewLeadButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>+ Lead</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo lead"><LeadForm onDone={() => setOpen(false)} /></Modal>
    </>
  )
}
