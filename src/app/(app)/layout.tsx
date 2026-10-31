import { Suspense } from 'react'
import { Nav, NavLinks } from '@/components/Nav'
import { PushRegister } from '@/components/PushRegister'

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <Suspense fallback={<NavLinks path={null} />}><Nav /></Suspense>
      <PushRegister />
      <div className="md:pl-52">
        <main className="mx-auto max-w-6xl px-4 pt-5 pb-24 md:px-8 md:pb-10">{children}</main>
      </div>
    </>
  )
}
