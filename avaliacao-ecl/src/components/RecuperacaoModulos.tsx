import React, { useState } from 'react';
import { CRONOGRAMA_2026_2027 } from '../cronograma';
import { ModalFullscreen } from './ModalFullscreen';
import { RecuperacaoFCTAluno } from './RecuperacaoFCT';
import { gerarPDFRecuperacaoFCT } from './GerarPDFRecuperacaoFCT';
import { gerarPDFRecuperacaoFCTViaScript } from '../backend';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { Aluno } from '../types';
import {
  getRecuperacoesPorAluno, addOrUpdateRecuperacao, criarRecuperacaoAutomatica,
  getPlanosFaltadosPorUC, getPlanosAulaPorTurma, getEstadoCompetenciasUC, getGuiasDaRecuperacao,
  construirPromptPlanoIndividual,
  gerarPlanoRecuperacaoComIA,
  recuperacaoEstaTrancada, getAlunos,
} from '../backend';
import { encontrarMicro, encontrarAtitude, OBRIGATORIAS } from '../compatECL';
import { gerarPerguntasDefesaOral } from '../matrizEvidencias';
import { getReferencialUC } from '../referencial811RA144';
import { UCS_COZINHA } from './PlanoAula';
import { GuiaProducao } from './GuiaProducao';
import { SeletorIA } from './SeletorIA';

function getNomeComp(id: string): string {
  if (id.startsWith('OBR_')) return OBRIGATORIAS.find(o => o.id === id)?.nome || id;
  if (id.startsWith('ATT_')) return encontrarAtitude(id)?.nome || id;
  return encontrarMicro(id)?.nome || id;
}

export function RecuperacaoModulosAluno({ aluno }: { aluno: Aluno }) {
  const [tab, setTab] = useState<'progresso' | 'porConcluir' | 'emRecuperacao' | 'recuperados'>('progresso');
  const [refresh, setRefresh] = useState(0);
  const [ucSelecionada, setUcSelecionada] = useState('');
  const [recuperacaoAberta, setRecuperacaoAberta] = useState<string | null>(null);

  const todasRecuperacoes = getRecuperacoesPorAluno(aluno.id);
  const planosDaTurma = getPlanosAulaPorTurma(aluno.turmaId);
  const ucsComPlanos = Array.from(new Set(planosDaTurma.filter(p => p.ucId).map(p => p.ucId!)));

  // UCs sem nenhuma recuperação ainda criada, mas com faltas
  const ucsPorConcluir = ucsComPlanos.filter(ucId => {
    const jaTem = todasRecuperacoes.some(r => r.ucId === ucId);
    if (jaTem) return false;
    const faltas = getPlanosFaltadosPorUC(aluno.id, ucId, aluno.turmaId);
    return faltas.length > 0;
  });

  const emRecuperacao = todasRecuperacoes.filter(r => r.estado === 'pendente' || r.estado === 'submetida' || r.estado === 'em_avaliacao');
  const recuperados = todasRecuperacoes.filter(r => r.estado === 'concluida');

  function iniciarRecuperacao(ucId: string) {
    const uc = UCS_COZINHA.find(u => u.id === ucId);
    const nova = criarRecuperacaoAutomatica(aluno.id, aluno.turmaId, ucId, uc?.nome || '');
    addOrUpdateRecuperacao(nova);
    setRefresh(r => r + 1);
    setTab('emRecuperacao');
    setRecuperacaoAberta(nova.id);
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        Recuperação de Módulos
      </div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)', marginBottom: 16 }}>
        Aulas que faltaste podem ser recuperadas aqui — sem teres de repetir tudo do zero.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('progresso')} className={`tab-btn${tab === 'progresso' ? ' active' : ''}`} style={{ flex: 1 }}>
          📊 Progresso
        </button>
        <button onClick={() => setTab('porConcluir')} className={`tab-btn${tab === 'porConcluir' ? ' active' : ''}`} style={{ flex: 1 }}>
          Por concluir ({ucsPorConcluir.length})
        </button>
        <button onClick={() => setTab('emRecuperacao')} className={`tab-btn${tab === 'emRecuperacao' ? ' active' : ''}`} style={{ flex: 1 }}>
          Em recuperação ({emRecuperacao.length})
        </button>
        <button onClick={() => setTab('recuperados')} className={`tab-btn${tab === 'recuperados' ? ' active' : ''}`} style={{ flex: 1 }}>
          Recuperados ({recuperados.length})
        </button>
      </div>

      {tab === 'progresso' && (
        <div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginBottom: 12 }}>
            Estado das tuas competências por Unidade de Competência — combina o que demonstraste em aula com o que recuperaste.
          </div>
          {ucsComPlanos.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>Ainda não há aulas nesta turma.</div>
          )}
          {ucsComPlanos.map(ucId => {
            const uc = UCS_COZINHA.find(u => u.id === ucId);
            const estado = getEstadoCompetenciasUC(aluno.id, ucId);
            const pct = estado.total > 0 ? Math.round(((estado.demonstradasEmAula + estado.recuperadas) / estado.total) * 100) : 0;
            return (
              <div key={ucId} className="option-card" style={{ marginBottom: 8, cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{ucId}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{uc?.nome}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                    background: estado.estado === 'completo' ? 'rgba(90,122,78,0.15)' : 'rgba(181,101,29,0.12)',
                    color: estado.estado === 'completo' ? 'var(--sage)' : 'var(--copper)' }}>
                    {estado.estado === 'completo' ? '✓ Completo' : `${pct}%`}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--cream-dark)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: estado.estado === 'completo' ? 'var(--sage)' : 'var(--copper)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.45)', marginTop: 4 }}>
                  {estado.demonstradasEmAula} demonstradas em aula · {estado.recuperadas} recuperadas · {estado.total} no total
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'porConcluir' && (
        <div>
          {ucsPorConcluir.length === 0 && (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>
              Não tens módulos por concluir. 🎉
            </div>
          )}
          {ucsPorConcluir.map(ucId => {
            const uc = UCS_COZINHA.find(u => u.id === ucId);
            const faltas = getPlanosFaltadosPorUC(aluno.id, ucId, aluno.turmaId);
            return (
              <div key={ucId} className="option-card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ucId}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{uc?.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--copper)', marginTop: 2 }}>
                      {faltas.length} aula{faltas.length !== 1 ? 's' : ''} em falta: {faltas.map(p => p.titulo).join(', ')}
                    </div>
                  </div>
                  <button onClick={() => iniciarRecuperacao(ucId)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                    Iniciar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'emRecuperacao' && (
        <div>
          {emRecuperacao.length === 0 && (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>
              Nenhuma recuperação em curso.
            </div>
          )}
          {emRecuperacao.map(r => (
            <RecuperacaoCard key={r.id} recuperacao={r} aberta={recuperacaoAberta === r.id}
              onToggle={() => setRecuperacaoAberta(recuperacaoAberta === r.id ? null : r.id)}
              onAtualizado={() => setRefresh(x => x + 1)} />
          ))}
        </div>
      )}

      {tab === 'recuperados' && (
        <div>
          {recuperados.length === 0 && (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>
              Ainda não tens recuperações concluídas.
            </div>
          )}
          {recuperados.map(r => (
            <div key={r.id} className="option-card" style={{ marginBottom: 8, opacity: 0.8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.numeroRecuperacao ? `#${r.numeroRecuperacao} · ` : ""}{r.ucId} — {r.ucNome}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Concluída em {r.dataValidacao ? fmtData(r.dataValidacao) : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecuperacaoCard({ recuperacao, aberta, onToggle, onAtualizado }: {
  recuperacao: import('../types').RecuperacaoModulo; aberta: boolean; onToggle: () => void; onAtualizado: () => void;
}) {
  const r = recuperacao;
  const [trabalhoTeorico, setTrabalhoTeorico] = useState(r.trabalhoTeorico || '');
  const [investigacao, setInvestigacao] = useState(r.investigacao || '');
  const [casoProfissional, setCasoProfissional] = useState(r.casoProfissional || '');
  const [autoavaliacao, setAutoavaliacao] = useState(r.autoavaliacao || '');
  const [anexos, setAnexos] = useState<{ tipo: 'foto' | 'video' | 'audio' | 'documento' | 'link'; url: string; descricao?: string; criadoEm: string }[]>(r.anexos || []);
  const [guiaAberto, setGuiaAberto] = useState<string | null>(null);

  const ehTecnica = r.tipoUC === 'tecnica' || r.tipoUC === 'hibrida';
  const refUC = getReferencialUC(r.ucId);
  const guias = getGuiasDaRecuperacao(r.planosIds);

  function submeter() {
    if (!confirm('Submeter esta recuperação para avaliação do professor? Depois de submetida não podes editar.')) return;
    const perguntasDefesaOral = gerarPerguntasDefesaOral(r.competenciasIds, r.responsabilidadesIds, r.ucNome);
    addOrUpdateRecuperacao({
      ...r,
      trabalhoTeorico, investigacao, casoProfissional, autoavaliacao, anexos,
      estado: 'submetida',
      perguntasDefesaOral,
      dataSubmissao: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    });
    onAtualizado();
  }

  const jaSubmetida = r.estado !== 'pendente';
  const trancada = recuperacaoEstaTrancada(r);

  return (
    <div style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '12px 14px', background: aberta ? 'var(--copper-pale)' : '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{trancada ? '🔒' : jaSubmetida ? '⏳' : '📝'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.numeroRecuperacao ? `#${r.numeroRecuperacao} · ` : ""}{r.ucId} — {r.ucNome}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {trancada ? 'Prazo terminado — fala com o professor' : r.estado === 'pendente' ? 'Por fazer' : r.estado === 'submetida' ? 'Submetida — a aguardar avaliação' : 'Em avaliação'}
          </div>
        </div>
        <span style={{ fontSize: 14, color: 'var(--copper)' }}>{aberta ? '▲' : '▼'}</span>
      </button>

      {aberta && (
        <ModalFullscreen titulo={`${r.ucId} — ${r.ucNome}`} subtitulo={r.viaFCT ? 'Recuperação via FCT' : 'Recuperação de módulo'} onFechar={onToggle}>
          {r.viaFCT ? (
            // Recuperação via FCT — fluxo completamente diferente: o aluno
            // não escreve trabalho teórico, preenche evidências reais.
            <>
              <RecuperacaoFCTAluno recuperacao={r} onAtualizado={onAtualizado} />
              <button onClick={async () => {
                const alunoDaRecuperacao = getAlunos().find(a => a.id === r.alunoId);
                // Aluno externo/antigo — o nome fica guardado directamente na
                // recuperação, não existe em getAlunos().
                const nomeAluno = r.fct?.nomeAlunoManual
                  || alunoDaRecuperacao?.nome
                  || `Aluno ${alunoDaRecuperacao?.numero || ''}`;
                const turmaParaImprimir = r.fct?.nomeAlunoManual ? (r.fct?.turmaAlunoManual || r.turmaId) : r.turmaId;
                // Tenta primeiro gerar o PDF oficial (fiel ao Word da escola) via Apps
                // Script — só cai para a versão impressa pelo browser se esse script
                // ainda não estiver configurado.
                const resultado = await gerarPDFRecuperacaoFCTViaScript({
                  nomeAluno, turma: turmaParaImprimir, ucId: r.ucId, ucNome: r.ucNome, modulo: `${r.ucId} — ${r.ucNome}`,
                  disciplina: CRONOGRAMA_2026_2027.find(m => m.id === r.ucId)?.disciplina,
                  competencias: (r.fct?.competenciasAEvidenciar || []),
                  evidencias: (r.fct?.evidencias || []).map(e => ({ competenciaId: e.competenciaId, descricao: e.descricao })),
                  importancias: r.fct?.importancias,
                  perguntas: r.fct?.perguntas,
                  exigirHoras: r.fct?.exigirHoras || false, horasMinimas: r.fct?.horasMinimasExigidas,
                  localFCT: r.fct?.localFCT, dataInicio: r.fct?.dataInicio, dataTermo: r.fct?.dataTermo,
                });
                if (resultado.ok && resultado.pdfUrl) {
                  const janelaP = window.open(resultado.pdfUrl, '_blank');
                  if (!janelaP) {
                    alert('PDF gerado com sucesso, mas o browser bloqueou a abertura automática. Link: ' + resultado.pdfUrl + '\n\n(Foi copiado — permite pop-ups para abrir automaticamente da próxima vez.)');
                    try { navigator.clipboard.writeText(resultado.pdfUrl); } catch {}
                  }
                } else {
                  alert('Não consegui gerar o PDF automaticamente (' + (resultado.mensagem || 'motivo desconhecido') + '). A tentar o método alternativo (impressão do browser)...');
                  gerarPDFRecuperacaoFCT({
                    nomeAluno, numero: alunoDaRecuperacao?.numero || '', turmaId: turmaParaImprimir,
                    ucId: r.ucId, ucNome: r.ucNome, recuperacao: r,
                  });
                }
              }} style={{ width: '100%', marginTop: 14, padding: 12, borderRadius: 10, border: '1px solid #6d28d9',
                background: 'transparent', color: '#6d28d9', fontWeight: 700, cursor: 'pointer' }}>
                📄 Gerar folha de recuperação (PDF)
              </button>
            </>
          ) : trancada ? (
            <div style={{ fontSize: 13, color: 'var(--danger)', background: 'var(--danger-pale)', borderRadius: 10, padding: 14 }}>
              🔒 O prazo de 1 mês para esta recuperação terminou. Fala com o professor para reabrir.
            </div>
          ) : jaSubmetida ? (
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>
              Já submetiste este trabalho. Vais ser avisado quando o professor o avaliar.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--copper)', marginBottom: 6 }}>
                Aulas em falta nesta recuperação:
              </div>
              <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 14 }}>
                {r.planosIds.length} aula{r.planosIds.length !== 1 ? 's' : ''}
              </div>

              <PlanoIndividualBloco recuperacao={r} onAtualizado={onAtualizado} />

              {/* O GUIA é o centro do trabalho de recuperação — o aluno trabalha
                  a partir do conteúdo já gerado, não escreve do zero. */}
              {guias.length > 0 ? (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sage)', marginBottom: 8 }}>
                    📚 Estuda primeiro o(s) Guia(s) de Apoio à Produção
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.55)', marginBottom: 10 }}>
                    Todo o trabalho abaixo (B, C, D) deve ser respondido com base no que está aqui — enquadramento, HACCP, rendimentos, food cost e as questões já preparadas para esta produção.
                  </div>
                  {guias.map(g => (
                    <div key={g.fichaId} style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <button onClick={() => setGuiaAberto(guiaAberto === g.fichaId ? null : g.fichaId)}
                        style={{ width: '100%', padding: '10px 12px', background: guiaAberto === g.fichaId ? 'var(--sage-pale)' : '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📄</span>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{g.nomePrato}</span>
                        <span style={{ fontSize: 12, color: 'var(--sage)' }}>{guiaAberto === g.fichaId ? '▲ fechar' : '▼ abrir guia completo'}</span>
                      </button>
                      {guiaAberto === g.fichaId && (
                        <div style={{ padding: 12, maxHeight: 500, overflowY: 'auto' }}>
                          <GuiaProducao textoGuia={g.textoGuia} nomePrato={g.nomePrato} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--copper-pale)', borderRadius: 8, padding: 12, marginBottom: 18, fontSize: 12, color: 'var(--copper)' }}>
                  ⚠️ Ainda não há Guia de Apoio gerado para a(s) aula(s) em falta. Fala com o professor.
                </div>
              )}

              {refUC && refUC.realizacoes.length > 0 && (
                <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    📖 O que esta UC exige (referencial oficial 811RA144)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'rgba(26,23,20,0.65)' }}>
                    {refUC.realizacoes.slice(0, 5).map((r2, i) => <li key={i} style={{ marginBottom: 3 }}>{r2}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>B. Trabalho Teórico</div>
              <textarea value={trabalhoTeorico} onChange={e => setTrabalhoTeorico(e.target.value)}
                placeholder="Responde às questões da secção 12 do Guia (Questões para Estudo e Recuperação) acima..."
                style={{ width: '100%', minHeight: 100, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 13, marginBottom: 14 }} />

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>C. Investigação</div>
              <textarea value={investigacao} onChange={e => setInvestigacao(e.target.value)}
                placeholder="Desenvolve a investigação/aprofundamento proposto..."
                style={{ width: '100%', minHeight: 80, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 13, marginBottom: 14 }} />

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>D. Caso Profissional</div>
              <textarea value={casoProfissional} onChange={e => setCasoProfissional(e.target.value)}
                placeholder="Analisa e justifica a decisão no caso profissional proposto..."
                style={{ width: '100%', minHeight: 80, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 13, marginBottom: 14 }} />

              {ehTecnica && (
                <div style={{ padding: '10px 12px', background: 'var(--sage-pale)', borderRadius: 8, fontSize: 12, color: 'var(--sage)', marginBottom: 14 }}>
                  📷 Esta UC é predominantemente técnica — fala com o professor sobre como apresentar evidência prática (fotos, vídeo, ou repetição da técnica numa próxima aula).
                </div>
              )}

              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>E. Autoavaliação</div>
              <textarea value={autoavaliacao} onChange={e => setAutoavaliacao(e.target.value)}
                placeholder="Reflete sobre o que aprendeste a recuperar este módulo..."
                style={{ width: '100%', minHeight: 70, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 13, marginBottom: 16 }} />

              <AnexosBloco anexos={anexos} setAnexos={setAnexos} />

              <button onClick={submeter} disabled={!trabalhoTeorico}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: trabalhoTeorico ? 1 : 0.4 }}>
                ✓ Submeter Recuperação
              </button>
            </>
          )}
        </ModalFullscreen>
      )}
    </div>
  );
}

// Plano de Recuperação Individual — prompt único gerado pela app, copiado
// para uma IA externa (ChatGPT/Claude), resultado colado de volta. Não há
// forma de impedir o uso de IA fora da app — a proteção real é o prompt ser
// único + a Defesa Oral obrigatória depois confirmar compreensão real.
// Converte o JSON estruturado devolvido pela Gemini num texto legível, no
// mesmo formato que o aluno já via ao colar manualmente de uma IA externa —
// mantém a interface consistente entre os dois caminhos (automático/manual).
function formatarPlanoIA(plano: import('../backend').PlanoIndividualGemini): string {
  return `RESUMO
${plano.resumo}

TAREFAS
${(plano.tarefas || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}

QUESTÕES TÉCNICAS
${(plano.questoesTecnicas || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}

CASO PROFISSIONAL
${plano.casoProfissional || ''}

EVIDÊNCIAS A ENTREGAR
${(plano.evidenciasExigidas || []).map(e => `- ${e}`).join('\n')}

COMPETÊNCIAS COM DEFESA ORAL OBRIGATÓRIA
${(plano.competenciasComDefesaOral || []).map(c => `- ${c}`).join('\n')}

Tempo estimado: ${plano.tempoEstimadoMinutos || '?'} minutos`;
}

function PlanoIndividualBloco({ recuperacao, onAtualizado }: { recuperacao: import('../types').RecuperacaoModulo; onAtualizado: () => void }) {
  const r = recuperacao;
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [colando, setColando] = useState(false);
  const [textoColado, setTextoColado] = useState(r.planoIndividualTexto || '');
  const [aGerarIA, setAGerarIA] = useState(false);
  const [avisoIA, setAvisoIA] = useState('');

  const prompt = r.promptPlanoIndividual || construirPromptPlanoIndividual(r.id);

  // Tenta primeiro a geração automática via Gemini (gratuita) — se não
  // estiver configurada ou o limite diário foi atingido, cai automaticamente
  // no modo manual (prompt copiável), sem nunca bloquear o aluno.
  async function gerar() {
    setAGerarIA(true);
    setAvisoIA('');
    const resultado = await gerarPlanoRecuperacaoComIA(r.id);
    if (resultado.ok) {
      const textoFormatado = formatarPlanoIA(resultado.plano);
      addOrUpdateRecuperacao({
        ...r, promptPlanoIndividual: prompt, planoIndividualTexto: textoFormatado,
        atualizadoEm: new Date().toISOString(),
      });
      setTextoColado(textoFormatado);
    } else {
      // Modo manual — guarda só o prompt, o aluno copia/cola como antes.
      if (resultado.motivo === 'limite_atingido') setAvisoIA('A geração automática atingiu o limite gratuito de hoje — usa o modo manual abaixo.');
      else if (resultado.motivo !== 'sem_chave') setAvisoIA('Não foi possível gerar automaticamente — usa o modo manual abaixo.');
      addOrUpdateRecuperacao({ ...r, promptPlanoIndividual: prompt, atualizadoEm: new Date().toISOString() });
    }
    setAGerarIA(false);
    setAberto(true);
    onAtualizado();
  }

  function copiar() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function guardarResultado() {
    addOrUpdateRecuperacao({ ...r, planoIndividualTexto: textoColado, atualizadoEm: new Date().toISOString() });
    setColando(false);
    onAtualizado();
  }

  if (!r.promptPlanoIndividual && !r.planoIndividualTexto && !aberto) {
    return (
      <div style={{ marginBottom: 18, background: 'var(--copper-pale)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--copper)', marginBottom: 6 }}>
          🤖 Plano de Recuperação Individual
        </div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 10 }}>
          Gera um plano feito só para ti, com as tuas competências em falta. A app tenta gerar automaticamente — se não conseguir, dá-te um texto para colares numa IA.
        </div>
        {avisoIA && <div style={{ fontSize: 12, color: 'var(--copper)', marginBottom: 8 }}>{avisoIA}</div>}
        <button onClick={gerar} disabled={aGerarIA} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 13, cursor: aGerarIA ? 'default' : 'pointer', opacity: aGerarIA ? 0.7 : 1 }}>
          {aGerarIA ? '⏳ A gerar...' : '✨ Gerar o meu Plano de Recuperação'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 18, border: '1px solid rgba(181,101,29,0.3)', borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={() => setAberto(!aberto)} style={{ width: '100%', padding: '10px 14px', background: 'var(--copper-pale)', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🤖</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: 'var(--copper)' }}>Plano de Recuperação Individual</span>
        <span style={{ fontSize: 12 }}>{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <div style={{ padding: 14 }}>
          {!r.planoIndividualTexto && (
            <>
              <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>
                Escolhe uma IA — depois cola aqui o resultado.
              </div>
              <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 10, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                {prompt}
              </div>
              <SeletorIA prompt={prompt} corPrincipal="var(--recuperacao)" />
              <button onClick={copiar} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--copper)', background: copiado ? 'var(--sage)' : '#fff', color: copiado ? 'white' : 'var(--copper)', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>
                {copiado ? '✓ Copiado!' : '📋 Copiar prompt'}
              </button>
              {!colando ? (
                <button onClick={() => setColando(true)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Já tenho o resultado da IA →
                </button>
              ) : (
                <>
                  <textarea value={textoColado} onChange={e => setTextoColado(e.target.value)}
                    placeholder="Cola aqui o resultado que a IA te deu..."
                    style={{ width: '100%', minHeight: 120, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 12, marginBottom: 8 }} />
                  <button onClick={guardarResultado} disabled={!textoColado}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: textoColado ? 1 : 0.4 }}>
                    Guardar Plano
                  </button>
                </>
              )}
            </>
          )}
          {r.planoIndividualTexto && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', marginBottom: 6 }}>
                O teu plano {r.planoIndividualAprovado ? '✓ aprovado pelo professor' : '— a aguardar revisão do professor'}
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
                {r.planoIndividualTexto}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Anexos de evidências (ponto 6-7 da adenda) — Opção C: o aluno cola um link
// (Google Drive, OneDrive, YouTube não-listado, etc.). Mais simples de
// implementar já, sem precisar de infraestrutura própria de upload de
// ficheiros — fica registado e associado a esta recuperação específica.
type Anexo = { tipo: 'foto' | 'video' | 'audio' | 'documento' | 'link'; url: string; descricao?: string; criadoEm: string };

function AnexosBloco({ anexos, setAnexos }: { anexos: Anexo[]; setAnexos: (a: Anexo[]) => void }) {
  const [novoTipo, setNovoTipo] = useState<Anexo['tipo']>('foto');
  const [novoUrl, setNovoUrl] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');

  const icones: Record<Anexo['tipo'], string> = { foto: '📷', video: '🎥', audio: '🎙️', documento: '📄', link: '🔗' };

  function adicionar() {
    if (!novoUrl.trim()) return;
    setAnexos([...anexos, { tipo: novoTipo, url: novoUrl.trim(), descricao: novaDescricao.trim(), criadoEm: new Date().toISOString() }]);
    setNovoUrl('');
    setNovaDescricao('');
  }

  function remover(i: number) {
    setAnexos(anexos.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>F. Evidências (opcional)</div>
      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.55)', marginBottom: 8 }}>
        Se a competência precisar de prova prática, cola aqui o link (Google Drive, vídeo, etc.) — foto da mise en place, vídeo da técnica, áudio de explicação...
      </div>

      {anexos.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--cream-dark)', borderRadius: 8, marginBottom: 4 }}>
          <span>{icones[a.tipo]}</span>
          <a href={a.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12, color: 'var(--copper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descricao || a.url}</a>
          <button onClick={() => remover(i)} style={{ background: 'none', border: 'none', color: 'rgba(26,23,20,0.4)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <select value={novoTipo} onChange={e => setNovoTipo(e.target.value as Anexo['tipo'])}
          style={{ borderRadius: 8, border: '1px solid var(--border)', padding: '8px 6px', fontSize: 12 }}>
          <option value="foto">📷 Foto</option>
          <option value="video">🎥 Vídeo</option>
          <option value="audio">🎙️ Áudio</option>
          <option value="documento">📄 Documento</option>
          <option value="link">🔗 Outro link</option>
        </select>
        <input value={novoUrl} onChange={e => setNovoUrl(e.target.value)} placeholder="Cola o link aqui..."
          style={{ flex: 1, borderRadius: 8, border: '1px solid var(--border)', padding: '8px 10px', fontSize: 12 }} />
      </div>
      <input value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} placeholder="Descrição curta (opcional)"
        style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '8px 10px', fontSize: 12, marginBottom: 6 }} />
      <button onClick={adicionar} disabled={!novoUrl.trim()}
        style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: novoUrl.trim() ? 1 : 0.4 }}>
        + Adicionar evidência
      </button>
    </div>
  );
}

export default RecuperacaoModulosAluno;
