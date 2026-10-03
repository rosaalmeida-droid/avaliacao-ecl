// ============================================================
// O que os colegas dizem deste aluno — na validação do professor
// (Rosa, out/2026). Não conta para a nota: ajuda o professor a validar
// as atitudes e os 5 C. Mostra, aula a aula, quem disse o quê; avisa
// quando o aluno se avalia bem mais alto do que os colegas o veem; e
// tira da média o que é muito diferente do resto (pode ser conflito
// entre colegas). O professor diz se teve em conta.
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  oQueOsColegasDizem, LIGACOES_PARES, TEXTO_RESPOSTA_PAR, palavraDosColegas, sincronizarGrupos, getPlanosAula,
  type DimensaoPar,
} from '../backend';
import { rotuloPlano } from '../rotuloPlano';
import { nomeCompetencia } from '../compatECL';

const V = '#6B3FA0';

/** O aluno avaliou-se alto nesta pergunta dos colegas (nas atitudes ligadas ou no C)? */
function autoavaliacaoAlta(dim: DimensaoPar, autoavaliacoes: any[], triagem: any): boolean {
  const lig = LIGACOES_PARES[dim];
  const ati = (autoavaliacoes || []).filter(a => lig.atitudes.includes(a.competenciaId) && Number(a.nota) > 0);
  if (ati.some(a => Number(a.nota) >= 3)) return true;
  const r = triagem?.[lig.c];
  return typeof r === 'number' && r >= 2;
}

export function ColegasNaValidacao({ alunoId, turmaId, autoavaliacoes, triagemDoAluno, tidoEmConta, onTidoEmConta }: {
  alunoId: string; turmaId: string; autoavaliacoes: any[]; triagemDoAluno: any;
  tidoEmConta: boolean; onTidoEmConta: (v: boolean) => void;
}) {
  const [, redesenhar] = useState(0);
  const [aberta, setAberta] = useState<DimensaoPar | null>(null);
  // As avaliações entre colegas de toda a turma (também as de aulas anteriores).
  useEffect(() => {
    let vivo = true;
    sincronizarGrupos(turmaId, true).catch(() => {}).finally(() => { if (vivo) redesenhar(n => n + 1); });
    return () => { vivo = false; };
  }, [turmaId]);

  const dados = oQueOsColegasDizem(alunoId).filter(d => d.respostas.length > 0);
  if (!dados.length) return null;
  const planos = new Map(getPlanosAula().map(p => [p.id, p]));

  return (
    <div style={{ background: '#fff', border: `1.5px solid ${V}55`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: V }}>
        O que os colegas de grupo dizem deste aluno
      </div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', margin: '4px 0 10px', lineHeight: 1.5 }}>
        Não conta para a nota. Serve para ajudar o professor a validar as atitudes e os 5 C. O que é muito diferente do que os outros
        colegas disseram na mesma aula fica fora da média (pode ser conflito entre eles).
      </div>
      {dados.map(d => {
        const lig = LIGACOES_PARES[d.dimensao];
        const palavra = palavraDosColegas(d.media, d.dimensao);
        const diferenca = d.media !== null && d.media < 2 && autoavaliacaoAlta(d.dimensao, autoavaliacoes, triagemDoAluno);
        return (
          <div key={d.dimensao} style={{ borderTop: '1px solid rgba(26,23,20,0.08)', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{lig.pergunta}</span>
              <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)' }}>
                ajuda em: {lig.atitudes.map(id => { try { return nomeCompetencia(id); } catch { return id; } }).join(', ')} · {lig.nomeC}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14 }}>Os colegas dizem: <b>{palavra || '—'}</b></span>
              <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)' }}>
                ({d.colegas} colega{d.colegas === 1 ? '' : 's'}, {d.aulas} aula{d.aulas === 1 ? '' : 's'})
              </span>
              <button onClick={() => setAberta(aberta === d.dimensao ? null : d.dimensao)}
                style={{ marginLeft: 'auto', fontSize: 12.5, padding: '3px 10px', borderRadius: 7, border: `1px solid ${V}`, background: '#fff', color: V, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                {aberta === d.dimensao ? 'Fechar' : 'Ver aula a aula'}
              </button>
            </div>
            {diferenca && (
              <div style={{ marginTop: 6, fontSize: 13, padding: '6px 9px', borderRadius: 8, background: '#fff4e0', color: '#8a5a12', lineHeight: 1.45 }}>
                ⚠ O aluno avalia-se com nível alto aqui, mas a resposta dos colegas é «<b>{palavra}</b>». Confirme com o que observou.
              </div>
            )}
            {aberta === d.dimensao && (
              <div style={{ marginTop: 6 }}>
                {d.respostas.map((r, i) => {
                  const p: any = planos.get(r.planoAulaId);
                  return (
                    <div key={i} style={{ fontSize: 13, padding: '5px 8px', borderRadius: 7, marginBottom: 3,
                      background: r.foraDoComum ? 'rgba(192,57,43,0.07)' : 'rgba(26,23,20,0.03)' }}>
                      <b>{r.data.split('-').reverse().slice(0, 2).join('/')}</b> · {p ? rotuloPlano(p) : 'aula'} · <b>{r.avaliadorNome}</b> disse: «{TEXTO_RESPOSTA_PAR[d.dimensao][r.valor - 1] || r.valor}»
                      {r.comentario ? <> · comentário: «{r.comentario}»</> : null}
                      {r.foraDoComum && <span style={{ color: '#a23a2e', fontWeight: 700 }}> · muito diferente dos outros colegas: fora da média</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, fontSize: 14, cursor: 'pointer', lineHeight: 1.4 }}>
        <input type="checkbox" checked={tidoEmConta} onChange={e => onTidoEmConta(e.target.checked)} style={{ marginTop: 3 }} />
        <span><b>Tive em conta a opinião dos colegas nesta validação.</b> Fica registado e aparece na avaliação final da UC. Se não marcares, não aparece em lado nenhum.</span>
      </label>
    </div>
  );
}
