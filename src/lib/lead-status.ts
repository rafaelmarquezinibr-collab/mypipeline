// Etapas de lead (as mesmas do HubSpot do Rafa) + descartado/convertido
export const LEAD_STATUS: Record<string, string> = {
  novo: 'Novo', tentativa: 'Tentativa de conexão', contato: 'Contato estabelecido',
  agendado: 'Visita/consulta agendada', realizado: 'Visita/consulta realizada',
  descartado: 'Descartado', convertido: 'Convertido',
}
