// ============================================================
// Simulação da pauta da UC — para a coordenação ver como sai.
//
// A pauta verdadeira só se faz no fim da UC. Aqui inventam-se alunos e
// notas, e passa-se tudo pelas MESMAS contas e pelo MESMO gerador de
// Excel e PDF da pauta verdadeira. Nada é gravado nem enviado: os alunos
// não existem fora deste ecrã.
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  calculoDoModelo, sugestaoClassificacao, erroClassificacao, avisosClassificacao,
  htmlDaPauta, gerarPautaXLSX, gerarPautaPDF, descarregar, nomeFicheiroPauta,
  type DadosPauta, type LinhaPautaUC, type ProdutoPauta, type Letra5C,
} from '../pautaUC';

const NOMES = [
  'Ana Sofia Martins', 'Bruno Costa Pereira', 'Carla Ferreira Lopes', 'Diogo Almeida Santos',
  'Eva Rodrigues Nunes', 'Filipe Sousa Gomes', 'Gabriela Pinto Rocha', 'Hugo Carvalho Dias',
  'Inês Moreira Teixeira', 'João Ribeiro Mendes', 'Joana Fernandes Cruz', 'Leonor Araújo Vaz',
  'Miguel Correia Reis', 'Nádia Barbosa Faria', 'Pedro Cardoso Neves', 'Rita Monteiro Lima',
  'Rui Tavares Couto', 'Sara Machado Freitas', 'Tiago Castro Pires', 'Vera Nogueira Sá',
  'Xavier Lopes Brito', 'Yara Matos Leal', 'Zé Pedro Antunes', 'Beatriz Gil Moura',
];

/** Números "aleatórios" que se repetem com a mesma semente. */
function gerador(semente: number) {
  let s = semente % 2147483647 || 1;
  return () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
}

/** Tipos de aluno, para a pauta ter de tudo: bons, médios, fracos, faltosos. */
const PERFIS = [
  { nome: 'muito bom', base: 17.5, nivel5C: 6 },
  { nome: 'bom',       base: 15,   nivel5C: 5 },
  { nome: 'suficiente', base: 12,  nivel5C: 4 },
  { nome: 'fraco',     base: 8.5,  nivel5C: 3 },
];

function simular(nAlunos: number, nPlanos: number, semente: number) {
  const r = gerador(semente);
  const titulos = ['Caldos e fundos', 'Molhos base', 'Cortes de legumes', 'Arroz e massas',
    'Peixe — preparação', 'Carnes — assados', 'Sobremesas de colher', 'Almoço pedagógico',
    'Dinâmica de grupo', 'Pastelaria base', 'Ovos', 'Sopas'];

  // Peso de cada plano pelo número de competências avaliadas (como na real).
  const elementos = Array.from({ length: nPlanos }, () => 4 + Math.floor(r() * 7));
  const totalEl = elementos.reduce((s, x) => s + x, 0);
  const produtos: ProdutoPauta[] = elementos.map((el, j) => ({
    numero: j + 1, titulo: titulos[j % titulos.length], planosIds: [`sim_${j}`],
    elementos: el, peso: Math.round((el / totalEl) * 1000) / 10,
  }));
  const soma = produtos.reduce((s, p) => s + p.peso, 0);
  if (produtos.length) produtos[produtos.length - 1].peso = Math.round((produtos[produtos.length - 1].peso + 100 - soma) * 10) / 10;

  const totalAtividades = 3 + Math.floor(r() * 3);
  const linhas: LinhaPautaUC[] = Array.from({ length: nAlunos }, (_, i) => {
    const perfil = PERFIS[Math.floor(r() * PERFIS.length)];
    const notas = produtos.map(() => {
      // 1 vez em 20 o aluno faltou ao plano: conta 0, como na pauta real.
      if (r() < 1 / 20) return 0;
      return Math.max(0, Math.min(20, Math.round((perfil.base + (r() - 0.5) * 5) * 10) / 10));
    });
    const c = (): number => Math.max(1, Math.min(6, perfil.nivel5C + Math.round((r() - 0.5) * 2)));
    const c5: Record<Letra5C, number | null> = { cm: c(), cl: c(), co: c(), cr: c() };
    // Um aluno sem evidência de CR, para se ver o aviso.
    if (i === 2) c5.cr = null;
    const evid = { cm: [], cl: [], co: [], cr: [] } as LinhaPautaUC['evidencias'];
    return {
      alunoId: `sim_aluno_${i + 1}`, numero: i + 1, nome: NOMES[i % NOMES.length],
      atividades: Math.round(totalAtividades * (0.4 + r() * 0.6)),
      produtos: notas, c5, evidencias: evid, proposta: null, justificacao: `Perfil simulado: ${perfil.nome}`,
    };
  });
  return { produtos, linhas, totalAtividades };
}

const n1 = (x: number | null | undefined) => x === null || x === undefined ? '—' : String(Math.round(x * 10) / 10).replace('.', ',');

export function SimulacaoPauta() {
  const [nAlunos, setNAlunos] = useState(12);
  const [nPlanos, setNPlanos] = useState(5);
  const [semente, setSemente] = useState(20260925);
  const [aGerar, setAGerar] = useState<string | null>(null);

  const sim = useMemo(() => simular(nAlunos, nPlanos, semente), [nAlunos, nPlanos, semente]);
  const contas = useMemo(() => sim.linhas.map(l => {
    const c = calculoDoModelo(l, sim.produtos, sim.totalAtividades);
    const nota = sugestaoClassificacao(l, sim.produtos, c.cp);
    return { l, c, nota, avisos: [erroClassificacao(nota, c.cp), ...avisosClassificacao(nota, c.total, c.resultado)].filter(Boolean) as string[] };
  }), [sim]);

  const dados: DadosPauta = {
    cabecalho: {
      turma: 'SIMULAÇÃO', disciplina: 'Tecnologia Alimentar', formador: 'Alunos fictícios — simulação',
      ucId: 'UC-SIMULACAO', ucNome: 'Simulação da pauta (alunos fictícios)',
      dataInicio: '2026-09-15', dataFim: '2026-11-30',
    },
    produtos: sim.produtos, linhas: sim.linhas, totalAtividades: sim.totalAtividades,
    classificacoes: Object.fromEntries(contas.map(x => [x.l.alunoId, x.nota])),
  };

  async function gerar(tipo: 'xlsx' | 'pdf') {
    setAGerar(tipo);
    try {
      const blob = tipo === 'xlsx' ? await gerarPautaXLSX(dados) : await gerarPautaPDF(dados);
      descarregar(blob, nomeFicheiroPauta(dados.cabecalho, tipo));
    } catch (e: any) {
      alert('Não consegui gerar a pauta.\n\n' + (e?.message || ''));
    } finally { setAGerar(null); }
  }

  const resumo = ['Muito bom', 'Bom', 'Suficiente', 'Módulo em atraso']
    .map(r => ({ r, n: contas.filter(x => x.c.resultado === r).length }));

  const campo: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: 80 };
  const th: React.CSSProperties = { padding: '6px', fontSize: 12, background: '#b8cce4', border: '1px solid #008080', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '5px 6px', fontSize: 12.5, border: '1px solid rgba(0,128,128,0.35)', textAlign: 'center' };

  return (
    <div>
      <div style={{ background: '#fff8e1', border: '1px solid #e0b000', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 13.5, lineHeight: 1.5 }}>
        <b>Simulação — alunos fictícios.</b> As notas são inventadas, mas as contas, o modelo e os
        ficheiros são os mesmos da pauta verdadeira. Nada é gravado nem enviado.
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <label style={{ fontSize: 13 }}>Alunos<br />
          <input type="number" min={1} max={24} value={nAlunos} style={campo}
            onChange={e => setNAlunos(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} /></label>
        <label style={{ fontSize: 13 }}>Planos avaliados<br />
          <input type="number" min={1} max={12} value={nPlanos} style={campo}
            onChange={e => setNPlanos(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} /></label>
        <button onClick={() => setSemente(s => s + 7919)} className="btn btn-ghost">🎲 Outros alunos</button>
        <button onClick={() => gerar('xlsx')} disabled={!!aGerar} className="btn btn-primary">
          {aGerar === 'xlsx' ? 'A gerar…' : '⬇ Excel'}</button>
        <button onClick={() => gerar('pdf')} disabled={!!aGerar} className="btn btn-primary">
          {aGerar === 'pdf' ? 'A gerar…' : '⬇ PDF'}</button>
      </div>
      {nPlanos > 7 && (
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginBottom: 10 }}>
          Com mais de 7 planos, a pauta ganha colunas — é assim que sai numa UC longa.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {resumo.map(x => (
          <span key={x.r} style={{ padding: '5px 10px', borderRadius: 20, background: 'var(--cream-dark)', fontSize: 12.5, fontWeight: 700 }}>
            {x.r}: {x.n}
          </span>
        ))}
      </div>

      {/* As contas, aluno a aluno — o que vai para as colunas da pauta. */}
      <div style={{ overflowX: 'auto', marginBottom: 18 }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 700 }}>
          <thead><tr>
            <th style={th}>Nº</th><th style={th}>Nome</th>
            {sim.produtos.map(p => <th key={p.numero} style={th} title={p.titulo}>P{p.numero}<br /><small>{n1(p.peso)}%</small></th>)}
            <th style={th}>CM</th><th style={th}>CP</th><th style={th}>CL</th><th style={th}>CO</th><th style={th}>CR</th>
            <th style={th}>TOTAL</th><th style={th}>RESULTADO</th><th style={th}>CLASSIF.</th>
          </tr></thead>
          <tbody>
            {contas.map(({ l, c, nota, avisos }) => (
              <tr key={l.alunoId} title={avisos.join(' ')} style={{ background: avisos.length ? '#fff4f2' : undefined }}>
                <td style={td}>{l.numero}</td>
                <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap' }}>{l.nome}</td>
                {l.produtos.map((v, j) => <td key={j} style={{ ...td, color: v === 0 ? '#c0392b' : undefined }}>{n1(v)}</td>)}
                <td style={td}>{l.c5.cm ?? '—'}</td><td style={{ ...td, fontWeight: 700 }}>{c.cp}</td>
                <td style={td}>{l.c5.cl ?? '—'}</td><td style={td}>{l.c5.co ?? '—'}</td><td style={td}>{l.c5.cr ?? '—'}</td>
                <td style={td}>{n1(c.total)}</td><td style={td}>{c.resultado}</td>
                <td style={{ ...td, fontWeight: 700, color: (nota ?? 0) < 10 ? '#c0392b' : undefined }}>{nota ?? '—'}{(nota ?? 20) < 10 ? ' a)' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.55)', marginTop: 6 }}>
          0 a vermelho = faltou ao plano (conta 0). — = sem evidência. Linha rosada = a classificação tem um aviso (passe o rato por cima).
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Como sai a pauta (o mesmo desenho do PDF)</div>
      <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff', maxHeight: 600 }}
        dangerouslySetInnerHTML={{ __html: htmlDaPauta(dados) }} />
    </div>
  );
}

export default SimulacaoPauta;
