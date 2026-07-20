import React, { useState, useEffect } from 'react';
import { Aluno, RecuperacaoModulo } from '../types';
import { ModalFullscreen } from './ModalFullscreen';
import {
  getAlunos, criarRecuperacaoFCT, addEvidenciaFCT, addOrUpdateRecuperacao,
  getRecuperacoesPorAluno,
} from '../backend';
import { microsPorUC, encontrarMicro } from '../compatECL';
import { CRONOGRAMA_2026_2027 } from '../cronograma';
import { gerarPDFRecuperacaoFCT } from './GerarPDFRecuperacaoFCT';
import { gerarPromptRecuperacaoFCT, gerarPromptCompetenciasUC } from '../matrizEvidencias';
import { getReferencialUC } from '../referencial811RA144';
import { SeletorIA } from './SeletorIA';

// Lista completa de UC/UFCD de todos os anos — recuperações FCT podem ser
// de alunos antigos, a recuperar módulos de qualquer ano, não só da turma actual.
const TODOS_OS_MODULOS = CRONOGRAMA_2026_2027.map(m => ({ id: m.id, nome: m.nome, disciplina: m.disciplina }));

// ═══════════════════════════════════════════════════════════════
// Recuperação via FCT — lado do PROFESSOR
// Cria uma recuperação nova, escolhendo aluno, UC, competências a
// evidenciar, e se exige horas mínimas de formação ou só evidências.
// ═══════════════════════════════════════════════════════════════

export function CriarRecuperacaoFCT({
  turmaId, onCriada, templateRecuperacao
}: {
  turmaId: string;
  onCriada: () => void;
  /** Se fornecido, pré-preenche o formulário com os dados desta recuperação (duplicar/reutilizar) */
  templateRecuperacao?: import('../types').RecuperacaoModulo;
}) {
  const [aberto, setAberto] = useState(false);
  // Aluno desta turma (dropdown) OU aluno externo/antigo (nome escrito à mão,
  // para quem já terminou o curso e está a recuperar um módulo em falta).
  const [tipoAluno, setTipoAluno] = useState<'turma' | 'externo'>('turma');
  const [alunoId, setAlunoId] = useState('');
  const [nomeExterno, setNomeExterno] = useState('');
  const [turmaExterno, setTurmaExterno] = useState('');
  const [ucId, setUcId] = useState('');
  const [competenciasSel, setCompetenciasSel] = useState<Set<string>>(new Set());
  const [competenciaManual, setCompetenciaManual] = useState('');
  const [exigirHoras, setExigirHoras] = useState(true); // por defeito ligado — a Rosa confirmou que quer sempre exigir horas
  const [horasMinimas, setHorasMinimas] = useState(10);
  const [localFCT, setLocalFCT] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  // Importância relativa de cada competência (1=baixa, 2=média, 3=alta) —
  // usada para sugerir o peso % de cada uma na média final da tabela.
  const [importancias, setImportancias] = useState<Record<string, number>>({});
  // Pergunta de cenário gerada pela IA para cada competência (extraída do
  // separador "::" na resposta) — usada no guião de reflexão em vez da
  // fórmula fixa genérica.
  const [perguntas, setPerguntas] = useState<Record<string, string>>({});
  const [dataTermo, setDataTermo] = useState('');
  // Decisão sobre defesa oral — tomada AGORA, na criação, nunca depois de
  // avaliar. Por defeito não exige (o professor liga só se achar necessário).
  const [possivelOral, setPossivelOral] = useState(false);
  // Guião de apoio gerado pela IA — o professor cola aqui o resultado, e
  // fica guardado para aparecer em anexo no documento final.
  const [guiaoTexto, setGuiaoTexto] = useState('');
  const [supervisorFCT, setSupervisorFCT] = useState('');

  const alunos = getAlunos().filter(a => a.turmaId === turmaId).sort((a, b) => a.numero - b.numero);
  const uc = TODOS_OS_MODULOS.find(u => u.id === ucId);
  const competenciasDaUC = ucId ? microsPorUC(ucId) : [];
  const formularioValido = tipoAluno === 'turma' ? !!alunoId : nomeExterno.trim().length > 0;

  // ── Rascunho automático — se o modal fechar por qualquer motivo antes de
  // "Criar recuperação via FCT" (ex: clique sem querer fora do modal, ou
  // ao voltar de uma aba da IA), o que já foi preenchido não se perde.
  const CHAVE_RASCUNHO = `ecl_rascunho_fct_${turmaId}`;

  // Responder ao evento "Duplicar para outro aluno" vindo da GestaoRecuperacoes
  React.useEffect(() => {
    function abrirComTemplate(e: CustomEvent) {
      const template = e.detail?.template;
      if (template) {
        try { localStorage.setItem('ecl_template_fct', JSON.stringify(template)); } catch {}
      }
      setAberto(true);
    }
    window.addEventListener('ecl:abrirFCT', abrirComTemplate as EventListener);
    return () => window.removeEventListener('ecl:abrirFCT', abrirComTemplate as EventListener);
  }, []);

  // Ao abrir, verificar se há template guardado e pré-preencher
  React.useEffect(() => {
    if (!aberto) return;
    try {
      const templateStr = localStorage.getItem('ecl_template_fct');
      if (templateStr) {
        const tmpl = JSON.parse(templateStr);
        localStorage.removeItem('ecl_template_fct');
        if (tmpl?.viaFCT && tmpl?.fct) {
          if (tmpl.fct.localFCT) setLocalFCT(tmpl.fct.localFCT);
          if (tmpl.fct.supervisorFCT) setSupervisorFCT(tmpl.fct.supervisorFCT);
          if (tmpl.fct.dataInicio) setDataInicio(tmpl.fct.dataInicio);
          if (tmpl.fct.dataTermo) setDataTermo(tmpl.fct.dataTermo);
          if (tmpl.fct.exigirHoras !== undefined) setExigirHoras(tmpl.fct.exigirHoras);
          if (tmpl.fct.horasMinimasExigidas) setHorasMinimas(tmpl.fct.horasMinimasExigidas);
          if (tmpl.fct.possivelOral !== undefined) setPossivelOral(tmpl.fct.possivelOral);
          if (tmpl.fct.guiaoTexto) setGuiaoTexto(tmpl.fct.guiaoTexto);
          if (tmpl.ucId) setUcId(tmpl.ucId);
          if (tmpl.fct.competenciasAEvidenciar?.length) {
            setCompetenciasSel(new Set(tmpl.fct.competenciasAEvidenciar));
          }
        }
      }
    } catch {}
  }, [aberto]);

  // Se há template, pré-preencher ao abrir o modal
  useEffect(() => {
    if (!aberto || !templateRecuperacao) return;
    const r = templateRecuperacao;
    if (r.viaFCT && r.fct) {
      setExigirHoras(r.fct.exigirHoras || false);
      setHorasMinimas(r.fct.horasMinimasExigidas || 10);
      setLocalFCT(r.fct.localFCT || '');
      setSupervisorFCT(r.fct.supervisorFCT || '');
      setDataInicio(r.fct.dataInicio || '');
      setDataTermo(r.fct.dataTermo || '');
      setPossivelOral(r.fct.possivelOral || false);
      setGuiaoTexto(r.fct.guiaoTexto || '');
      if (r.ucId) setUcId(r.ucId);
      if (r.fct.competenciasAEvidenciar?.length) {
        setCompetenciasSel(new Set(r.fct.competenciasAEvidenciar));
      }
    }
  }, [aberto, templateRecuperacao]);

  useEffect(() => {
    if (!aberto) return;
    try {
      const guardado = localStorage.getItem(CHAVE_RASCUNHO);
      if (guardado) {
        const r = JSON.parse(guardado);
        setTipoAluno(r.tipoAluno || 'turma');
        setAlunoId(r.alunoId || '');
        setNomeExterno(r.nomeExterno || '');
        setTurmaExterno(r.turmaExterno || '');
        setUcId(r.ucId || '');
        setCompetenciasSel(new Set(r.competenciasSel || []));
        setExigirHoras(r.exigirHoras || false);
        setHorasMinimas(r.horasMinimas || 10);
        setLocalFCT(r.localFCT || '');
        setSupervisorFCT(r.supervisorFCT || '');
        setDataInicio(r.dataInicio || '');
        setDataTermo(r.dataTermo || '');
        setPossivelOral(r.possivelOral || false);
        setGuiaoTexto(r.guiaoTexto || '');
      }
    } catch {}
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const rascunho = {
      tipoAluno, alunoId, nomeExterno, turmaExterno, ucId,
      competenciasSel: Array.from(competenciasSel),
      exigirHoras, horasMinimas, localFCT, supervisorFCT, dataInicio, dataTermo,
      possivelOral, guiaoTexto,
    };
    try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho)); } catch {}
  }, [aberto, tipoAluno, alunoId, nomeExterno, turmaExterno, ucId, competenciasSel, exigirHoras, horasMinimas, localFCT, supervisorFCT, dataInicio, dataTermo, possivelOral, guiaoTexto]);

  function limparRascunho() {
    try { localStorage.removeItem(CHAVE_RASCUNHO); } catch {}
  }

  function toggleComp(id: string) {
    setCompetenciasSel(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) { novo.delete(id); } else { novo.add(id); }
      return novo;
    });
    setImportancias(prev => {
      const novo = { ...prev };
      if (novo[id]) { delete novo[id]; } else { novo[id] = 2; } // 2 = média, por defeito
      return novo;
    });
  }

  function adicionarCompetenciaManual() {
    // Aceita colar a lista toda de uma vez. Nem sempre a quebra de linha
    // sobrevive ao copiar de uma IA (às vezes cola tudo numa linha só) —
    // por isso, se não houver \n suficientes, tenta separar pelo padrão
    // "Termo técnico (explicação)" que este prompt sempre produz: cada
    // competência fecha com ")" antes da próxima começar com maiúscula.
    // Normalizar o texto antes de dividir:
    // 1. Remover numeração "1. ", "2. " etc. do início de cada linha
    // 2. Juntar linhas que começam com "(" à linha anterior (são continuações)
    // 3. Juntar linhas que começam com "::" à linha anterior (são perguntas do guião)
    const linhasRaw = competenciaManual.split('\n').map(l => l.trim()).filter(Boolean);
    const linhasUnidas: string[] = [];
    for (const linha of linhasRaw) {
      const semNumero = linha.replace(/^\d+\.\s+/, ''); // remove "1. ", "2. " etc.
      // Linha de continuação: começa com "(" ou "::" → junta à anterior
      if ((semNumero.startsWith('(') || semNumero.startsWith('::')) && linhasUnidas.length > 0) {
        linhasUnidas[linhasUnidas.length - 1] += '\n' + semNumero;
      } else {
        linhasUnidas.push(semNumero);
      }
    }
    let itens = linhasUnidas.filter(Boolean);
    if (itens.length <= 1 && itens.length > 0) {
      const texto = itens[0] || competenciaManual.trim();
      const partes = texto.split(/\)\s+(?=[A-ZÀ-Ú])/).map((p, i, arr) => {
        return i < arr.length - 1 && !p.trim().endsWith(')') ? p.trim() + ')' : p.trim();
      }).filter(Boolean);
      if (partes.length > 1) itens = partes;
    }
    if (itens.length === 0) return;

    // Extrair " :: Pergunta" (se existir) antes de tratar a importância —
    // fica guardada à parte, associada ao texto limpo da competência.
    const MAPA_IMPORTANCIA: Record<string, number> = { ALTA: 3, 'MÉDIA': 2, MEDIA: 2, BAIXA: 1 };
    const itensLimpos: string[] = [];
    const importanciasDetectadas: Record<string, number> = {};
    const perguntasDetectadas: Record<string, string> = {};
    itens.forEach(l => {
      let linha = l;
      let pergunta = '';
      const idxSeparador = linha.indexOf(' :: ');
      if (idxSeparador >= 0) {
        pergunta = linha.slice(idxSeparador + 4).trim();
        linha = linha.slice(0, idxSeparador).trim();
      }
      const match = linha.match(/^(.*?)\s*\[(ALTA|M[ÉE]DIA|BAIXA)\]\s*\.?\s*$/i);
      if (match) {
        const textoLimpo = match[1].trim();
        const nivel = MAPA_IMPORTANCIA[match[2].toUpperCase()] || 2;
        itensLimpos.push(textoLimpo);
        importanciasDetectadas[textoLimpo] = nivel;
        if (pergunta) perguntasDetectadas[textoLimpo] = pergunta;
      } else {
        itensLimpos.push(linha);
        if (pergunta) perguntasDetectadas[linha] = pergunta;
      }
    });

    setCompetenciasSel(prev => {
      const novo = new Set(prev);
      itensLimpos.forEach(l => novo.add(l));
      return novo;
    });
    setImportancias(prev => {
      const novo = { ...prev };
      itensLimpos.forEach(l => { if (!novo[l]) novo[l] = importanciasDetectadas[l] || 2; });
      return novo;
    });
    setPerguntas(prev => ({ ...prev, ...perguntasDetectadas }));
    setCompetenciaManual('');
  }

  function criar() {
    if (!formularioValido || !ucId || competenciasSel.size === 0) {
      alert('Escolhe o aluno, a UC, e pelo menos uma competência a evidenciar.');
      return;
    }
    // Aluno externo/antigo — gera um ID próprio (não existe em getAlunos()),
    // o nome fica guardado directamente na recuperação para a impressão/PDF.
    const idParaUsar = tipoAluno === 'turma' ? alunoId : `externo_${Date.now()}`;
    // A recuperação tem de ficar guardada sempre com a turma ACTUAL (onde o
    // professor está a trabalhar) — é isso que decide em que lista aparece.
    // A turma de origem de um aluno externo/antigo é só informativa, guarda-se
    // à parte (turmaAlunoManual), nunca substitui a turma real da recuperação.
    const turmaParaUsar = turmaId;

    const listaCompetencias = Array.from(competenciasSel);
    const listaImportancias = listaCompetencias.map(c => importancias[c] || 2);
    const listaPerguntas = listaCompetencias.map(c => perguntas[c] || '');
    const nova = criarRecuperacaoFCT(
      idParaUsar, turmaParaUsar, ucId, uc?.nome || '',
      listaCompetencias, exigirHoras, exigirHoras ? horasMinimas : undefined,
      localFCT || undefined, supervisorFCT || undefined,
      dataInicio || undefined, dataTermo || undefined,
      listaImportancias, listaPerguntas, possivelOral
    );
    if (nova.fct) nova.fct.guiaoTexto = guiaoTexto || undefined;
    if (tipoAluno === 'externo' && nova.fct) {
      nova.fct.nomeAlunoManual = nomeExterno.trim();
      nova.fct.turmaAlunoManual = turmaExterno.trim() || undefined;
    }
    addOrUpdateRecuperacao(nova);
    // Guardar dados FCT por aluno para pre-fill na próxima recuperação
    const chaveAluno = tipoAluno === 'turma' && alunoId
      ? `ecl_fct_dados_${alunoId}`
      : nomeExterno.trim() ? `ecl_fct_dados_externo_${nomeExterno.trim().toLowerCase().replace(/\s+/g,'_')}` : null;
    if (chaveAluno && (localFCT || supervisorFCT || dataInicio || dataTermo)) {
      try {
        localStorage.setItem(chaveAluno, JSON.stringify({ localFCT, supervisorFCT, dataInicio, dataTermo, exigirHoras, horasMinimas }));
      } catch {}
    }
    limparRascunho();
    setAberto(false);
    setAlunoId(''); setNomeExterno(''); setTurmaExterno(''); setUcId(''); setCompetenciasSel(new Set());
    setExigirHoras(false); setLocalFCT(''); setSupervisorFCT(''); setDataInicio(''); setDataTermo('');
    setPossivelOral(false); setGuiaoTexto('');
    onCriada();
  }

  return (
    <>
      <button onClick={() => setAberto(true)} style={{
        width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed #6d28d9',
        background: 'transparent', color: '#6d28d9', cursor: 'pointer', fontSize: 14, fontWeight: 700,
      }}>
        🏢 Criar recuperação via FCT
      </button>

      {aberto && (
        <ModalFullscreen titulo="Nova recuperação via FCT" subtitulo="Formação em Contexto de Trabalho" onFechar={() => setAberto(false)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Aluno</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button onClick={() => setTipoAluno('turma')} style={{
                flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                border: tipoAluno === 'turma' ? '2px solid #6d28d9' : '1px solid #ddd',
                background: tipoAluno === 'turma' ? '#f3f0fb' : '#fff', color: tipoAluno === 'turma' ? '#6d28d9' : '#666',
              }}>Aluno desta turma</button>
              <button onClick={() => setTipoAluno('externo')} style={{
                flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                border: tipoAluno === 'externo' ? '2px solid #6d28d9' : '1px solid #ddd',
                background: tipoAluno === 'externo' ? '#f3f0fb' : '#fff', color: tipoAluno === 'externo' ? '#6d28d9' : '#666',
              }}>Aluno externo / antigo</button>
            </div>
            {tipoAluno === 'turma' ? (
              <select value={alunoId} onChange={e => {
                  const id = e.target.value;
                  setAlunoId(id);
                  if (id) {
                    try {
                      const ultimo = localStorage.getItem(`ecl_fct_dados_${id}`);
                      if (ultimo) {
                        const d = JSON.parse(ultimo);
                        if (d.localFCT) setLocalFCT(d.localFCT);
                        if (d.supervisorFCT) setSupervisorFCT(d.supervisorFCT);
                        if (d.dataInicio) setDataInicio(d.dataInicio);
                        if (d.dataTermo) setDataTermo(d.dataTermo);
                        if (d.exigirHoras !== undefined) setExigirHoras(d.exigirHoras);
                        if (d.horasMinimas) setHorasMinimas(d.horasMinimas);
                      }
                    } catch {}
                  }
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
                <option value="">Seleccionar...</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.numero} — {a.nome}</option>)}
              </select>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <input value={nomeExterno} onChange={e => setNomeExterno(e.target.value)} placeholder="Nome completo do aluno"
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                <input value={turmaExterno} onChange={e => setTurmaExterno(e.target.value)} placeholder="Turma de origem (opcional)"
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Unidade de Competência / UFCD <span style={{ fontWeight: 400, color: '#999' }}>(todos os anos e planos — inclui alunos de coortes anteriores)</span>
            </div>
            <select value={ucId} onChange={e => { setUcId(e.target.value); setCompetenciasSel(new Set()); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
              <option value="">Seleccionar...</option>
              {TODOS_OS_MODULOS.map(u => <option key={u.id} value={u.id}>{u.id} — {u.nome}</option>)}
            </select>
          </div>

          {ucId && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Competências a evidenciar na FCT ({competenciasSel.size} seleccionadas)
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                {/* Realizações oficiais do referencial 811RA144 — é a fonte mais
                    fiável que existe (nunca está mal atribuída, ao contrário da
                    biblioteca técnica que às vezes cruza UCs relacionadas).
                    Aparece sempre primeiro, antes da biblioteca e da IA. */}
                {(getReferencialUC(ucId)?.realizacoes || []).length > 0 && (
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', marginBottom: 4 }}>
                      Referencial oficial desta UC
                    </div>
                    <div style={{ fontSize: 11, color: '#b5651d', marginBottom: 6 }}>
                      ⚠️ Escolhe UM estilo por competência — ou isto (frase oficial curta), ou a
                      versão elaborada pela IA abaixo. Marcar os dois para a mesma ideia repete a
                      informação no documento final.
                    </div>
                    {(getReferencialUC(ucId)?.realizacoes || []).map(r => (
                      <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={competenciasSel.has(r)} onChange={() => toggleComp(r)} />
                        <span style={{ fontSize: 13 }}>{r}</span>
                      </label>
                    ))}
                  </div>
                )}
                {competenciasDaUC.length > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 4 }}>
                    Técnicas da biblioteca (podem ser partilhadas com outras UCs relacionadas)
                  </div>
                )}
                {competenciasDaUC.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={competenciasSel.has(c.id)} onChange={() => toggleComp(c.id)} />
                    <span style={{ fontSize: 13 }}>{c.nome}</span>
                  </label>
                ))}
                {Array.from(competenciasSel).filter(id => !competenciasDaUC.some(c => c.id === id)).map(texto => (
                  <label key={texto} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                    <input type="checkbox" checked readOnly onChange={() => toggleComp(texto)} />
                    <span style={{ fontSize: 13 }}>{texto}</span>
                    <button onClick={() => toggleComp(texto)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#c00', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </label>
                ))}
              </div>
              {/* Gerar por IA — sempre disponível, quer a UC já tenha
                  competências mapeadas na biblioteca quer não. A biblioteca
                  às vezes é boa (técnicas de cozinha), mas para FCT o
                  professor pode preferir sempre a sugestão da IA, mais
                  focada em evidências observáveis fora da sala de aula. */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                  {competenciasDaUC.length === 0
                    ? 'Sem competências mapeadas para esta UC — gera uma sugestão por IA, baseada no referencial oficial, e cola-as no campo abaixo:'
                    : 'Preferes gerar por IA em vez de usar a lista da biblioteca acima? Gera uma sugestão baseada no referencial oficial:'}
                </div>
                <SeletorIA
                  corPrincipal="#6d28d9"
                  prompt={gerarPromptCompetenciasUC({
                    ucId, ucNome: uc?.nome || '',
                    realizacoesOficiais: getReferencialUC(ucId)?.realizacoes || [],
                    criteriosDesempenho: getReferencialUC(ucId)?.criteriosDesempenho,
                  })}
                />
              </div>
              {/* Sempre visível — a biblioteca não tem competências mapeadas para
                  todas as UCs (ex: sociocultural), o professor tem de conseguir
                  colar a lista toda de uma vez (não uma a uma) para o formulário
                  nunca ficar bloqueado nem obrigar a trabalho repetitivo. */}
              <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                Cola aqui a lista toda que a IA devolveu (uma competência por linha) —
                não precisas de as escrever uma a uma.
              </div>
              <textarea value={competenciaManual} onChange={e => setCompetenciaManual(e.target.value)}
                placeholder={'Cola aqui a lista da IA — ex:\nComunicação clara com colegas\nCumprimento de instruções\nPontualidade'}
                style={{ width: '100%', minHeight: 90, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box', marginBottom: 6, fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={adicionarCompetenciaManual} style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none', background: '#6d28d9', color: '#fff',
                  fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  + Adicionar todas as linhas
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14, padding: 12, background: '#f5f0e8', borderRadius: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: exigirHoras ? 10 : 0 }}>
              <input type="checkbox" checked={exigirHoras} onChange={e => setExigirHoras(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Exigir um número mínimo de horas de formação</span>
            </label>
            {exigirHoras && (
              <input type="number" min={1} value={horasMinimas} onChange={e => setHorasMinimas(parseInt(e.target.value) || 0)}
                placeholder="Horas mínimas" style={{ width: 120, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }} />
            )}
            {!exigirHoras && (
              <div style={{ fontSize: 11, color: '#8a4a15' }}>
                Sem exigência de horas — só contam as evidências das competências, seja qual for o tempo dedicado.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Início do período de FCT</div>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Termo do período de FCT</div>
              <input type="date" value={dataTermo} onChange={e => setDataTermo(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Local de FCT (opcional)</div>
              <input value={localFCT} onChange={e => setLocalFCT(e.target.value)} placeholder="Nome da empresa"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Supervisor na empresa (opcional)</div>
              <input value={supervisorFCT} onChange={e => setSupervisorFCT(e.target.value)} placeholder="Nome do orientador"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
          </div>

          {competenciasSel.size > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f9f7fc', borderRadius: 8, border: '1px solid #e4d9f7' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Importância de cada competência na nota final ({competenciasSel.size})
              </div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>
                Define se cada competência pesa pouco, o normal, ou muito na média final — o peso %
                é calculado automaticamente a partir disto e aparece já pronto na tabela do documento.
              </div>
              {Array.from(competenciasSel).map(comp => (
                <div key={comp} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ flex: 1, fontSize: 12 }}>{comp.length > 70 ? comp.slice(0, 70) + '…' : comp}</span>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {[
                      { valor: 1, label: 'Baixa' },
                      { valor: 2, label: 'Média' },
                      { valor: 3, label: 'Alta' },
                    ].map(op => (
                      <button key={op.valor}
                        onClick={() => setImportancias(prev => ({ ...prev, [comp]: op.valor }))}
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                          border: (importancias[comp] || 2) === op.valor ? 'none' : '1px solid #ddd',
                          background: (importancias[comp] || 2) === op.valor ? '#6d28d9' : '#fff',
                          color: (importancias[comp] || 2) === op.valor ? '#fff' : '#666',
                        }}>
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ucId && competenciasSel.size > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Gerar guião de apoio (opcional, ajuda o aluno a estruturar as evidências)
              </div>
              <SeletorIA
                corPrincipal="#6d28d9"
                prompt={gerarPromptRecuperacaoFCT({
                  nomeAluno: tipoAluno === 'turma' ? (alunos.find(a => a.id === alunoId)?.nome || 'Aluno') : (nomeExterno || 'Aluno'),
                  ucId, ucNome: uc?.nome || '', tipoUC: 'tecnica',
                  competenciasAEvidenciar: Array.from(competenciasSel).map(id => ({
                    id, nome: encontrarMicro(id)?.nome || id,
                  })),
                  exigirHoras, horasMinimasExigidas: exigirHoras ? horasMinimas : undefined,
                  localFCT: localFCT || undefined,
                  realizacoesOficiais: getReferencialUC(ucId)?.realizacoes || [],
                  criteriosDesempenho: getReferencialUC(ucId)?.criteriosDesempenho,
                })}
              />
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                Copia o prompt, cola numa IA, e o resultado ajuda o aluno a saber o que escrever em cada evidência.
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Colocar aqui o guião</div>
              <textarea value={guiaoTexto} onChange={e => setGuiaoTexto(e.target.value)}
                placeholder="Cola aqui o guião completo que a IA gerou — vai aparecer em anexo no documento final, numa folha própria para o aluno responder."
                style={{ width: '100%', minHeight: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              {guiaoTexto && (
                <div style={{ fontSize: 11, color: '#5a7a4e', marginTop: 4 }}>
                  ✓ Vai aparecer em anexo, numa folha formatada para o aluno escrever.
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16, padding: 12, background: '#fdf0e6', borderRadius: 8, border: '1px solid #f0dcc4' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={possivelOral} onChange={e => setPossivelOral(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Pode vir a ser necessária defesa oral desta recuperação</span>
            </label>
            <div style={{ fontSize: 11, color: '#8a4a15', marginTop: 6 }}>
              Decide isto agora — depois de avaliares a recuperação já não podes voltar a exigir uma
              defesa oral que não tenhas previsto aqui.
            </div>
          </div>

          <button onClick={criar} disabled={!formularioValido || !ucId || competenciasSel.size === 0}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14,
              background: (!formularioValido || !ucId || competenciasSel.size === 0) ? '#eee' : '#6d28d9',
              color: (!formularioValido || !ucId || competenciasSel.size === 0) ? '#999' : '#fff',
              cursor: (!formularioValido || !ucId || competenciasSel.size === 0) ? 'default' : 'pointer' }}>
            Criar recuperação via FCT
          </button>
        </ModalFullscreen>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Recuperação via FCT — lado do ALUNO
// Preenche as evidências: o que fez, quando, com base nas competências
// que o professor definiu.
// ═══════════════════════════════════════════════════════════════

export function RecuperacaoFCTAluno({ recuperacao, onAtualizado }: {
  recuperacao: RecuperacaoModulo; onAtualizado: () => void;
}) {
  const fct = recuperacao.fct;
  const [novaEvidencia, setNovaEvidencia] = useState<{ competenciaId: string; descricao: string; dataOcorrencia: string }>({
    competenciaId: fct?.competenciasAEvidenciar[0] || '', descricao: '', dataOcorrencia: '',
  });

  if (!fct) return null;

  function adicionar() {
    if (!novaEvidencia.competenciaId || !novaEvidencia.descricao.trim()) {
      alert('Escolhe a competência e descreve a situação real.');
      return;
    }
    addEvidenciaFCT(recuperacao.id, {
      id: `ev_${Date.now()}`,
      competenciaId: novaEvidencia.competenciaId,
      descricao: novaEvidencia.descricao,
      dataOcorrencia: novaEvidencia.dataOcorrencia || undefined,
    });
    setNovaEvidencia({ competenciaId: fct!.competenciasAEvidenciar[0] || '', descricao: '', dataOcorrencia: '' });
    onAtualizado();
  }

  return (
    <div>
      <div style={{ marginBottom: 14, padding: 12, background: '#f5f0e8', borderRadius: 8, fontSize: 12 }}>
        {fct.exigirHoras
          ? `Esta recuperação exige um mínimo de ${fct.horasMinimasExigidas || 0} horas de FCT dedicadas a estas competências.`
          : 'Esta recuperação não exige um número mínimo de horas — contam as evidências concretas do que fizeste.'}
        {fct.localFCT && <div style={{ marginTop: 4 }}>Local: {fct.localFCT}</div>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Evidências já registadas ({fct.evidencias.length})</div>
      {fct.evidencias.map(e => (
        <div key={e.id} style={{ padding: 10, borderRadius: 8, border: '1px solid #eee', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9' }}>{e.competenciaId} {e.dataOcorrencia ? `· ${e.dataOcorrencia}` : ''}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{e.descricao}</div>
          {e.validadoPeloSupervisor && <div style={{ fontSize: 11, color: '#5a7a4e', marginTop: 4 }}>✓ Validado pelo supervisor</div>}
        </div>
      ))}

      <div style={{ marginTop: 16, padding: 14, background: '#fafafa', borderRadius: 10, border: '1px dashed #ccc' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>+ Adicionar evidência</div>
        <select value={novaEvidencia.competenciaId} onChange={e => setNovaEvidencia(p => ({ ...p, competenciaId: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 8 }}>
          {fct.competenciasAEvidenciar.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <textarea value={novaEvidencia.descricao} onChange={e => setNovaEvidencia(p => ({ ...p, descricao: e.target.value }))}
          placeholder="Descreve uma situação real: o que fizeste, quando, com quem, que resultado teve..."
          style={{ width: '100%', minHeight: 70, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 8, boxSizing: 'border-box' }} />
        <input type="date" value={novaEvidencia.dataOcorrencia} onChange={e => setNovaEvidencia(p => ({ ...p, dataOcorrencia: e.target.value }))}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 10 }} />
        <button onClick={adicionar} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none',
          background: '#6d28d9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Adicionar evidência
        </button>
      </div>
    </div>
  );
}
