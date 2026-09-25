// ============================================================
// Vista de turma durante a aula — para o professor.
//
// Num ecrã: quem entrou, quem tem a farda em falta, quem fez os
// registos, quem já se avaliou. Antes o professor tinha de abrir aluno
// a aluno para saber isto.
//
// Uma linha por aluno, com o que interessa numa aula a decorrer. As
// decisões de falta fazem-se daqui, sem sair do ecrã.
// ============================================================

import React, { useState } from 'react';
import {
  estadoDaTurmaNaAula, resumoDaTurmaNaAula, decidirFalta,
  LABEL_DECISAO, type DecisaoFalta, type EstadoAlunoNaAula,
} from '../backend';

const C = {
  bordeaux: '#7B2233', bordeauxSuave: '#F6ECEE',
  verde: '#3E7A31', verdeSuave: '#E8F3E5',
  cobre: '#B5651D', cobreSuave: '#FDF0E8',
  tinta: '#1A1A1A', suave: '#777777',
  border: '#E4E1E8',
};

function Pastilha({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      background: fundo, color: cor, whiteSpace: 'nowrap',
    }}>{texto}</span>
  );
}

export function TurmaNaAula({
  planoAulaId, turmaId, nomeProfessor, onAtualizar, onValidar,
}: {
  planoAulaId: string;
  turmaId: string;
  nomeProfessor?: string;
  onAtualizar?: () => void;
  /** Abre a validação deste aluno, sem sair do plano. */
  onValidar?: (alunoId: string) => void;
}) {
  // O ecrã redesenha-se sozinho depois de cada decisão.
  const [, redesenhar] = useState(0);
  const estados = estadoDaTurmaNaAula(planoAulaId, turmaId);
  const r = resumoDaTurmaNaAula(estados);

  if (estados.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: C.suave, fontSize: 14.5 }}>
        Ainda não há alunos nesta turma.
      </div>
    );
  }

  const resumo = (n: number, total: number, label: string, cor: string) => (
    <div style={{ flex: '1 1 90px', textAlign: 'center', padding: '10px 6px',
      background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: n > 0 ? cor : C.suave, lineHeight: 1 }}>
        {n}{total ? <span style={{ fontSize: 13, color: C.suave, fontWeight: 400 }}>/{total}</span> : null}
      </div>
      <div style={{ fontSize: 11.5, color: C.suave, marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div>
      {/* Resumo — o estado da aula num relance */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
        {resumo(r.entraram, r.total, 'entraram', C.verde)}
        {resumo(r.foraDeTempo, 0, 'por decidir', C.cobre)}
        {resumo(r.semFarda, 0, 'sem farda', C.cobre)}
        {resumo(r.porAvaliar, 0, 'por avaliar', C.bordeaux)}
        {resumo(r.porValidar, 0, 'por validar', C.bordeaux)}
      </div>

      {estados.map(e => (
        <div key={e.alunoId} style={{
          background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          border: `1px solid ${e.entrou ? C.border : 'rgba(192,57,43,0.25)'}`,
          opacity: e.entrou ? 1 : 0.7,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: e.entrou ? C.verdeSuave : '#F5F5F5',
              color: e.entrou ? C.verde : C.suave,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
            }}>{e.numero}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.tinta }}>{e.nome}</span>
                {e.ehLider && <Pastilha texto="líder KF" cor="#0e7490" fundo="rgba(14,116,144,0.1)" />}
              </div>

              {/* Estado, por ordem de importância para quem está a dar aula */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {!e.entrou && <Pastilha texto="não entrou" cor="#C0392B" fundo="#FDF0EF" />}

                {e.entrou && e.foraDeTempo && !e.decisaoFalta && (
                  <Pastilha texto={`+${e.minutosAposAbertura} min · por decidir`}
                    cor={C.cobre} fundo={C.cobreSuave} />
                )}
                {e.decisaoFalta && (
                  <Pastilha texto={LABEL_DECISAO[e.decisaoFalta as DecisaoFalta] || e.decisaoFalta}
                    cor={e.decisaoFalta === 'sem_falta' ? C.verde : C.cobre}
                    fundo={e.decisaoFalta === 'sem_falta' ? C.verdeSuave : C.cobreSuave} />
                )}
                {e.entrou && !e.foraDeTempo && !e.decisaoFalta && e.horaEntrada && (
                  <Pastilha texto={`entrou ${e.horaEntrada}`} cor={C.verde} fundo={C.verdeSuave} />
                )}

                {e.entrou && !e.fardamentoOk && (
                  <Pastilha texto={e.itensEmFalta ? `falta: ${e.itensEmFalta}` : 'farda incompleta'}
                    cor={C.cobre} fundo={C.cobreSuave} />
                )}

                {e.entrou && e.kfInicial && !e.kfFinal && (
                  <Pastilha texto="KF por fechar" cor={C.suave} fundo="#F5F5F5" />
                )}
                {e.kfFinal && <Pastilha texto="KF feito" cor={C.verde} fundo={C.verdeSuave} />}

                {e.validado
                  ? <Pastilha texto="validado" cor={C.verde} fundo={C.verdeSuave} />
                  : e.autoavaliou
                    ? <Pastilha texto="por validar" cor={C.bordeaux} fundo={C.bordeauxSuave} />
                    : e.entrou && <Pastilha texto="não se avaliou" cor={C.suave} fundo="#F5F5F5" />}
              </div>

              {/* Validar dali, sem ter de ir ao menu procurar. */}
              {e.autoavaliou && onValidar && (
                <button onClick={() => onValidar(e.alunoId)} style={{
                  marginTop: 9, padding: '9px 16px', borderRadius: 9,
                  border: e.validado ? `1px solid ${C.border}` : 'none',
                  background: e.validado ? '#fff' : C.bordeaux,
                  color: e.validado ? C.suave : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {e.validado ? 'Rever avaliação' : 'Validar agora'}
                </button>
              )}

              {/* A decisão da falta faz-se daqui, sem sair do ecrã */}
              {/* Quem entrou fora de tempo, e quem não entrou: o professor
                  decide. Também se muda uma decisão já tomada. */}
              {(e.foraDeTempo || !e.entrou || e.decisaoFalta) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 5, marginTop: 9 }}>
                  {(['sem_falta', 'falta_atraso', 'falta_presenca'] as DecisaoFalta[]).map(d => (
                    <button key={d}
                      onClick={() => {
                        decidirFalta(e.alunoId, planoAulaId, d, nomeProfessor || 'professor');
                        redesenhar(n => n + 1);
                        onAtualizar?.();
                      }}
                      aria-pressed={e.decisaoFalta === d}
                      style={{
                        padding: '8px 4px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        border: `1px solid ${e.decisaoFalta === d ? 'transparent' : C.border}`,
                        background: e.decisaoFalta === d
                          ? (d === 'sem_falta' ? C.verde : d === 'falta_atraso' ? C.cobre : '#C0392B')
                          : '#fff',
                        color: e.decisaoFalta === d ? '#fff'
                          : d === 'sem_falta' ? C.verde : d === 'falta_atraso' ? C.cobre : '#C0392B',
                      }}>
                      {LABEL_DECISAO[d]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
