// ============================================================
// Histórico por unidade — vista do professor.
//
// O histórico era uma lista de planos sem agrupamento: o professor
// não via onde acabava uma unidade e começava outra, nem sabia quando
// uma tinha terminado sem estar avaliada.
//
// Passa a estar organizado por UC, com os planos dentro. A informação
// abre por camadas: primeiro o resumo, e o detalhe só se o professor
// carregar. Se tiver dúvidas, chega lá; se não tiver, não o atrapalha.
// ============================================================

import React, { useState } from 'react';
import {
  getPlanosAulaPorTurma, getSelecoes, getValidacoes,
  getFichasProducao, getAlunos,
} from '../backend';
import { getReferencialUC } from '../referencial811RA144';
import { modulosDaTurma } from '../cronograma';
import { fmtDataCurta } from '../datas';

const C = {
  fundo: '#F5F2F3', branco: '#FFFFFF',
  bordeaux: '#7B2233', bordeauxSuave: '#F6ECEE',
  tinta: '#1A1A1A', suave: '#777777',
  sage: '#3E7A31', sageSuave: '#E8F3E5',
  aviso: '#B5651D', avisoSuave: '#FDF0E8',
  border: '#E4E1E8',
  sombra: '0 1px 3px rgba(0,0,0,0.06)',
};

interface PlanoResumo {
  id: string;
  titulo: string;
  data: string;
  tipo: string;
  fichas: string[];
  totalAlunos: number;
  autoavaliados: number;
  validados: number;
}

interface UCResumo {
  ucId: string;
  ucNome: string;
  dataInicio?: string;
  dataFim?: string;
  terminada: boolean;
  planos: PlanoResumo[];
  porValidar: number;
}

function montar(turmaId: string): UCResumo[] {
  const planos = getPlanosAulaPorTurma(turmaId);
  const selecoes = getSelecoes().filter(s => s.turmaId === turmaId);
  const validacoes = getValidacoes();
  const fichas = getFichasProducao();
  const totalAlunos = getAlunos().filter(a => a.turmaId === turmaId && a.ativo !== false).length;
  const modulos = modulosDaTurma(turmaId);
  const hoje = new Date().toISOString().slice(0, 10);

  const porUC = new Map<string, PlanoResumo[]>();
  for (const p of planos) {
    const uc = (p as any).ucId || '(sem unidade)';
    const sels = selecoes.filter(s => s.planoAulaId === p.id);
    const vals = sels.filter(s => validacoes.some(v => (v as any).selecaoId === s.id));
    const resumo: PlanoResumo = {
      id: p.id,
      titulo: p.titulo || 'Aula',
      data: p.data,
      tipo: (p as any).tipoPlanAula || 'pratico',
      fichas: fichas.filter(f => p.fichasIds?.includes(f.id)).map(f => f.nomePrato),
      totalAlunos,
      autoavaliados: sels.length,
      validados: vals.length,
    };
    if (!porUC.has(uc)) porUC.set(uc, []);
    porUC.get(uc)!.push(resumo);
  }

  return [...porUC.entries()]
    .map(([ucId, ps]) => {
      const mod = modulos.find(m => m.id === ucId);
      const ref = getReferencialUC(ucId);
      const ordenados = [...ps].sort((a, b) => b.data.localeCompare(a.data));
      return {
        ucId,
        ucNome: ref?.nome || mod?.nome || '',
        dataInicio: mod?.dataInicio,
        dataFim: mod?.dataFim,
        terminada: !!mod?.dataFim && mod.dataFim < hoje,
        planos: ordenados,
        porValidar: ps.reduce((s, p) => s + (p.autoavaliados - p.validados), 0),
      };
    })
    .sort((a, b) => (b.planos[0]?.data || '').localeCompare(a.planos[0]?.data || ''));
}

const LABEL_TIPO: Record<string, string> = {
  pratico: 'Prática', misto: 'Mista', teorico: 'Teórica',
};

export function HistorialPorUC({ turmaId, onAbrirPlano, onValidar }: {
  turmaId: string;
  onAbrirPlano?: (planoId: string) => void;
  onValidar?: (planoId: string) => void;
}) {
  const ucs = montar(turmaId);
  const [aberta, setAberta] = useState<string | null>(
    // A primeira unidade que precise de atenção abre logo.
    ucs.find(u => u.terminada && u.porValidar > 0)?.ucId ?? ucs[0]?.ucId ?? null
  );

  if (ucs.length === 0) {
    return (
      <div style={{ background: C.branco, borderRadius: 16, boxShadow: C.sombra,
        padding: 30, textAlign: 'center', color: C.suave, fontSize: 15 }}>
        Ainda não há planos de aula nesta turma.
      </div>
    );
  }

  return (
    <div>
      {/* Unidades terminadas com avaliação por fechar — o professor tem
          de saber sem ter de procurar. */}
      {ucs.filter(u => u.terminada && u.porValidar > 0).map(u => (
        <div key={`av-${u.ucId}`} style={{
          background: C.avisoSuave, border: `1px solid ${C.aviso}`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: C.aviso }}>
            {u.ucId} terminou e ainda tem avaliação por fechar
          </div>
          <div style={{ fontSize: 14, color: C.aviso, marginTop: 4, lineHeight: 1.5 }}>
            {u.ucNome}<br />
            Acabou a {u.dataFim ? fmtDataCurta(u.dataFim) : '—'} ·{' '}
            {u.porValidar} autoavaliaç{u.porValidar === 1 ? 'ão' : 'ões'} por validar.
          </div>
          <button
            onClick={() => setAberta(u.ucId)}
            style={{ marginTop: 10, background: C.aviso, color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 16px', fontSize: 14.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Rever a avaliação desta unidade
          </button>
        </div>
      ))}

      {ucs.map(u => {
        const expandida = aberta === u.ucId;
        return (
          <div key={u.ucId} style={{
            background: C.branco, borderRadius: 16, boxShadow: C.sombra,
            marginBottom: 12, overflow: 'hidden',
          }}>
            <button
              onClick={() => setAberta(expandida ? null : u.ucId)}
              style={{
                width: '100%', textAlign: 'left', background: expandida ? C.bordeauxSuave : C.branco,
                border: 'none', padding: '15px 17px', cursor: 'pointer', fontFamily: 'inherit',
                borderLeft: `5px solid ${expandida ? C.bordeaux : 'transparent'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: C.bordeaux,
                  }}>
                    {u.ucId}
                  </div>
                  <div style={{ fontSize: 16.5, fontWeight: 700, color: C.tinta, marginTop: 3, lineHeight: 1.3 }}>
                    {u.ucNome || '(sem nome no referencial)'}
                  </div>
                  <div style={{ fontSize: 13.5, color: C.suave, marginTop: 5 }}>
                    {u.planos.length} aula{u.planos.length === 1 ? '' : 's'}
                    {u.dataInicio && u.dataFim && ` · ${fmtDataCurta(u.dataInicio)} a ${fmtDataCurta(u.dataFim)}`}
                    {u.terminada && ' · terminada'}
                  </div>
                </div>
                <span style={{
                  fontSize: 12.5, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  whiteSpace: 'nowrap',
                  background: u.porValidar > 0 ? C.avisoSuave : C.sageSuave,
                  color: u.porValidar > 0 ? C.aviso : C.sage,
                }}>
                  {u.porValidar > 0 ? `${u.porValidar} por validar` : 'tudo validado'}
                </span>
              </div>
            </button>

            {expandida && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {u.planos.map(p => (
                  <div key={p.id} style={{ padding: '13px 17px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.tinta }}>
                          {p.titulo}
                        </div>
                        <div style={{ fontSize: 13, color: C.suave, marginTop: 2 }}>
                          {fmtDataCurta(p.data)} · {LABEL_TIPO[p.tipo] || p.tipo}
                        </div>
                        {/* O que foi trabalhado — em resumo, não em detalhe */}
                        {p.fichas.length > 0 && (
                          <div style={{ fontSize: 13.5, color: C.tinta, marginTop: 5, lineHeight: 1.5 }}>
                            {p.fichas.join(' · ')}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: C.suave, marginTop: 5 }}>
                          {p.autoavaliados} de {p.totalAlunos} alunos autoavaliaram
                          {p.autoavaliados > 0 && ` · ${p.validados} validados`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {onAbrirPlano && (
                          <button onClick={() => onAbrirPlano(p.id)} style={{
                            background: 'transparent', border: `1px solid ${C.border}`,
                            borderRadius: 9, padding: '7px 12px', fontSize: 13,
                            color: C.tinta, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                          }}>
                            Ver plano
                          </button>
                        )}
                        {onValidar && p.autoavaliados > p.validados && (
                          <button onClick={() => onValidar(p.id)} style={{
                            background: C.bordeaux, border: 'none', borderRadius: 9,
                            padding: '7px 12px', fontSize: 13, fontWeight: 700,
                            color: '#fff', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                          }}>
                            Validar {p.autoavaliados - p.validados}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
