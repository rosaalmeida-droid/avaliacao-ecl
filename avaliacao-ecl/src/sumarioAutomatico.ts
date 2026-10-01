// ============================================================
// Sumário feito pela aplicação
// ============================================================
// O professor não tem tempo para escrever sumários (Rosa, out/2026): a
// aplicação escreve-o a partir do que está no plano — o tipo de aula, o
// tema e os conteúdos do manual, os indicadores trabalhados, os pratos e as
// técnicas das fichas, a forma de trabalho. O professor só o muda se
// quiser; enquanto não escrever o dele, vale este, e atualiza-se sozinho
// quando o plano muda.
// ============================================================
import type { PlanoAula, FichaProducao } from './types';
import { codigosDasLinhas, encontrarSubtecnica, encontrarAparelho, ATITUDES } from './compatECL';
import { triagemDoPlano, tipoDe } from './contextoAula';

const semPonto = (t: string) => t.trim().replace(/[.;:]+$/, '');
const minuscula = (t: string) => t ? t[0].toLowerCase() + t.slice(1) : t;
const lista = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`;

export function sumarioAutomatico(plano: PlanoAula, fichas: FichaProducao[]): string {
  const p: any = plano;
  const t = triagemDoPlano(plano);
  const tipo = t ? tipoDe(t) : String(p.tipoPlanAula || '').replace('_obr', '');
  const linhas: string[] = [];

  // Tema e conteúdos (do manual) e os indicadores trabalhados.
  const conh: { texto: string; capitulo?: string; tema?: string }[] = Array.isArray(p.conhecimentosProf) ? p.conhecimentosProf : [];
  const porConteudo = new Map<string, { tema?: string; indicadores: string[] }>();
  const soltos: string[] = [];
  for (const k of conh) {
    if (k.capitulo) {
      const titulo = k.capitulo.replace(/^Manual, Cap\. \d+ — /i, '').replace(/^Manual, cap\. \d+ — /i, '');
      const g = porConteudo.get(titulo) || { tema: k.tema, indicadores: [] };
      g.indicadores.push(minuscula(semPonto(k.texto)));
      porConteudo.set(titulo, g);
    } else soltos.push(minuscula(semPonto(k.texto)));
  }
  const temas = [...new Set([...porConteudo.values()].map(g => g.tema).filter(Boolean))] as string[];
  if (temas.length) linhas.push(`${temas.join('; ')}.`);
  for (const [titulo, g] of porConteudo) linhas.push(`${titulo}: ${lista(g.indicadores)}.`);
  if (soltos.length) linhas.push(`Conhecimentos: ${lista(soltos)}.`);

  // Produção: os pratos e as técnicas das fichas.
  if (tipo === 'pratico' || tipo === 'misto') {
    const pratos = fichas.map(f => f.nomePrato).filter(Boolean);
    if (pratos.length) linhas.push(`Produção: ${lista(pratos)}.`);
    const tecnicas = [...new Set(fichas.flatMap((f: any) => [
      ...codigosDasLinhas(f.tecnicasSugeridas, 'SUB-').map(id => encontrarSubtecnica(id)?.nome || ''),
      ...codigosDasLinhas(f.aparelhosDetectados, 'APP-').map(id => encontrarAparelho(id)?.nome || ''),
    ]).filter(Boolean).map(minuscula))];
    if (tecnicas.length) linhas.push(`Técnicas: ${lista(tecnicas.slice(0, 8))}.`);
  }

  // Aula atitudinal: as atitudes trabalhadas.
  if (tipo === 'atitudinal') {
    const atitudes = ((p.compAdicionadas || []) as string[]).filter(id => id.startsWith('ATI-'))
      .map(id => ATITUDES.find(a => a.id === id)?.nome).filter(Boolean) as string[];
    linhas.push(atitudes.length ? `Dinâmica de grupo: ${lista(atitudes.map(minuscula))}.` : 'Dinâmica de grupo e trabalho de atitudes.');
  }

  // Como se trabalhou.
  if (t) {
    const como = t.trabalho === 'grupos' ? 'Trabalho em grupos' : t.trabalho === 'individual' ? 'Trabalho individual' : 'Trabalho com a turma toda';
    const onde = t.onde === 'fora' ? ', fora da escola' : '';
    linhas.push(`${como}${onde}${t.servico && (tipo === 'pratico' || tipo === 'misto') ? ', com serviço a clientes' : ''}.`);
  }
  if (tipo === 'teorico' && porConteudo.size) linhas.push('Leitura e trabalho no Manual do Aluno.');
  return linhas.join('\n');
}

/** O sumário da aula: o que o professor escreveu, ou o feito pela aplicação. */
export function sumarioDoPlano(plano: PlanoAula, fichas: FichaProducao[]): string {
  const escrito = String((plano as any).sumario || '').trim();
  return escrito || sumarioAutomatico(plano, fichas);
}
