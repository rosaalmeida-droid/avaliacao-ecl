// ============================================================
// Nota e atividades — ecrãs do aluno.
//
// Pensados para quem tem 14 ou 15 anos. Um aluno dessa idade não quer
// uma caderneta: quer saber se está a melhorar e o que fazer para subir.
// Por isso a evolução vem antes do número, as barras substituem a lista
// de datas, e há sempre uma ação concreta no fim.
// ============================================================

import React, { useState } from 'react';
import { Atividade } from '../types';
import { fmtDataLonga, fmtDataCurta } from '../datas';

const C = {
  fundo: '#F3F2F5', branco: '#FFFFFF',
  violeta: '#6B3FA0', violetaSuave: '#F0EBF7', violetaClaro: '#DCCFF0',
  violetaBarra: '#D4C4E8',
  tinta: '#1A1A1A', texto: '#555555', suave: '#777777',
  verde: '#3E7A31', verdeSuave: '#E8F3E5',
  ambar: '#B08A3E', ambarSuave: '#E8D9B8',
  cobre: '#B5651D', cobreSuave: '#FDF0E8', cobreEscuro: '#8A4E15',
  sombra: '0 1px 3px rgba(0,0,0,0.06)',
};

const painel: React.CSSProperties = {
  background: C.branco, borderRadius: 16, boxShadow: C.sombra,
};

function Cabecalho({ ucId, ucNome, titulo }: {
  ucId?: string; ucNome?: string; titulo: string;
}) {
  return (
    <div style={{ background: C.violeta, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: C.violetaClaro }}>
        {ucId ? `${ucId}${ucNome ? ` · ${ucNome}` : ''}` : ''}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 5 }}>{titulo}</div>
    </div>
  );
}

// ── A minha nota ──────────────────────────────────────────────

export interface AulaNota {
  numero: number;
  titulo: string;
  data: string;
  nota20: number;
}

export function EcraMinhaNota({
  ucId, ucNome, nota, aulas, competenciasPorAvaliar = 0, notaPossivel, detalhe,
}: {
  /** Como se chega à nota: faltas, média das aulas, bónus de cada atividade. */
  detalhe?: {
    faltas: { titulo: string; data: string }[];
    media: number | null;
    bonus: { id: string; titulo: string; data: string; tipo: string; conta: boolean; motivo: string; valor: number }[];
    bonusTotal: number; teto: boolean; motivoTeto?: string; final: number | null; publicada: boolean;
  } | null;
  ucId?: string; ucNome?: string;
  nota: number | null;
  /** Aulas já avaliadas, por ordem. */
  aulas: AulaNota[];
  competenciasPorAvaliar?: number;
  /** Onde a nota pode chegar se fizer bem o que falta. */
  notaPossivel?: number | null;
}) {
  const ultimas = aulas.slice(-6);
  const maxNota = Math.max(...ultimas.map(a => a.nota20), 20);
  const melhor = aulas.length ? aulas.reduce((m, a) => (a.nota20 > m.nota20 ? a : m)) : null;

  // A diferença para a aula anterior — é o que o aluno procura primeiro.
  const evolucao = aulas.length >= 2
    ? Math.round((aulas[aulas.length - 1].nota20 - aulas[aulas.length - 2].nota20) * 10) / 10
    : null;

  const fmt = (n: number) => n.toFixed(1).replace('.', ',').replace(',0', '');
  // O bónus em centésimas (0,45), sem zeros a mais.
  const fmt2 = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

  return (
    <div style={{ background: C.fundo, minHeight: '100%', padding: 14 }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <Cabecalho ucId={ucId} ucNome={ucNome} titulo="A minha nota" />

        {/* O número, e logo a seguir se subiu ou desceu. */}
        <div style={{ ...painel, padding: '20px 18px', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10 }}>
            <span style={{ fontSize: 56, fontWeight: 700, color: C.tinta, lineHeight: 1 }}>
              {nota != null ? fmt(nota) : '—'}
            </span>
            <span style={{ fontSize: 17, color: C.suave }}>em 20</span>
          </div>

          {evolucao != null && evolucao !== 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
              background: evolucao > 0 ? C.verdeSuave : C.cobreSuave,
              borderRadius: 20, padding: '6px 14px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={evolucao > 0 ? C.verde : C.cobre} strokeWidth={2.8} strokeLinecap="round">
                <path d={evolucao > 0 ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'} />
              </svg>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: evolucao > 0 ? C.verde : C.cobre }}>
                {evolucao > 0 ? 'Subiste' : 'Desceste'} {fmt(Math.abs(evolucao))} desde a última aula
              </span>
            </div>
          )}

          <div style={{ fontSize: 13.5, color: C.suave, marginTop: 12 }}>
            se a unidade acabasse hoje
          </div>
        </div>

        {/* Barras: vê-se a linha a subir sem ter de comparar números. */}
        {ultimas.length > 1 && (
          <div style={{ ...painel, padding: 18, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.tinta, marginBottom: 16 }}>
              Aula a aula
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, marginBottom: 8 }}>
              {ultimas.map((a, i) => {
                const ultima = i === ultimas.length - 1;
                const fraca = a.nota20 < 10;
                return (
                  <div key={a.numero} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 5 }}>
                    <span style={{
                      fontSize: ultima ? 13.5 : 12.5,
                      fontWeight: ultima ? 700 : 600,
                      color: ultima ? C.violeta : fraca ? C.ambar : C.suave,
                    }}>
                      {fmt(a.nota20)}
                    </span>
                    <div style={{
                      width: '100%',
                      height: `${Math.max(8, (a.nota20 / maxNota) * 100)}%`,
                      borderRadius: '6px 6px 0 0',
                      // Uma aula fraca fica em âmbar, não em vermelho:
                      // é um dia pior, não uma falha.
                      background: ultima ? C.violeta : fraca ? C.ambarSuave : C.violetaBarra,
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {ultimas.map((a, i) => (
                <div key={a.numero} style={{ flex: 1, textAlign: 'center', fontSize: 11.5,
                  color: i === ultimas.length - 1 ? C.violeta : '#999',
                  fontWeight: i === ultimas.length - 1 ? 700 : 400 }}>
                  {a.numero}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Como chegaste a esta nota: tudo, aula a aula, e o bónus de cada atividade. */}
        {detalhe && (aulas.length > 0 || detalhe.faltas.length > 0 || detalhe.bonus.length > 0) && (
          <div style={{ ...painel, padding: 18, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.tinta, marginBottom: 10 }}>Como chegaste a esta nota</div>
            {aulas.map(a => (
              <div key={'a' + a.numero + a.titulo} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #F0EDF2', fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0, color: C.texto }}>Aula {a.numero} · {a.titulo} <span style={{ color: '#999' }}>· {fmtDataCurta(a.data)}</span></span>
                <span style={{ fontWeight: 700, color: a.nota20 < 10 ? C.ambar : C.tinta }}>{fmt(a.nota20)}</span>
              </div>
            ))}
            {detalhe.faltas.map((f, i) => (
              <div key={'f' + i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #F0EDF2', fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0, color: C.texto }}>Faltaste · {f.titulo} <span style={{ color: '#999' }}>· {f.data}</span></span>
                <span style={{ fontWeight: 700, color: C.ambar }}>0</span>
              </div>
            ))}
            {detalhe.media != null && (
              <div style={{ display: 'flex', gap: 10, padding: '9px 0 6px', fontSize: 15, fontWeight: 700 }}>
                <span style={{ flex: 1 }}>Média das aulas</span><span>{fmt(detalhe.media)}</span>
              </div>
            )}
            {detalhe.bonus.map(b => (
              <div key={b.id} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0, color: C.texto }}>
                  {b.tipo === 'concurso' ? '🏆' : '🏅'} {b.titulo} <span style={{ color: '#999' }}>· {b.data.split('-').reverse().slice(0, 2).join('/')}</span>
                  {(!b.conta || b.tipo === 'concurso') && b.motivo && <span style={{ display: 'block', fontSize: 12.5, color: '#999' }}>{b.motivo}</span>}
                </span>
                <span style={{ fontWeight: 700, color: b.conta ? C.verde : '#999' }}>{b.conta ? `+${fmt2(b.valor)}` : '+0'}</span>
              </div>
            ))}
            {detalhe.bonus.length > 0 && (
              <div style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 14.5, fontWeight: 700, color: C.verde }}>
                <span style={{ flex: 1 }}>Bónus das atividades (máximo 2)</span><span>+{fmt2(detalhe.bonusTotal)}</span>
              </div>
            )}
            {detalhe.teto && (
              <div style={{ fontSize: 13, color: C.suave, marginTop: 4 }}>
                {detalhe.motivoTeto || 'A nota ficou no limite.'} Participar e candidatar-se também é atitude.
              </div>
            )}
            {detalhe.final != null && (
              <div style={{ display: 'flex', gap: 10, padding: '10px 0 0', marginTop: 6, borderTop: '2px solid #E6E1EA', fontSize: 16, fontWeight: 800 }}>
                <span style={{ flex: 1 }}>Nota se a unidade acabasse hoje</span><span>{fmt(detalhe.final)}</span>
              </div>
            )}
            {detalhe.publicada && (
              <div style={{ fontSize: 13, color: C.suave, marginTop: 6 }}>O professor já publicou a nota final; é essa que aparece em cima.</div>
            )}
          </div>
        )}

        {/* Uma memória concreta a que voltar. */}
        {melhor && (
          <div style={{ ...painel, padding: 17, marginBottom: 12,
            display: 'flex', alignItems: 'flex-start', gap: 13 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.verdeSuave,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.verde}
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.6 6.6L21 9.2l-4.8 4.3 1.4 6.5L12 16.8 6.4 20l1.4-6.5L3 9.2l6.4-.6z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.suave }}>A tua melhor aula</div>
              <div style={{ fontSize: 16.5, fontWeight: 600, color: C.tinta, marginTop: 2 }}>
                Aula {melhor.numero} · {melhor.titulo}
              </div>
              <div style={{ fontSize: 14, color: C.texto, marginTop: 3 }}>
                {fmt(melhor.nota20)} em 20 · {melhor.data}
              </div>
            </div>
          </div>
        )}

        {/* Uma ação concreta, não um conselho vago. */}
        {competenciasPorAvaliar > 0 && (
          <div style={{ background: C.cobreSuave, border: `1px solid ${C.cobre}`,
            borderRadius: 16, padding: 17 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.cobre, marginBottom: 7 }}>
              Para subires
            </div>
            <div style={{ fontSize: 15, color: C.cobreEscuro, lineHeight: 1.6 }}>
              Tens {competenciasPorAvaliar} competência{competenciasPorAvaliar > 1 ? 's' : ''} por
              avaliar nesta unidade.
              {notaPossivel != null && ` Se as fizeres bem, a tua nota pode chegar aos ${Math.floor(notaPossivel)}.`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Atividades e concursos ────────────────────────────────────

export function EcraAtividades({
  atividades, alunoId, onInscrever, onCancelar, onBalanco, onVer, recuperacao,
}: {
  atividades: Atividade[];
  alunoId: string;
  /** Abrir, só para ver, uma atividade em que o aluno não esteve. */
  onVer?: (planoId: string) => void;
  onInscrever: (id: string) => void;
  onCancelar: (id: string) => void;
  onBalanco: (id: string, participou: boolean, resultado?: string) => void;
  /** Aluno em recuperação: pode candidatar-se a recuperar numa atividade, mesmo fechada (Rosa, out/2026). */
  recuperacao?: {
    ucs: string[];
    estado: (planoId: string) => 'candidato' | 'aceite' | null;
    onCandidatar: (planoId: string, sim: boolean) => void;
  };
}) {
  const [aBalancar, setABalancar] = useState<string | null>(null);
  // Inscrever-se é um compromisso: pergunta-se antes, e dá-se os parabéns depois.
  const [aConfirmar, setAConfirmar] = useState<string | null>(null);
  const [acabouDe, setAcabouDe] = useState<string | null>(null);
  const querParticipar = (a: Atividade, texto: string) => aConfirmar === a.id ? (
    <div style={{ marginTop: 13, padding: '13px 14px', borderRadius: 12, background: C.violetaSuave }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.tinta }}>Queres mesmo participar?</div>
      <div style={{ fontSize: 14, color: C.texto, marginTop: 5, lineHeight: 1.55 }}>
        Participar é um compromisso: treinar antes, chegar a horas, vir com a farda completa e o material,
        e ficar até ao fim. O professor conta contigo.
      </div>
      {botao('Sim, quero participar', () => { onInscrever(a.id); setAConfirmar(null); setAcabouDe(a.id); })}
      {botao('Agora não', () => setAConfirmar(null), false)}
    </div>
  ) : botao(texto, () => setAConfirmar(a.id));
  const parabens = (a: Atividade) => acabouDe === a.id ? (
    <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 11, background: C.verdeSuave, color: C.verde,
      fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>
      🎉 Parabéns por te inscreveres! Querer participar já é uma boa atitude. Prepara-te bem: é assim que se aprende a sério.
    </div>
  ) : null;
  const hoje = new Date().toISOString().slice(0, 10);

  const inscrito = (a: Atividade) => (a.inscritosIds ?? []).includes(alunoId);
  const jaDeuBalanco = (a: Atividade) => (a.balancos ?? []).some(b => b.alunoId === alunoId);
  const participou = (a: Atividade) => a.participantesIds.includes(alunoId);

  // Eventos que vêm do plano do professor: quem vai decide-o o professor
  // (a turma toda, ou os inscritos que ele aceita). Não há «como correu».
  const doPlano = (a: Atividade) => !!(a as any).doPlano;
  // Quem já se candidatou a recuperar numa atividade vê-a só em «Recuperar numa atividade».
  const paraRecuperar = (a: Atividade) => !!(recuperacao && doPlano(a) && recuperacao.estado((a as any).planoId));
  const abertas = atividades.filter(a => !a.fechada && a.data >= hoje && !paraRecuperar(a));
  const porFechar = atividades.filter(a => !doPlano(a) && a.data < hoje && inscrito(a) && !jaDeuBalanco(a));
  const feitas = atividades.filter(a => (doPlano(a) ? a.data < hoje && participou(a) : participou(a) || jaDeuBalanco(a)));

  const cartao = (a: Atividade, corpo: React.ReactNode) => (
    <div key={a.id} style={{ ...painel, padding: 16, marginBottom: 11 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: C.violeta }}>
        {a.tipo === 'concurso' ? 'Concurso' : 'Evento'}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: C.tinta, marginTop: 3, lineHeight: 1.3 }}>
        {a.titulo}
      </div>
      <div style={{ fontSize: 14, color: C.texto, marginTop: 5 }}>
        {fmtDataLonga(a.data)}
        {a.horaInicio && ` · ${a.horaInicio}${a.horaFim ? `–${a.horaFim}` : ''}`}
        {a.local && ` · ${a.local}`}
      </div>
      {a.descricao && (
        <div style={{ fontSize: 14.5, color: C.texto, marginTop: 8, lineHeight: 1.55 }}>
          {a.descricao}
        </div>
      )}
      {corpo}
    </div>
  );

  const botao = (texto: string, onClick: () => void, principal = true) => (
    <button onClick={onClick} style={{
      width: '100%', marginTop: 13, padding: 14, borderRadius: 12,
      border: principal ? 'none' : `2px solid ${C.violeta}`,
      background: principal ? C.violeta : 'transparent',
      color: principal ? '#fff' : C.violeta,
      fontSize: 15.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>{texto}</button>
  );

  return (
    <div style={{ background: C.fundo, minHeight: '100%', padding: 14 }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <Cabecalho titulo="Atividades e concursos" />

        <div style={{ ...painel, padding: 15, marginBottom: 16, fontSize: 14.5,
          color: C.texto, lineHeight: 1.6 }}>
          Participar não é obrigatório, mas conta para a tua nota. Cada
          evento pode subir-te 0,5 valores. Cada concurso pode subir-te até
          1 valor: 0,2 por te candidatares (mesmo que não sejas escolhido),
          0,2 por participares, 0,2 por cada fase que passares e, se ganhares,
          o que falta para 1. Para contar, tens de ir de farda e dar o teu melhor. Se não
          participares em nenhum concurso, a nota não passa de 18.
        </div>

        {/* Em recuperação: candidatar-se a recuperar numa atividade (Rosa, out/2026). */}
        {recuperacao && recuperacao.ucs.length > 0 && atividades.some(a => doPlano(a) && a.data >= hoje) && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: C.cobre, marginBottom: 10 }}>
              Recuperar numa atividade
            </div>
            <div style={{ ...painel, padding: 15, marginBottom: 11, fontSize: 14.5, color: C.texto, lineHeight: 1.6 }}>
              Estás em recuperação na UC {recuperacao.ucs.join(', ')}. Podes candidatar-te a recuperar numa destas atividades,
              mesmo que seja só para alguns alunos. O professor aceita ou escolhe outra. Só recuperas se participares
              e o professor o confirmar. Esta atividade serve para recuperar: não dá bónus.
            </div>
            {atividades.filter(a => doPlano(a) && a.data >= hoje).map(a => {
              const pid = (a as any).planoId;
              const est = recuperacao.estado(pid);
              return cartao(a, est === 'aceite'
                ? <div style={{ marginTop: 13, padding: '12px 14px', borderRadius: 11, background: C.verdeSuave, color: C.verde, fontSize: 15, fontWeight: 600 }}>
                    ✓ O professor aceitou: recuperas nesta atividade. Só conta se participares.</div>
                : est === 'candidato'
                  ? <>
                      <div style={{ marginTop: 13, padding: '12px 14px', borderRadius: 11, background: C.cobreSuave, color: C.cobre, fontSize: 15, fontWeight: 600 }}>
                        Candidataste-te para recuperar. O professor vai decidir.</div>
                      {botao('Retirar a candidatura', () => recuperacao.onCandidatar(pid, false), false)}
                    </>
                  : botao('Candidatar-me para recuperar', () => recuperacao.onCandidatar(pid, true), false));
            })}
            <div style={{ height: 18 }} />
          </>
        )}

        {/* Por fechar primeiro: é o que exige ação. */}
        {porFechar.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: C.cobre, marginBottom: 10 }}>
              Diz-nos como correu
            </div>
            {porFechar.map(a => cartao(a,
              aBalancar === a.id ? (
                <div style={{ marginTop: 13 }}>
                  <div style={{ fontSize: 14.5, color: C.texto, marginBottom: 10 }}>
                    Foste?
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {([
                      ['ganhei', 'Fui e correu muito bem'],
                      ['participei', 'Fui e correu bem'],
                      ['nao_correu_bem', 'Fui, mas podia ter corrido melhor'],
                    ] as const).map(([r, lbl]) => (
                      <button key={r} onClick={() => { onBalanco(a.id, true, r); setABalancar(null); }}
                        style={{ padding: '13px 14px', borderRadius: 11, textAlign: 'left',
                          border: `1.5px solid ${C.violeta}`, background: C.violetaSuave,
                          color: C.violeta, fontSize: 15, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit' }}>
                        {lbl}
                      </button>
                    ))}
                    <button onClick={() => { onBalanco(a.id, false); setABalancar(null); }}
                      style={{ padding: '13px 14px', borderRadius: 11, textAlign: 'left',
                        border: '1.5px solid #DDD', background: '#fff', color: C.suave,
                        fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Afinal não fui
                    </button>
                  </div>
                </div>
              ) : botao('Dizer como correu', () => setABalancar(a.id))
            ))}
            <div style={{ height: 18 }} />
          </>
        )}

        {/* Atividades da turma em que não esteve: só para ver (Rosa, out/2026). */}
        {onVer && atividades.some(a => doPlano(a) && a.data <= hoje && !participou(a)) && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: C.suave, marginBottom: 10 }}>
              Para ver: o que os colegas fizeram
            </div>
            {atividades.filter(a => doPlano(a) && a.data <= hoje && !participou(a)).map(a => cartao(a, <>
              <div style={{ fontSize: 14.5, color: C.texto, marginTop: 6, lineHeight: 1.5 }}>
                Não estiveste nesta atividade. Podes ver o que se fez, a ficha técnica e o guião.
              </div>
              {botao('Ver a atividade', () => onVer((a as any).planoId), false)}
            </>))}
            <div style={{ height: 18 }} />
          </>
        )}

        {abertas.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: C.suave, marginBottom: 10 }}>
              Podes inscrever-te
            </div>
            {abertas.map(a => {
              if (doPlano(a)) {
                const turma = (a as any).modo === 'turma';
                const aceite = participou(a);
                const aviso = (txt: string, cor: string, fundo: string) => (
                  <div style={{ marginTop: 13, padding: '12px 14px', borderRadius: 11, background: fundo, color: cor, fontSize: 15, fontWeight: 600 }}>{txt}</div>);
                return cartao(a, turma
                  ? aviso('Vai a turma toda, por isso é obrigatório. Não conta como falta de aula, e também te autoavalias.', C.violeta, C.violetaSuave)
                  : aceite
                    ? aviso('✓ Foste aceite! Agora é contigo: assumes o compromisso de estar lá à hora, com a farda impecável, e dar o teu máximo do princípio ao fim. No dia, também te autoavalias.', C.verde, C.verdeSuave)
                    : inscrito(a)
                      ? <>{parabens(a)}{aviso('Estás inscrito/a. O professor vai confirmar se participas.', C.cobre, C.cobreSuave)}{botao('Já não vou', () => onCancelar(a.id), false)}</>
                      : querParticipar(a, 'Quero participar'));
              }
              const vagasRestantes = a.vagas != null
                ? a.vagas - (a.inscritosIds?.length ?? 0) : null;
              const cheio = vagasRestantes != null && vagasRestantes <= 0 && !inscrito(a);
              const foraDePrazo = !!a.inscricoesAte && a.inscricoesAte < hoje;

              return cartao(a, <>
                {vagasRestantes != null && (
                  <div style={{ fontSize: 13.5, color: cheio ? C.cobre : C.suave, marginTop: 6 }}>
                    {cheio ? 'Já não há vagas' : `${vagasRestantes} vaga${vagasRestantes === 1 ? '' : 's'}`}
                  </div>
                )}
                {inscrito(a)
                  ? <>
                      {parabens(a)}
                      <div style={{ marginTop: 13, padding: '12px 14px', borderRadius: 11,
                        background: C.verdeSuave, color: C.verde, fontSize: 15, fontWeight: 600 }}>
                        Estás inscrito
                      </div>
                      {botao('Já não vou', () => onCancelar(a.id), false)}
                    </>
                  : cheio || foraDePrazo
                    ? <div style={{ marginTop: 13, padding: '12px 14px', borderRadius: 11,
                        background: '#F5F5F5', color: C.suave, fontSize: 14.5 }}>
                        {foraDePrazo ? 'As inscrições já fecharam' : 'Sem vagas'}
                      </div>
                    : querParticipar(a, 'Quero ir')}
              </>);
            })}
            <div style={{ height: 18 }} />
          </>
        )}

        {feitas.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: C.suave, marginBottom: 10 }}>
              Onde já participaste · {feitas.length}
            </div>
            {feitas.map(a => (
              <div key={a.id} style={{ ...painel, padding: '13px 16px', marginBottom: 9,
                display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.verde}
                  strokeWidth={2.5} strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.tinta }}>{a.titulo}</div>
                  <div style={{ fontSize: 13, color: C.suave }}>{fmtDataLonga(a.data)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {abertas.length === 0 && porFechar.length === 0 && feitas.length === 0 && (
          <div style={{ ...painel, padding: 30, textAlign: 'center',
            color: C.suave, fontSize: 15 }}>
            Ainda não há atividades a decorrer. Quando o professor lançar alguma,
            aparece aqui.
          </div>
        )}
      </div>
    </div>
  );
}
