// ============================================================
// Pauta da UC — fechar a unidade
//
// O professor escolhe os alunos que entram (em princípio todos) e vê a
// pauta como vai sair, já com tudo calculado a partir do que aconteceu
// nas aulas:
//   - a ponderação dos produtos, pelo que foi efetivamente avaliado;
//   - os 5 C's, com as evidências de onde saíram (toca num aluno);
//   - a nota que o aluno propôs na autoavaliação final;
//   - "a)" nas negativas.
// Depois descarrega a pauta no modelo da escola, em Excel (.xlsx, abre
// no Google Drive/Sheets) ou em PDF pronto a imprimir, partilha o
// ficheiro, ou manda-a por email como antes.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  pautaDaUC, enviarPautaPorEmail, marcarUCFechada,
  emailDoProfessor, guardarEmailDoProfessor, getTurmas,
} from '../backend';
import { modulosDaTurma } from '../cronograma';
import {
  produtosDaUC, linhasDaPautaUC, atividadesDoModulo, gerarPautaXLSX, gerarPautaPDF, nomeFicheiroPauta,
  calculoDoModelo, classificacaoComNota, descarregar, MAPA_5C, MAX_PRODUTOS,
  type CabecalhoPauta, type DadosPauta, type Letra5C,
} from '../pautaUC';

const rotulo: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 800, letterSpacing: '0.05em',
  textTransform: 'uppercase', color: 'rgba(26,23,20,0.55)', margin: '18px 0 8px',
};
const th: React.CSSProperties = {
  padding: '7px 6px', fontSize: 11.5, fontWeight: 700, background: '#b8cce4', color: '#1a1a1a',
  textTransform: 'none', letterSpacing: 0, textAlign: 'center', border: '1px solid #008080', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '6px 6px', border: '1px solid rgba(0,128,128,0.35)', textAlign: 'center', fontSize: 13 };
const n1 = (x: number | null | undefined) => x === null || x === undefined ? '' : String(Math.round(x * 10) / 10).replace('.', ',');

export function FecharUC({ turmaId, ucId, ucNome, nomeProfessor, onFechado, onCancelar }: {
  turmaId: string;
  ucId: string;
  ucNome?: string;
  nomeProfessor?: string;
  onFechado: () => void;
  onCancelar: () => void;
}) {
  const produtos = useMemo(() => produtosDaUC(turmaId, ucId), [turmaId, ucId]);
  const linhas = useMemo(() => linhasDaPautaUC(turmaId, ucId, produtos), [turmaId, ucId, produtos]);
  const totalAtividades = useMemo(() => atividadesDoModulo(turmaId, ucId), [turmaId, ucId]);
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);

  const [email, setEmail] = useState(emailDoProfessor());
  const [aEnviar, setAEnviar] = useState(false);
  const [aGerar, setAGerar] = useState<string | null>(null);
  const [incluidos, setIncluidos] = useState<Set<string>>(() => new Set(linhas.map(l => l.alunoId)));
  const [aberto, setAberto] = useState<string | null>(null);

  const escolhidas = linhas.filter(l => incluidos.has(l.alunoId));
  const negativas = escolhidas.filter(l => l.final !== null && Math.round(l.final) < 10).length;
  const semProposta = escolhidas.filter(l => l.proposta === null);
  const semEvidencia = (Object.keys(MAPA_5C) as Letra5C[])
    .map(c => ({ c, n: escolhidas.filter(l => l.c5[c] === null).length })).filter(x => x.n > 0);

  function alternar(id: string) {
    setIncluidos(s => { const t = new Set(s); t.has(id) ? t.delete(id) : t.add(id); return t; });
  }

  function dados(): DadosPauta {
    const cabecalho: CabecalhoPauta = {
      turma: getTurmas().find(t => t.id === turmaId)?.nome || turmaId,
      disciplina: mod?.disciplina || '',
      formador: nomeProfessor || mod?.docente || '',
      ucId, ucNome: ucNome || mod?.nome || '',
      dataInicio: mod?.dataInicio || '', dataFim: mod?.dataFim || '',
    };
    return { cabecalho, produtos, linhas: escolhidas, totalAtividades };
  }

  async function gerar(tipo: 'xlsx' | 'pdf', partilhar = false) {
    if (!escolhidas.length) { alert('Escolhe pelo menos um aluno.'); return; }
    setAGerar(tipo);
    try {
      const d = dados();
      const blob = tipo === 'xlsx' ? await gerarPautaXLSX(d) : await gerarPautaPDF(d);
      const nome = nomeFicheiroPauta(d.cabecalho, tipo);
      if (partilhar) {
        const file = new File([blob], nome, { type: blob.type });
        if ((navigator as any).canShare?.({ files: [file] })) {
          await (navigator as any).share({ files: [file], title: nome, text: `Pauta ${ucId} — ${turmaId}` });
          return;
        }
      }
      descarregar(blob, nome);
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert('Não consegui gerar a pauta.\n\n' + (e?.message || ''));
    } finally {
      setAGerar(null);
    }
  }
  const podePartilhar = typeof navigator !== 'undefined' && typeof (navigator as any).canShare === 'function';

  async function enviar() {
    if (!email.includes('@')) { alert('Escreve o teu email.'); return; }
    if (!escolhidas.length) { alert('Escolhe pelo menos um aluno.'); return; }
    guardarEmailDoProfessor(email);
    setAEnviar(true);
    const r = await enviarPautaPorEmail(turmaId, ucId, email, nomeProfessor || '', [...incluidos]);
    setAEnviar(false);
    if (!r.ok) { alert('Não consegui enviar a pauta.\n\n' + (r.erro || '')); return; }
    marcarUCFechada(turmaId, ucId);
    alert(`Pauta enviada para ${email}.\n\nFicou também no ficheiro de dados, numa folha própria.`);
    onFechado();
  }

  const botao = (principal: boolean, ativo = true): React.CSSProperties => ({
    flex: '1 1 170px', padding: 13, borderRadius: 10, fontSize: 14.5, fontWeight: 700,
    cursor: ativo ? 'pointer' : 'default', fontFamily: 'inherit', opacity: ativo ? 1 : 0.6,
    border: principal ? 'none' : '1px solid rgba(26,23,20,0.18)',
    background: principal ? 'var(--sage, #5a7a4e)' : '#fff', color: principal ? '#fff' : 'inherit',
  });
  void pautaDaUC;

  return (
    <div onClick={onCancelar} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(26,23,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 1100,
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Pauta de {ucId}</div>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
          {ucNome || mod?.nome} · {turmaId}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 0' }}>
          {[
            [`${escolhidas.length} alunos na pauta`, '#f7f5f2'],
            [`${produtos.length} produto${produtos.length === 1 ? '' : 's'} avaliado${produtos.length === 1 ? '' : 's'}`, '#f7f5f2'],
            [`${negativas} negativa${negativas === 1 ? '' : 's'} — a)`, negativas ? '#fdf0ef' : '#f7f5f2'],
            [`${semProposta.length} sem proposta do aluno`, semProposta.length ? '#fdf0e6' : '#eef4eb'],
          ].map(([txt, cor]) => (
            <span key={txt} style={{ padding: '6px 12px', borderRadius: 20, background: cor,
              fontSize: 13, fontWeight: 700 }}>{txt}</span>
          ))}
        </div>

        {/* 1. Os alunos */}
        <div style={rotulo}>1. Alunos que entram na pauta</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[['Todos', () => setIncluidos(new Set(linhas.map(l => l.alunoId)))], ['Nenhum', () => setIncluidos(new Set())]].map(([t, fn]) => (
            <button key={t as string} onClick={fn as any} style={{ padding: '6px 12px', borderRadius: 8,
              border: '1px solid rgba(26,23,20,0.18)', background: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit' }}>{t as string}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 6 }}>
          {linhas.map(l => (
            <label key={l.alunoId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 8, border: '1px solid rgba(26,23,20,0.1)', cursor: 'pointer', fontSize: 14,
              background: incluidos.has(l.alunoId) ? '#fff' : '#f7f5f2',
              color: incluidos.has(l.alunoId) ? 'inherit' : 'rgba(26,23,20,0.45)' }}>
              <input type="checkbox" checked={incluidos.has(l.alunoId)} onChange={() => alternar(l.alunoId)}
                style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 700, minWidth: 22 }}>{l.numero}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nome}</span>
            </label>
          ))}
        </div>

        {/* 2. Produtos e ponderação */}
        <div style={rotulo}>2. Produtos e ponderação</div>
        {produtos.length === 0 ? (
          <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)' }}>
            Ainda não há nenhum plano de aula desta unidade avaliado (validado).
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8, lineHeight: 1.5 }}>
              Cada produto é um plano de aula avaliado. Pesa pelo número de elementos (competências)
              que foram efetivamente avaliados nele. Uma aula a que o aluno faltou conta 0.
              {produtos.some(p => p.planosIds.length > 1) && ' Há mais planos do que as 7 colunas do modelo: os planos seguidos juntam-se no mesmo produto.'}
            </div>
            <div style={{ border: '1px solid rgba(26,23,20,0.12)', borderRadius: 10, overflow: 'hidden' }}>
              {produtos.map((p, i) => (
                <div key={p.numero} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderTop: i ? '1px solid rgba(26,23,20,0.08)' : 'none', fontSize: 14 }}>
                  <span style={{ fontWeight: 700, minWidth: 22 }}>{p.numero}.</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{p.titulo}</span>
                  <span style={{ color: 'rgba(26,23,20,0.55)', fontSize: 13 }}>{p.elementos} elemento{p.elementos === 1 ? '' : 's'} avaliado{p.elementos === 1 ? '' : 's'}</span>
                  <span style={{ fontWeight: 800, minWidth: 56, textAlign: 'right' }}>{n1(p.peso)}%</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 3. A pauta */}
        <div style={rotulo}>3. A pauta (toca num aluno para ver de onde saem os 5 C's)</div>
        {(semEvidencia.length > 0 || semProposta.length > 0) && (
          <div style={{ background: '#fdf0e6', border: '1px solid var(--copper)', borderRadius: 10,
            padding: '11px 13px', fontSize: 13.5, lineHeight: 1.55, marginBottom: 10 }}>
            {semEvidencia.map(x => (
              <div key={x.c}>{MAPA_5C[x.c].sigla} ({MAPA_5C[x.c].nome}): {x.n} aluno{x.n === 1 ? '' : 's'} sem
                nenhuma evidência (não vieram a nenhuma aula desta UC) — conta 0 (N.R.).</div>
            ))}
            {semProposta.length > 0 && (
              <div>Ainda sem a autoavaliação final: {semProposta.map(l => l.numero).join(', ')}.</div>
            )}
          </div>
        )}
        <details style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)', marginBottom: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>De onde saem os 5 C's</summary>
          <div style={{ padding: '6px 0 0 4px', lineHeight: 1.6 }}>
            {(Object.keys(MAPA_5C) as Letra5C[]).map(k => (
              <div key={k}><b>{MAPA_5C[k].sigla} {MAPA_5C[k].nome}</b>: {MAPA_5C[k].evidencias}; e as atitudes validadas
                que as regras do ano e do trimestre permitem avaliar.</div>
            ))}
            <div><b>CP Competente</b>: os produtos (planos de aula), com a ponderação acima.</div>
          </div>
        </details>
        <div style={{ overflowX: 'auto', border: '1px solid rgba(0,128,128,0.4)', borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>Nº</th><th style={{ ...th, textAlign: 'left' }}>Nome</th>
                {Array.from({ length: MAX_PRODUTOS }, (_, j) => <th key={j} style={th}>P{j + 1}</th>)}
                {['CM', 'CP', 'CL', 'CO', 'CR', 'TOTAL', 'RESULTADO', 'Proposta aluno', 'Classif.'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {escolhidas.map(l => {
                const c = calculoDoModelo(l, produtos, totalAtividades);
                const neg = l.final !== null && Math.round(l.final) < 10;
                return (
                  <React.Fragment key={l.alunoId}>
                    <tr onClick={() => setAberto(a => a === l.alunoId ? null : l.alunoId)} style={{ cursor: 'pointer',
                      background: aberto === l.alunoId ? '#eef6f6' : undefined }}>
                      <td style={{ ...td, fontWeight: 700 }}>{l.numero}</td>
                      <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap' }}>{l.nome}</td>
                      {l.produtos.map((v, j) => <td key={j} style={{ ...td, color: v === 0 ? '#c0392b' : undefined }}>{n1(v)}</td>)}
                      <td style={td}>{l.c5.cm ?? '—'}</td>
                      <td style={{ ...td, background: '#ccffff', fontWeight: 700 }}>{n1(c.cp)}</td>
                      <td style={td}>{l.c5.cl ?? '—'}</td>
                      <td style={td}>{l.c5.co ?? '—'}</td>
                      <td style={td}>{l.c5.cr ?? '—'}</td>
                      <td style={{ ...td, background: '#ccffff', fontWeight: 700 }}>{n1(c.total)}</td>
                      <td style={{ ...td, background: '#ccffff', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.resultado}</td>
                      <td style={td}>{l.proposta ?? '—'}</td>
                      <td style={{ ...td, fontWeight: 800, color: neg ? '#c0392b' : undefined }}>{classificacaoComNota(l.final) || '—'}</td>
                    </tr>
                    {aberto === l.alunoId && (
                      <tr>
                        <td colSpan={2 + MAX_PRODUTOS + 9} style={{ ...td, textAlign: 'left', background: '#f7fbfb', padding: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
                            {(Object.keys(MAPA_5C) as Letra5C[]).map(k => (
                              <div key={k}>
                                <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                                  {MAPA_5C[k].sigla} · {MAPA_5C[k].nome}: {l.c5[k] ?? 'sem evidências'}
                                </div>
                                {l.evidencias[k].length === 0 ? (
                                  <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>Sem evidências: não veio a nenhuma aula desta UC.</div>
                                ) : l.evidencias[k].map((e, i) => (
                                  <div key={i} style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.75)' }}>
                                    {e.rotulo}: {n1(e.nota20)} val. ({e.vezes}×)
                                  </div>
                                ))}
                              </div>
                            ))}
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13.5 }}>CP · Competente: {n1(c.cp)}</div>
                              <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.75)' }}>Dos produtos, com a ponderação acima.</div>
                              {l.proposta !== null && (
                                <>
                                  <div style={{ fontWeight: 800, fontSize: 13.5, marginTop: 8 }}>Proposta do aluno: {l.proposta}</div>
                                  <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.75)', fontStyle: 'italic' }}>“{l.justificacao}”</div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Ficheiros */}
        <div style={rotulo}>4. A pauta no modelo da escola</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => gerar('xlsx')} disabled={!!aGerar} style={botao(false, !aGerar)}>
            {aGerar === 'xlsx' ? 'A preparar…' : 'Descarregar em Excel (.xlsx)'}
          </button>
          <button onClick={() => gerar('pdf')} disabled={!!aGerar} style={botao(false, !aGerar)}>
            {aGerar === 'pdf' ? 'A preparar…' : 'Descarregar em PDF'}
          </button>
          {podePartilhar && (
            <button onClick={() => gerar('pdf', true)} disabled={!!aGerar} style={botao(false, !aGerar)}>
              Partilhar o PDF
            </button>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 6, lineHeight: 1.5 }}>
          O Excel abre no Google Drive (Google Sheets) e no Excel, com as fórmulas do modelo.
          O PDF sai pronto a imprimir ou a arquivar.
        </div>

        {/* 5. Email */}
        <div style={rotulo}>5. Fechar a unidade e enviar</div>
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="o.teu.email@eclisboa.net" style={{
            width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 15,
            border: '1px solid rgba(26,23,20,0.2)', fontFamily: 'inherit', boxSizing: 'border-box',
          }} />
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 5, lineHeight: 1.5 }}>
          Recebes um email com o link da pauta, que fica também no ficheiro de dados da escola.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={onCancelar} style={{ ...botao(false), flex: '1 1 120px' }}>Agora não</button>
          <button onClick={enviar} disabled={aEnviar} style={{ ...botao(true, !aEnviar), flex: '2 1 200px' }}>
            {aEnviar ? 'A enviar…' : 'Fechar a unidade e enviar a pauta'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FecharUC;
