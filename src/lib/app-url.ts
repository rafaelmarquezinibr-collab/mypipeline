/** APP_URL sem barra no fim, para os links não saírem com "//". */
export const appUrl = () => (process.env.APP_URL ?? '').trim().replace(/\/+$/, '')
