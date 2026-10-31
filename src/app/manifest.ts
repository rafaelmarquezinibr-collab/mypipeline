import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Funil de Vendas',
    short_name: 'Funil',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    lang: 'pt-BR',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
