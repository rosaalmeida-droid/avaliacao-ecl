// ============================================================
// Fechar a unidade — pauta de avaliação
//
// Quando o módulo acaba, o professor tem de fechar a avaliação e mandar
// a pauta para a direção. Ficava à espera de se lembrar, e depois tinha
// de refazer as contas à mão.
//
// Aqui escolhe os alunos que entram (em princípio todos) e os pesos de
// cada plano de aula, vê a pauta com as notas já calculadas, e:
//   - descarrega a pauta no modelo da escola (.ods), com os 5 C's
//     preenchidos e "a)" nas negativas;
//   - partilha o ficheiro (no telemóvel abre o email, o WhatsApp…);
//   - manda a pauta para o email dele, que fica também numa folha
//     própria do ficheiro de dados.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  pautaDaUC, enviarPautaPorEmail, marcarUCFechada,
  emailDoProfessor, guardarEmailDoProfessor, getTurmas,
} from '../backend';
import { modulosDaTurma } from '../cronograma';
import {
  produtosDaUC, linhasDaPautaUC, atividadesDoModulo, gerarPautaODS, nomeFicheiroPauta,
  type CabecalhoPauta,
} from '../pautaUC';

const rotulo: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 800, letterSpacing: '0.05em',
  textTransform: 'uppercase', color: 'rgba(26,23,20,0.55)', margin: '18px 0 8px',
};

export function FecharUC({ turmaId, ucId, ucNome, nomeProfessor, onFechado, onCancelar }: {
  turmaId: string;
  ucId: string;
  ucNome?: string;
  nomeProfessor?: string;
  onFechado: () => void;
  onCancelar: () => void;
}) {
  const linhas = useMemo(() => pautaDaUC(turmaId, ucId), [turmaId, ucId]);
  const produtosIniciais = useMemo(() => produtosDaUC(turmaId, ucId), [turmaId, ucId]);

  const [email, setEmail] = useState(emailDoProfessor());
  const [aEnviar, setAEnviar] = useState(false);
  const [aGerar, setAGerar] = useState(false);
  // Em princípio entram todos; o professor tira quem não deve entrar.
  const [incluidos, setIncluidos] = useState<Set<string>>(() => new Set(linhas.map(l => l.alunoId)));
  const [pesos, setPesos] = useState<Record<string, number>>(
    () => Object.fromEntries(produtosIniciais.map(p => [p.planoId, p.peso])));

  const escolhidas = linhas.filter(l => incluidos.has(l.alunoId));
  const comNota = escolhidas.filter(l => l.final !== null);
  const negativas = comNota.filter(l => Math.round(l.final ?? 0) < 10).length;
  const emRecuperacao = escolhidas.filter(l => l.recuperacao).length;
  const semNota = escolhidas.length - comNota.length;
  const somaPesos = Math.round(produtosIniciais.reduce((s, p) => s + (pesos[p.planoId] || 0), 0) * 10) / 10;

  const n = (x: number | null) => x === null ? '—' : String(Math.round(x * 10) / 10).replace('.', ',');

  function alternar(id: string) {
    setIncluidos(s => { const t = new Set(s); t.has(id) ? t.delete(id) : t.add(id); return t; });
  }

  async function ficheiroDaPauta(): Promise<{ blob: Blob; nome: string }> {
    const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
    const cabecalho: CabecalhoPauta = {
      turma: getTurmas().find(t => t.id === turmaId)?.nome || turmaId,
      disciplina: mod?.disciplina || '',
      formador: nomeProfessor || mod?.docente || '',
      ucId, ucNome: ucNome || mod?.nome || '',
      dataInicio: mod?.dataInicio || '', dataFim: mod?.dataFim || '',
    };
    const produtos = produtosIniciais.map(p => ({ ...p, peso: pesos[p.planoId] || 0 }));
    const todas = linhasDaPautaUC(turmaId, ucId, produtos).filter(l => incluidos.has(l.alunoId));
    const blob = await gerarPautaODS({ cabecalho, produtos, linhas: todas, totalAtividades: atividadesDoModulo(turmaId, ucId) });
    return { blob, nome: nomeFicheiroPauta(cabecalho) };
  }

  async function descarregar() {
    setAGerar(true);
    try {
      const { blob, nome } = await ficheiroDaPauta();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      alert('Não consegui gerar a pauta.\n\n' + (e?.message || ''));
    } finally {
      setAGerar(false);
    }
  }

  // No telemóvel e no Chrome, abre a partilha do sistema: escolhe-se o
  // email e o ficheiro vai anexado.
  const podePartilhar = typeof navigator !== 'undefined' && typeof (navigator as any).canShare === 'function';
  async function partilhar() {
    setAGerar(true);
    try {
      const { blob, nome } = await ficheiroDaPauta();
      const file = new File([blob], nome, { type: blob.type });
      if (!(navigator as any).canShare({ files: [file] })) { await descarregar(); return; }
      await (navigator as any).share({ files: [file], title: nome, text: `Pauta ${ucId} — ${turmaId}` });
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert('Não consegui partilhar a pauta.\n\n' + (e?.message || ''));
    } finally {
      setAGerar(false);
    }
  }

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

  const botao = (principal: boolean): React.CSSProperties => ({
    flex: '1 1 180px', padding: 13, borderRadius: 10, fontSize: 14.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    border: principal ? 'none' : '1px solid rgba(26,23,20,0.18)',
    background: principal ? 'var(--sage, #5a7a4e)' : '#fff', color: principal ? '#fff' : 'inherit',
  });

  return (
    <div onClick={onCancelar} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(26,23,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 760,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Pauta de {ucId}</div>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
          {ucNome} · {turmaId}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 0' }}>
          {[
            [`${escolhidas.length} alunos na pauta`, '#f7f5f2'],
            [`${comNota.length} com nota`, '#eef4eb'],
            [`${negativas} negativas — a)`, negativas ? '#fdf0ef' : '#f7f5f2'],
            [`${emRecuperacao} em recuperação`, emRecuperacao ? '#fdf0e6' : '#f7f5f2'],
            [`${semNota} por avaliar`, semNota ? '#fdf0e6' : '#f7f5f2'],
          ].map(([txt, cor]) => (
            <span key={txt} style={{ padding: '6px 12px', borderRadius: 20, background: cor,
              fontSize: 13, fontWeight: 700 }}>{txt}</span>
          ))}
        </div>

        {/* 1. Os alunos */}
        <div style={rotulo}>1. Alunos que entram na pauta</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setIncluidos(new Set(linhas.map(l => l.alunoId)))} style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.18)', background: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Todos</button>
          <button onClick={() => setIncluidos(new Set())} style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.18)', background: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Nenhum</button>
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

        {/* 2. Os pesos dos planos */}
        <div style={rotulo}>2. Peso de cada plano de aula (produtos)</div>
        {produtosIniciais.length === 0 ? (
          <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)' }}>
            Ainda não há planos de aula publicados desta unidade que já tenham acontecido.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8, lineHeight: 1.5 }}>
              A proposta é pelas horas de cada plano. Muda o que quiseres — o total deve dar 100%.
            </div>
            <div style={{ border: '1px solid rgba(26,23,20,0.12)', borderRadius: 10, overflow: 'hidden' }}>
              {produtosIniciais.map((p, i) => (
                <div key={p.planoId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderTop: i ? '1px solid rgba(26,23,20,0.08)' : 'none', fontSize: 14 }}>
                  <span style={{ fontWeight: 700, minWidth: 22 }}>{i + 1}.</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {p.titulo}
                    <span style={{ color: 'rgba(26,23,20,0.5)', fontSize: 12.5 }}>
                      {' · '}{p.data.split('-').reverse().join('/')}{p.horas ? ` · ${n(p.horas)} h` : ''}
                    </span>
                  </span>
                  <input type="number" min={0} max={100} step={0.1} value={pesos[p.planoId] ?? 0}
                    onChange={e => setPesos(s => ({ ...s, [p.planoId]: Math.max(0, Number(e.target.value) || 0) }))}
                    style={{ width: 72, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)',
                      fontSize: 14, textAlign: 'right', fontFamily: 'inherit' }} />
                  <span>%</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6,
              color: Math.abs(somaPesos - 100) < 0.5 ? '#3E7A31' : '#c0392b' }}>
              Total: {n(somaPesos)}%{Math.abs(somaPesos - 100) < 0.5 ? '' : ' — deve dar 100%'}
            </div>
          </>
        )}

        {/* 3. A pauta */}
        <div style={rotulo}>3. Notas</div>
        {semNota > 0 && (
          <div style={{ background: '#fdf0e6', border: '1px solid var(--copper)', borderRadius: 10,
            padding: '11px 13px', fontSize: 13.5, lineHeight: 1.55, marginBottom: 12 }}>
            Há {semNota} aluno{semNota > 1 ? 's' : ''} sem nenhuma nota nesta unidade. A pauta vai com
            um traço nesses lugares.
          </div>
        )}
        <div style={{ overflowX: 'auto', border: '1px solid rgba(26,23,20,0.12)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#f7f5f2' }}>
                {['Nº', 'Aluno', 'Competências', '+ Assid.', '+ Eventos', 'Final', 'Presença', ''].map(h => (
                  <th key={h} style={{ padding: '9px 10px', textAlign: h === 'Aluno' ? 'left' : 'right',
                    background: '#f7f5f2',
                    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: 'rgba(26,23,20,0.5)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {escolhidas.map(l => (
                <tr key={l.alunoId} style={{ borderTop: '1px solid rgba(26,23,20,0.08)' }}>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{l.numero}</td>
                  <td style={{ padding: '8px 10px' }}>{l.nome}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{n(l.base)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{n(l.bonusAssiduidade)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{n(l.bonusParticipacao)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800,
                    color: l.final === null ? 'rgba(26,23,20,0.4)'
                      : Math.round(l.final) >= 10 ? '#3E7A31' : '#c0392b' }}>
                    {n(l.final)}{l.final !== null && Math.round(l.final) < 10 ? ' a)' : ''}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{l.presenca}%</td>
                  <td style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--copper)' }}>
                    {l.recuperacao ? l.motivo : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {negativas > 0 && (
          <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginTop: 6 }}>
            a) Classificação negativa — módulo em atraso.
          </div>
        )}

        {/* 4. A pauta no modelo da escola */}
        <div style={rotulo}>4. Pauta no modelo da escola</div>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 10, lineHeight: 1.5 }}>
          Um produto por plano de aula, os 5 C's preenchidos (CM 10% · CP 60% · CL 10% · CO 10% · CR 10%)
          e "a)" nas negativas. Abre no LibreOffice ou no Excel; as fórmulas recalculam se mudares alguma nota.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={descarregar} disabled={aGerar || !escolhidas.length} style={{ ...botao(false),
            opacity: aGerar || !escolhidas.length ? 0.6 : 1 }}>
            {aGerar ? 'A preparar…' : 'Descarregar a pauta (.ods)'}
          </button>
          {podePartilhar && (
            <button onClick={partilhar} disabled={aGerar || !escolhidas.length} style={{ ...botao(false),
              opacity: aGerar || !escolhidas.length ? 0.6 : 1 }}>
              Partilhar o ficheiro
            </button>
          )}
        </div>

        {/* 5. Email */}
        <div style={rotulo}>5. Enviar para</div>
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="o.teu.email@eclisboa.net" style={{
            width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 15,
            border: '1px solid rgba(26,23,20,0.2)', fontFamily: 'inherit', boxSizing: 'border-box',
          }} />
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 5, lineHeight: 1.5 }}>
          Recebes um email com o link da pauta. Ela fica no ficheiro de dados da escola,
          numa folha só dela. Para mandar o ficheiro .ods anexado, usa "Partilhar o ficheiro".
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={onCancelar} style={{ ...botao(false), flex: '1 1 120px' }}>Agora não</button>
          <button onClick={enviar} disabled={aEnviar} style={{ ...botao(true), flex: '2 1 200px',
            cursor: aEnviar ? 'default' : 'pointer', opacity: aEnviar ? 0.6 : 1 }}>
            {aEnviar ? 'A enviar…' : 'Fechar a unidade e enviar a pauta'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FecharUC;
