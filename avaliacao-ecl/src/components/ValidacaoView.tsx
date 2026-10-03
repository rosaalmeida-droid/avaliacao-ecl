import { ehTurmaTransicao, atitudesAnteriores } from '../transicaoReferencial';
import { getTriagemDaAula, guardarTriagemDaAula, colegasQueViram, selecoesQueContam, vezesQueRespondeu, temasDosColegas } from '../backend';
import { perguntasDaAula, perguntaPorId, type Triagem5C } from '../triagem5c';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { SelecaoAluno, Validacao, calcularNotaPlano, classificacao20, notaPara20 } from '../types';
import { perguntasDe, NAO_ACONTECEU, nivelDaAtitude } from '../perguntas_atitudes';
import { getComandas, getSelecoes, getValidacoes, addOrUpdateValidacao,
  getPlanosAula, getFichasProducao, addRegistoAvaliacao, substituirRegistosDoProfessor, getAlunos , nivelConsolidadoAtitude, somarUmAtitude , sincronizarDoSheets, confirmarRegistosNoSheets, selecaoJaValidada, validacaoDaSelecao, contaNaNotaDaAula, calculoDaAulaValidada, NIVEIS_REGISTOS_KF, marcaRegistosKF, guardarMarcaRegistosKF, getPresencas } from '../backend';
import { TEC_EVENTO, NOME_TEC_EVENTO } from '../eventosAvaliacao';
import { MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, encontrarMicro, encontrarAtitude, encontrarAparelho, encontrarSubtecnica, nomeCompetencia, nomeConhecimentoProf, categoriaDaNota, ramoDaCompetencia, caminhoDoRamo } from '../compatECL';
import { getLibrary } from '../libraryService';
import { capituloDoCampo } from '../bancoManuais';
import { Card, Button, Field } from './ui';
import { CriteriosComp } from './CriteriosComp';

// Escala 1-4 alinhada com a autoavaliação do aluno
// Escala 1-5 — cores de ardósia progressivas (neutras, sem verde/vermelho)
// Cinco níveis, do mais alto ao mais baixo. O `curto` é o que cabe no
// botão; o `label` é a frase inteira, para o professor confirmar o que
// está a dar. Antes só havia a frase longa, espremida em 20% da
// largura do ecrã — não se lia nem parecia um botão.
const NIVEIS_PROF = [
  { v: 5, curto: 'Muito bom', label: 'Faço com muito bom resultado',             txt: '#1e3a4a' },
  // Valores intermédios (Rosa, set/2026): 17,5 e 12,5.
  { v: 4.5, curto: 'Entre', label: 'Entre «Faço sozinho/a» e «Muito bom»',       txt: '#2d4a5c' },
  { v: 4, curto: 'Sozinho',   label: 'Faço sozinho/a',                           txt: '#3d5a6e' },
  { v: 3.5, curto: 'Entre', label: 'Entre «Com ajuda» e «Faço sozinho/a»',       txt: '#52697b' },
  { v: 3, curto: 'Com ajuda', label: 'Consegui com ajuda',                       txt: '#647a8a' },
  { v: 2, curto: 'A treinar', label: 'Tentei mas ainda preciso de mais prática', txt: '#96a4b0' },
  { v: 1, curto: 'Não fez',   label: 'Ainda não fiz',                            txt: '#7B2233' },
];

// Label do nível do aluno (vem da autoavaliação)
function labelNivelAluno(nivel: string, nota?: number): string {
  // A farda é verificada à entrada da aula: dizia só "entrada".
  if (nivel === 'entrada') return nota && nota >= 5 ? 'Farda completa (verificada à entrada)'
    : nota ? `Faltava-lhe parte da farda à entrada (${nota}/5)` : 'Verificado à entrada';
  if (nivel === 'mbr' || nivel === 'autonomia' || nivel === 'superei') return 'Faço com muito bom resultado';
  if (nivel === 'fs'  || nivel === 'sozinho'   || nivel === 'atingi')  return 'Faço sozinho/a';
  if (nivel === 'ca'  || nivel === 'ajuda'     || nivel === 'desenvolvimento') return 'Consegui com ajuda';
  if (nivel === 'tp')  return 'Tentei mas ainda preciso de mais prática';
  if (nivel === 'nf'  || nivel === 'nao'       || nivel === 'nao_atingi') return 'Ainda não fiz';
  return nivel;
}

function corNivelAluno(nivel: string, nota?: number): string {
  // A escala nova (mbr, fs, ca, tp) caía toda no vermelho: "Faço sozinho/a"
  // aparecia como se fosse mau.
  if (nivel === 'entrada') return nota && nota >= 5 ? 'var(--sage)' : 'var(--copper)';
  if (nivel === 'mbr' || nivel === 'autonomia' || nivel === 'superei')          return '#0369a1';
  if (nivel === 'fs'  || nivel === 'sozinho'   || nivel === 'atingi')           return 'var(--sage)';
  if (nivel === 'ca'  || nivel === 'tp' || nivel === 'ajuda' || nivel === 'desenvolvimento')  return 'var(--copper)';
  return 'var(--danger)';
}

// Nota final = a nota do professor, sempre. A autoavaliação do aluno é só uma
// proposta/referência — o professor confirma, sobe ou desce, mas a decisão
// final é sempre dele. O aluno só recebe a nota depois desta validação.
function calcularNotaFinal(notaProf: number, notaAluno: number): number {
  return notaProf;
}

// Conversão 1-5 → 0-20 (0-5-10-15-20)
function para20(n: number): number { return notaPara20(n); }
/** O mesmo, sem arredondar (a média de duas respostas pode dar 17,5). */
function para20Dec(n: number): number { return Math.max(0, Math.min(20, (n - 1) * 5)); }

/** Nota 1-5 → a mesma classificação que o aluno vê, em /20. */
function labelNotaFinal(nota: number): string {
  return classificacao20(notaPara20(nota));
}

function corNotaFinal(nota: number): string {
  if (nota >= 3) return 'var(--sage)';
  if (nota >= 2) return 'var(--copper)';
  return 'var(--danger)';
}

/** O tema do manual que o aluno trabalhou (o capítulo das competências
 *  que respondeu). Vazio quando a aula não é sobre o manual. */
function temaDoAluno(s: SelecaoAluno): string {
  const caps = new Map<number, string>();
  for (const a of (s.autoavaliacoes || []) as any[]) {
    const c = capituloDoCampo(String(a?.competenciaId || ''));
    if (c) caps.set(c.capitulo.n, `${c.capitulo.n}. ${c.capitulo.titulo}`);
  }
  return [...caps.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]).join(' · ');
}

/** O professor precisa do nome, não do identificador interno. */
function nomeDoAluno(alunoId: string): string {
  const a = getAlunos().find(x => x.id === alunoId);
  if (!a) return 'Aluno';
  return a.nome || `Aluno nº ${a.numero}`;
}

export function ValidacaoView({ turmaId, planoId }: { turmaId?: string; planoId?: string }) {
  const planos = getPlanosAula().filter(p => (!turmaId || p.turmaId === turmaId) && (!planoId || p.id === planoId));
  const selecoes = getSelecoes().filter(s => (!turmaId || s.turmaId === turmaId) && (!planoId || s.planoAulaId === planoId));
  const validacoes = getValidacoes();

  // Uma por aluno e aula: a mesma autoavaliação pode ter chegado duas vezes.
  // Fica a resposta mais recente: se o aluno respondeu outra vez, é essa que
  // se valida (antes ficava a antiga, já validada, e a nova não aparecia).
  const unicas = selecoesQueContam(selecoes);
  const porValidarLista = unicas.filter(s => !selecaoJaValidada(s, validacoes));
  const validadasLista = unicas.filter(s => selecaoJaValidada(s, validacoes))
    .sort((a, b) => String(b.criadaEm || '').localeCompare(String(a.criadaEm || '')));

  const [ativa, setAtiva] = useState<SelecaoAluno | null>(null);
  /** O aluno que acabou de ser validado (aviso no ecrã do seguinte). */
  const [acabou, setAcabou] = useState<string | null>(null);
  const [, redesenhar] = useState(0);
  const [aProcurar, setAProcurar] = useState(false);

  // As autoavaliações chegam pelo Sheets. Sem isto, só apareciam quando
  // a aplicação era reaberta — o professor ficava à espera sem saber
  // de quê. Enquanto este ecrã estiver aberto, procura de meio em meio
  // minuto, e há um botão para procurar já.
  function procurar() {
    if (!turmaId) return;
    setAProcurar(true);
    sincronizarDoSheets(turmaId)
      .catch(() => {})
      .finally(() => { setAProcurar(false); redesenhar(n => n + 1); });
  }

  useEffect(() => {
    if (!turmaId || ativa) return;
    const t = setInterval(procurar, 30000);
    return () => clearInterval(t);
  }, [turmaId, ativa]);

  if (ativa) {
    const plano = planos.find(p => p.id === ativa.planoAulaId);
    const fichas = getFichasProducao().filter(f => plano?.fichasIds?.includes(f.id));
    const valExistente = validacaoDaSelecao(ativa, validacoes) || null;
    return (
      <ValidarSelecao key={ativa.id}
        selecao={ativa}
        planoTitulo={plano?.titulo || ''}
        ucId={plano?.ucId || ''}
        fichasNomes={fichas.map(f => f.nomePrato)}
        fichas={fichas}
        tipoPlanAula={(plano as any)?.tipoPlanAula || 'pratico'}
        validacaoExistente={valExistente}
        onVoltar={() => { setAcabou(null); setAtiva(null); }}
        // Depois de guardar, o seguinte por validar — sem voltar à lista.
        seguintes={porValidarLista.filter(s => s.id !== ativa.id).length}
        onSeguinte={() => {
          const prox = porValidarLista.filter(s => s.id !== ativa.id && !selecaoJaValidada(s))[0];
          setAcabou(nomeDoAluno(ativa.alunoId));
          setAtiva(prox || null);
        }}
        acabouDe={acabou}
        fila={porValidarLista.map(s => ({ id: s.id, nome: nomeDoAluno(s.alunoId), atual: s.id === ativa.id }))}
        onIr={(id: string) => { setAcabou(null); setAtiva(porValidarLista.find(s => s.id === id) || null); }}
      />
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
        Validar autoavaliações
      </div>
      {acabou && (
        <div style={{ background: 'rgba(90,122,78,0.12)', border: '1px solid var(--sage)', borderRadius: 12,
          padding: '10px 14px', marginBottom: 12, fontSize: 14, color: 'var(--sage)', fontWeight: 600 }}>
          ✓ Validaste {acabou}. {porValidarLista.length ? '' : 'Não há mais nenhum por validar.'}
        </div>
      )}
      {porValidarLista.length > 0 && (
        <button onClick={() => { setAcabou(null); setAtiva(porValidarLista[0]); }} style={{
          display: 'block', width: '100%', padding: '14px', borderRadius: 12, border: 'none', marginBottom: 12,
          background: 'var(--sage)', color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Validar seguidos ({porValidarLista.length}) →
        </button>
      )}
      <button onClick={procurar} disabled={aProcurar} style={{
        padding: '9px 14px', borderRadius: 9, marginBottom: 12,
        border: '1px solid rgba(26,23,20,0.18)', background: '#fff',
        fontSize: 13.5, fontWeight: 700, cursor: aProcurar ? 'default' : 'pointer',
        fontFamily: 'inherit', opacity: aProcurar ? 0.6 : 1,
      }}>
        {aProcurar ? 'A procurar…' : 'Procurar autoavaliações agora'}
      </button>

      {planoId && <QuemFalta planoId={planoId} turmaId={planos[0]?.turmaId || turmaId || ''} selecoes={selecoes} />}

      {/* Primeiro o que falta; o que já está validado fica por baixo, à
          parte. Antes vinha tudo junto debaixo de «pendentes». */}
      <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: 'var(--copper)', margin: '6px 2px 8px' }}>Por validar ({porValidarLista.length})</div>
      {porValidarLista.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '14px 0' }}>
            <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 6 }}>
              {selecoes.length ? '✓ Não há nada por validar' : 'Ainda não há nada para validar'}
            </div>
            <div className="muted" style={{ lineHeight: 1.6 }}>
              {selecoes.length
                ? 'Todas as autoavaliações que chegaram já estão validadas.'
                : 'A validação só aparece depois de os alunos submeterem a autoavaliação. Se a aula já acabou e não aparece ninguém, confirma que abriste a aula e que eles chegaram ao último passo.'}
            </div>
          </div>
        </Card>
      )}
      {porValidarLista.map(s => cartao(s, false))}

      {validadasLista.length > 0 && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: 'var(--sage)', margin: '18px 2px 8px' }}>Já validadas ({validadasLista.length}) — tocar para alterar</div>
          {validadasLista.map(s => cartao(s, true))}
        </>
      )}
    </div>
  );

  function cartao(s: SelecaoAluno, jaValidada: boolean) {
    const plano = planos.find(p => p.id === s.planoAulaId) || getPlanosAula().find(p => p.id === s.planoAulaId);
    const nMicros = s.autoavaliacoes?.length || 0;
    const dia = String((plano as any)?.data || s.criadaEm || '').slice(0, 10).split('-').reverse().join('/');
    return (
      <div key={s.id} className="option-card" onClick={() => setAtiva(s)}
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {nomeDoAluno(s.alunoId)} — {plano?.titulo || `Aula de ${dia} (o plano não está neste computador)`}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {plano?.ucId ? `${plano.ucId} · ` : ''}
            {temaDoAluno(s) ? `Tema: ${temaDoAluno(s)} · ` : ''}
            {vezesQueRespondeu(s.alunoId, s.planoAulaId || '', selecoes) > 1
              ? `Respondeu ${vezesQueRespondeu(s.alunoId, s.planoAulaId || '', selecoes)} vezes: conta a última · ` : ''}
            {jaValidada
              ? '✓ Validado — tocar para alterar'
              : `${nMicros} competência${nMicros !== 1 ? 's' : ''} a validar`}
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: jaValidada ? 'rgba(90,122,78,0.15)' : 'rgba(181,101,29,0.15)',
          color: jaValidada ? 'var(--sage)' : 'var(--copper)' }}>
          {jaValidada ? 'Validado' : 'Por validar'}
        </span>
      </div>
    );
  }
}

/**
 * Quantos alunos ainda não enviaram a autoavaliação desta aula, e quem
 * (Rosa, set/2026). Contam os que entraram na aula; se ninguém tem a
 * entrada registada, conta a turma toda.
 */
function QuemFalta({ planoId, turmaId, selecoes }: { planoId: string; turmaId: string; selecoes: SelecaoAluno[] }) {
  const daTurma = getAlunos().filter(a => a.turmaId === turmaId && a.numero !== 99 && a.numero !== 88);
  const entraram = new Set(getPresencas().filter(p => p.planoAulaId === planoId && p.presente).map(p => p.alunoId));
  const esperados = entraram.size ? daTurma.filter(a => entraram.has(a.id)) : daTurma;
  if (!esperados.length) return null;
  const enviaram = new Set(selecoes.filter(s => s.planoAulaId === planoId).map(s => s.alunoId));
  const faltam = esperados.filter(a => !enviaram.has(a.id)).sort((a, b) => a.numero - b.numero);
  return (
    <div style={{ background: faltam.length ? '#FFF4E0' : 'rgba(90,122,78,0.12)', border: `1.5px solid ${faltam.length ? '#E8A33D' : 'var(--sage)'}`,
      borderRadius: 12, padding: '10px 14px', marginBottom: 12, fontSize: 14.5, lineHeight: 1.5 }}>
      <b>{esperados.length - faltam.length} de {esperados.length}</b> {entraram.size ? 'alunos que entraram' : 'alunos da turma'} já enviaram a autoavaliação.
      {faltam.length > 0 && (<>
        <div style={{ fontWeight: 700, marginTop: 4 }}>Ainda não chegou de: {faltam.map(a => `${a.numero}. ${a.nome}`).join(' · ')}</div>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 4 }}>
          Se o aluno diz que enviou, pede-lhe para abrir a aplicação com rede: a autoavaliação volta a ser enviada sozinha.
        </div>
      </>)}
    </div>
  );
}

// ── Validar autoavaliação de um aluno ────────────────────────
function ValidarSelecao({ selecao, planoTitulo, ucId, fichasNomes, fichas = [], tipoPlanAula, validacaoExistente, onVoltar, seguintes = 0, onSeguinte, acabouDe, fila = [], onIr }: {
  seguintes?: number;
  onSeguinte?: () => void;
  acabouDe?: string | null;
  fila?: { id: string; nome: string; atual: boolean }[];
  onIr?: (id: string) => void;
  selecao: SelecaoAluno;
  planoTitulo: string;
  ucId: string;
  fichasNomes: string[];
  /** As fichas do plano — para mostrar o ramo (prato → aparelho → técnica). */
  fichas?: any[];
  tipoPlanAula?: 'pratico' | 'misto' | 'teorico';
  validacaoExistente?: any;
  onVoltar: () => void;
}) {
  /** +1 já dados nesta validação — um por atitude, para não somar duas vezes. */
  const [maisUm, setMaisUm] = useState<Record<string, boolean>>({});
  const [aConfirmar, setAConfirmar] = useState(false);
  // Ao passar ao aluno seguinte, começa-se do topo.
  const topoRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { topoRef.current?.scrollIntoView({ block: 'start' }); }, []);
  /** A confirmar no Sheets. Era o mesmo estado da janela de confirmação —
   *  e a janela voltava a abrir enquanto a nota seguia. */
  const [aEnviar, setAEnviar] = useState(false);
  const [chegou, setChegou] = useState<boolean | null>(null);
  // Pré-preencher com a proposta do aluno — o professor só precisa de clicar
  // onde quer discordar (subir ou descer); o resto fica já seleccionado, pronto
  // a confirmar com um só toque em "Guardar".
  const [notasProf, setNotasProf] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    (selecao.autoavaliacoes || []).forEach((auto: any) => {
      const notaAlunoProposta = auto.nota || (
        auto.nivel === 'mbr' || auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 5 :
        auto.nivel === 'fs'  || auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 4 :
        auto.nivel === 'ca'  || auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 3 :
        auto.nivel === 'tp' ? 2 : 1
      );
      const jaVal = validacaoExistente?.notas?.find((n: any) => n.competenciaId === auto.competenciaId);
      inicial[auto.competenciaId] = jaVal ? jaVal.nota : notaAlunoProposta;
    });
    // Registos do KitchenFlow: só o professor marca (o aluno já não responde).
    // Vem a marca já gravada, ou a que deste a um colega do mesmo grupo.
    delete inicial.OBR_02;
    // O que o aluno fez em vez das técnicas: só o professor dá nota.
    if (!validacaoExistente?.notas?.some((n: any) => n.competenciaId === 'SUB-OUTRA')) delete inicial['SUB-OUTRA'];
    const kf = validacaoExistente?.notas?.find((n: any) => n.competenciaId === 'OBR_02')?.nota
      ?? marcaRegistosKF(selecao.planoAulaId || '', selecao.alunoId);
    if (kf) inicial.OBR_02 = kf;
    return inicial;
  });
  const [comentario, setComentario] = useState('');
  // O aluno declarou a farda completa e não era verdade: a farda fica a 1 e
  // a atitude «Responsabilidade pelas suas ações» (ATI-001) também.
  // Fica gravado na validação: ao reabrir, o botão aparece como foi deixado.
  const [faltouVerdade, setFaltouVerdade] = useState<boolean>(() => !!validacaoExistente?.faltouVerdade);
  // Sem farda completa (declarado à entrada, ou «Não era verdade»): avalia-se
  // tudo e fica no percurso, mas as técnicas contam 0 na nota. O professor pode desfazer.
  const fardaDaEntrada = (selecao.autoavaliacoes || []).find((a: any) => a.competenciaId === 'OBR_01' && a.daEntrada);
  const [semFarda, setSemFarda] = useState<boolean>(() => validacaoExistente
    ? !!validacaoExistente.semFarda
    : !!fardaDaEntrada && Number((fardaDaEntrada as any).nota) < 5);
  const [guardado, setGuardado] = useState(false);
  // Triagem do CL e do CR: vem a resposta do aluno; o professor confirma ou muda.
  const [triagem, setTriagem] = useState<Triagem5C | null>(() => {
    const t = getTriagemDaAula(selecao.alunoId, selecao.planoAulaId || '');
    return t.professor || t.aluno || validacaoExistente?.triagem5c || (selecao as any).triagem5c || null;
  });

  // Obter competências da autoavaliação
  // A pergunta antiga ao aluno sobre a higiene e segurança alimentar sai:
  // os registos do KitchenFlow marca-os o professor, pelo relatório.
  const autoavaliacoesAluno = (selecao.autoavaliacoes || []).filter((a: any) => a.competenciaId !== 'OBR_02');
  const planoDaSelecao: any = getPlanosAula().find(p => p.id === selecao.planoAulaId);
  const comRegistosKF = ['pratico', 'misto'].includes(String(tipoPlanAula || planoDaSelecao?.tipoPlanAula || 'pratico'))
    && !(planoDaSelecao?.compRemovidas || []).includes('OBR_02');
  // Sem farda completa: «Cuidado com a apresentação pessoal» avalia-se sempre
  // nesta aula (mesmo que o aluno não a tenha na autoavaliação).
  const autoavaliacoes: any[] = [
    ...(comRegistosKF ? [{ competenciaId: 'OBR_02', nivel: 'professor', nota: 0, doProfessor: true, registosKF: true }] : []),
    ...autoavaliacoesAluno,
    ...(semFarda && !autoavaliacoesAluno.some((a: any) => a.competenciaId === 'ATI-003')
      ? [{ competenciaId: 'ATI-003', nivel: 'professor', nota: 1, doProfessor: true }] : []),
  ];
  // «Não tive oportunidade» (técnicas): o professor confirma — confirmado, não conta.
  const [semOport, setSemOport] = useState<Record<string, boolean>>(() => Object.fromEntries(
    autoavaliacoesAluno.filter((a: any) => a.semOportunidade || a.nivel === 'nop')
      .map((a: any) => [a.competenciaId, !(validacaoExistente?.notas || []).some((n: any) => n.competenciaId === a.competenciaId)])));
  const contaParaNota = (id: string) => !semOport[id];
  // Atitudes: o aluno disse «não aconteceu» e o professor viu que aconteceu.
  // Essa pergunta passa a contar no nível mais baixo, e o aluno é avisado.
  const [aconteceu, setAconteceu] = useState<Record<string, boolean>>(() => Object.fromEntries(
    ((validacaoExistente as any)?.naoReparou || []).map((x: any) => [`${x.competenciaId}|${x.q}`, true])));

  function getNomeComp(id: string): string {
    if (id === TEC_EVENTO) return NOME_TEC_EVENTO;
    if (id === 'SUB-OUTRA') return 'O que fez em vez das técnicas (conta como a técnica de hoje)';
    if (id.startsWith('OBR_')) {
      const obrs: Record<string,string> = {
        'OBR_01': 'Farda', 'OBR_02': 'Registos do KitchenFlow', 'OBR_03': 'Assiduidade',
      };
      return obrs[id] || id;
    }
    if (id.startsWith('SUB-')) return encontrarSubtecnica(id)?.nome || id;
    if (id.startsWith('APP-')) return encontrarAparelho(id)?.nome || id;
    if (id.startsWith('ATT_')) return encontrarAtitude(id)?.nome || id;
    if (id.startsWith('KNW-P') || id.startsWith('KNW-R-')) return nomeConhecimentoProf(id) || 'Conhecimento';
    if (id.startsWith('KNW-')) {
      const lib = getLibrary();
      return (lib.conhecimentos as any[]).find(k => k.id === id)?.nome || id;
    }
    return encontrarMicro(id)?.nome || id;
  }

  function getCriterios(id: string): string[] {
    if (id.startsWith('ATT_') || id.startsWith('OBR_')) return [];
    const m = encontrarMicro(id);
    return (m?.criterios || []).map((c: any) => c.criterio || c);
  }

  // As notas finais desta validação — as MESMAS na pré-visualização e na
  // gravação. Antes a pré-visualização tinha uma conta à parte e não via o
  // «Não era verdade»: o professor via uma nota mais alta do que a gravada.
  function montarNotasFinais() {
    const notasFinais = autoavaliacoes.filter((a: any) => contaParaNota(a.competenciaId)).map((auto: any) => {
      const notaProf = notasProf[auto.competenciaId] ?? (auto.doProfessor ? auto.nota : undefined) ?? 2;
      // Nota do aluno em escala 1-5
      const notaAluno = (auto as any).nota || (
        auto.nivel === 'mbr' || auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 5 :
        auto.nivel === 'fs'  || auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 4 :
        auto.nivel === 'ca'  || auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 3 :
        auto.nivel === 'tp' ? 2 : 1
      );
      const notaFinal = calcularNotaFinal(notaProf, notaAluno);
      return { competenciaId: auto.competenciaId, notaProf, notaAluno, notaFinal };
    });
    if (faltouVerdade) {
      const r = notasFinais.find(n => n.competenciaId === 'ATI-001');
      if (r) { r.notaProf = 1; r.notaFinal = 1; }
      else notasFinais.push({ competenciaId: 'ATI-001', notaProf: 1, notaAluno: 0, notaFinal: 1 });
    }
    return notasFinais;
  }
  /** A nota da aula como fica gravada — pela função única do backend. */
  function calcularDaAula(notasFinais: { competenciaId: string; notaFinal: number }[]) {
    return calculoDaAulaValidada({
      notas: notasFinais.map(n => ({ competenciaId: n.competenciaId, nota: n.notaFinal })),
      semFarda, faltouVerdade, tipoPlanAulaUsado: tipoPlanAula || 'pratico',
    }) || { nota20: 0, porCategoria: {} as Record<string, number>, detalhes: '' };
  }

  // Pré-visualização em tempo real da nota final — actualiza a cada nota que o
  // professor dá, para não haver surpresas: o professor vê SEMPRE a decomposição
  // por categoria antes de confirmar, não só o número final.
  const previsaoNota = calcularDaAula(montarNotasFinais());

  const LABEL_CAT: Record<string,string> = {
    OBR: 'Higiene e segurança alimentar (farda e registos do KitchenFlow)',
    SUB: 'Técnicas/Subtécnicas',
    KNW: 'Conhecimentos',
    ATI: 'Atitude',
    INI: 'Iniciativa',
  };

  async function guardar() {
    const agora = new Date().toISOString();
    const notasFinais = montarNotasFinais();
    const naoReparou: any[] = autoavaliacoesAluno.flatMap((a: any) => (a.respIdx || []).map((v: any, q: number) =>
      v === NAO_ACONTECEU && aconteceu[`${a.competenciaId}|${q}`]
        ? { competenciaId: a.competenciaId, q, pergunta: perguntasDe(a.competenciaId, !!planoDaSelecao?.tipoEvento)?.[q]?.pergunta || '',
            proxima: perguntasDe(a.competenciaId, !!planoDaSelecao?.tipoEvento)?.[q]?.respostas[2] || '' } : null).filter(Boolean));
    // O mesmo nas perguntas dos 5 C.
    if (triagem) for (const q of perguntasDaAula(triagem.coId, triagem.crId, triagem.clId))
      if ((triagem.naoReparou || []).includes(q.chave)) {
        // A pergunta que o aluno disse que não aconteceu (a primeira que saltou).
        const p = perguntaPorId((triagem.semAntes?.[q.chave] || [])[0] || '') || q;
        naoReparou.push({ competenciaId: q.chave, q: 0, pergunta: p.pergunta, proxima: p.frases[2] || '' });
      }
    // Guardar validação
    const validacao: Validacao = {
      id: `val_${selecao.id}`,
      selecaoId: selecao.id,
      comandaId: selecao.planoAulaId || '',
      alunoId: selecao.alunoId,
      turmaId: selecao.turmaId,
      planoAulaId: selecao.planoAulaId || '',
      fichaId: selecao.fichaId || '',
      notas: notasFinais.map(n => ({
        competenciaId: n.competenciaId,
        nota: n.notaFinal,
        origem: 'professor' as const,
      })),
      ...(triagem ? { triagem5c: triagem } : {}),
      ...(naoReparou.length ? { naoReparou } : {}),
      comentarioGeral: comentario,
      validadoPor: 'professor',
      validadoEm: agora,
    };
    // Calcular nota ponderada com pesos por categoria
    // A técnica geral do evento só serve para o bónus de eventos: não entra
    // na nota do plano nem nos registos das competências.
    const paraNota = notasFinais.filter(n => n.competenciaId !== TEC_EVENTO);
    const { nota20, porCategoria, detalhes } = calcularDaAula(paraNota);
    const notaMedia = paraNota.length
      ? paraNota.reduce((s, n) => s + n.notaFinal, 0) / paraNota.length
      : 0;
    (validacao as any).notaMedia = Math.round(notaMedia * 10) / 10;
    (validacao as any).notaMedia20 = nota20; // usa pesos por categoria, não média simples
    // Sem farda: as técnicas ficam no percurso com a nota dada, mas contam 0 na nota da aula.
    if (semFarda) (validacao as any).semFarda = true;
    if (faltouVerdade) (validacao as any).faltouVerdade = true;
    // Guardar a decomposição por categoria para o professor perceber sempre
    // como a nota foi calculada (antes ficava só o número, sem explicação).
    (validacao as any).porCategoria = porCategoria;
    (validacao as any).detalhesNota = detalhes;
    (validacao as any).tipoPlanAulaUsado = tipoPlanAula || 'pratico';
    addOrUpdateValidacao(validacao as any);
    if (triagem) guardarTriagemDaAula(selecao.alunoId, selecao.turmaId, selecao.planoAulaId || '', triagem, 'professor');

    // Substituir — não acrescentar. Se o professor corrigir uma validação
    // já feita, os registos antigos têm de sair, senão o aluno passa a ver
    // duas notas para a mesma competência.
    substituirRegistosDoProfessor(
      selecao.alunoId,
      selecao.planoAulaId || '',
      paraNota.map(n => ({
        // Identificador estável: se corrigires a validação, a linha do
        // Sheets é a mesma — não fica uma nota velha ao lado da nova.
        id: `registo_${selecao.alunoId}_${selecao.planoAulaId}_${n.competenciaId}`,
        alunoId: selecao.alunoId,
        turmaId: selecao.turmaId,
        planoAulaId: selecao.planoAulaId || '',
        fichaId: selecao.fichaId || '',
        ucId,
        microcompetenciaId: n.competenciaId,
        nota: n.notaFinal,
        data: agora,
        validadoPor: 'professor' as const,
      }))
    );
    // Confirmar que chegou ao Sheets. Uma nota que se perde engana o
    // aluno e o professor — por isso é dito na hora.
    setGuardado(true);
    // A confirmação no Sheets faz-se por trás: cada nota é um envio, e o
    // professor ficava parado à espera de todas. Agora grava, diz logo que
    // está guardado, e pode passar ao aluno seguinte. Só avisa se, ao fim
    // de meio minuto, as notas ainda não tiverem chegado.
    const ids = paraNota.map(n => `registo_${selecao.alunoId}_${selecao.planoAulaId}_${n.competenciaId}`);
    setAEnviar(true);
    const nome = getAlunos().find(a => a.id === selecao.alunoId)?.nome || 'este aluno';
    confirmarRegistosNoSheets(selecao.turmaId, ids).then(r => {
      setAEnviar(false);
      setChegou(r.ok);
      if (!r.ok) {
        alert(
          `ATENÇÃO — a avaliação de ${nome} ficou gravada aqui, mas ainda NÃO chegou ao arquivo da escola.\n\n`
          + `Confirmadas ${r.encontrados} de ${r.total} notas.\n\n`
          + 'A aplicação volta a tentar sozinha. Se o aviso se repetir, vai a Coordenadora → Alunos → '
          + '"Testar a ligação".'
        );
      }
    });
  }

  // Depois de guardar não se fecha o ecrã: o professor pode querer
  // corrigir logo a seguir. Fica só um aviso por cima do formulário.
  

  return (
    <div>
      <button ref={topoRef} className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={onVoltar}>← Voltar à lista</button>

      {acabouDe && !guardado && (
        <div style={{ background: 'rgba(90,122,78,0.12)', border: '1px solid var(--sage)', borderRadius: 12,
          padding: '10px 14px', marginBottom: 12, fontSize: 14, color: 'var(--sage)', fontWeight: 600 }}>
          ✓ Validaste {acabouDe}. Agora: {nomeDoAluno(selecao.alunoId)}.
        </div>
      )}
      {/* Os que faltam: toca num nome para saltar para ele. */}
      {fila.length > 1 && onIr && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
          {fila.map((f, i) => (
            <button key={f.id} onClick={() => !f.atual && onIr(f.id)} style={{
              flexShrink: 0, padding: '7px 11px', borderRadius: 100, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: f.atual ? 'default' : 'pointer', whiteSpace: 'nowrap',
              border: f.atual ? '2px solid var(--copper)' : '1px solid var(--border)',
              background: f.atual ? 'var(--copper)' : '#fff', color: f.atual ? '#fff' : 'rgba(26,23,20,0.75)' }}>
              {i + 1}. {f.nome.split(' ')[0]} {f.nome.split(' ').slice(-1)[0] !== f.nome.split(' ')[0] ? f.nome.split(' ').slice(-1)[0] : ''}
            </button>
          ))}
        </div>
      )}

      {guardado && (
        <div style={{ background: 'rgba(90,122,78,0.12)', border: '1px solid var(--sage)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, color: 'var(--sage)' }}>✓</span>
          <div style={{ flex: 1, fontSize: 14, color: 'var(--sage)', fontWeight: 600 }}>
            Validação guardada. Podes continuar a alterar — basta guardar outra vez.
            <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 3,
              color: chegou === false ? 'var(--danger)' : 'rgba(26,23,20,0.55)' }}>
              {aEnviar ? '⏳ A chegar ao arquivo da escola… podes passar ao seguinte.'
                : chegou ? '✓ Já está no arquivo da escola.'
                : chegou === false ? '⚠ Ainda não chegou ao arquivo — a aplicação volta a tentar.' : ''}
            </div>
          </div>
          {seguintes > 0 && onSeguinte && (
            <button onClick={onSeguinte} style={{ padding: '10px 14px', borderRadius: 9, border: 'none',
              background: 'var(--sage)', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Seguinte ({seguintes}) →
            </button>
          )}
        </div>
      )}

      {validacaoExistente && !guardado && (
        <div style={{ background: 'rgba(90,122,78,0.12)', border: '1px solid var(--sage)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          fontSize: 14, color: 'var(--sage)', fontWeight: 600 }}>
          Já validaste esta autoavaliação. As notas abaixo são as que gravaste — altera e guarda de novo.
        </div>
      )}

      <div style={{ background: 'var(--charcoal)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, color: 'var(--cream)' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{planoTitulo}</div>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 3 }}>
          {ucId && `${ucId} · `}{nomeDoAluno(selecao.alunoId)}
          {fichasNomes.length > 0 && ` · ${fichasNomes.join(', ')}`}
        </div>
        {temaDoAluno(selecao) && (
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, color: '#f0b470' }}>
            Tema do aluno: {temaDoAluno(selecao)}
          </div>
        )}
        {(() => {
          // No mesmo grupo, o mesmo tema: o professor vê se não bate certo.
          const meu = (selecao.autoavaliacoes || []).map((a: any) => capituloDoCampo(String(a?.competenciaId || ''))?.capitulo.n).find(n => n != null);
          const outros = temasDosColegas(selecao.planoAulaId || '', selecao.alunoId).filter(c => meu != null && c.tema !== meu);
          return outros.length ? (
            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6, color: '#ffb4a8' }}>
              ⚠ Tema diferente do grupo: {outros.map(o => `${o.nome} escolheu o ${o.tema}`).join(' · ')}
            </div>
          ) : null;
        })()}
      </div>

      {/* Sem farda completa: avalia-se tudo (fica no percurso), as técnicas contam 0. */}
      {(semFarda || fardaDaEntrada) && tipoPlanAula !== 'teorico' && (
        <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 12,
          background: semFarda ? '#fdf0ef' : '#f5f7f2', border: `1.5px solid ${semFarda ? '#c0392b' : 'rgba(26,23,20,0.12)'}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: semFarda ? '#8e2418' : 'rgba(26,23,20,0.7)' }}>
            {semFarda ? 'Sem farda completa: as técnicas contam 0 nesta aula' : 'Farda completa'}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(26,23,20,0.7)', marginTop: 4 }}>
            {semFarda
              ? 'Avalia tudo normalmente: as técnicas ficam no percurso do aluno. As atitudes contam — incluindo «Cuidado com a apresentação pessoal» e a forma como ajudou na aula. Não é falta.'
              : 'O aluno declarou a farda completa à entrada.'}
          </div>
          {(() => {
            const r = (fardaDaEntrada as any)?.reflexaoFarda;
            if (!r) return null;
            return (
              <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: 8 }}>
                {r.emFalta?.length ? <div><b>Faltava:</b> {r.emFalta.join(', ')}</div> : null}
                <div><b>O que aconteceu:</b> {r.porque || '—'}</div>
                <div><b>O que fez para resolver:</b> {r.resolver || '—'}</div>
                <div><b>Para não voltar a acontecer:</b> {r.evitar || '—'}</div>
              </div>
            );
          })()}
          <button onClick={() => setSemFarda(!semFarda)} style={{ marginTop: 8, fontSize: 13, fontWeight: 700,
            padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            border: '1px solid rgba(26,23,20,0.25)', background: '#fff', color: 'rgba(26,23,20,0.75)' }}>
            {semFarda ? 'Desfazer: tinha a farda completa' : 'Não tinha a farda completa'}
          </button>
        </div>
      )}

      {autoavaliacoes.length === 0 && (
        <Card>
          <div className="muted">Sem competências para validar nesta autoavaliação.</div>
        </Card>
      )}

      {autoavaliacoes.map(auto => {
        if (auto.registosKF) {
          const escolha = notasProf.OBR_02;
          return (
            <div key="OBR_02" style={{ marginBottom: 10, background: '#fff', border: `1.5px solid ${escolha ? 'var(--border)' : '#b5651d'}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Registos do KitchenFlow</div>
              <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', margin: '4px 0 10px', lineHeight: 1.5 }}>
                Vê o relatório do KitchenFlow desta aula. Os registos que a ficha pede foram feitos? Conta 10% na nota da aula.
                A mesma marca fica já escolhida para os colegas do mesmo grupo.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {NIVEIS_REGISTOS_KF.map(n => (
                  <button key={n.v} onClick={() => {
                      setNotasProf(p => ({ ...p, OBR_02: n.v }));
                      guardarMarcaRegistosKF(selecao.planoAulaId || '', selecao.alunoId, n.v);
                    }}
                    style={{ padding: '12px 4px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      border: `2px solid ${escolha === n.v ? 'var(--sage)' : 'var(--border)'}`,
                      background: escolha === n.v ? 'var(--sage)' : '#fff', color: escolha === n.v ? '#fff' : 'rgba(26,23,20,0.7)' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{n.texto}</div>
                    <div style={{ fontSize: 12, marginTop: 3 }}>{para20(n.v)}/20</div>
                  </button>
                ))}
              </div>
            </div>
          );
        }
        const nome = getNomeComp(auto.competenciaId);
        const criterios = getCriterios(auto.competenciaId);
        const _isApp = auto.competenciaId.startsWith('APP-');
        const _isSub = auto.competenciaId.startsWith('SUB-');
        const _isKnw = auto.competenciaId.startsWith('KNW-');
        const _app = _isApp ? encontrarAparelho(auto.competenciaId) : null;
        const notaProf = notasProf[auto.competenciaId];
        // Usar nota 1-4 directamente (novo sistema), com fallback para labels antigos
        const notaAluno14 = (auto as any).nota || (
          auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 4 :
          auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 3 :
          auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 2 : 1
        );
        const notaFinal = notaProf ? calcularNotaFinal(notaProf, notaAluno14) : null;

        // Cor e label do nível do aluno — suporta escala nova e antiga
        const corAluno = corNivelAluno((auto as any).nivel || '', (auto as any).nota);
        const labelAluno = (auto as any).nivel === 'outra' ? `«${(auto as any).texto || ''}» — dá tu a nota`
          : Array.isArray((auto as any).respostas) && (auto as any).respostas.length
            ? `${String(Math.round(para20Dec(Number((auto as any).nota) || 1) * 10) / 10).replace('.', ',')}/20 pelas respostas abaixo`
          : (auto as any).nivel === 'evento'
          ? `${(auto as any).texto || ''}${(auto as any).comentario ? ` — correu menos bem: «${(auto as any).comentario}»` : ''}`
          : labelNivelAluno((auto as any).nivel || '', (auto as any).nota);

        // O ramo: prato → aparelho → técnica, para o professor saber de que
        // roux/corte se trata, e o que se vê quando está bem feito.
        const _ramo = (_isSub || _isApp) ? ramoDaCompetencia(auto.competenciaId, fichas) : null;
        const _caminho = _ramo ? (_isApp ? (_ramo.prato || '') : caminhoDoRamo(_ramo)) : '';

        return (
          <div key={auto.competenciaId} style={{ marginBottom: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            {_caminho && <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.55)', marginBottom:2 }}>{_caminho}</div>}
            {/* Nome da competência */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom: 8 }}>
              {/* O que o aluno fez neste prato (da ficha), como o aluno o viu. */}
              <span style={{ fontWeight: 700, fontSize: 14 }}>{_ramo?.fazes || nome}</span>
              {_ramo?.fazes && <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)' }}>{nome}</span>}
              {auto.competenciaId === 'OBR_01' && (auto as any).daEntrada && (
                <span style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:12.5, fontWeight:700, padding:'2px 8px', borderRadius:100, background:'#fdf0e6', color:'#b5651d' }}>
                    Declarado pelo aluno — confirma
                  </span>
                  <button onClick={() => {
                      const v = !faltouVerdade; setFaltouVerdade(v);
                      if (v) { setNotasProf(p => ({ ...p, OBR_01: 1 })); setSemFarda(true); }
                    }}
                    style={{ fontSize:12.5, fontWeight:700, padding:'3px 9px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                      border:'1px solid #7B2233', background: faltouVerdade ? '#7B2233' : '#fff', color: faltouVerdade ? '#fff' : '#7B2233' }}>
                    {faltouVerdade ? '✓ Não era verdade (farda e Responsabilidade a 1)' : 'Não era verdade'}
                  </button>
                </span>
              )}
              {(auto as any).semRegistoKF && (
                <span style={{ fontSize:12.5, fontWeight:700, padding:'2px 8px', borderRadius:100,
                  background:'#fdf0e6', color:'#b5651d' }}>
                  Sem registos no KitchenFlow — proposta a 1
                </span>
              )}
              {_isApp && _app && (
                <span style={{ fontSize:12.5, fontWeight:700, padding:'2px 6px', borderRadius:100,
                  background: _app.nivel===1?'rgba(90,122,78,0.15)':_app.nivel===2?'rgba(181,101,29,0.15)':'rgba(192,57,43,0.15)',
                  color: _app.nivel===1?'#5a7a4e':_app.nivel===2?'#b5651d':'#c0392b' }}>
                  Aparelho N{_app.nivel} · {_app.categoria}
                </span>
              )}
              {_isSub && (
                <span style={{ fontSize:12.5, color:'rgba(26,23,20,0.4)', fontStyle:'italic' }}>subtécnica</span>
              )}
              {auto.competenciaId.startsWith('KNW-') && (
                <span style={{ fontSize:12.5, color:'#0369a1', fontStyle:'italic', fontWeight:600 }}>conhecimento</span>
              )}
            </div>
            {_ramo?.resultado && (
              <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.6)', margin:'-4px 0 8px' }}>Bem feito é: {_ramo.resultado}</div>
            )}

            {/* «Não tive oportunidade»: o professor confirma (não conta) ou não (não fez = 0). */}
            {auto.competenciaId in semOport && (
              <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: '#fdf6e8', border: '1px solid #e8c98f' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#8a5a12' }}>
                  O aluno diz que não teve oportunidade de fazer esta hoje. Confirmas?
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {[[true, 'Confirmo: não conta para a nota'], [false, 'Não é verdade: não fez (0)']].map(([v, t]) => (
                    <button key={String(v)} onClick={() => {
                        setSemOport(p => ({ ...p, [auto.competenciaId]: v as boolean }));
                        if (!v) setNotasProf(p => ({ ...p, [auto.competenciaId]: 1 }));
                      }}
                      style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                        border: '1px solid #b5651d', background: semOport[auto.competenciaId] === v ? '#b5651d' : '#fff',
                        color: semOport[auto.competenciaId] === v ? '#fff' : '#b5651d' }}>{t as string}</button>
                  ))}
                </div>
              </div>
            )}
            {auto.competenciaId === 'OBR_01' && (
              <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>
                Confirma a farda: completa, passada, branca e limpa. Conta 10% na nota da aula. Quando falta, as técnicas contam 0.
              </div>
            )}
            {semFarda && categoriaDaNota(auto.competenciaId) === 'SUB' && (
              <div style={{ fontSize: 12.5, color: '#8e2418', marginBottom: 8 }}>
                Sem farda: fica no percurso com a nota que deres, mas conta 0 na nota desta aula.
              </div>
            )}

            {/* Autoavaliação do aluno */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: 'var(--cream-dark)', borderRadius: 8 }}>
              <span style={{ fontSize:13, color: 'rgba(26,23,20,0.5)' }}>Aluno disse:</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: corAluno }}>{labelAluno}</span>
            </div>

            {/* Atitudes: as duas perguntas e o que o aluno respondeu a cada uma. */}
            {Array.isArray((auto as any).respostas) && (auto as any).respostas.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {(auto as any).respostas.map((r: any, i: number) => {
                  const disseNao = (auto as any).respIdx?.[i] === NAO_ACONTECEU;
                  const chave = `${auto.competenciaId}|${i}`;
                  // Os colegas da mesma aula que responderam a esta pergunta (não disseram «não aconteceu»).
                  const col = disseNao ? getSelecoes().filter((s: any) => s.planoAulaId === selecao.planoAulaId && s.alunoId !== selecao.alunoId)
                    .map((s: any) => (s.autoavaliacoes || []).find((x: any) => x.competenciaId === auto.competenciaId)?.respIdx?.[i])
                    .filter((v: any) => v != null) : [];
                  const viram = col.filter((v: any) => v >= 0).length;
                  return (
                    <div key={i} style={{ fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)', lineHeight: 1.45 }}>
                      <div style={{ color: 'rgba(26,23,20,0.55)' }}>{i + 1}. {r.pergunta}</div>
                      <div style={{ fontWeight: 600 }}>{r.resposta}</div>
                      {disseNao && (
                        <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: '#fdf6e8', border: '1px solid #e8c98f' }}>
                          {col.length > 0 && (
                            <div style={{ fontSize: 12.5, color: '#8a5a12', marginBottom: 6 }}>
                              {viram} de {col.length} colegas disseram que isto aconteceu nesta aula.
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {([[false, 'Não aconteceu: não conta'], [true, 'Aconteceu e não reparou: conta 5/20']] as const).map(([v, t]) => (
                              <button key={String(v)} onClick={() => {
                                  setAconteceu(p => ({ ...p, [chave]: v }));
                                  const idx = ((auto as any).respIdx || []).map((x: any, q: number) =>
                                    q === i ? (v ? 0 : NAO_ACONTECEU)
                                    : x === NAO_ACONTECEU && aconteceu[`${auto.competenciaId}|${q}`] ? 0 : x);
                                  const n = nivelDaAtitude(idx);
                                  if (n != null) setNotasProf(p => ({ ...p, [auto.competenciaId]: n }));
                                }}
                                style={{ fontSize: 12.5, fontWeight: 700, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                                  border: '1px solid #b5651d', background: !!aconteceu[chave] === v ? '#b5651d' : '#fff',
                                  color: !!aconteceu[chave] === v ? '#fff' : '#b5651d' }}>{t}</button>
                            ))}
                          </div>
                          {aconteceu[chave] && (
                            <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginTop: 4 }}>
                              O aluno vai ver: «Aconteceu hoje e não reparaste» e o que fazer para a próxima.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Critérios observáveis */}
            {criterios.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, color: 'rgba(26,23,20,0.4)' }}>
                  Critérios observáveis
                </div>
                {criterios.map((c, i) => (
                  <div key={i} style={{ fontSize:13, padding: '3px 0', borderBottom: '1px solid var(--border)', color: 'rgba(26,23,20,0.7)' }}>
                    · {c}
                  </div>
                ))}
              </div>
            )}

            {/* Critérios observáveis do Dicionário — ajuda o professor a validar com precisão */}
            {/* Só quando a lista de cima não existe: eram os mesmos critérios duas vezes. */}
            {criterios.length === 0 && <CriteriosComp compId={auto.competenciaId} cor="var(--sage)" />}

            {/* Avaliação do professor (1-4) */}
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, marginTop: 12, color: 'rgba(26,23,20,0.5)' }}>
              A tua avaliação
            </div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.45)', marginBottom: 8 }}>
              Vem preenchido com o que o aluno se deu. Toca para alterar.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
              {NIVEIS_PROF.map(n => {
                const escolhido = notaProf === n.v;
                const foiDoAluno = notaAluno14 === n.v;
                return (
                  <button key={n.v}
                    onClick={() => setNotasProf(p => ({ ...p, [auto.competenciaId]: n.v }))}
                    style={{
                      padding: '12px 2px 9px', borderRadius: 10, minWidth: 0,
                      border: `2px solid ${escolhido ? n.txt : 'var(--border)'}`,
                      background: escolhido ? n.txt : '#fff',
                      color: escolhido ? '#fff' : 'rgba(26,23,20,0.55)',
                      cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                      position: 'relative',
                    }}>
                    {/* Em /20, como a nota da aula (os níveis 1 a 5 confundiam). */}
                    <div style={{ fontSize: Number.isInteger(n.v) ? 20 : 16, fontWeight: 700, lineHeight: 1 }}>{String(para20Dec(n.v)).replace('.', ',')}</div>
                    <div style={{ fontSize: 11.5, marginTop: 5, fontWeight: escolhido ? 700 : 400 }}>
                      {n.curto}
                    </div>
                    {/* Onde o aluno se pôs — para o professor ver de relance
                        se está a confirmar ou a discordar. */}
                    {foiDoAluno && (
                      <div style={{
                        position: 'absolute', top: 4, right: 5, width: 7, height: 7,
                        borderRadius: '50%', background: escolhido ? '#fff' : 'var(--copper)',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* A frase inteira do que está escolhido. */}
            {notaProf && (
              <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', marginBottom: notaFinal ? 8 : 0,
                fontStyle: 'italic' }}>
                {NIVEIS_PROF.some(n => n.v === notaProf)
                  ? `"${NIVEIS_PROF.find(n => n.v === notaProf)?.label}"`
                  : `Média das respostas do aluno: ${String(Math.round(para20Dec(notaProf) * 10) / 10).replace('.', ',')}/20. Toca num valor para mudar.`}
                {NIVEIS_PROF.some(n => n.v === notaProf) && notaProf !== notaAluno14 && (
                  <span style={{ color: 'var(--copper)', fontWeight: 700, fontStyle: 'normal' }}>
                    {' '}· alteraste o que o aluno tinha posto
                  </span>
                )}
              </div>
            )}

            {/* Nota final calculada */}
            {notaFinal !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: notaFinal >= 3 ? 'var(--sage-pale)' : notaFinal >= 2 ? 'var(--copper-pale)' : 'var(--danger-pale)', borderRadius: 8 }}>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.5)' }}>Nota final:</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: corNotaFinal(notaFinal) }}>
                  {notaFinal}
                </span>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.4)' }}>/5</span>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.4)', marginLeft: 8 }}>→</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: corNotaFinal(notaFinal), marginLeft: 4 }}>
                  {String(Math.round(para20Dec(notaFinal) * 10) / 10).replace('.', ',')}
                </span>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.4)' }}>/20</span>
                <span style={{ fontSize:13, marginLeft: 'auto', color: corNotaFinal(notaFinal), fontWeight: 600 }}>
                  {labelNotaFinal(notaFinal)}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Triagem do Colaborativo e do Criativo — não entra na nota da aula. */}
      {triagem && (
        <Card>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
            color:'rgba(26,23,20,0.5)', marginBottom:4 }}>Equipa, problemas e reflexão (5 C da pauta)</div>
          <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.5)', marginBottom:8 }}>
            Não conta para a nota desta aula. Entra no Colaborativo, no Criativo e no Consciente da pauta da UC.
          </div>
          {perguntasDaAula(triagem.coId, triagem.crId, triagem.clId).map(q => {
            const r = triagem[q.chave];
            const opcoes: { v: number | 'sem'; txt: string }[] = [
              ...q.frases.map((f, i) => ({ v: i, txt: f })), ...(q.semOcasiao ? [{ v: 'sem' as const, txt: q.semOcasiao }] : [])];
            // Perguntas a que disse «não aconteceu» antes de responder a esta.
            const saltou = triagem.semAntes?.[q.chave] || [];
            const pSaltada = saltou.length ? perguntaPorId(saltou[0]) : undefined;
            // O que o aluno respondeu (para voltar atrás se o professor mudar de ideias).
            const doAluno = ((selecao as any).triagem5c || {})[q.chave] ?? null;
            // A turma toda respondeu à mesma pergunta do Consciente e do Criativo:
            // se este aluno diz que não aconteceu e vários colegas dizem que sim, avisa-se.
            const idPergunta = saltou.length ? saltou[0] : q.chave === 'co' ? triagem.coId : q.chave === 'cr' ? triagem.crId : undefined;
            const viram = q.chave !== 'cl' && (r === 'sem' || saltou.length > 0) && idPergunta
              ? colegasQueViram(q.chave, selecao.alunoId, selecao.planoAulaId || '', idPergunta) : 0;
            return (
              <div key={q.chave} style={{ marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{q.sigla} · {q.pergunta}</div>
                {(r === 'sem' || saltou.length > 0 || (triagem.naoReparou || []).includes(q.chave)) && (
                  <div style={{ fontSize:13, padding:'7px 10px', marginBottom:6, borderRadius:8,
                    background:'rgba(184,115,51,0.12)', color:'#8a4a15', lineHeight:1.45 }}>
                    {pSaltada && <div style={{ marginBottom:4 }}>Antes disse que hoje não aconteceu: «{pSaltada.pergunta}»</div>}
                    {viram >= 1
                      ? <>⚠️ Este aluno diz que hoje não aconteceu, mas <b>{viram} colega{viram === 1 ? '' : 's'}</b> disse{viram === 1 ? '' : 'ram'} que sim.</>
                      : <>O aluno diz que hoje não aconteceu.</>}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                      {([[false, 'Não aconteceu: não conta'], [true, 'Aconteceu e não reparou: fica na mais baixa']] as const).map(([v, t]) => {
                        const on = (triagem.naoReparou || []).includes(q.chave) === v;
                        return (
                          <button key={String(v)} onClick={() => setTriagem(tr => tr && ({ ...tr,
                              [q.chave]: v ? 0 : (saltou.length ? doAluno : 'sem'),
                              naoReparou: v ? [...new Set([...(tr.naoReparou || []), q.chave])] : (tr.naoReparou || []).filter(x => x !== q.chave) }))}
                            style={{ fontSize:12.5, fontWeight:700, padding:'5px 10px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                              border:'1px solid #b5651d', background: on ? '#b5651d' : '#fff', color: on ? '#fff' : '#b5651d' }}>{t}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {opcoes.map(o => (
                  <button key={String(o.v)} onClick={() => setTriagem(t => t && ({ ...t, [q.chave]: o.v,
                      naoReparou: (t.naoReparou || []).filter(x => x !== q.chave) }))}
                    style={{ display:'flex', gap:8, alignItems:'center', width:'100%', textAlign:'left',
                      padding:'7px 10px', marginBottom:4, borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                      fontSize:13.5, border: r === o.v ? '2px solid var(--sage)' : '1px solid var(--border)',
                      background: r === o.v ? 'rgba(90,122,78,0.1)' : '#fff' }}>
                    <span style={{ minWidth:18, fontWeight:800, color:'var(--sage)' }}>
                      {typeof o.v === 'number' ? notaPara20(o.v + 2) : '–'}</span>
                    <span style={{ flex:1 }}>{o.txt}</span>
                  </button>
                ))}
                {q.chave === 'cr' && triagem.problema && (
                  <div style={{ fontSize:13, fontStyle:'italic', color:'rgba(26,23,20,0.6)' }}>
                    Problema, nas palavras do aluno: “{triagem.problema}”</div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* Pré-visualização da nota final — mostra SEMPRE a decomposição por
          categoria, para o professor perceber como se chegou ao número, mesmo
          antes de guardar. */}
      <div style={{ background: 'rgba(90,122,78,0.06)', border: '1px solid var(--sage)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 8 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'rgba(26,23,20,0.5)' }}>
            Nota prevista desta aula
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--sage)' }}>
            {previsaoNota.nota20}<span style={{fontSize:14, fontWeight:600, opacity:0.6}}>/20</span>
          </div>
        </div>
        <div style={{ fontSize:13, color:'rgba(26,23,20,0.65)', lineHeight:1.6 }}>
          {Object.entries(previsaoNota.porCategoria).map(([cat, n]) => (
            <div key={cat} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0' }}>
              <span>{LABEL_CAT[cat] || cat}</span>
              <span style={{ fontWeight:700 }}>{n}/20</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.4)', marginTop:8 }}>
          Ponderação de aula {tipoPlanAula === 'teorico' ? 'teórica' : tipoPlanAula === 'misto' ? 'mista' : (tipoPlanAula as any) === 'atitudinal' ? 'atitudinal — só atitudes' : 'prática'}.
          Falta preencher {autoavaliacoes.filter(a => !notasProf[a.competenciaId]).length} de {autoavaliacoes.length} competências.
        </div>
      </div>

      {/* Turmas ACP — +1 nas atitudes dos anos anteriores. Conta para a
          consolidação da atitude, não para a nota desta aula nem da UC. */}
      {ehTurmaTransicao(selecao.turmaId) && (() => {
        const aluno = getAlunos().find(a => a.id === selecao.alunoId);
        if (!aluno) return null;
        const lista = atitudesAnteriores(aluno);
        if (!lista.length) return null;
        const escolhidas = new Set(selecao.atitudes || []);
        // Sugestão: a que o aluno escolheu para apanhar vem primeiro.
        const ordenada = [...lista].sort((x, y) =>
          (escolhidas.has(y.id) ? 1 : 0) - (escolhidas.has(x.id) ? 1 : 0) || x.ano - y.ano);
        return (
          <Card>
            <div style={{ fontSize:15, fontWeight:700 }}>Atitudes dos anos anteriores</div>
            <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', margin:'4px 0 10px', lineHeight:1.5 }}>
              O aluno vem do referencial antigo. Se o viste demonstrar alguma destas
              atitudes hoje, soma +1. Não entra na nota da aula nem da UC — conta só
              para consolidar a atitude.
            </div>
            {ordenada.map(x => {
              const nivel = nivelConsolidadoAtitude(aluno.id, x.id);
              const sugerida = escolhidas.has(x.id);
              const somadaHoje = maisUm[x.id];
              return (
                <div key={x.id} style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'9px 10px', borderRadius:10, marginBottom:5,
                  background: sugerida ? 'rgba(125,79,140,0.07)' : 'transparent',
                  border: sugerida ? '1px solid rgba(125,79,140,0.3)' : '1px solid transparent' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight: sugerida ? 700 : 500 }}>
                      {x.nome} <span style={{ fontSize:12, color:'rgba(26,23,20,0.45)', fontWeight:500 }}>· {x.ano}º ano</span>
                    </div>
                    {sugerida && (
                      <div style={{ fontSize:12, color:'#7d4f8c' }}>O aluno escolheu esta para apanhar</div>
                    )}
                  </div>
                  <span style={{ fontSize:13, color:'rgba(26,23,20,0.55)', flexShrink:0 }}>
                    nível {nivel}
                  </span>
                  <button
                    disabled={nivel >= 5 || somadaHoje}
                    onClick={() => {
                      somarUmAtitude(aluno.id, selecao.turmaId, x.id, selecao.planoAulaId || '', 'professor');
                      setMaisUm(m => ({ ...m, [x.id]: true }));
                    }}
                    style={{ padding:'6px 12px', borderRadius:8, border:'none', flexShrink:0,
                      background: somadaHoje ? 'var(--sage)' : '#7d4f8c', color:'#fff',
                      fontSize:13, fontWeight:700, fontFamily:'inherit',
                      cursor: nivel >= 5 || somadaHoje ? 'default' : 'pointer',
                      opacity: nivel >= 5 ? 0.35 : 1 }}>
                    {somadaHoje ? '✓ +1' : '+1'}
                  </button>
                </div>
              );
            })}
          </Card>
        );
      })()}

      {/* Comentário e guardar */}
      <Card>
        <Field label="Observação geral (opcional)">
          <textarea
            className="input"
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Notas para o aluno sobre esta aula..."
            style={{ minHeight: 80 }}
          />
        </Field>
        <button className="btn btn-primary" onClick={() => setAConfirmar(true)}
          disabled={autoavaliacoes.some(a => !notasProf[a.competenciaId])}
          style={{ width:'100%', background: 'var(--sage)', marginTop: 8, padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', opacity: autoavaliacoes.some(a => !notasProf[a.competenciaId]) ? 0.4 : 1 }}>
          {guardado ? '✓ Guardar outra vez' : '✓ Validar e guardar avaliação'}
        </button>
        {autoavaliacoes.some(a => !notasProf[a.competenciaId]) && (
          <div style={{ fontSize:13, color: 'var(--danger)', textAlign: 'center', marginTop: 6 }}>
            Preenche a avaliação do professor em todas as competências antes de guardar.
          </div>
        )}
      </Card>

      {/* Confirmação antes de gravar. A nota vai para o aluno — o
          professor tem de ver o que está a entregar, e onde discordou
          da proposta dele. */}
      {aConfirmar && (() => {
        const alterou = autoavaliacoes.filter(auto => !auto.doProfessor).filter(auto => {
          const nAluno = (auto as any).nota || 0;
          return notasProf[auto.competenciaId] !== nAluno;
        });
        return (
          <div onClick={() => setAConfirmar(false)} style={{
            position:'fixed', inset:0, background:'rgba(26,23,20,0.6)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center', padding:20,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background:'#fff', borderRadius:18, padding:22, maxWidth:460, width:'100%',
              maxHeight:'80vh', overflowY:'auto',
            }}>
              <div style={{ fontSize:19, fontWeight:700, color:'var(--charcoal, #1a1714)' }}>
                Confirmas esta avaliação?
              </div>
              <div style={{ fontSize:14.5, color:'rgba(26,23,20,0.6)', marginTop:6,
                lineHeight:1.55 }}>
                É esta a nota que {nomeDoAluno(selecao.alunoId)} vai receber.
              </div>

              <div style={{ background:'rgba(90,122,78,0.08)', border:'1px solid var(--sage)',
                borderRadius:12, padding:16, marginTop:16, textAlign:'center' }}>
                <div style={{ fontSize:34, fontWeight:800, color:'var(--sage)' }}>
                  {previsaoNota.nota20}<span style={{ fontSize:16, opacity:0.6 }}>/20</span>
                </div>
                <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', marginTop:4 }}>
                  {autoavaliacoes.length} competência{autoavaliacoes.length === 1 ? '' : 's'} avaliada{autoavaliacoes.length === 1 ? '' : 's'}
                </div>
              </div>

              {alterou.length > 0 && (
                <div style={{ background:'var(--copper-pale, #fdf0e6)',
                  border:'1px solid var(--copper)', borderRadius:12,
                  padding:14, marginTop:12 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--copper)',
                    marginBottom:6 }}>
                    Alteraste {alterou.length} de {autoavaliacoes.length}
                  </div>
                  <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.7)', lineHeight:1.6 }}>
                    Nas restantes concordaste com o que o aluno se deu.
                  </div>
                </div>
              )}

              {comentario.trim() && (
                <div style={{ background:'rgba(26,23,20,0.04)', borderRadius:12,
                  padding:14, marginTop:12, fontSize:14, color:'rgba(26,23,20,0.75)',
                  lineHeight:1.55 }}>
                  <b>Vais escrever ao aluno:</b><br />{comentario}
                </div>
              )}

              <button onClick={() => {
                  setAConfirmar(false); guardar();
                  // Validar seguidos: passa logo ao próximo por validar.
                  // No último, volta à lista («não há mais nenhum por validar»).
                  if (onSeguinte && !validacaoExistente) onSeguinte();
                }} style={{
                width:'100%', marginTop:18, padding:16, borderRadius:12, border:'none',
                background:'var(--sage)', color:'#fff', fontSize:16.5, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}>
                {seguintes > 0 && onSeguinte && !validacaoExistente
                  ? `Confirmar e passar ao seguinte (faltam ${seguintes})`
                  : 'Confirmar e entregar ao aluno'}
              </button>
              <button onClick={() => setAConfirmar(false)} style={{
                width:'100%', marginTop:8, padding:13, background:'transparent',
                border:'none', fontSize:15, color:'rgba(26,23,20,0.5)',
                cursor:'pointer', fontFamily:'inherit',
              }}>
                Voltar e rever
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
