// ═══════════════════════════════════════════════════════════════
// Alunos externos e as suas recuperações (Rosa, out/2026)
// ═══════════════════════════════════════════════════════════════
// Alunos de fora das turmas que vêm recuperar UC. Ficam no Sheets e em
// todos os aparelhos. O professor da UC e a coordenação criam o plano de
// recuperação, registam o que o aluno entregou e o resultado; o aluno não
// entra na aplicação. Sai uma pauta por UC (imprimir/PDF e Excel).
import React, { useEffect, useMemo, useState } from 'react';
import {
  getAlunosExternos, guardarAlunoExterno, eliminarAlunoExterno, sincronizarExternos, recuperacoesDeExternos,
  ucsParaExternos, criarRecuperacaoExterno, registarEntregaRecuperacao, registarResultadoRecuperacao,
  eliminarRecuperacaoExterno, novoId, MODALIDADES_RECUPERACAO, type AlunoExterno,
} from '../backend';
import { descarregar } from '../pautaUC';

const dataPT = (iso?: string) => iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-PT') : '';
const h1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const campo: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.2)',
  fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const botao = (principal = true): React.CSSProperties => ({ padding: '9px 14px', borderRadius: 9, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 13.5, border: principal ? 'none' : '1px solid rgba(26,23,20,0.2)',
  background: principal ? '#0f766e' : '#fff', color: principal ? '#fff' : 'rgba(26,23,20,0.8)' });
const NOME_MOD: Record<string, string> = { pratico: 'Exercício prático', teorico: 'Trabalho teórico', atividade: 'Numa atividade', outra: 'Outra' };

export function AlunosExternos({ nomeProfessor = '' }: { nomeProfessor?: string }) {
  const [, redesenhar] = useState(0);
  const atualizar = () => redesenhar(n => n + 1);
  const [aSincronizar, setASincronizar] = useState(false);
  const [semRede, setSemRede] = useState(false);
  const [aba, setAba] = useState<'alunos' | 'pauta'>('alunos');
  const [pesquisa, setPesquisa] = useState('');
  const [aEditar, setAEditar] = useState<AlunoExterno | null>(null);
  const [novaRecPara, setNovaRecPara] = useState<AlunoExterno | null>(null);

  async function sincronizar() {
    setASincronizar(true);
    const ok = await sincronizarExternos();
    setSemRede(!ok); setASincronizar(false); atualizar();
  }
  useEffect(() => { sincronizar(); }, []);

  const alunos = getAlunosExternos().sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const recs = recuperacoesDeExternos().filter((r: any) => r.estado !== 'anulada');
  const filtrados = alunos.filter(a => !pesquisa || (a.nome + ' ' + (a.numeroProcesso || '')).toLowerCase().includes(pesquisa.toLowerCase()));

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: '#0f766e', color: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>🌍 Alunos externos — recuperações</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 3, lineHeight: 1.5 }}>
          Alunos de fora das turmas que vêm recuperar UC. O professor da UC e a coordenação registam o plano, o que o aluno
          entregou e o resultado. Fica tudo no Sheets (folhas ALUNOS_EXTERNOS e RECUPERAÇÕES).
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <button style={botao(aba === 'alunos')} onClick={() => setAba('alunos')}>Alunos ({alunos.length})</button>
        <button style={botao(aba === 'pauta')} onClick={() => setAba('pauta')}>Pauta por UC</button>
        <span style={{ flex: 1 }} />
        <button style={botao(false)} onClick={sincronizar} disabled={aSincronizar}>{aSincronizar ? 'A atualizar…' : '↻ Atualizar'}</button>
      </div>
      {semRede && <div style={{ fontSize: 13, color: '#8e2418', marginBottom: 10 }}>Sem ligação ao Sheets: mostra o que está neste aparelho.</div>}

      {aba === 'alunos' && (<>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Procurar pelo nome ou nº de processo" style={{ ...campo, flex: 1 }} />
          <button style={botao()} onClick={() => setAEditar({ id: novoId('ext'), nome: '', criadoEm: new Date().toISOString() })}>+ Aluno externo</button>
        </div>
        {filtrados.length === 0 && <div style={{ textAlign: 'center', padding: 28, color: 'rgba(26,23,20,0.5)' }}>Ainda não há alunos externos.</div>}
        {filtrados.map(a => {
          const dele = recs.filter(r => r.alunoId === a.id);
          return (
            <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 10, border: '1px solid rgba(26,23,20,0.1)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{a.nome}</div>
                  <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
                    {[a.numeroProcesso && `Nº ${a.numeroProcesso}`, a.turmaOrigem, a.cursoOrigem, a.anoLetivo].filter(Boolean).join(' · ') || 'Sem dados de origem'}
                  </div>
                </div>
                <button style={botao()} onClick={() => setNovaRecPara(a)}>+ Recuperação</button>
                <button style={botao(false)} onClick={() => setAEditar({ ...a })}>Editar</button>
              </div>
              {dele.length === 0 && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 8 }}>Sem recuperações.</div>}
              {dele.map(r => <CartaoRecuperacao key={r.id} r={r} nomeProfessor={nomeProfessor} onMudou={atualizar} />)}
            </div>
          );
        })}
      </>)}

      {aba === 'pauta' && <PautaExternos />}

      {aEditar && <FormAluno a={aEditar} onFechar={() => setAEditar(null)} onGuardado={() => { setAEditar(null); atualizar(); }} />}
      {novaRecPara && <FormRecuperacao a={novaRecPara} nomeProfessor={nomeProfessor} onFechar={() => setNovaRecPara(null)}
        onCriada={() => { setNovaRecPara(null); atualizar(); }} />}
    </div>
  );
}

function Modal({ titulo, children, onFechar }: { titulo: string; children: React.ReactNode; onFechar: () => void }) {
  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>{titulo}</div>
        {children}
      </div>
    </div>
  );
}

function FormAluno({ a, onFechar, onGuardado }: { a: AlunoExterno; onFechar: () => void; onGuardado: () => void }) {
  const [d, setD] = useState<AlunoExterno>(a);
  const novo = !getAlunosExternos().some(x => x.id === a.id);
  const linha = (rotulo: string, k: keyof AlunoExterno, ph = '', tipo = 'text') => (
    <label key={k} style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 9 }}>{rotulo}
      <input type={tipo} value={String(d[k] || '')} placeholder={ph} onChange={e => setD({ ...d, [k]: e.target.value })} style={{ ...campo, marginTop: 4 }} />
    </label>
  );
  return (
    <Modal titulo={novo ? 'Novo aluno externo' : 'Editar aluno externo'} onFechar={onFechar}>
      {linha('Nome completo *', 'nome', 'Nome do aluno')}
      {linha('Nº de processo', 'numeroProcesso', 'Ex.: 2026/001')}
      {linha('Escola ou turma de origem', 'turmaOrigem', 'Ex.: 3º ACP — Escola X')}
      {linha('Curso de origem', 'cursoOrigem')}
      {linha('Ano letivo', 'anoLetivo', 'Ex.: 2026/27')}
      {linha('Contacto', 'contacto', 'Telefone ou email')}
      {linha('Observações', 'observacoes')}
      {(d.localFCT || d.supervisorFCT) && (<>{linha('Empresa FCT', 'localFCT')}{linha('Supervisor FCT', 'supervisorFCT')}</>)}
      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <button style={botao(false)} onClick={onFechar}>Cancelar</button>
        {!novo && <button style={{ ...botao(false), color: '#c0392b', borderColor: '#c0392b' }} onClick={() => {
          if (!confirm(`Eliminar ${d.nome}? As recuperações dele ficam registadas no Sheets.`)) return;
          eliminarAlunoExterno(d.id); onGuardado();
        }}>Eliminar</button>}
        <span style={{ flex: 1 }} />
        <button style={botao()} onClick={() => { if (!d.nome.trim()) { alert('Escreva o nome.'); return; } guardarAlunoExterno({ ...d, nome: d.nome.trim() }); onGuardado(); }}>Guardar</button>
      </div>
    </Modal>
  );
}

function FormRecuperacao({ a, nomeProfessor, onFechar, onCriada }: { a: AlunoExterno; nomeProfessor: string; onFechar: () => void; onCriada: () => void }) {
  const ucs = useMemo(() => ucsParaExternos(), []);
  const [ucId, setUcId] = useState('');
  const [modalidade, setModalidade] = useState<'pratico' | 'teorico' | 'atividade' | 'outra'>('pratico');
  const [descricao, setDescricao] = useState(MODALIDADES_RECUPERACAO[0].sugestao);
  const [prazo, setPrazo] = useState(() => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [professor, setProfessor] = useState(nomeProfessor);
  return (
    <Modal titulo={`Plano de recuperação — ${a.nome}`} onFechar={onFechar}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 9 }}>UC a recuperar
        <select value={ucId} onChange={e => setUcId(e.target.value)} style={{ ...campo, marginTop: 4 }}>
          <option value="">Escolher…</option>
          {ucs.map(u => <option key={u.id} value={u.id}>{u.ano ? `${u.ano}º ano · ` : ''}{u.id} — {u.nome}</option>)}
        </select></label>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Como recupera</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
        {MODALIDADES_RECUPERACAO.filter(m => m.id !== 'atividade').map(m => (
          <button key={m.id} style={botao(modalidade === m.id)} onClick={() => { setModalidade(m.id); setDescricao(m.sugestao === 'Definida pelo professor.' ? '' : m.sugestao); }}>{m.nome}</button>
        ))}
      </div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 9 }}>O que tem de fazer
        <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} style={{ ...campo, marginTop: 4 }} /></label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 700, flex: '1 1 160px' }}>Prazo
          <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} style={{ ...campo, marginTop: 4 }} /></label>
        <label style={{ fontSize: 13, fontWeight: 700, flex: '2 1 220px' }}>Professor da UC
          <input value={professor} onChange={e => setProfessor(e.target.value)} style={{ ...campo, marginTop: 4 }} /></label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button style={botao(false)} onClick={onFechar}>Cancelar</button>
        <span style={{ flex: 1 }} />
        <button style={botao()} onClick={() => {
          const uc = ucs.find(u => u.id === ucId);
          if (!uc) { alert('Escolha a UC.'); return; }
          if (!descricao.trim()) { alert('Escreva o que o aluno tem de fazer.'); return; }
          criarRecuperacaoExterno(a, uc, modalidade, descricao.trim(), prazo, professor.trim());
          onCriada();
        }}>Criar o plano</button>
      </div>
    </Modal>
  );
}

function CartaoRecuperacao({ r, nomeProfessor, onMudou }: { r: any; nomeProfessor: string; onMudou: () => void }) {
  const [modo, setModo] = useState<'' | 'entrega' | 'resultado'>('');
  const [texto, setTexto] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');
  const feita = r.estado === 'concluida';
  return (
    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: feita ? '#eef4eb' : '#f7f5f2', fontSize: 13.5, lineHeight: 1.5 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <b style={{ flex: 1 }}>{r.ucId} — {r.ucNome}</b>
        <span style={{ fontWeight: 700, color: feita ? '#3E7A31' : '#b5651d' }}>
          {feita ? `Recuperado: ${h1(r.resultadoNota)} valores${r.resultadoNota < 10 ? ' (negativa)' : ''}` : 'Em curso'}</span>
      </div>
      <div>{NOME_MOD[r.modalidade] || ''}{r.descricaoPlano ? ` — ${r.descricaoPlano}` : ''}{r.dataLimite ? ` · até ${dataPT(r.dataLimite)}` : ''}
        {r.professorAvaliador ? ` · Professor: ${r.professorAvaliador}` : ''}</div>
      {(r.entregas || []).length > 0 && (
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {(r.entregas || []).map((e: any, i: number) => <li key={i}>{dataPT(e.data)} — {e.descricao}</li>)}
        </ul>
      )}
      {feita && r.comentarioProfessor && <div style={{ color: 'rgba(26,23,20,0.7)' }}>Observação: {r.comentarioProfessor}</div>}
      {!feita && modo === '' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          <button style={botao(false)} onClick={() => setModo('entrega')}>Registar o que entregou</button>
          <button style={botao()} onClick={() => setModo('resultado')}>Registar o resultado</button>
          <button style={{ ...botao(false), color: '#c0392b' }} onClick={() => { if (confirm('Anular esta recuperação?')) { eliminarRecuperacaoExterno(r.id); onMudou(); } }}>Anular</button>
        </div>
      )}
      {modo === 'entrega' && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...campo, width: 150 }} />
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="O que entregou ou fez" style={{ ...campo, flex: '1 1 220px', width: 'auto' }} />
          <button style={botao(false)} onClick={() => setModo('')}>Cancelar</button>
          <button style={botao()} onClick={() => { if (!texto.trim()) return; registarEntregaRecuperacao(r.id, texto.trim(), data, nomeProfessor); setTexto(''); setModo(''); onMudou(); }}>Guardar</button>
        </div>
      )}
      {modo === 'resultado' && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="number" min={0} max={20} step={0.5} value={nota} onChange={e => setNota(e.target.value)} placeholder="0 a 20" style={{ ...campo, width: 100 }} />
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Observação (opcional)" style={{ ...campo, flex: '1 1 220px', width: 'auto' }} />
          <button style={botao(false)} onClick={() => setModo('')}>Cancelar</button>
          <button style={botao()} onClick={() => {
            const n = Number(nota.replace(',', '.'));
            if (nota === '' || isNaN(n) || n < 0 || n > 20) { alert('Escreva o resultado, de 0 a 20.'); return; }
            registarResultadoRecuperacao(r.id, n, texto.trim(), nomeProfessor || r.professorAvaliador); setModo(''); onMudou();
          }}>Guardar o resultado</button>
        </div>
      )}
    </div>
  );
}

/** Uma pauta por UC com os alunos externos que a recuperaram (ou estão a recuperar). */
function PautaExternos() {
  const recs = recuperacoesDeExternos().filter((r: any) => r.estado !== 'anulada');
  const alunos = new Map(getAlunosExternos().map(a => [a.id, a]));
  const ucs = [...new Map(recs.map((r: any) => [r.ucId, r.ucNome || ''])).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const [ucId, setUcId] = useState('');
  const linhas = recs.filter((r: any) => r.ucId === ucId).map((r: any) => {
    const a: any = alunos.get(r.alunoId) || { nome: r.nomeAluno || r.alunoId };
    const feita = r.estado === 'concluida';
    const nota = feita && typeof r.resultadoNota === 'number' ? Math.round(r.resultadoNota) : null;
    return {
      processo: a.numeroProcesso || '', nome: a.nome, origem: [a.turmaOrigem, a.cursoOrigem].filter(Boolean).join(' · '),
      como: NOME_MOD[r.modalidade] || '', entregas: (r.entregas || []).map((e: any) => `${dataPT(e.data)}: ${e.descricao}`).join('; '),
      resultado: feita ? h1(r.resultadoNota) : 'Em curso', classificacao: nota === null ? '' : nota < 10 ? `${nota} a)` : String(nota),
      data: feita ? dataPT(r.realizadaEm) : '', professor: r.professorAvaliador || '',
    };
  }).sort((x, y) => x.nome.localeCompare(y.nome, 'pt'));
  const ucNome = ucs.find(u => u[0] === ucId)?.[1] || '';
  const cab = ['Nº processo', 'Aluno', 'Origem', 'Como recuperou', 'O que entregou', 'Resultado (0-20)', 'Classificação', 'Data', 'Professor'];
  const vals = (l: any) => [l.processo, l.nome, l.origem, l.como, l.entregas, l.resultado, l.classificacao, l.data, l.professor];

  async function excel() {
    const ExcelJS: any = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Pauta');
    ws.addRow([`PAUTA DE RECUPERAÇÃO — ALUNOS EXTERNOS`]).font = { bold: true, size: 13 };
    ws.addRow([`${ucId} — ${ucNome}`]).font = { bold: true };
    ws.addRow([`Escola de Comércio de Lisboa · ${new Date().toLocaleDateString('pt-PT')}`]);
    ws.addRow([]);
    const h = ws.addRow(cab); h.font = { bold: true }; h.eachCell((c: any) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8CCE4' } }; });
    linhas.forEach(l => ws.addRow(vals(l)));
    [14, 30, 26, 18, 40, 14, 14, 12, 22].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    const buf = await wb.xlsx.writeBuffer();
    descarregar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Pauta externos ${ucId}.xlsx`);
  }
  function imprimir() {
    const w = window.open('', '_blank');
    if (!w) { alert('O navegador bloqueou a janela. Permite janelas para esta página.'); return; }
    const esc = (s: string) => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);
    w.document.write(`<html><head><meta charset="utf-8"><title>Pauta externos ${esc(ucId)}</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#111} h1{font-size:17px;margin:0 0 4px} h2{font-size:14px;margin:0 0 14px;font-weight:normal}
      table{border-collapse:collapse;width:100%;font-size:12px} th,td{border:1px solid #008080;padding:5px 6px;text-align:left;vertical-align:top} th{background:#b8cce4}
      .ass{margin-top:40px;display:flex;gap:60px;font-size:12px} .ass div{border-top:1px solid #333;padding-top:4px;width:240px}</style></head><body>
      <h1>PAUTA DE RECUPERAÇÃO — ALUNOS EXTERNOS</h1><h2>${esc(ucId)} — ${esc(ucNome)} · Escola de Comércio de Lisboa · ${new Date().toLocaleDateString('pt-PT')}</h2>
      <table><tr>${cab.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
      ${linhas.map(l => `<tr>${vals(l).map((v: string) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table>
      <div class="ass"><div>O professor da UC</div><div>A coordenação</div></div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(26,23,20,0.1)' }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Pauta de recuperação por UC</div>
      {ucs.length === 0 ? <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)' }}>Ainda não há recuperações de alunos externos.</div> : (<>
        <select value={ucId} onChange={e => setUcId(e.target.value)} style={{ ...campo, maxWidth: 480 }}>
          <option value="">Escolher a UC…</option>
          {ucs.map(([id, nome]) => <option key={id} value={id}>{id} — {nome}</option>)}
        </select>
        {ucId && (<>
          <div style={{ overflowX: 'auto', margin: '12px 0' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: 760, fontSize: 13 }}>
              <thead><tr>{cab.map(c => <th key={c} style={{ background: '#b8cce4', border: '1px solid #008080', padding: 6, textAlign: 'left' }}>{c}</th>)}</tr></thead>
              <tbody>{linhas.map((l, i) => <tr key={i}>{vals(l).map((v: string, j: number) => <td key={j} style={{ border: '1px solid rgba(0,128,128,0.35)', padding: '5px 6px', verticalAlign: 'top' }}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={botao()} onClick={imprimir}>Imprimir / PDF</button>
            <button style={botao(false)} onClick={excel}>Descarregar em Excel</button>
          </div>
        </>)}
      </>)}
    </div>
  );
}

export default AlunosExternos;
