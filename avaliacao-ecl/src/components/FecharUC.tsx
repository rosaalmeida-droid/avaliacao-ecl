// ============================================================
// Pauta da UC — fechar a unidade
//
// O professor escolhe os alunos que entram (em princípio todos) e vê a
// pauta como vai sair, já com tudo calculado a partir do que aconteceu
// nas aulas:
//   - a ponderação dos produtos, pelo que foi efetivamente avaliado;
//   - os 5 C's, com as evidências de onde saíram (toca num aluno);
//   - a nota que o aluno propôs na autoavaliação final;
//   - a CLASSIF. ATRIBUÍDA: a aplicação sugere uma nota perto do
//     Competente, o professor decide, e avisa-se quando não corresponde
//     ao RESULTADO; fora da faixa do Competente não deixa gerar; "a)" nas negativas.
// Antes de tudo pergunta que Planos de Avaliação entram (recomendado:
// todos os realizados na UC). Cada coluna da pauta é um plano.
// Depois descarrega a pauta no modelo da escola, em Excel (.xlsx, abre
// no Google Drive/Sheets) ou em PDF pronto a imprimir, partilha o
// ficheiro, ou manda-a por email como antes.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  pautaDaUC, enviarPautaPorEmail, marcarUCFechada, situacaoRecuperacaoUC,
  emailDoProfessor, guardarEmailDoProfessor, getTurmas,
} from '../backend';
import { modulosDaTurma } from '../cronograma';
import {
  produtosDaUC, linhasDaPautaUC, atividadesDoModulo, gerarPautaXLSX, gerarPautaPDF, nomeFicheiroPauta,
  calculoDoModelo, classificacaoComNota, descarregar, MAPA_5C, colunasDeProdutos,
  planosRealizadosDaUC, sugestaoClassificacao, chaveClassificacoes, avisosClassificacao, erroClassificacao, notaDoCompetente,
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
  // Que Planos de Avaliação entram. Recomendado: todos os realizados na UC,
  // para o percurso todo ficar à vista e não haver surpresas na nota.
  const planosUC = useMemo(() => planosRealizadosDaUC(turmaId, ucId), [turmaId, ucId]);
  const avaliados = planosUC.filter(p => p.avaliado);
  const [modoPlanos, setModoPlanos] = useState<'pergunta' | 'todos' | 'escolher'>('pergunta');
  const [planosEscolhidos, setPlanosEscolhidos] = useState<Set<string>>(() => new Set(avaliados.map(p => p.id)));
  const produtos = useMemo(() => produtosDaUC(turmaId, ucId, modoPlanos === 'escolher' ? [...planosEscolhidos] : undefined),
    [turmaId, ucId, modoPlanos, planosEscolhidos]);
  const nProd = colunasDeProdutos(produtos);
  const porResponder = modoPlanos === 'pergunta' && avaliados.length > 0;
  const linhas = useMemo(() => linhasDaPautaUC(turmaId, ucId, produtos), [turmaId, ucId, produtos]);
  const totalAtividades = useMemo(() => atividadesDoModulo(turmaId, ucId), [turmaId, ucId]);
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);

  const [email, setEmail] = useState(emailDoProfessor());
  const [aEnviar, setAEnviar] = useState(false);
  const [aGerar, setAGerar] = useState<string | null>(null);
  const [incluidos, setIncluidos] = useState<Set<string>>(() => new Set(linhas.map(l => l.alunoId)));
  const [aberto, setAberto] = useState<string | null>(null);

  const escolhidas = linhas.filter(l => incluidos.has(l.alunoId));

  // CLASSIF. ATRIBUÍDA: começa na sugestão; o professor muda o que quiser.
  // Fica guardada neste aparelho para não se perder ao fechar o ecrã.
  const chaveClassif = chaveClassificacoes(turmaId, ucId);
  const [classifEscrita, setClassifEscrita] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(chaveClassif) || '{}'); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(chaveClassif, JSON.stringify(classifEscrita)); } catch { /* */ } }, [chaveClassif, classifEscrita]);
  const contas = useMemo(() => Object.fromEntries(linhas.map(l => {
    const c = calculoDoModelo(l, produtos, totalAtividades);
    const sugestao = sugestaoClassificacao(l, produtos, c.cp);
    const escrita = classifEscrita[l.alunoId];
    const n = escrita !== undefined && escrita !== '' ? Number(escrita.replace(',', '.')) : NaN;
    const nota = !isNaN(n) && n >= 0 && n <= 20 ? Math.round(n) : sugestao;
    const erro = erroClassificacao(nota, c.cp);
    return [l.alunoId, { c, sugestao, nota, erro, avisos: [...(erro ? [erro] : []), ...avisosClassificacao(nota, c.total, c.resultado)] }];
  })), [linhas, produtos, totalAtividades, classifEscrita]);
  const classificacoes = Object.fromEntries(escolhidas.map(l => [l.alunoId, contas[l.alunoId]?.nota ?? null]));
  const comAlinea = escolhidas.filter(l => String(classificacaoComNota(contas[l.alunoId].nota)).endsWith('a)'));
  const negativas = comAlinea.length;
  const naoCorrespondem = escolhidas.filter(l => contas[l.alunoId].avisos.length > 0);
  const foraDaFaixa = escolhidas.filter(l => contas[l.alunoId].erro);
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
    return { cabecalho, produtos, linhas: escolhidas, totalAtividades, classificacoes };
  }

  /** Pergunta antes de sair uma pauta com classificações que não batem certo. */
  function confirmarClassificacoes(): boolean {
    // Fora da faixa do Competente não pode sair: tem de se corrigir primeiro.
    if (foraDaFaixa.length) {
      alert('Há classificações fora da faixa do Competente. Corrige antes de continuar:\n\n'
        + foraDaFaixa.map(l => `${l.numero}. ${l.nome} — ${contas[l.alunoId].nota}: ${contas[l.alunoId].erro}`).join('\n'));
      return false;
    }
    if (!naoCorrespondem.length) return true;
    return confirm('Há classificações que não correspondem à folha:\n\n'
      + naoCorrespondem.map(l => `${l.numero}. ${l.nome} — ${contas[l.alunoId].nota}: ${contas[l.alunoId].avisos.join(' ')}`).join('\n')
      + '\n\nQueres continuar assim?');
  }

  async function gerar(tipo: 'xlsx' | 'pdf', partilhar = false) {
    if (!escolhidas.length) { alert('Escolhe pelo menos um aluno.'); return; }
    if (!confirmarClassificacoes()) return;
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
    if (!confirmarClassificacoes()) return;
    guardarEmailDoProfessor(email);
    setAEnviar(true);
    // O que vai por email é a pauta oficial: os mesmos campos de sempre
    // (o script da escola conta com eles), com os valores da folha.
    const oficiais = escolhidas.map(l => {
      const { c, nota } = contas[l.alunoId];
      const s = situacaoRecuperacaoUC(l.alunoId, turmaId, ucId);
      return {
        numero: l.numero, nome: l.nome, alunoId: l.alunoId,
        base: notaDoCompetente(l, produtos), bonusAssiduidade: 0, bonusParticipacao: 0,
        final: nota, presenca: s.presenca, recuperacao: s.precisa,
        motivo: s.motivo === 'faltas' ? 'faltas acima de 10%' : s.motivo === 'negativa' ? 'terminou sem positiva' : '',
        produtos: l.produtos.slice(0, produtos.length),
        cm: l.c5.cm, cp: c.cp, cl: l.c5.cl, co: l.c5.co, cr: l.c5.cr,
        total: Math.round(c.total * 100) / 100, resultado: c.resultado,
        proposta: l.proposta, classificacao: String(classificacaoComNota(nota)),
      };
    });
    const r = await enviarPautaPorEmail(turmaId, ucId, email, nomeProfessor || '', [...incluidos], oficiais);
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
            [`${negativas} com a)`, negativas ? '#fdf0ef' : '#f7f5f2'],
            ...(naoCorrespondem.length ? [[`${naoCorrespondem.length} classificaç${naoCorrespondem.length === 1 ? 'ão' : 'ões'} a rever`, '#fdf0ef']] : []),
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

        {/* 2. Planos de Avaliação e ponderação */}
        <div style={rotulo}>2. Planos de Avaliação e ponderação</div>
        {avaliados.length === 0 ? (
          <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)' }}>
            Ainda não há nenhum plano de aula desta unidade avaliado (validado).
          </div>
        ) : modoPlanos === 'pergunta' ? (
          <div style={{ border: '2px solid var(--sage, #5a7a4e)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>
              Pretende incluir todos os Planos de Avaliação realizados nesta UC?
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', margin: '4px 0 10px', lineHeight: 1.5 }}>
              {avaliados.length} plano{avaliados.length === 1 ? '' : 's'} avaliado{avaliados.length === 1 ? '' : 's'}.
              Recomendado: assim fica à vista todo o percurso do aluno e a nota bate com as avaliações que ele já viu.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setModoPlanos('todos')} style={{ ...botao(true), flex: '2 1 220px' }}>Sim — incluir todos (recomendado)</button>
              <button onClick={() => setModoPlanos('escolher')} style={{ ...botao(false), flex: '1 1 160px' }}>Não, escolher os planos</button>
            </div>
          </div>
        ) : (
          <>
            {modoPlanos === 'escolher' && (
              <>
                {planosEscolhidos.size < avaliados.length && (
                  <div style={{ background: '#fdf0e6', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.5, marginBottom: 8 }}>
                    Deixaste de fora {avaliados.length - planosEscolhidos.size} plano{avaliados.length - planosEscolhidos.size === 1 ? '' : 's'} avaliado{avaliados.length - planosEscolhidos.size === 1 ? '' : 's'}.
                    A nota pode não bater com as avaliações que o aluno viu.
                    <button onClick={() => { setPlanosEscolhidos(new Set(avaliados.map(p => p.id))); setModoPlanos('todos'); }}
                      style={{ marginLeft: 8, border: 'none', background: 'transparent', color: 'var(--sage, #5a7a4e)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                      Incluir todos
                    </button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6, marginBottom: 10 }}>
                  {planosUC.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                      border: '1px solid rgba(26,23,20,0.1)', fontSize: 13.5, cursor: p.avaliado ? 'pointer' : 'default',
                      color: p.avaliado ? 'inherit' : 'rgba(26,23,20,0.45)' }}>
                      <input type="checkbox" disabled={!p.avaliado} checked={p.avaliado && planosEscolhidos.has(p.id)}
                        onChange={() => setPlanosEscolhidos(st => { const t = new Set(st); t.has(p.id) ? t.delete(p.id) : t.add(p.id); return t; })}
                        style={{ width: 18, height: 18 }} />
                      <span style={{ minWidth: 42, color: 'rgba(26,23,20,0.55)' }}>{p.data.slice(8, 10)}/{p.data.slice(5, 7)}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span>
                      {!p.avaliado && <span style={{ fontSize: 12 }}>sem avaliação</span>}
                    </label>
                  ))}
                </div>
              </>
            )}
            {planosUC.some(p => !p.avaliado) && modoPlanos === 'todos' && (
              <div style={{ fontSize: 13, color: '#8a4a15', marginBottom: 8 }}>
                {planosUC.filter(p => !p.avaliado).length} plano(s) realizado(s) ainda sem avaliação validada: não entram até serem validados.
              </div>
            )}
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8, lineHeight: 1.5 }}>
              Cada coluna da pauta é a nota final de um Plano de Avaliação. Pesa pelo número de elementos
              (competências) efetivamente avaliados nele. Uma aula a que o aluno faltou conta 0.
              {produtos.length > 7 && ` São ${produtos.length} planos: a pauta ganha ${produtos.length - 7} coluna${produtos.length - 7 === 1 ? '' : 's'} de produto além das 7 do modelo.`}
              {modoPlanos === 'todos' && (
                <button onClick={() => setModoPlanos('escolher')} style={{ marginLeft: 6, border: 'none', background: 'transparent',
                  color: 'var(--sage, #5a7a4e)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  Escolher planos
                </button>
              )}
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

        {(modoPlanos !== 'pergunta' || avaliados.length === 0) && (<>
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
              <div key={k}><b>{MAPA_5C[k].sigla} {MAPA_5C[k].nome}</b>: {MAPA_5C[k].evidencias}.</div>
            ))}
            <div><b>CP Competente</b>: os Planos de Avaliação, com a ponderação acima.</div>
            <div style={{ marginTop: 4 }}>As atitudes e a higiene e segurança alimentar já contam na nota de cada plano
              (logo no CP) e por isso não entram outra vez nos 5 C's.</div>
          </div>
        </details>
        <div style={{ overflowX: 'auto', border: '1px solid rgba(0,128,128,0.4)', borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>Nº</th><th style={{ ...th, textAlign: 'left' }}>Nome</th>
                {Array.from({ length: nProd }, (_, j) => <th key={j} style={th}>P{j + 1}</th>)}
                {['CM', 'CP', 'CL', 'CO', 'CR', 'TOTAL', 'RESULTADO', 'Proposta aluno', 'Classif.'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {escolhidas.map(l => {
                const { c, sugestao, nota, avisos } = contas[l.alunoId];
                const cel = classificacaoComNota(nota);
                const neg = String(cel).endsWith('a)');
                return (
                  <React.Fragment key={l.alunoId}>
                    <tr onClick={() => setAberto(a => a === l.alunoId ? null : l.alunoId)} style={{ cursor: 'pointer',
                      background: aberto === l.alunoId ? '#eef6f6' : undefined }}>
                      <td style={{ ...td, fontWeight: 700 }}>{l.numero}</td>
                      <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap' }}>{l.nome}</td>
                      {l.produtos.map((v, j) => <td key={j} style={{ ...td, color: v === 0 ? '#c0392b' : undefined }}>{n1(v)}</td>)}
                      <td style={td}>{l.c5.cm ?? '—'}</td>
                      <td style={{ ...td, background: '#ccffff', fontWeight: 700 }}>{c.cp}</td>
                      <td style={td}>{l.c5.cl ?? '—'}</td>
                      <td style={td}>{l.c5.co ?? '—'}</td>
                      <td style={td}>{l.c5.cr ?? '—'}</td>
                      <td style={{ ...td, background: '#ccffff', fontWeight: 700 }}>{n1(c.total)}</td>
                      <td style={{ ...td, background: '#ccffff', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.resultado}</td>
                      <td style={td}>{l.proposta ?? '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap', background: avisos.length ? '#fdf0ef' : undefined }} onClick={e => e.stopPropagation()}>
                        <input value={classifEscrita[l.alunoId] ?? (sugestao ?? '')} inputMode="numeric"
                          onChange={e => setClassifEscrita(m => ({ ...m, [l.alunoId]: e.target.value }))}
                          title={sugestao !== null ? `Sugestão: ${sugestao}` : ''}
                          style={{ width: 38, padding: '4px 3px', textAlign: 'center', fontWeight: 800, fontSize: 14,
                            border: `1.5px solid ${avisos.length ? '#c0392b' : 'rgba(0,128,128,0.45)'}`, borderRadius: 6,
                            color: neg ? '#c0392b' : undefined, fontFamily: 'inherit' }} />
                        {neg && <span style={{ fontWeight: 800, color: '#c0392b', marginLeft: 3 }}>a)</span>}
                        {avisos.length > 0 && <span title={avisos.join(' ')} style={{ marginLeft: 3, color: '#c0392b', fontWeight: 900 }}>!</span>}
                      </td>
                    </tr>
                    {avisos.length > 0 && (
                      <tr>
                        <td colSpan={2 + nProd + 9} style={{ ...td, textAlign: 'left', background: '#fdf0ef', color: '#8e2418', fontSize: 12.5, padding: '5px 10px' }}>
                          {l.numero}. {l.nome}: a classificação {nota} — {avisos.join(' ')}
                          {sugestao !== null && nota !== sugestao && (
                            <button onClick={() => setClassifEscrita(m => { const t = { ...m }; delete t[l.alunoId]; return t; })}
                              style={{ marginLeft: 8, border: 'none', background: 'transparent', color: '#8e2418', fontWeight: 800,
                                cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', fontSize: 12.5 }}>
                              Voltar à sugestão ({sugestao})
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                    {aberto === l.alunoId && (
                      <tr>
                        <td colSpan={2 + nProd + 9} style={{ ...td, textAlign: 'left', background: '#f7fbfb', padding: 12 }}>
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
                              <div style={{ fontWeight: 800, fontSize: 13.5 }}>CP · Competente: {c.cp} <span style={{ fontWeight: 400 }}>(N = {n1(c.cpN)})</span></div>
                              <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.75)' }}>
                                Dos planos, com a ponderação acima. Em valores: {n1(notaDoCompetente(l, produtos))}.
                                Sugestão para a classificação: {sugestao ?? '—'}.
                              </div>
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

        </>)}

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
          <button onClick={enviar} disabled={aEnviar || porResponder} style={{ ...botao(true, !aEnviar && !porResponder), flex: '2 1 200px' }}>
            {aEnviar ? 'A enviar…' : 'Fechar a unidade e enviar a pauta'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FecharUC;
