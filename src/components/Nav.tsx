'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Hoje', icon: '☀️' },
  { href: '/pipeline', label: 'Pipeline', icon: '📊' },
  { href: '/leads', label: 'Leads', icon: '👤' },
  { href: '/dashboard', label: 'Dashboard', icon: '📈' },
  { href: '/config', label: 'Ajustes', icon: '⚙️' },
]

export function Nav() {
  return <NavLinks path={usePathname()} />
}

/** Sem path (antes de saber a rota) renderiza o menu sem item ativo. */
export function NavLinks({ path }: { path: string | null }) {
  const active = (href: string) => path !== null && (href === '/' ? path === '/' : path.startsWith(href) || (href === '/pipeline' && path.startsWith('/negocios')))
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col border-r border-slate-200 bg-white p-3 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 pt-2">
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          <span className="font-semibold">Funil</span>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active(i.href) ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span>{i.icon}</span>{i.label}
            </Link>
          ))}
        </nav>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href}
            className={`flex flex-1 flex-col items-center py-2 text-[11px] ${active(i.href) ? 'text-indigo-700' : 'text-slate-500'}`}>
            <span className="text-lg leading-none">{i.icon}</span>{i.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
