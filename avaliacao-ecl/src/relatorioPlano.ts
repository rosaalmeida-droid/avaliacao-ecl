// ============================================================
// Relatório de um plano de aula, para imprimir ou guardar em PDF
// (Rosa, out/2026: «não se consegue produzir relatórios do plano»).
// O plano (dados, sumário, fichas, o que os alunos respondem) e, se a
// aula já aconteceu, a presença e a autoavaliação de cada aluno.
// ============================================================
import type { PlanoAula } from './types';
import {
  getAlunos, getFichasProducao, getPresencas, ultimaResposta, validacaoDaAula, calculoDaAulaValidada,
  atrasoConta, contextoDoPlano, perguntaCODaAula, perguntaCRDaAula,
} from './backend';
import { rotuloDoPlano } from './rotuloPlano';
import { sumarioDoPlano } from './sumarioAutomatico';
import { getReferencialUC } from './referencial811RA144';
import { ecrasDoAluno } from './autoavaliacaoDaAula';
import { abrirEImprimir, paginaA4, esc } from './imprimir';

const virgula = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

export function htmlRelatorioPlano(plano: PlanoAula): string {
  const p: any = plano;
  const fichas = getFichasProducao().filter(f => (plano.fichasIds || []).includes(f.id));
  let nomeUC = p.ucNome || '';
  if (!nomeUC && plano.ucId) { try { nomeUC = getReferencialUC(plano.ucId)?.nome || ''; } catch { /* */ } }
  const dataLonga = plano.data ? new Date(String(plano.data).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  let sumario = '';
  try { sumario = sumarioDoPlano(plano, fichas); } catch { /* */ }
  let perguntas: { rotulo: string; nome: string }[] = [];
  try {
    perguntas = ecrasDoAluno(plano, fichas, contextoDoPlano(plano), perguntaCODaAula(plano.id), perguntaCRDaAula(plano.id), 1).ecras
      .map((e: any) => ({ rotulo: e.rotulo, nome: e.tipo === 'escolhe' ? String(e.nome).replace(/^Escolhe 1: /, '') : e.nome }));
  } catch { /* plano sem dados suficientes */ }

  const linhaDados = (k: string, v: string) => v ? `<tr><th style="width:28%">${esc(k)}</th><td>${esc(v)}</td></tr>` : '';
  let corpo = `<h1>${esc(rotuloDoPlano(plano))}</h1>
<div class="sub">${esc(plano.turmaId)}${plano.professor ? ' · ' + esc(plano.professor) : ''}</div>
<h2>O plano</h2>
<table>
${linhaDados('Data', dataLonga)}
${linhaDados('Horário', plano.horaInicio ? `${plano.horaInicio}–${plano.horaFim || ''}` : '')}
${linhaDados('Unidade (UC)', [plano.ucId, nomeUC].filter(Boolean).join(' — '))}
${linhaDados('Tipo de aula', p.tipoAtividade || '')}
${linhaDados('Estado', plano.estado === 'publicado' ? 'Publicado' : plano.estado === 'arquivado' ? 'Arquivado' : 'Rascunho')}
</table>`;
  if (sumario) corpo += `<h2>Sumário</h2><p>${esc(sumario)}</p>`;
  if (fichas.length) {
    corpo += `<h2>Fichas técnicas</h2><ul>${fichas.map(f =>
      `<li><b>${esc(f.nomePrato)}</b>${f.classificacao ? ' · ' + esc(f.classificacao) : ''}${f.numPorcoes ? ' · ' + esc(f.numPorcoes) + ' doses' : ''}</li>`).join('')}</ul>`;
  }
  if (perguntas.length) {
    corpo += `<h2>O que os alunos avaliam (${perguntas.length})</h2><ol>${perguntas.map(q =>
      `<li>${esc(q.rotulo)}: <b>${esc(q.nome)}</b></li>`).join('')}</ol>`;
  }
  if (p.observacoes) corpo += `<h2>Observações</h2><p>${esc(p.observacoes)}</p>`;

  // A turma na aula: só quando a aula já tem registos.
  const alunos = getAlunos().filter(a => a.turmaId === plano.turmaId && a.ativo !== false && a.numero !== 99 && a.numero !== 88)
    .sort((a, b) => (a.numero || 0) - (b.numero || 0));
  const presencas = getPresencas().filter(x => x.planoAulaId === plano.id);
  const temRegistos = presencas.length > 0 || alunos.some(a => ultimaResposta(a.id, plano.id));
  if (temRegistos && alunos.length) {
    let somaNotas = 0, nNotas = 0;
    const linhas = alunos.map(a => {
      const pr = presencas.find(x => x.alunoId === a.id);
      const presenca = !pr ? '—' : !pr.presente ? 'Falta' : atrasoConta(pr, plano.id) ? `Atraso${pr.atrasadoMins ? ` (${pr.atrasadoMins} min)` : ''}` : 'Presente';
      const sel = ultimaResposta(a.id, plano.id);
      const val = validacaoDaAula(a.id, plano.id);
      const calc = val ? calculoDaAulaValidada(val) : null;
      if (calc) { somaNotas += calc.nota20; nNotas++; }
      const auto = val ? 'Validada' : sel ? 'Por validar' : pr?.presente ? 'Em falta' : '—';
      return `<tr><td>${a.numero}</td><td>${esc(a.nome || '')}</td><td>${presenca}</td><td>${auto}</td><td style="text-align:right">${calc ? virgula(calc.nota20) : ''}</td></tr>`;
    }).join('');
    const nPres = presencas.filter(x => x.presente).length;
    corpo += `<h2>A turma nesta aula</h2>
<div class="sub">${nPres} de ${alunos.length} alunos presentes${nNotas ? ` · média das notas validadas: ${virgula(somaNotas / nNotas)}` : ''}.</div>
<table><tr><th style="width:6%">N.º</th><th>Nome</th><th style="width:16%">Presença</th><th style="width:18%">Autoavaliação</th><th style="width:10%;text-align:right">Nota</th></tr>${linhas}</table>`;
  }
  return paginaA4(rotuloDoPlano(plano), corpo);
}

export function imprimirRelatorioPlano(plano: PlanoAula): void {
  abrirEImprimir(htmlRelatorioPlano(plano));
}
