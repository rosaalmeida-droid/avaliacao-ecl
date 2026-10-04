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
          <div style={{ flex: 1, fontSize: 13 }}>{item.nome}</div>
          <span style={{ fontSize: 12.5, padding: '3px 8px', borderRadius: 20, fontWeight: 700, color: 'white', background: corNivel(item.nivel) }}>
            {NIVEL_DOMINIO_LABEL[item.nivel]}
          </span>
        </div>
      ))}
    </div>
  );
}

import { escreverPerfil } from '../motorAvaliacao';
import { CRONOGRAMA_2026_2027 } from '../cronograma';
import { assiduidadeNaUC, leituraAssiduidade, assiduidadeEmHoras, perfilSocialDoAluno } from '../backend';
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
  // O número de cima é em horas, como na escola: cada hora do plano é uma
  // hora de falta. Antes contava aulas — uma aula de 1 h pesava o mesmo
  // que um dia de 8 h.
  const horas = assiduidadeEmHoras(aluno.id, aluno.turmaId);
  const ucsAcima = horas.porUC.filter(u => u.acimaDoLimite);
  const fmtH = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');
  const grave = leitura.grave || ucsAcima.length > 0;

  // Categoria de cada competência, para agrupar por família de trabalho.
  const texto = escreverPerfil(
    [...perfil.tecnicas, ...perfil.responsabilidades, ...perfil.atitudes].map(c => ({
      nome: c.nome,
      categoria: MICROCOMPETENCIAS.find(m => m.id === c.competenciaId)?.categoria,
      nivel: c.nivel,
      consolidada: c.consolidada,
      media: (c as any).media ?? null,
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

      {/* Sem competências, a mensagem do perfil (mais abaixo) já o diz: eram
          duas mensagens seguidas a dizer o mesmo. */}

      {/* Assiduidade — antes das competências, porque é a base de
          tudo o resto. Sem estar presente não há nada a demonstrar. */}
      {(assid.aulasPrevistas > 0 || horas.horasDadas > 0) && (
        <div style={{
          background: grave ? 'var(--danger-pale, #fdf0ef)'
                    : leitura.atitudesAfetadas.length ? 'var(--copper-pale, #fdf0e6)'
                    : 'var(--sage-pale, #eef4eb)',
          border: `1px solid ${grave ? 'var(--danger)'
                    : leitura.atitudesAfetadas.length ? 'var(--copper)' : 'var(--sage)'}`,
          borderRadius: 14, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:30, fontWeight:700, lineHeight:1,
              color: grave ? 'var(--danger)'
                   : leitura.atitudesAfetadas.length ? 'var(--copper)' : 'var(--sage)' }}>
              {horas.presenca}%
            </span>
            <span style={{ fontSize:14.5, fontWeight:700, color:'rgba(26,23,20,0.7)' }}>
              de presença · {horas.horasFaltadas > 0
                ? `faltaste a ${fmtH(horas.horasFaltadas)} h das ${fmtH(horas.horasDadas)} h dadas`
                : `${fmtH(horas.horasDadas)} h dadas, sem faltas`}
            </span>
          </div>
          {ucsAcima.map(u => (
            <div key={u.ucId} style={{ fontSize:14, fontWeight:700, color:'var(--danger)', marginBottom:8, lineHeight:1.5 }}>
              {u.ucId}: {fmtH(u.horasFaltadas)} h de faltas. A UC tem {fmtH(u.horasPrevistas || u.horasDadas)} h no total, e já chegaste aos 10% ({fmtH(u.limite)} h).
              Tens de fazer a recuperação deste módulo.
            </div>
          ))}
          {/* Sem aulas abertas na aplicação, as horas já dizem tudo: a frase
              «ainda não há aulas…» ao lado de «12 h dadas» contradizia-se. */}
          {(assid.aulasPrevistas > 0 || horas.horasDadas === 0) && (
            <div style={{ fontSize:15, color:'rgba(26,23,20,0.8)', lineHeight:1.6 }}>
              {leitura.texto}
            </div>
          )}
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

      {/* Os 5 C, a participação em atividades e eventos, o que os colegas
          veem e o próximo passo (Rosa, out/2026). */}
      <PerfilSocialAluno alunoId={aluno.id} />

      {/* O detalhe fica fechado: só abre quem quiser ver competência a
          competência. Aberto por omissão, era um muro de texto. */}
      {totalCompetencias > 0 && <button
        onClick={() => setVerDetalhe((v: boolean) => !v)}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 12, padding: '13px', fontSize: 14.5, fontWeight: 700,
          color: 'rgba(26,23,20,0.65)', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {verDetalhe ? 'Esconder o detalhe' : totalCompetencias === 1 ? 'Ver a competência' : `Ver as ${totalCompetencias} competências uma a uma`}
      </button>}

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

/** Os 5 C e o que os colegas de grupo veem (Rosa, out/2026). Sem notas: em
 *  palavras e com a barra do caminho. Do que os colegas disseram, só o que o
 *  professor confirmou, sem nomes. Sempre um passo concreto. */
function PerfilSocialAluno({ alunoId }: { alunoId: string }) {
  const p = perfilSocialDoAluno(alunoId);
  if (!p) return null;
  const V = '#6B3FA0';
  const caixa = (bg: string) => ({ background: bg, borderRadius: 14, padding: '12px 14px', marginBottom: 10 } as React.CSSProperties);
  return (
    <div data-perfil-social style={{ marginBottom: 14 }}>
      {p.cincoC.length > 0 && (
        <div style={caixa('#f1ebf8')}>
          <div style={{ fontSize: 15, fontWeight: 800, color: V }}>Os teus 5 C{p.ucId ? ` · ${CRONOGRAMA_2026_2027.find(m => m.id === p.ucId)?.nome || p.ucId}` : ''}</div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 4 }}>Os mesmos da pauta da UC, até agora.</div>
          {p.cincoC.map(c => (
            <div key={c.c} style={{ margin: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5 }}><b>{c.nome}</b><span>{c.nivel}</span></div>
              <div style={{ height: 8, borderRadius: 5, background: 'rgba(107,63,160,0.15)', marginTop: 3, overflow: 'hidden' }}>
                <div style={{ width: `${c.pct}%`, height: '100%', borderRadius: 5, background: V }} />
              </div>
              <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginTop: 2 }}>{c.frase}</div>
            </div>
          ))}
        </div>
      )}
      {p.participacoes.length > 0 && (
        <div style={caixa('#eef3fa')}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#2F5D8A', marginBottom: 4 }}>
            Participação em atividades e eventos · {p.participacoes.length}
          </div>
          {p.participacoes.slice(0, 5).map((x, i) => (
            <div key={i} style={{ fontSize: 14.5, margin: '3px 0' }}>⭐ {x.titulo} <span style={{ color: 'rgba(26,23,20,0.5)', fontSize: 13 }}>· {x.data.split('-').reverse().join('/')}</span></div>
          ))}
          {p.participacoes.length > 5 && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)' }}>e mais {p.participacoes.length - 5}.</div>}
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 4 }}>Contam para o Colaborativo e podem dar bónus na nota da UC.</div>
        </div>
      )}
      {(p.forte.length > 0 || p.melhorar.length > 0) && (
        <div style={caixa('#e8f2e4')}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#3E7A31', marginBottom: 4 }}>O que os teus colegas de grupo veem</div>
          {p.forte.map((t, i) => <div key={'f' + i} style={{ fontSize: 14.5, margin: '4px 0' }}>👍 {t.charAt(0).toUpperCase() + t.slice(1)}.</div>)}
          {p.melhorar.map((t, i) => <div key={'m' + i} style={{ fontSize: 14.5, margin: '4px 0' }}>🌱 {t.charAt(0).toUpperCase() + t.slice(1)}.</div>)}
        </div>
      )}
      {p.diferenca && p.diferenca !== 'igual' && (
        <div style={caixa(p.diferenca === 'acima' ? '#fff4e0' : '#e8f2e4')}>
          <div style={{ fontSize: 15, fontWeight: 800, color: p.diferenca === 'acima' ? '#9a6512' : '#3E7A31', marginBottom: 4 }}>Tu e os outros</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>
            {p.diferenca === 'acima'
              ? <>Em algumas atitudes, <b>dás-te mais valor do que os teus colegas te dão</b>. Não quer dizer que estejas mal: pergunta ao grupo o que podes fazer para que também o notem.</>
              : <>Os teus colegas <b>veem-te melhor do que tu te vês</b>. Confia mais em ti: o grupo gosta de trabalhar contigo.</>}
          </div>
        </div>
      )}
      {p.diferenca === 'igual' && (
        <div style={{ ...caixa('transparent'), border: '1px solid rgba(26,23,20,0.12)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#3E7A31', marginBottom: 4 }}>Tu e os outros</div>
          <div style={{ fontSize: 14.5 }}>O que dizes de ti <b>bate certo</b> com o que os teus colegas veem. Isso mostra que te conheces bem.</div>
        </div>
      )}
      <div style={{ border: `1.5px dashed ${V}`, borderRadius: 14, padding: '11px 14px', fontSize: 14.5, lineHeight: 1.5 }}>
        <b style={{ color: V }}>O teu próximo passo:</b> {p.passo}
      </div>
      {p.aulas > 0 && (
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)', marginTop: 6 }}>
          O que os colegas veem: opinião confirmada pelo professor em {p.aulas} aula{p.aulas === 1 ? '' : 's'}. Não conta para a nota.
        </div>
      )}
    </div>
  );
}
