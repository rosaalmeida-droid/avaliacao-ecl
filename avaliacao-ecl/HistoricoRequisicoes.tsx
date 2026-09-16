// ============================================================
// Histórico de requisições e orçamentos.
//
// Não havia nenhum: o professor fazia uma requisição, ela ia para o
// Google Sheets, e desaparecia da aplicação. Para a ver tinha de abrir
// a folha de cálculo.
//
// Cada documento tem o seu número — R01, O01 — ou, quando pertence a um
// plano de aula, identifica-se por esse plano.
// ============================================================

import React, { useState } from 'react';
import { historicoDocumentos, rotuloDocumento, getPlanosAula } from '../backend';

const C = {
  cobre: '#B5651D', cobreSuave: '#FDF0E8',
  verde: '#3E7A31', verdeSuave: '#E8F3E5',
  tinta: '#1A1A1A', suave: '#777777', border: '#E4E1E8',
};

function euros(v: number | undefined): string {
  if (!v && v !== 0) return '—';
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function dataCurta(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function HistoricoRequisicoes({
  turmaId, onAbrir,
}: {
  turmaId: string;
  /** Reabre o documento para consulta ou alteração. */
  onAbrir?: (reqId: string, planoAulaId?: string) => void;
}) {
  const [filtro, setFiltro] = useState<'todos' | 'requisicoes' | 'orcamentos'>('todos');
  const [busca, setBusca] = useState('');

  const todos = historicoDocumentos(turmaId);

  const visiveis = todos.filter(r => {
    if (filtro === 'orcamentos' && !r.ehOrcamento) return false;
    if (filtro === 'requisicoes' && r.ehOrcamento) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const texto = [
        r.numero, r.titulo, rotuloDocumento(r),
        ...(r.linhas || []).map((l: any) => l.produto),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const totalGasto = visiveis.reduce((s, r) => s + (r.custoTotal || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
        {([
          ['todos', `Tudo (${todos.length})`],
          ['requisicoes', `Requisições (${todos.filter(r => !r.ehOrcamento).length})`],
          ['orcamentos', `Orçamentos (${todos.filter(r => r.ehOrcamento).length})`],
        ] as ['todos' | 'requisicoes' | 'orcamentos', string][]).map(([id, lbl]) => (
          <button key={id} onClick={() => setFiltro(id)} style={{
            padding: '9px 15px', borderRadius: 10, fontSize: 13.5,
            fontWeight: filtro === id ? 700 : 500, cursor: 'pointer',
            fontFamily: 'inherit',
            border: `1.5px solid ${filtro === id ? C.cobre : C.border}`,
            background: filtro === id ? C.cobreSuave : '#fff',
            color: filtro === id ? C.cobre : C.suave,
          }}>{lbl}</button>
        ))}
      </div>

      <input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Procurar por número, nome ou ingrediente..."
        style={{ width: '100%', padding: '11px 13px', borderRadius: 10,
          border: `1px solid ${C.border}`, fontSize: 14.5, marginBottom: 12,
          fontFamily: 'inherit' }} />

      {visiveis.length > 0 && (
        <div style={{ background: C.cobreSuave, borderRadius: 10, padding: '11px 14px',
          marginBottom: 12, fontSize: 14, color: C.cobre, fontWeight: 600 }}>
          {visiveis.length} documento{visiveis.length > 1 ? 's' : ''} · {euros(totalGasto)} ao todo
        </div>
      )}

      {visiveis.length === 0 && (
        <div style={{ padding: 28, textAlign: 'center', color: C.suave, fontSize: 14.5,
          lineHeight: 1.55 }}>
          {busca.trim()
            ? `Nada encontrado para "${busca}".`
            : filtro === 'orcamentos'
              ? 'Ainda não há orçamentos. Cria o primeiro em Orçamentos.'
              : 'Ainda não há requisições guardadas.'}
        </div>
      )}

      {visiveis.map(r => {
        const plano = r.planoAulaId
          ? getPlanosAula().find(p => p.id === r.planoAulaId)
          : undefined;

        return (
          <div key={r.id} style={{
            background: '#fff', borderRadius: 12, padding: '13px 15px', marginBottom: 8,
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            {/* O número, em destaque — é por ele que o documento se identifica */}
            <span style={{
              fontSize: 14, fontWeight: 700, padding: '6px 11px', borderRadius: 9,
              flexShrink: 0, whiteSpace: 'nowrap',
              background: r.ehOrcamento ? C.cobreSuave : C.verdeSuave,
              color: r.ehOrcamento ? C.cobre : C.verde,
            }}>
              {rotuloDocumento(r)}
            </span>

            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: C.tinta }}>
                {r.titulo || plano?.titulo || (r.ehOrcamento ? 'Orçamento' : 'Requisição')}
              </div>
              <div style={{ fontSize: 13, color: C.suave, marginTop: 2 }}>
                {dataCurta(r.criadaEm)}
                {' · '}{(r.linhas || []).length} ingredientes
                {r.fichasIds?.length ? ` · ${r.fichasIds.length} ficha${r.fichasIds.length > 1 ? 's' : ''}` : ''}
              </div>
            </div>

            <span style={{ fontSize: 15, fontWeight: 700, color: C.tinta, flexShrink: 0 }}>
              {euros(r.custoTotal)}
            </span>

            {onAbrir && (
              <button onClick={() => onAbrir(r.id, r.planoAulaId || undefined)}
                style={{ padding: '8px 14px', borderRadius: 9, flexShrink: 0,
                  border: `1px solid ${C.cobre}`, background: '#fff', color: C.cobre,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Abrir
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
