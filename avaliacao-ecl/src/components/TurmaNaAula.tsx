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

import React, { useEffect, useState } from 'react';
import {
  estadoDaTurmaNaAula, resumoDaTurmaNaAula, decidirFalta, confirmarPresencasDaAula, marcarJustificacaoOficial,
  LABEL_DECISAO, type DecisaoFalta, type EstadoAlunoNaAula,
  getPlanosAula, getPresencas, blocosDeHoraDoPlano, colegasPorAvaliar, sincronizarGrupos, decidirFardaNaPresenca,
  recuperacaoDaAula, notaDaAulaRecuperada, recuperacaoEhAutomatica, pedirRecuperacaoDaAula, darNotaDaRecuperacaoDaAula,
  cancelarRecuperacaoDaAula, ultimaResposta,
} from '../backend';
import { janelaConfirmar } from './janelaConfirmar';
import { decisaoFardaNaAula, toleranciaNoPeriodo, diaMes } from '../regrasFarda';
import { pedeFardaEHigiene } from '../contextoAula';

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
  // A avaliação entre colegas é obrigatória (Rosa, 6/out/2026): o professor vê
  // quem ainda não a fez. Vão-se buscar as respostas dos colegas de 30 em 30 s.
  useEffect(() => {
    let vivo = true;
    const ver = () => sincronizarGrupos(turmaId, true).catch(() => {}).finally(() => { if (vivo) redesenhar(n => n + 1); });
    ver();
    const t = setInterval(ver, 30000);
    return () => { vivo = false; clearInterval(t); };
  }, [turmaId, planoAulaId]);
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
        {/* Na aula teórica não se pede farda nem higiene (auditoria 5/out/2026). */}
        {pedeFardaEHigiene(plano) && resumo(r.semFarda, 0, 'sem farda', C.cobre)}
        {resumo(r.porAvaliar, 0, 'por avaliar', C.bordeaux)}
        {resumo(r.porValidar, 0, 'autoavaliações por validar', C.bordeaux)}
      </div>

      {/* Fechar esta parte: confirma e volta a enviar todas as decisões. */}
      {(() => {
        const porDecidir = estados.filter(e => !e.decisaoFalta && (!e.entrou || e.foraDeTempo)).length;
        const conf = (plano as any)?.presencasConfirmadasEm as string | undefined;
        const hora = conf ? new Date(conf).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        return (
          <div style={{ background: conf && !porDecidir ? C.verdeSuave : '#fff', border: `1.5px solid ${conf && !porDecidir ? C.verde : C.border}`,
            borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.tinta }}>
              {porDecidir ? `Faltam decidir ${porDecidir} aluno${porDecidir > 1 ? 's' : ''} (não entrou ou chegou fora de tempo).`
                : conf ? `✓ Presenças confirmadas${(plano as any)?.presencasConfirmadasPor ? ` por ${(plano as any).presencasConfirmadasPor}` : ''} em ${hora}.`
                : 'Todas as faltas estão decididas. Confirme para ficarem guardadas.'}
            </div>
            <div style={{ fontSize: 12.5, color: C.suave, marginTop: 3 }}>
              Cada decisão fica guardada de imediato. O botão «Confirmar» volta a enviar todas as decisões para o Sheets e marca esta parte como concluída.
            </div>
            <button onClick={() => { confirmarPresencasDaAula(planoAulaId, nomeProfessor || 'professor'); redesenhar(n => n + 1); onAtualizar?.(); }}
              style={{ marginTop: 10, minHeight: 44, width: '100%', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 15, fontWeight: 700, background: C.verde, color: '#fff' }}>
              {conf ? 'Confirmar outra vez' : 'Confirmar as presenças'}
            </button>
          </div>
        );
      })()}

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
                {/* O líder faltou ou esteve só parte da aula: avisar para o substituir (auditoria 5/out/2026). */}
                {e.ehLider && (e.decisaoFalta === 'parcial' || e.decisaoFalta === 'falta_presenca' || (!e.entrou && !e.decisaoFalta)) && (
                  <Pastilha texto={e.decisaoFalta === 'parcial' ? 'líder só parte da aula: substituir?' : 'líder ausente: escolher substituto'}
                    cor={C.bordeaux} fundo={C.bordeauxSuave} />
                )}
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
                {/* Entrada registada depois da hora de fim da aula (auditoria 5/out/2026). */}
                {e.entrou && e.horaEntrada && (plano as any)?.horaFim
                  && String(e.horaEntrada).slice(0, 5) > String((plano as any).horaFim).slice(0, 5) && (
                  <Pastilha texto="entrou depois do fim da aula" cor={C.bordeaux} fundo={C.bordeauxSuave} />
                )}

                {/* A farda só se sabe de quem entrou pela aplicação. */}
                {pedeFardaEHigiene(plano) && e.entrou && !!e.horaEntrada && !e.fardamentoOk && (
                  <Pastilha texto={e.itensEmFalta ? `falta: ${e.itensEmFalta}` : 'farda incompleta'}
                    cor={C.cobre} fundo={C.cobreSuave} />
                )}

                {/* Mãos lavadas: o aluno confirma à entrada, depois dos passos. */}
                {e.entrou && !!e.horaEntrada && pedeFardaEHigiene(plano) && !String((plano as any)?.tipoPlanAula || '').startsWith('atitudinal') && (e.maosLavadas
                  ? <Pastilha texto={`mãos lavadas ${e.maosLavadas.replace(/^às /, '')}`} cor={C.verde} fundo={C.verdeSuave} />
                  : <Pastilha texto="mãos por lavar" cor={C.cobre} fundo={C.cobreSuave} />)}

                {e.entrou && e.kfInicial && !e.kfFinal && (
                  <Pastilha texto="KF por fechar" cor={C.suave} fundo="#F5F5F5" />
                )}
                {e.kfFinal && <Pastilha texto="KF feito" cor={C.verde} fundo={C.verdeSuave} />}

                {e.validado
                  ? <Pastilha texto="autoavaliação validada" cor={C.verde} fundo={C.verdeSuave} />
                  : e.autoavaliou
                    ? <Pastilha texto="autoavaliação por validar" cor={C.bordeaux} fundo={C.bordeauxSuave} />
                    : e.entrou && <Pastilha texto="ainda não se autoavaliou" cor={C.suave} fundo="#F5F5F5" />}
                {e.autoavaliou && colegasPorAvaliar(planoAulaId, e.alunoId).length > 0 && (
                  <Pastilha texto={`falta avaliar ${colegasPorAvaliar(planoAulaId, e.alunoId).length} colega${colegasPorAvaliar(planoAulaId, e.alunoId).length > 1 ? 's' : ''} do grupo`}
                    cor={C.cobre} fundo={C.cobreSuave} />
                )}
              </div>

              {/* Sem farda completa: o professor decide já (Rosa, 7/out/2026). Uma
                  tolerância por período; sem ela, o aluno não faz prática e
                  autoavalia-se só nos conhecimentos. */}
              {pedeFardaEHigiene(plano) && e.entrou && !!e.horaEntrada && !e.fardamentoOk && (() => {
                const { decisao, automatica } = decisaoFardaNaAula(e.alunoId, planoAulaId);
                const usada = toleranciaNoPeriodo(e.alunoId, String(plano?.data || ''), planoAulaId);
                const decidir = (d: 'tolerancia' | 'sem_pratica' | null) => { decidirFardaNaPresenca(e.alunoId, planoAulaId, d, nomeProfessor); redesenhar(n => n + 1); onAtualizar?.(); };
                const bt = (ativo: boolean, cor: string): React.CSSProperties => ({ padding: '7px 12px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', border: `1.5px solid ${cor}`, background: ativo ? cor : '#fff', color: ativo ? '#fff' : cor });
                return (
                  <div style={{ marginTop: 9, padding: '9px 11px', borderRadius: 10, background: C.cobreSuave, fontSize: 13, lineHeight: 1.45 }}>
                    <b>Sem farda completa.</b>{' '}
                    {decisao === 'tolerancia' ? 'Tolerância dada: faz a aula e as técnicas contam (a única deste período).'
                      : decisao === 'sem_pratica' ? (automatica ? `Já usou a tolerância deste período (${diaMes(usada!.data)}): hoje não faz prática.` : 'Hoje não faz prática.') + ' Autoavalia-se só nos conhecimentos.'
                      : usada ? `Já usou a tolerância deste período (${diaMes(usada.data)}).` : 'Ainda tem a tolerância deste período.'}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {!usada && <button onClick={() => decidir(decisao === 'tolerancia' ? null : 'tolerancia')} style={bt(decisao === 'tolerancia', C.verde)}>
                        {decisao === 'tolerancia' ? '✓ ' : ''}Dar tolerância (a única do período)</button>}
                      <button onClick={() => decidir(decisao === 'sem_pratica' && !automatica ? null : 'sem_pratica')} style={bt(decisao === 'sem_pratica', C.bordeaux)}>
                        {decisao === 'sem_pratica' ? '✓ ' : ''}Não faz prática hoje</button>
                    </div>
                  </div>
                );
              })()}

              {/* Validar dali, sem ter de ir ao menu procurar. */}
              {e.autoavaliou && onValidar && (
                <button onClick={() => onValidar(e.alunoId)} style={{
                  marginTop: 9, padding: '9px 16px', borderRadius: 9,
                  border: e.validado ? `1px solid ${C.border}` : 'none',
                  background: e.validado ? '#fff' : C.bordeaux,
                  color: e.validado ? C.suave : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {/* «Validar agora» confundia-se com validar a presença (Rosa, 6/out/2026). */}
                  {e.validado ? 'Rever a autoavaliação' : 'Validar a autoavaliação'}
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
                    {e.decisaoFalta && e.decididoEm && (
                      <div style={{ fontSize: 12, color: C.verde, marginTop: 5, fontWeight: 600 }}>
                        ✓ Gravado às {new Date(e.decididoEm).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {/* (Rosa, 12/out/2026) Só um registo: a falta conta na mesma e a aula fica sem avaliação. */}
                    {(e.decisaoFalta === 'falta_presenca' || e.decisaoFalta === 'parcial') && (
                      <button
                        onClick={() => {
                          marcarJustificacaoOficial(e.alunoId, planoAulaId, !e.justificacaoOficial, nomeProfessor || 'professor');
                          redesenhar(n => n + 1);
                          onAtualizar?.();
                        }}
                        aria-pressed={!!e.justificacaoOficial}
                        style={{
                          marginTop: 7, width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          border: `1px solid ${e.justificacaoOficial ? '#2C5F8A' : C.border}`,
                          background: e.justificacaoOficial ? '#EAF2FA' : '#fff', color: '#2C5F8A',
                        }}>
                        {e.justificacaoOficial ? '✓ ' : ''}Com justificação oficial
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: C.suave, marginTop: 2 }}>
                          Registada na plataforma da escola. Só informação: a falta conta na mesma nas horas.
                        </span>
                      </button>
                    )}
                    {/* (Rosa, 12/out/2026) Qualquer aluno pode recuperar a aula a que faltou. */}
                    {e.decisaoFalta === 'falta_presenca' && plano && (
                      <RecuperarAula alunoId={e.alunoId} plano={plano} professor={nomeProfessor || 'professor'}
                        onValidar={onValidar} onMudou={() => { redesenhar(n => n + 1); onAtualizar?.(); }} />
                    )}
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

const dm = (d?: string) => d ? `${String(d).slice(8, 10)}/${String(d).slice(5, 7)}` : '';
const daquiA = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
const f1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/**
 * Recuperar uma aula a que o aluno faltou (Rosa, 12/out/2026), para qualquer
 * aluno, com ou sem 10% de faltas. Na aula teórica é automática: o aluno
 * autoavalia-se nela e o professor valida. Nas outras, o professor diz o que
 * o aluno tem de fazer e dá a nota. A nota substitui o 0 só desta aula; a
 * falta conta na mesma nas horas.
 */
function RecuperarAula({ alunoId, plano, professor, onValidar, onMudou }: {
  alunoId: string; plano: any; professor: string;
  onValidar?: (alunoId: string) => void; onMudou: () => void;
}) {
  const r = recuperacaoDaAula(alunoId, plano.id);
  const automatica = r ? r.automatica : recuperacaoEhAutomatica(plano);
  const nota = notaDaAulaRecuperada(alunoId, plano.id);
  const [aberto, setAberto] = useState(false);
  const [oQueFazer, setOQueFazer] = useState(r?.oQueFazer || '');
  const [prazo, setPrazo] = useState(r?.prazo || daquiA(7));
  const [notaTxt, setNotaTxt] = useState(typeof r?.nota === 'number' ? f1(r.nota) : '');
  const [aMudarNota, setAMudarNota] = useState(false);
  const verde = C.verde;
  const caixa: React.CSSProperties = { marginTop: 7, padding: '10px 11px', borderRadius: 8, border: `1px solid ${verde}`, background: C.verdeSuave, fontSize: 12.5, lineHeight: 1.45, color: C.tinta };
  const bt = (cheio: boolean): React.CSSProperties => ({ padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: `1.5px solid ${verde}`, background: cheio ? verde : '#fff', color: cheio ? '#fff' : verde });
  const campo: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 9px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: 'inherit', fontSize: 13, background: '#fff' };

  if (!r && !aberto) {
    return (
      <button onClick={() => setAberto(true)} style={{ marginTop: 7, width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', border: `1px solid ${C.border}`, background: '#fff', color: verde }}>
        Recuperar esta aula
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: C.suave, marginTop: 2 }}>
          {automatica ? 'Aula teórica: o aluno autoavalia-se nos conhecimentos desta aula e o professor valida.' : 'Diga o que o aluno tem de fazer e, depois, dê a nota.'}
          {' '}A nota substitui o 0 desta aula. A falta conta na mesma nas horas.
        </span>
      </button>
    );
  }

  if (!r || aberto) {
    const podePedir = automatica || oQueFazer.trim().length > 0;
    return (
      <div style={caixa}>
        <b>Recuperar esta aula</b>
        <div style={{ color: C.suave, marginTop: 2 }}>
          {automatica ? 'Aula teórica: o aluno estuda o trabalho da aula e autoavalia-se só nos conhecimentos (as atitudes de uma aula em que não esteve não se avaliam). O professor valida.'
            : 'Aula com prática ou atitudes: só o professor pode avaliar o que o aluno fez.'}
        </div>
        <label style={{ display: 'block', fontWeight: 700, marginTop: 8 }}>
          O que o aluno tem de fazer{automatica ? ' (opcional)' : ''}
          <textarea value={oQueFazer} onChange={ev => setOQueFazer(ev.target.value)} rows={2}
            placeholder={automatica ? 'Ex.: estudar o tema da aula no manual.' : 'Ex.: apresentar o trabalho na próxima aula.'}
            style={{ ...campo, marginTop: 4, resize: 'vertical' }} />
        </label>
        <label style={{ display: 'block', fontWeight: 700, marginTop: 6 }}>
          Prazo
          <input type="date" value={prazo} onChange={ev => setPrazo(ev.target.value)} style={{ ...campo, width: 170, marginTop: 4, display: 'block' }} />
        </label>
        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          <button disabled={!podePedir} onClick={() => {
            pedirRecuperacaoDaAula(alunoId, plano.id, { oQueFazer, prazo }, professor);
            setAberto(false); onMudou();
          }} style={{ ...bt(true), opacity: podePedir ? 1 : 0.5 }}>{r ? 'Guardar' : 'Pedir a recuperação'}</button>
          <button onClick={() => { setAberto(false); setOQueFazer(r?.oQueFazer || ''); }} style={bt(false)}>Cancelar</button>
        </div>
      </div>
    );
  }

  const respondeu = !!ultimaResposta(alunoId, plano.id);
  return (
    <div style={caixa}>
      <b>{nota !== null ? `✓ Aula recuperada: ${f1(nota)}/20` : 'Recuperação pedida'}</b>
      <span style={{ color: C.suave }}> · em {dm(r.pedidaEm)}{r.prazo ? `, até ${dm(r.prazo)}` : ''}</span>
      {r.oQueFazer && <div style={{ marginTop: 3 }}>{r.oQueFazer}</div>}
      {automatica ? (
        nota === null && (
          <div style={{ marginTop: 6 }}>
            {respondeu ? 'O aluno já se autoavaliou: falta validar.' : 'À espera da autoavaliação do aluno (aparece-lhe no Início).'}
            {respondeu && onValidar && (
              <button onClick={() => onValidar(alunoId)} style={{ ...bt(true), display: 'block', marginTop: 6 }}>Validar a autoavaliação</button>
            )}
          </div>
        )
      ) : (nota === null || aMudarNota) ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 7, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>Nota da recuperação</span>
          <input inputMode="decimal" value={notaTxt} onChange={ev => setNotaTxt(ev.target.value)} placeholder="0–20"
            aria-label="Nota da recuperação, de 0 a 20" style={{ ...campo, width: 70 }} />
          <span>/20</span>
          {(() => {
            const n = Number(notaTxt.replace(',', '.'));
            const ok = notaTxt.trim() !== '' && !isNaN(n) && n >= 0 && n <= 20;
            return <button disabled={!ok} onClick={() => { darNotaDaRecuperacaoDaAula(alunoId, plano.id, n, professor); setAMudarNota(false); onMudou(); }}
              style={{ ...bt(true), opacity: ok ? 1 : 0.5 }}>Guardar a nota</button>;
          })()}
        </div>
      ) : (
        <button onClick={() => setAMudarNota(true)} style={{ ...bt(false), display: 'block', marginTop: 6 }}>Mudar a nota</button>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setAberto(true)} style={{ background: 'none', border: 'none', padding: 0, color: verde, fontSize: 12.5, fontWeight: 700,
          textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Mudar o pedido</button>
        <button onClick={async () => {
          const ok = await janelaConfirmar({ titulo: 'Cancelar a recuperação desta aula?',
            texto: nota !== null ? `A nota da recuperação (${f1(nota)}) deixa de contar e a aula volta a contar 0.` : 'A aula continua a contar 0.',
            sim: 'Cancelar a recuperação', nao: 'Voltar', perigo: true });
          if (!ok) return;
          cancelarRecuperacaoDaAula(alunoId, plano.id, professor); setOQueFazer(''); setNotaTxt(''); onMudou();
        }} style={{ background: 'none', border: 'none', padding: 0, color: '#C0392B', fontSize: 12.5, fontWeight: 700,
          textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar a recuperação</button>
      </div>
    </div>
  );
}
