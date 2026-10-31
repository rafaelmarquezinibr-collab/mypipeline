// O app roda no fuso de Brasília (sem horário de verão desde 2019, UTC-3 fixo).
export const TZ = 'America/Sao_Paulo'
const OFFSET = '-03:00'

/** Converte o valor de um <input type="datetime-local"> (hora de Brasília) em Date. */
export function fromLocalInput(value: string) {
  return new Date(`${value.length === 16 ? value + ':00' : value}${OFFSET}`)
}

/** Formata uma Date para <input type="datetime-local"> em hora de Brasília. */
export function toLocalInput(d: Date) {
  const local = new Date(d.getTime() - 3 * 3600_000)
  return local.toISOString().slice(0, 16)
}

export function fmtDateTime(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

export function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

export function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export function daysSince(d: Date | string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}

/** Início do dia de hoje em Brasília, como Date (UTC). */
export function startOfTodayBR() {
  const nowBR = new Date(Date.now() - 3 * 3600_000)
  nowBR.setUTCHours(0, 0, 0, 0)
  return new Date(nowBR.getTime() + 3 * 3600_000)
}
