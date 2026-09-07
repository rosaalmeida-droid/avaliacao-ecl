import React, { useState } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { Aluno } from '../types';
import { getPerfilProfissionalAluno, ItemPerfil } from '../backend';
import { NIVEL_DOMINIO_LABEL } from '../matrizEvidencias';

function corNivel(nivel: number): string {
  if (nivel >= 4) return '#2980b9';
  if (nivel === 3) return 'var(--sage)';
  if (nivel === 2) return 'var(--copper)';
  if (nivel === 1) return '#b8985a';
  return 'rgba(26,23,20,0.3)';
}

function GrupoCompetencias({ titulo, icone, itens }: { titulo: string; icone: string; itens: ItemPerfil[] }) {
  if (itens.length === 0) return null;
  const ordenados = [...itens].sort((a, b) => b.nivel - a.nivel);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--charcoal)' }}>
        {icone} {titulo} ({itens.length})
      </div>
      {ordenados.map(item => (
        <div key={item.competenciaId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 4, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ flex: 1, fontSize: 12 }}>{item.nome}</div>
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700, color: 'white', background: corNivel(item.nivel) }}>
            {NIVEL_DOMINIO_LABEL[item.nivel]}
          </span>
        </div>
      ))}
    </div>
  );
}

import { escreverPerfil } from '../motorAvaliacao';
import { assiduidadeNaUC, leituraAssiduidade } from '../backend';
import { MICROCOMPETENCIAS } from '../compatECL';

export function PerfilProfissionalAluno({ aluno, semTitulo }: {
  aluno: Aluno;
  /** O ecrã já traz cabeçalho violeta próprio — não repetir o título. */
  semTitulo?: boolean;
}) {
  const perfil = getPerfilProfissionalAluno(aluno.id);
  const totalCompetencias = perfil.tecnicas.length + perfil.responsabilidades.length + perfil.atitudes.length;
  const [verDetalhe, setVerDetalhe] = useState(false);

  // A assiduidade faz parte do perfil: faltar é um comportamento, e
  // atinge a responsabilidade e o respeito pelas regras. O aluno tem de
  // ver isso para saber o que melhorar.
  const assid = assiduidadeNaUC(aluno.id, aluno.turmaId);
  const leitura = leituraAssiduidade(assid);

  // Categoria de cada competência, para agrupar por família de trabalho.
  const texto = escreverPerfil(
    [...perfil.tecnicas, ...perfil.responsabilidades, ...perfil.atitudes].map(c => ({
      nome: c.nome,
      categoria: MICROCOMPETENCIAS.find(m => m.id === c.competenciaId)?.categoria,
      nivel: c.nivel,
    }))
  );

  return (
    <div>
      {!semTitulo && (
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          O Meu Perfil Profissional
        </div>
      )}
      <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginBottom: 16, lineHeight: 1.55 }}>
        O que já sabes fazer e o que ainda estás a treinar. Muda ao longo do curso.
      </div>

      {totalCompetencias === 0 && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>
          Ainda não há competências registadas. Vai aparecendo aqui à medida que participas nas aulas.
        </div>
      )}

      {/* Texto, não lista. Uma enumeração de subtécnicas — "cozer massa
          al dente · gratinar" — parece um índice e não diz nada ao aluno
          sobre onde está. O perfil fala-lhe por famílias de trabalho. */}
      {texto.temDados ? (
        <>
          <div style={{ background: 'var(--sage-pale)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--sage)', marginBottom: 8 }}>
              O que já dominas
            </div>
            <div style={{ fontSize: 15, color: 'rgba(26,23,20,0.85)', lineHeight: 1.65 }}>
              {texto.fortes}
            </div>
          </div>

          {/* Assiduidade — antes das competências, porque é a base de
              tudo o resto. Sem estar presente não há nada a demonstrar. */}
          {assid.aulasPrevistas > 0 && (
            <div style={{
              background: leitura.grave ? 'var(--danger-pale, #fdf0ef)'
                        : leitura.atitudesAfetadas.length ? 'var(--copper-pale, #fdf0e6)'
                        : 'var(--sage-pale, #eef4eb)',
              border: `1px solid ${leitura.grave ? 'var(--danger)'
                        : leitura.atitudesAfetadas.length ? 'var(--copper)' : 'var(--sage)'}`,
              borderRadius: 14, padding: 16, marginBottom: 12,
            }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:30, fontWeight:700, lineHeight:1,
                  color: leitura.grave ? 'var(--danger)'
                       : leitura.atitudesAfetadas.length ? 'var(--copper)' : 'var(--sage)' }}>
                  {assid.percentagemPresenca}%
                </span>
                <span style={{ fontSize:14.5, fontWeight:700, color:'rgba(26,23,20,0.7)' }}>
                  de presenças · {assid.presencas} de {assid.aulasPrevistas} aulas
                </span>
              </div>
              <div style={{ fontSize:15, color:'rgba(26,23,20,0.8)', lineHeight:1.6 }}>
                {leitura.texto}
              </div>
              {leitura.atitudesAfetadas.length > 0 && (
                <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', marginTop:9,
                  paddingTop:9, borderTop:'1px solid rgba(26,23,20,0.1)', lineHeight:1.5 }}>
                  Isto pesa na <b>responsabilidade pelas tuas ações</b> e no
                  <b> respeito pelas regras</b> — duas atitudes que estás a ser
                  avaliado.
                </div>
              )}
            </div>
          )}

          {texto.aDesenvolver && (
            <div style={{ background: 'var(--copper-pale)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--copper)', marginBottom: 8 }}>
                O que falta trabalhar
              </div>
              <div style={{ fontSize: 15, color: 'rgba(26,23,20,0.85)', lineHeight: 1.65 }}>
                {texto.aDesenvolver}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: 'var(--sage-pale)', borderRadius: 14, padding: 16, marginBottom: 18,
          fontSize: 15, color: 'rgba(26,23,20,0.75)', lineHeight: 1.6 }}>
          {texto.fortes}
        </div>
      )}

      {/* O detalhe fica fechado: só abre quem quiser ver competência a
          competência. Aberto por omissão, era um muro de texto. */}
      <button
        onClick={() => setVerDetalhe((v: boolean) => !v)}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 12, padding: '13px', fontSize: 14.5, fontWeight: 700,
          color: 'rgba(26,23,20,0.65)', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {verDetalhe ? 'Esconder o detalhe' : `Ver as ${totalCompetencias} competências uma a uma`}
      </button>

      {verDetalhe && (
        <div style={{ marginTop: 14 }}>
          <GrupoCompetencias titulo="Competências Técnicas" icone="🔪" itens={perfil.tecnicas} />
          <GrupoCompetencias titulo="Responsabilidades" icone="⚠️" itens={perfil.responsabilidades} />
          <GrupoCompetencias titulo="Atitudes e Competências Transversais" icone="🪞" itens={perfil.atitudes} />
        </div>
      )}
    </div>
  );
}

export default PerfilProfissionalAluno;
