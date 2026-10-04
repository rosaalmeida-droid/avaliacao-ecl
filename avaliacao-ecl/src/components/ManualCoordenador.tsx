import React, { useState } from 'react';
import { getHistoricoAvaliacoes, getAlunos } from '../backend';
import { PESOS_AULA } from '../types';
import { BONUS_EVENTOS } from '../eventosAvaliacao';
import {
  ATITUDES_DETALHADAS, calcularNotaPlano, atitudesDoTrimestre,
  getAtitudeDetalhada, nomeCompetencia,
} from '../compatECL';

// ─────────────────────────────────────────────────────────────
// Manual do Coordenador — Avaliação ECL
// Documento completo do sistema de avaliação por competências
// ─────────────────────────────────────────────────────────────

const T = {
  bg: '#f8f6f2',
  card: '#fff',
  border: '#e8e0d8',
  copper: '#b5651d',
  copperP: 'rgba(181,101,29,0.08)',
  sage: '#5a7a4e',
  sageP: 'rgba(90,122,78,0.08)',
  azul: '#0369a1',
  azulP: 'rgba(3,105,161,0.08)',
  roxo: '#7C3AED',
  roxoP: 'rgba(124,58,237,0.08)',
  text: '#1a1714',
  textLight: 'rgba(26,23,20,0.55)',
};

function Secção({ titulo, icone, children, cor = T.copper }: {
  titulo: string; icone: string; children: React.ReactNode; cor?: string;
}) {
  const [aberta, setAberta] = useState(true);
  return (
    <div style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}` }}>
      <button onClick={() => setAberta(a => !a)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        background: cor === T.copper ? T.copperP : cor === T.sage ? T.sageP : cor === T.azul ? T.azulP : T.roxoP,
        border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ fontSize: 22 }}>{icone}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: cor, flex: 1 }}>{titulo}</span>
        <span style={{ color: cor, fontSize: 18 }}>{aberta ? '▲' : '▼'}</span>
      </button>
      {aberta && (
        <div style={{ padding: '16px 20px', background: T.card }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Tabela({ headers, rows }: { headers: string[]; rows: (string|React.ReactNode)[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: T.copperP }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                color: T.copper, borderBottom: `2px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`,
                  color: T.text, verticalAlign: 'top' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 100,
      background: cor + '20', color: cor, fontWeight: 700, fontSize: 12.5, marginRight: 4 }}>
      {texto}
    </span>
  );
}

export function ManualCoordenador({ turmaId }: { turmaId: string }) {
  const historico = getHistoricoAvaliacoes();
  const alunos = getAlunos();
  const [tabActiva, setTabActiva] = useState<'manual'|'relatorio'>('manual');

  // Calcular estatísticas para relatório
  const estatsPorAluno = alunos.map(aluno => {
    const regsAluno = historico.filter(r => r.alunoId === aluno.id);
    const notas = regsAluno.map(r => r.nota).filter(Boolean) as number[];
    const mediaGeral = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
    const emRecuperacao = regsAluno.filter(r => r.nota !== undefined && r.nota < 3).length;
    // Competências (não avaliações) com sucesso em 2 aulas diferentes — a regra da escola.
    const aulasComSucesso = new Map<string, Set<string>>();
    regsAluno.filter(r => r.nota !== undefined && r.nota >= 3).forEach(r => {
      if (!aulasComSucesso.has(r.microcompetenciaId)) aulasComSucesso.set(r.microcompetenciaId, new Set());
      aulasComSucesso.get(r.microcompetenciaId)!.add(r.planoAulaId || r.id);
    });
    const consolidadas = [...aulasComSucesso.values()].filter(a => a.size >= 2).length;
    return { aluno, mediaGeral, emRecuperacao, consolidadas, total: regsAluno.length };
  });

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: T.text, padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.copper}, #8B4513)`, padding: '24px 24px 0',
        color: '#fff', borderRadius: '0 0 0 0' }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Avaliação ECL · Escola de Comércio de Lisboa
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
          📋 Manual do Coordenador
        </h1>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          Sistema de Avaliação por Competências — Referencial 811RA144
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['manual', '📖 Manual'], ['relatorio', '📊 Relatório']].map(([id, label]) => (
            <button key={id} onClick={() => setTabActiva(id as any)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: tabActiva === id ? '#fff' : 'transparent',
              color: tabActiva === id ? T.copper : 'rgba(255,255,255,0.8)',
              borderRadius: '8px 8px 0 0',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px', background: T.bg, minHeight: 400 }}>
        {tabActiva === 'manual' ? (
          <>
            {/* 1. PRINCÍPIOS */}
            <Secção titulo="1. Princípios do Sistema" icone="🎯" cor={T.copper}>
              <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
                O sistema de avaliação da Avaliação ECL assenta na avaliação contínua por competências,
                alinhada com o Referencial 811RA144 e o Perfil dos Alunos à Saída da Escolaridade Obrigatória.
                A avaliação é processual, contextualizada e orientada para o desenvolvimento profissional do aluno.
              </p>
              <Tabela
                headers={['Princípio', 'Descrição']}
                rows={[
                  ['Continuidade', 'A avaliação acontece em cada plano de aula, não apenas em momentos pontuais.'],
                  ['Contextualização', 'Cada competência é avaliada no contexto real em que foi exercida.'],
                  ['Progressão', 'O nível de exigência aumenta ao longo dos 3 anos do curso.'],
                  ['Recuperação', 'O aluno tem sempre oportunidade de superar uma avaliação negativa.'],
                  ['Transparência', 'O aluno conhece o que vai ser avaliado antes de cada aula.'],
                ]}
              />
            </Secção>

            {/* 2. ESCALA */}
            <Secção titulo="2. Escala de Avaliação (1 a 5)" icone="📏" cor={T.copper}>
              <Tabela
                headers={['Nível', 'O que o aluno escolhe', 'Significado pedagógico']}
                rows={[
                  [<Badge texto="1" cor="#c0392b" />, 'Ainda não fiz', 'Competência não demonstrada.'],
                  [<Badge texto="2" cor="#b5651d" />, 'Tentei mas ainda preciso de mais prática', 'Em desenvolvimento.'],
                  [<Badge texto="3" cor="#b5651d" />, 'Consegui com ajuda', 'Parcialmente demonstrada.'],
                  [<Badge texto="4" cor={T.sage} />, 'Faço sozinho/a', 'Adquirida — demonstrada de forma autónoma.'],
                  [<Badge texto="5" cor={T.azul} />, 'Faço com muito bom resultado', 'Consolidada — com qualidade.'],
                ]}
              />
              <p style={{ margin: '12px 0 0', fontSize: 13, color: T.textLight }}>
                O aluno não vê números enquanto se avalia: escolhe frases. A nota que conta é sempre a do professor.
                Alunos com medidas seletivas ou adicionais têm frases mais simples, com os mesmos níveis.
              </p>
            </Secção>

            {/* 3. COMPONENTES POR PLANO */}
            <Secção titulo="3. Componentes Avaliadas por Plano de Aula" icone="🔬" cor={T.sage}>
              <Tabela
                headers={['Componente', 'De onde vem', 'Quem gere']}
                rows={[
                  ['🔒 Obrigatórias', 'Farda/higiene, HACCP e registos, assiduidade', 'App — o professor pode tirá-las de uma aula'],
                  ['🔬 Técnicas (subtécnicas e aparelhos)', 'Fichas técnicas do plano, escolhidas pela IA da lista da escola', 'Professor remove ou volta a incluir'],
                  ['📚 Conhecimentos', 'Escritos pelo professor, com sugestões do referencial da UC', 'Professor'],
                  ['💡 Atitudes', 'Do trimestre, ou marcadas pelo professor', 'App + professor'],
                ]}
              />
              <div style={{ background: T.copperP, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <strong>Ramo completo:</strong> cada técnica aparece com o seu contexto — prato → aparelho →
                técnica → subtécnica (ex.: Lasanha → Molho béchamel → Ligar · Roux branco, «bem feito é: cor de
                marfim, sem grumos»). Técnicas de outra área (ex.: pastelaria numa UC de cozinha) avaliam-se na
                mesma: vêm da ficha. Os conhecimentos vêm da UC.
              </div>
            </Secção>

            {/* 4. NOTA FINAL */}
            <Secção titulo="4. Cálculo da Nota Final" icone="🧮" cor={T.sage}>
              <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
                A nota de cada aula é a média ponderada das componentes; cada nível vale 0, 5, 10, 15 ou 20 (sem conhecimentos, as técnicas passam a 60%):
              </p>
              <Tabela
                headers={['Componente', 'Prática', 'Mista', 'Teórica']}
                rows={[
                  ['Obrigatórias', `${PESOS_AULA.pratico.OBR * 100}%`, `${PESOS_AULA.misto.OBR * 100}%`, `${PESOS_AULA.teorico.OBR * 100}%`],
                  ['Técnicas', `${PESOS_AULA.pratico.SUB * 100}%`, `${PESOS_AULA.misto.SUB * 100}%`, '—'],
                  ['Conhecimentos', `${PESOS_AULA.pratico.KNW * 100}%`, `${PESOS_AULA.misto.KNW * 100}%`, `${PESOS_AULA.teorico.KNW * 100}%`],
                  ['Atitudes', `${PESOS_AULA.pratico.ATI * 100}%`, `${PESOS_AULA.misto.ATI * 100}%`, `${PESOS_AULA.teorico.ATI * 100}%`],
                ]}
              />
              <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
                Uma parte não avaliada passa o peso às outras. <strong>Nota da UC</strong> = as validações do
                professor em todas as aulas da UC; uma falta conta zero (ou a nota da recuperação).
              </p>
              <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
                Não há bónus de assiduidade (a falta já conta 0, e a assiduidade pesa no Comprometido).
                Sem farda completa, as técnicas da aula contam 0 (as atitudes contam). Depois soma-se o bónus de
                <strong> eventos e concursos</strong> (evento +{String(BONUS_EVENTOS.porEvento).replace('.', ',')},
                concurso até +{BONUS_EVENTOS.concurso.maximo}, por pontos: candidatura, participação e cada fase
                +{String(BONUS_EVENTOS.concurso.fase).replace('.', ',')}, e a vitória completa o valor; no total, até +{BONUS_EVENTOS.maximo}).
                Tetos: {BONUS_EVENTOS.tetoSemParticipacao} sem participar, {BONUS_EVENTOS.tetoSoEventos} só com
                eventos, 20 com pelo menos um concurso. Concursos só com nota {BONUS_EVENTOS.notaMinimaConcurso} ou mais.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: T.textLight }}>
                Faltas: acima de 10% do total de horas da UC (no cronograma), o aluno fica em recuperação.
                Faltar a parte de uma aula conta só as horas faltadas.
              </p>
            </Secção>

            {/* 5. ATITUDES */}
            <Secção titulo="5. Sistema de Atitudes — 22 Competências" icone="💡" cor={T.azul}>
              <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
                As 22 atitudes do Referencial 811RA144 são distribuídas pelos 3 anos de forma progressiva e acumulativa.
                Por trimestre são introduzidas 2-3 atitudes novas. O nível de exigência aumenta de ano para ano.
              </p>
              {[1, 2, 3].map(ano => (
                <div key={ano} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: T.azul, marginBottom: 8, fontSize: 14 }}>
                    {ano}º Ano ({ano === 1 ? 8 : ano === 2 ? 8 : 6} atitudes)
                  </div>
                  {[1, 2, 3].map(tri => {
                    const atis = ATITUDES_DETALHADAS.filter(a => a.ano === ano && a.trimestre === tri);
                    if (!atis.length) return null;
                    return (
                      <div key={tri} style={{ marginBottom: 8, paddingLeft: 12, borderLeft: `3px solid ${T.azul}40` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.textLight, marginBottom: 4 }}>
                          Trimestre {tri}
                        </div>
                        {atis.map(a => (
                          <div key={a.id} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                              <Badge texto={a.id} cor={T.azul} />
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{a.nome}</span>
                            </div>
                            <div style={{ fontSize: 13, color: T.textLight, margin: '3px 0 3px 4px' }}>
                              {a.descricao}
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                              {(['n1','n2','n3'] as const).map((n, i) => (
                                <div key={n} style={{ fontSize: 12.5, padding: '2px 6px', borderRadius: 4,
                                  background: i === ano-1 ? T.azulP : '#f5f5f3',
                                  color: i === ano-1 ? T.azul : T.textLight,
                                  border: i === ano-1 ? `1px solid ${T.azul}40` : '1px solid transparent',
                                  fontWeight: i === ano-1 ? 700 : 400,
                                }}>
                                  {i+1}ºano: {a.nivelComplexidade[n]}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </Secção>

            {/* 6. RECUPERAÇÃO */}
            <Secção titulo="6. Sistema de Recuperação" icone="🔁" cor={T.roxo}>
              <Tabela
                headers={['Tipo de competência', 'Regra de recuperação', 'Dica ao aluno']}
                rows={[
                  ['💡 Atitude', 'Volta obrigatória no plano seguinte — sempre, independentemente da ficha.', 'Dica contextual gerada com base no nível do ano e no histórico.'],
                  ['🔬 Subtécnica / 🧪 Aparelho', 'Volta com aviso quando a ficha a incluir novamente.', 'Dica específica sobre o erro técnico anterior.'],
                  ['📚 Conhecimento', 'Volta com aviso quando a UC o incluir novamente.', 'Dica sobre o conceito que ficou por compreender.'],
                ]}
              />
              <div style={{ background: T.roxoP, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 8 }}>
                <strong>Avisos ao publicar:</strong> ao publicar um plano, o professor vê um aviso por cada aluno
                com recuperação pendente. O aluno recebe aviso no início da sua autoavaliação com a dica concreta.
              </div>
            </Secção>

            {/* 7. CICLO DE VIDA */}
            <Secção titulo="7. Ciclo de Vida de uma Competência" icone="🔄" cor={T.roxo}>
              <Tabela
                headers={['Fase', 'Quando ocorre', 'O que se espera']}
                rows={[
                  ['Introdução', '1ª vez que a competência é apresentada (trimestre definido)', 'Aluno conhece e tenta demonstrar pela primeira vez.'],
                  ['Reforço', 'Quando a UC ativa uma competência já introduzida', 'Aluno demonstra com maior exigência — nível seguinte.'],
                  ['Consolidação', 'Quando o aluno atinge nível 3 ou mais em 2 aulas diferentes', 'Competência marcada como consolidada no portfólio.'],
                  ['Recuperação', 'Quando o aluno obtém nível 1 ou 2', 'Competência volta obrigatória ou com aviso na próxima vez.'],
                ]}
              />
              <div style={{ fontSize: 13, color: T.textLight, marginTop: 8 }}>
                Por cada plano de aula: atitude nova do trimestre + máximo 1 atitude em reforço/recuperação.
                As subtécnicas e conhecimentos podem ter várias em reforço/recuperação em simultâneo, desde que a ficha ou UC as incluam.
              </div>
            </Secção>

            {/* 8. PAPEL DO PROFESSOR */}
            <Secção titulo="8. Papel do Professor" icone="👨‍🏫" cor={T.copper}>
              <Tabela
                headers={['Acção', 'Descrição']}
                rows={[
                  ['Criar plano', 'Define UC, ficha técnica e tipo de aula. A app gera automaticamente as competências.'],
                  ['Ajustar competências', 'Pode remover ou acrescentar subtécnicas, aparelhos ou conhecimentos. Pode acrescentar atitudes extra.'],
                  ['Publicar', 'Ao publicar, recebe avisos de recuperação pendente por aluno.'],
                  ['Validar autoavaliação', 'Confirma ou corrige a autoavaliação do aluno. Regista a nota do professor (1-5).'],
                  ['Adicionar comentário', 'Pode adicionar nota qualitativa que gera dica personalizada na próxima avaliação.'],
                ]}
              />
            </Secção>

            {/* 9. PAPEL DO ALUNO */}
            <Secção titulo="9. Papel do Aluno" icone="🎓" cor={T.sage}>
              <Tabela
                headers={['Acção', 'Descrição']}
                rows={[
                  ['Ver competências', 'Antes da aula, o aluno vê o que vai ser avaliado e o que significa cada competência.'],
                  ['Autoavaliar', 'No final da aula, escolhe a frase que diz o que fez em cada competência (5 níveis, sem números).'],
                  ['Escolher atitude', 'Para as atitudes, o aluno escolhe o nível que acha que atingiu.'],
                  ['Ver recuperação', 'Se tiver recuperação pendente, vê aviso claro com dica antes de autoavaliar.'],
                  ['Portfólio', 'Acesso ao historial completo das suas competências avaliadas ao longo do curso.'],
                ]}
              />
            </Secção>

            {/* 10. MANUAL DE AVALIAÇÃO PARA O COORDENADOR */}
            <Secção titulo="10. Regras de Avaliação — Coordenação" icone="📌" cor={T.copper}>
              <div style={{ lineHeight: 1.7, fontSize: 14 }}>
                <p><strong>Periodicidade:</strong> a avaliação ocorre em cada plano de aula prático ou teórico. Não existem momentos de avaliação exclusivos.</p>
                <p><strong>Ponderação UC:</strong> a nota da UC junta as validações do professor em todas as aulas da UC, com os pesos da secção 4, mais os bónus e os tetos.</p>
                <p><strong>Progressão de ano:</strong> o nível de exigência de cada competência aumenta de ano para ano. Uma atitude avaliada no 1º ano com nível 3 é reavaliada no 2º ano com critérios mais exigentes.</p>
                <p><strong>Recuperação obrigatória:</strong> qualquer competência com nível 1 ou 2 gera recuperação. As atitudes voltam obrigatoriamente no plano seguinte. Subtécnicas e conhecimentos voltam quando a próxima ficha ou UC os incluir.</p>
                <p><strong>Competências extra:</strong> o professor pode introduzir atitudes, subtécnicas ou conhecimentos não previstos automaticamente. Ficam marcadas como "extra" no portfólio.</p>
                <p><strong>Historial:</strong> todas as avaliações ficam registadas no portfólio do aluno, ligadas à UC. O professor vê o historial de qualquer competência de qualquer aluno em qualquer momento.</p>
                <p><strong>Eventos e concursos:</strong> organizam-se em <em>Atividades</em> (pedido, perguntas ao cliente, fichas, orçamentos, folha para o cliente, preparação, dia do evento e fecho). Avaliam-se num plano de evento (código E-2026-001), com a turma toda ou só com os inscritos que o professor aceita. Não há faltas: quem não vai não recebe bónus.</p>
                <p><strong>Medidas educativas:</strong> universais, seletivas ou adicionais, escolhidas por aluno (no Mapa da turma, ou na lista de alunos da coordenação). Os resultados são os mesmos; as perguntas da autoavaliação ficam mais simples. As medidas adicionais que alteram o currículo ainda não estão na aplicação.</p>
              </div>
            </Secção>
          </>
        ) : (
          // RELATÓRIO
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, color: T.copper }}>📊 Relatório de Avaliações</h2>
              <div style={{ fontSize: 13, color: T.textLight }}>Turma · {alunos.length} alunos · {historico.length} registos</div>
            </div>
            <Tabela
              headers={['Aluno', 'Total avaliações', 'Consolidadas', 'Em recuperação', 'Média geral']}
              rows={estatsPorAluno.map(({ aluno, mediaGeral, emRecuperacao, consolidadas, total }) => [
                aluno.nome,
                total.toString(),
                <Badge texto={consolidadas.toString()} cor={T.sage} />,
                emRecuperacao > 0 ? <Badge texto={emRecuperacao.toString()} cor="#c0392b" /> : '—',
                mediaGeral > 0 ? (
                  <Badge
                    texto={mediaGeral.toFixed(1).replace('.', ',')}
                    cor={mediaGeral >= 3 ? T.sage : mediaGeral >= 2 ? T.copper : '#c0392b'}
                  />
                ) : '—',
              ])}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default ManualCoordenador;
