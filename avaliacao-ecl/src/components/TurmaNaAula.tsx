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
  getPlanosAula, getPresencas, blocosDeHoraDoPlano,
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
  // Alunos com a escolha das horas aberta, e os que entraram a horas mas
  // o professor quer marcar (saiu mais cedo).
  const [horasAbertas, setHorasAbertas] = useState<Set<string>>(new Set());
  const [marcarAberto, setMarcarAberto] = useState<Set<string>>(new Set());
  const plano = getPlanosAula().find(p => p.id === planoAulaId);
  const blocos = plano ? blocosDeHoraDoPlano(plano) : [];
  const presencas = getPresencas().filter(p => p.planoAulaId === planoAulaId);
  const horasDe = (alunoId: string): string[] =>
    ((presencas.find(p => p.alunoId === alunoId) as any)?.horasPresentes) || [];
  const alternarSet = (set: Set<string>, id: string) => { const t = new Set(set); t.has(id) ? t.delete(id) : t.add(id); return t; };
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

                {/* A farda só se sabe de quem entrou pela aplicação. */}
                {e.entrou && !!e.horaEntrada && !e.fardamentoOk && (
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
              {/* Quem entrou a horas não precisa de decisão — mas pode ter
                  saído mais cedo. Um toque abre as mesmas opções. */}
              {e.entrou && !e.foraDeTempo && !e.decisaoFalta && !marcarAberto.has(e.alunoId) && (
                <button onClick={() => setMarcarAberto(s => alternarSet(s, e.alunoId))}
                  style={{ marginTop: 8, background: 'none', border: 'none', padding: 0,
                    color: C.suave, fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Saiu mais cedo? Marcar as horas
                </button>
              )}

              {(e.foraDeTempo || !e.entrou || e.decisaoFalta || marcarAberto.has(e.alunoId)) && (() => {
                const escolhidas = horasDe(e.alunoId);
                const verHoras = e.decisaoFalta === 'parcial' || horasAbertas.has(e.alunoId);
                const cor = (d: DecisaoFalta) => d === 'sem_falta' ? C.verde : d === 'falta_presenca' ? '#C0392B' : C.cobre;
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5, marginTop: 9 }}>
                      {(['sem_falta', 'falta_atraso', 'falta_presenca', 'parcial'] as DecisaoFalta[]).map(d => {
                        const activo = e.decisaoFalta === d || (d === 'parcial' && verHoras);
                        return (
                          <button key={d}
                            onClick={() => {
                              if (d === 'parcial') {
                                // Abre as horas; a decisão fica quando se escolhe a primeira.
                                setHorasAbertas(s => new Set(s).add(e.alunoId));
                                if (e.decisaoFalta !== 'parcial')
                                  decidirFalta(e.alunoId, planoAulaId, 'parcial', nomeProfessor || 'professor', undefined, escolhidas);
                              } else {
                                setHorasAbertas(s => { const t = new Set(s); t.delete(e.alunoId); return t; });
                                decidirFalta(e.alunoId, planoAulaId, d, nomeProfessor || 'professor');
                              }
                              redesenhar(n => n + 1);
                              onAtualizar?.();
                            }}
                            aria-pressed={activo}
                            style={{
                              padding: '9px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit',
                              border: `1px solid ${activo ? 'transparent' : C.border}`,
                              background: activo ? cor(d) : '#fff',
                              color: activo ? '#fff' : cor(d),
                            }}>
                            {activo ? '✓ ' : ''}{LABEL_DECISAO[d]}
                          </button>
                        );
                      })}
                    </div>
                    {verHoras && (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: '#FAFAF7', borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 12.5, color: C.suave, marginBottom: 6 }}>
                          Toca nas horas em que o aluno <b>esteve</b>. As outras contam como falta.
                        </div>
                        {blocos.length === 0 ? (
                          <div style={{ fontSize: 12.5, color: '#C0392B' }}>O plano não tem hora de início e de fim.</div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {blocos.map(bl => {
                              const esteve = escolhidas.includes(bl.inicio);
                              return (
                                <button key={bl.inicio}
                                  onClick={() => {
                                    const novas = esteve ? escolhidas.filter(x => x !== bl.inicio) : [...escolhidas, bl.inicio].sort();
                                    decidirFalta(e.alunoId, planoAulaId, 'parcial', nomeProfessor || 'professor', undefined, novas);
                                    redesenhar(n => n + 1);
                                    onAtualizar?.();
                                  }}
                                  aria-pressed={esteve}
                                  style={{
                                    padding: '7px 10px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    border: `1px solid ${esteve ? C.verde : C.border}`,
                                    background: esteve ? C.verde : '#fff', color: esteve ? '#fff' : C.tinta,
                                  }}>
                                  {esteve ? '✓ ' : ''}{bl.inicio}–{bl.fim}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {blocos.length > 0 && (
                          <div style={{ fontSize: 12, color: C.suave, marginTop: 6 }}>
                            Esteve {escolhidas.length} de {blocos.length} {blocos.length === 1 ? 'hora' : 'horas'}.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
