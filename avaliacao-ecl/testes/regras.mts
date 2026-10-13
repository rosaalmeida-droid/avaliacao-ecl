// Testes das regras de docs/regras.md (Rosa, out/2026).
// Correr: npm run testar
// Cada teste prepara os dados no «telemóvel» (localStorage) e confirma a regra.

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)); },
  removeItem: (k: string) => { mem.delete(k); }, key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; }, clear: () => mem.clear(),
};
(globalThis as any).window = globalThis;
(globalThis as any).addEventListener = () => {};
(globalThis as any).document = { addEventListener() {}, visibilityState: 'visible' };
(globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '{}' });
// Sem rede nos testes: os avisos do Firebase não interessam.
process.on('unhandledRejection', () => {});

const b = await import('../src/backend');
const g = await import('../src/components/PlanoGuiado');
const ev = await import('../src/eventosAvaliacao');
const c = await import('../src/contextoAula');
const rp = await import('../src/rotuloPlano');
const pa = await import('../src/perguntas_atitudes');
const t5 = await import('../src/triagem5c');
const pu = await import('../src/pautaUC');

let falhas = 0, total = 0;
function regra(nome: string, fn: () => void) {
  total++;
  mem.clear();
  try { fn(); console.log('  ✓ ' + nome); }
  catch (e: any) { falhas++; console.log('  ✗ ' + nome + '\n      ' + (e?.message || e)); }
}
function igual(obtido: unknown, esperado: unknown, o = '') {
  const a = JSON.stringify(obtido), e = JSON.stringify(esperado);
  if (a !== e) throw new Error(`${o} esperava ${e}, veio ${a}`);
}
const por = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

console.log('Regras da aplicação');

regra('5. Conta só a última resposta de cada aluno em cada aula', () => {
  const sels: any[] = [
    { id: 's1', alunoId: 'a1', planoAulaId: 'p1', criadaEm: '2026-10-01T09:00:00Z' },
    { id: 's2', alunoId: 'a1', planoAulaId: 'p1', criadaEm: '2026-10-01T10:00:00Z' },
    { id: 's3', alunoId: 'a2', planoAulaId: 'p1', criadaEm: '2026-10-01T09:30:00Z' },
  ];
  igual(b.selecoesQueContam(sels).map(s => s.id).sort(), ['s2', 's3']);
});

regra('10. A resposta dada com a versão antiga do plano continua ao alcance do professor', () => {
  por('ecl_planos', [{ id: 'p2', turmaId: 't', data: '2026-10-02', estado: 'publicado', pedirDeNovoEm: '2026-10-02T12:00:00Z' }]);
  por('ecl_selecoes', [{ id: 's1', alunoId: 'a1', turmaId: 't', planoAulaId: 'p2', criadaEm: '2026-10-02T13:00:00Z', versaoPlano: '2026-10-02T10:00:00Z' }]);
  igual(b.getSelecoes().length, 0, 'o aluno tem de responder outra vez:');
  const doProf = b.selecoesDoProfessor();
  igual(doProf.map(s => s.id), ['s1'], 'o professor vê:');
  igual(!!(doProf[0] as any).antesDoPedido, true, 'marcada como antes da alteração:');
});

regra('11. Conta a validação mais recente do professor', () => {
  por('ecl_planos', [{ id: 'p1', turmaId: 't' }]);
  const s = { id: 's1', alunoId: 'a1', planoAulaId: 'p1', criadaEm: '2026-10-01T08:00:00Z' };
  const vals: any[] = [
    { id: 'v1', selecaoId: 's1', alunoId: 'a1', planoAulaId: 'p1', validadoEm: '2026-10-01T09:00:00Z' },
    { id: 'v2', selecaoId: 'outra_copia', alunoId: 'a1', planoAulaId: 'p1', validadoEm: '2026-10-02T09:00:00Z' },
  ];
  igual(b.validacaoDaSelecao(s, vals)?.id, 'v2');
});

regra('8. Resposta nova ou antiga decide-se pela versão do plano, não pela hora do telemóvel', () => {
  // Telemóvel com a hora adiantada, mas respondeu à versão antiga.
  igual(b.respostaDepoisDoPedido({ criadaEm: '2026-10-05T00:00:00Z', versaoPlano: '2026-10-01T00:00:00Z' } as any, '2026-10-02T00:00:00Z'), false);
  igual(b.respostaDepoisDoPedido({ criadaEm: '2026-10-01T00:00:00Z', versaoPlano: '2026-10-03T00:00:00Z' } as any, '2026-10-02T00:00:00Z'), true);
});

regra('20. Os alunos da atividade respondem por omissão a todo o plano da turma', () => {
  const aula = { id: 'p_aula', turmaId: 't', data: '2026-10-01', horaInicio: '09:00', horaFim: '12:00', tipoAtividade: 'Aula prática', estado: 'publicado' };
  const atv = { id: 'p_ev', turmaId: 't', data: '2026-10-01', horaInicio: '09:00', horaFim: '12:00', tipoAtividade: 'Evento externo',
    tipoEvento: 'evento', modoParticipacao: 'inscricao', participantesIds: ['a1'], estado: 'publicado' };
  por('ecl_planos', [aula, atv]);
  igual(b.partesDoPlanoParaOAluno(aula as any, 'a1'), { tecnicas: true, conhecimentos: true, atitudes: true });
  por('ecl_planos', [aula, { ...atv, tambemRespondemAula: false }]);
  igual(b.partesDoPlanoParaOAluno(aula as any, 'a1'), { tecnicas: false, conhecimentos: false, atitudes: false });
});

regra('20a/20c. Numa atividade com ficha, os alunos avaliam as técnicas da ficha', () => {
  por('ecl_fichas', [{ id: 'f1', nomePrato: 'Bolo', tecnicasSugeridas: ['SUB-010 Bater claras'], aparelhosDetectados: [] }]);
  const atv = { id: 'p_atv', turmaId: 't', ucId: 'UC03576', data: '2026-10-10', tipoAtividade: 'Atividade fora da escola', tipoEvento: 'evento',
    tipoPlanAula: 'atitudinal', fichasIds: ['f1'], compAdicionadas: ['ATI-001'], modoParticipacao: 'inscricao', participantesIds: ['x'], estado: 'publicado' };
  por('ecl_planos', [atv]);
  const r = g.oQueOAlunoVe(atv as any);
  igual(r.ecras.some((e: any) => String(e.nome).includes('SUB-010')), true, 'a técnica da ficha aparece:');
});

regra('20g. Na atividade, a atitude escolhida pelo professor pergunta-se; as do dia não se repetem', () => {
  const aula = { id: 'p_aula', turmaId: 't', ucId: 'UC1', data: '2026-10-01', horaInicio: '10:30', horaFim: '15:00', tipoAtividade: 'Aula prática', estado: 'publicado' };
  const base = { id: 'p_atv', turmaId: 't', ucId: 'UC1', data: '2026-10-01', horaInicio: '10:30', horaFim: '15:00', tipoAtividade: 'Atividade fora da escola',
    tipoEvento: 'evento', tipoPlanAula: 'pratico', fichasIds: ['f1'], modoParticipacao: 'inscricao', participantesIds: ['a1'], aulaLigada: 'p_aula', estado: 'publicado' };
  por('ecl_fichas', [{ id: 'f1', nomePrato: 'Marmelada', tecnicasSugeridas: ['SUB-010 Bater claras'], aparelhosDetectados: [] }]);
  const ati = (p: any) => g.oQueOAlunoVe(p).ecras.filter((e: any) => e.tipo === 'atitude').map((e: any) => e.nome);
  por('ecl_planos', [aula, { ...base, compAdicionadas: ev.atitudesSugeridasEvento('Atividade fora da escola') }]);
  igual(ati(b.getPlanosAula()[1]).length, 0, 'com as sugeridas, não se repetem:');
  por('ecl_planos', [aula, { ...base, compAdicionadas: ['ATI-009'] }]);
  igual(ati(b.getPlanosAula()[1]).length, 1, 'a escolhida (cooperação) pergunta-se:');
});

regra('20d. «Atividade fora da escola» aparece como «Atividade extra», e já se sabe como é', () => {
  igual(ev.nomeDoTipoAtividade('Atividade fora da escola'), 'Atividade extra');
  igual(!!c.triagemDoPlano({ tipoEvento: 'evento', tipoAtividade: 'Atividade fora da escola' }), true);
});

regra('22a. Recuperar numa atividade: só com participação confirmada e validada, e sem bónus', () => {
  const atv: any = { id: 'p_ev', turmaId: 't', ucId: 'UC1', titulo: 'Feira', data: '2026-10-10', tipoAtividade: 'Evento externo', tipoEvento: 'evento',
    modoParticipacao: 'inscricao', participantesIds: [], estado: 'publicado' };
  por('ecl_planos', [atv]);
  por('ecl_recuperacoes', [{ id: 'r1', alunoId: 'a2', turmaId: 't', ucId: 'UC1', estado: 'em_curso', modalidade: 'atividade', criadoEm: '2026-10-01', atualizadoEm: '2026-10-01', planosIds: [] }]);
  b.ligarRecuperacaoAAtividade('r1', 'p_ev');
  const r = b.getRecuperacoes()[0];
  igual(b.resultadoSugeridoDaRecuperacao(r).nota, null, 'sem confirmar a participação:');
  const p: any = b.getPlanosAula()[0];
  por('ecl_planos', [{ ...p, participantesConfirmadosEm: '2026-10-10T18:00:00Z' }]);
  igual(b.resultadoSugeridoDaRecuperacao(r).nota, null, 'sem validar:');
  b.addOrUpdateValidacao({ id: 'v1', alunoId: 'a2', planoAulaId: 'p_ev', validadoEm: '2026-10-11T10:00:00Z',
    notas: [{ competenciaId: 'ATI-001', nota: 4 }, { competenciaId: 'ATI-002', nota: 3 }] } as any);
  igual(typeof b.resultadoSugeridoDaRecuperacao(r).nota, 'number', 'depois de validar há nota:');
  igual(b.participacaoContaParaBonus(b.eventosComoAtividades('t')[0], 'a2').conta, false, 'não dá bónus:');
});

regra('41a. Os alunos de teste não entram na avaliação entre colegas dos verdadeiros', () => {
  por('ecl_alunos', [{ id: 'r1', turmaId: 't', numero: 1, nome: 'Ana' }, { id: 'r2', turmaId: 't', numero: 2, nome: 'Rui' },
    { id: 't99', turmaId: 't', numero: 99, nome: 'TESTE — aluno de ensaio' }, { id: 't88', turmaId: 't', numero: 88, nome: 'TESTE 88' }]);
  igual(b.podemAvaliarSe('r1', 'r2'), true, 'verdadeiros entre si:');
  igual(b.podemAvaliarSe('r1', 't99'), false, 'verdadeiro avalia teste:');
  igual(b.podemAvaliarSe('t99', 'r1'), false, 'teste avalia verdadeiro:');
  igual(b.podemAvaliarSe('t99', 't88'), true, 'testes entre si (para ensaiar):');
  b.guardarAvaliacaoPar({ planoAulaId: 'p', turmaId: 't', grupoId: 'g', avaliadorId: 't99', avaliadoId: 'r1', colabora: 1, ouve: 1, flexivel: 1, conflito: 3 } as any);
  igual(b.getAvaliacoesPares('p').length, 0, 'não fica gravada:');
});

regra('20h. A atividade ligada a uma aula arquivada passa para a aula desse dia em uso', () => {
  const velha = { id: 'p157', turmaId: 't', ucId: 'UC1', data: '2026-10-01', horaInicio: '10:30', horaFim: '15:00', numeroPlan: 157, estado: 'arquivado', titulo: 'Atividade fora da escola — 2026-10-01' };
  const nova = { id: 'p160', turmaId: 't', ucId: 'UC1', data: '2026-10-01', horaInicio: '10:30', horaFim: '15:00', numeroPlan: 160, estado: 'publicado', titulo: 'Aula' };
  const atv = { id: 'atv', turmaId: 't', ucId: 'UC1', data: '2026-10-01', horaInicio: '10:30', horaFim: '15:00', tipoAtividade: 'Atividade fora da escola', tipoEvento: 'evento', aulaLigada: 'p157', estado: 'publicado' };
  por('ecl_planos', [velha, nova, atv]);
  igual(b.aulaDoDiaDaAtividade(atv)?.id, 'p160', 'a aula em uso:');
  igual(rp.rotuloDoPlano(velha).includes('157'), false, 'a arquivada também não mostra o n.º interno:');
});

regra('46. A validação do professor insiste até chegar ao Sheets', () => {
  por('ecl_planos', [{ id: 'p1', turmaId: 't', ucId: 'UC1', data: '2026-09-29', estado: 'publicado' }]);
  b.addOrUpdateValidacao({ id: 'v1', selecaoId: 's1', alunoId: 'a1', turmaId: 't', planoAulaId: 'p1', validadoEm: '2026-10-02T10:00:00Z',
    notas: [{ competenciaId: 'SUB-010', nota: 4 }], notaMedia20: 15 } as any);
  igual(b.estadoDaEspera().total >= 1, true, 'fica à espera de confirmação:');
});

regra('49. «Não aconteceu» numa atitude: a aplicação faz logo outra pergunta, que conta', () => {
  const sub = pa.perguntaSubstituta('ATI-001');
  igual(!!sub, true, 'há pergunta de substituição:');
  igual(pa.atitudeRespondida('ATI-001', [pa.NAO_ACONTECEU, 2]), false, 'falta responder à de substituição:');
  igual(pa.atitudeRespondida('ATI-001', [pa.NAO_ACONTECEU, 2, 3]), true, 'respondida:');
  igual(pa.nivelDaAtitude([pa.NAO_ACONTECEU, 1, 3]) !== pa.nivelDaAtitude([pa.NAO_ACONTECEU, 1]), true, 'a de substituição conta:');
  igual(pa.textoDasRespostas('ATI-001', [pa.NAO_ACONTECEU, 2, 3]).length, 3, 'o professor vê as três:');
  igual(!!pa.perguntaSubstituta('ATI-001', true), true, 'também nos eventos:');
});

regra('13. As datas comparam-se como datas, venham escritas como vierem', () => {
  const sels: any[] = [
    { id: 'velha', alunoId: 'a1', planoAulaId: 'p1', criadaEm: '2026-10-01T23:00:00.000Z' },
    { id: 'nova', alunoId: 'a1', planoAulaId: 'p1', criadaEm: 'Fri Oct 02 2026 09:00:00 GMT+0100' },
  ];
  igual(b.selecoesQueContam(sels)[0].id, 'nova');
});

regra('35a. O plano conta de 1 dentro da UC da turma; o n.º interno não aparece', () => {
  const p = (id: string, data: string, n: number, extra = {}) => ({ id, turmaId: 't', ucId: 'UC1', data, numeroPlan: n, estado: 'publicado', titulo: 'Aula', ...extra });
  por('ecl_planos', [p('a', '2026-09-20', 150), p('arq', '2026-09-21', 151, { estado: 'arquivado' }), p('b', '2026-09-22', 157), p('outra', '2026-09-21', 152, { ucId: 'UC2' })]);
  const r = rp.rotuloDoPlano(b.getPlanosAula().find(x => x.id === 'b'));
  igual(r.includes('157'), false, 'sem o n.º interno:');
  igual(/Plano de Aula 2\b/.test(r), true, 'é o 2.º da UC1 (' + r + '):');
});

regra('50. «Não aconteceu» no Consciente: a pergunta seguinte não é sempre a mesma', () => {
  const primeira = t5.perguntaSeguinte('co', ['co04'], true, []).id;
  const segunda = t5.perguntaSeguinte('co', ['co04'], true, [primeira]).id;
  const terceira = t5.perguntaSeguinte('co', ['co04'], true, [primeira, segunda]).id;
  igual(new Set([primeira, segunda, terceira]).size, 3, `três aulas, três perguntas (${primeira}, ${segunda}, ${terceira}):`);
  igual(t5.perguntaSeguinte('co', ['co04'], true, [primeira, segunda, terceira]).id, primeira, 'depois volta à mais antiga:');
  igual(t5.SO_AULA_PRATICA.has(t5.perguntaSeguinte('cr', ['cr03'], true, []).id), false, 'numa teórica, nada sobre a cozinha:');
  igual(!!t5.perguntaSeguinte('cr', ['cr03'], true, []).semOcasiao, false, 'a seguinte não tem «não aconteceu»:');
});

regra('51. A pergunta do Consciente e do Criativo fica fixada na 1.ª gravação do plano', () => {
  const p = (id: string, data: string) => ({ id, turmaId: 't', ucId: 'UC1', data, estado: 'publicado', tipoPlanAula: 'pratico', titulo: 'Aula' } as any);
  b.addOrUpdatePlanoAula(p('p3', '2026-10-03'));
  const antes = { co: b.perguntaCODaAula('p3'), cr: b.perguntaCRDaAula('p3') };
  igual(b.getPlanosAula().find(x => x.id === 'p3')?.rotacao5C, antes, 'fica guardada no plano:');
  // Criam-se aulas mais antigas: a posição muda, a pergunta não.
  b.addOrUpdatePlanoAula(p('p1', '2026-10-01'));
  b.addOrUpdatePlanoAula(p('p2', '2026-10-02'));
  igual({ co: b.perguntaCODaAula('p3'), cr: b.perguntaCRDaAula('p3') }, antes, 'a mesma depois de outros planos:');
  igual(b.perguntaCODaAula('p1') === b.perguntaCODaAula('p2') && b.perguntaCRDaAula('p1') === b.perguntaCRDaAula('p2'), false, 'aulas seguidas com perguntas diferentes:');
  // O professor escolhe outra: manda a dele.
  b.addOrUpdatePlanoAula({ ...b.getPlanosAula().find(x => x.id === 'p3'), perguntaCO: 'co16' } as any);
  igual(b.perguntaCODaAula('p3'), 'co16', 'a do professor:');
  // Uma aula prática com uma pergunta só da cozinha que passa a teórica: fixa-se outra.
  const pr: any = { ...p('p9', '2026-10-09'), rotacao5C: { co: 'co08', cr: 'cr01' } };
  b.addOrUpdatePlanoAula({ ...pr, tipoPlanAula: 'teorico', triagemAula: { tipo: 'teorico', cozinham: false, onde: 'sala', trabalho: 'individual', servico: false } });
  const fixa = b.getPlanosAula().find(x => x.id === 'p9')?.rotacao5C;
  igual(t5.SO_AULA_PRATICA.has(fixa!.co) || t5.SO_AULA_PRATICA.has(fixa!.cr), false, 'na teórica, nada sobre a cozinha:');
});

regra('52. A nota de hoje não conta 0 nas aulas à espera da validação', () => {
  const produtos: any[] = [{ peso: 50, planosIds: ['a'] }, { peso: 25, planosIds: ['b'] }, { peso: 25, planosIds: ['c'] }];
  const l: any = { produtos: [16, null, 0] };
  igual(pu.notaDoCompetenteDeHoje(l, produtos), 10.7, 'a aula por validar fica de fora, a falta conta 0:');
  igual(pu.notaDoCompetente(l, produtos), 8, 'a pauta oficial não muda:');
});

regra('53. Aula prática sem registos de higiene: os registos do KitchenFlow saem', () => {
  const t: any = { tipo: 'pratico', cozinham: true, onde: 'cozinha', trabalho: 'grupos', servico: false };
  igual(c.obrigatoriasDaTriagem(t), { farda: true, registos: true }, 'sem resposta, há registos:');
  igual(c.obrigatoriasDaTriagem({ ...t, registos: false }), { farda: true, registos: false }, 'com «Não»:');
  igual(c.obrigatoriasDaTriagem({ ...t, tipo: 'teorico', registos: true }).registos, false, 'na teórica nunca:');
});

regra('54. As perguntas do Consciente e do Criativo dizem de que se fala, com o plano do aluno', () => {
  por('ecl_planos', [
    { id: 'p_antes', turmaId: 't', ucId: 'UC1', data: '2026-10-10', estado: 'publicado', tipoPlanAula: 'pratico' },
    { id: 'p_hoje', turmaId: 't', ucId: 'UC1', data: '2026-10-13', estado: 'publicado', tipoPlanAula: 'pratico', fichasIds: ['f1'] }]);
  por('ecl_fichas', [{ id: 'f1', nomePrato: 'Wrap de Frango', textoGuia: 'Passo 1…', ingredientes: [] }]);
  por('ecl_historico_avaliacoes', [
    { id: 'r1', alunoId: 'a1', turmaId: 't', planoAulaId: 'p_antes', fichaId: '', ucId: 'UC1', microcompetenciaId: 'APP-0053', nota: 4, data: '2026-10-10', validadoPor: 'aluno' },
    { id: 'r2', alunoId: 'a1', turmaId: 't', planoAulaId: 'p_hoje', fichaId: '', ucId: 'UC1', microcompetenciaId: 'APP-0053', nota: 1, data: '2026-10-13', validadoPor: 'professor' }]);
  const pl = b.getPlanosAula().find(x => x.id === 'p_hoje');
  const ctx = b.contextoPerguntas5C(pl, undefined, 'a1');
  const co20 = t5.concretizar(t5.perguntaPorId('co20') as any, ctx);
  igual(co20.pergunta, 'Antes desta aula, viste o plano na aplicação e leste o guião de «Wrap de Frango»?', 'vir preparado:');
  igual(co20.frases[1], 'Vi o plano, mas não li o guião.', 'as respostas também:');
  const cr09 = t5.concretizar(t5.perguntaPorId('cr09') as any, ctx).pergunta;
  igual(cr09.startsWith('Hoje, a fazer «Wrap de Frango», usaste uma coisa que aprendeste numa aula anterior?'), true, cr09 + ':');
  igual(/da aula de 10\/10/.test(cr09), !!ctx.aprendido, 'o exemplo é de uma aula anterior:');
  igual(ctx.erro, undefined, 'a própria aula e o que o aluno disse de si não contam como erro:');
  igual(t5.concretizar(t5.perguntaPorId('co20') as any, {}).pergunta.includes('o que o professor preparou'), true, 'sem plano, diz o que é:');
});

regra('55. Anular a autoavaliação de um aluno: deixa de contar e ele responde a tudo de novo', () => {
  por('ecl_planos', [{ id: 'p1', turmaId: 't', data: '2026-10-09', estado: 'publicado', atualizadoEm: '2026-10-09T08:00:00Z' }]);
  por('ecl_selecoes', [
    { id: 's_men', alunoId: 'a1', turmaId: 't', planoAulaId: 'p1', criadaEm: '2026-10-09T10:00:00Z', versaoPlano: '2026-10-09T08:00:00Z', apresentacaoOral: 'hoje' },
    { id: 's_out', alunoId: 'a2', turmaId: 't', planoAulaId: 'p1', criadaEm: '2026-10-09T10:05:00Z', versaoPlano: '2026-10-09T08:00:00Z' }]);
  por('ecl_validacoes', [{ id: 'v_men', alunoId: 'a1', turmaId: 't', planoAulaId: 'p1', selecaoId: 's_men', notas: [], validadoEm: '2026-10-09T12:00:00Z' }]);
  por('ecl_historico_avaliacoes', [{ id: 'r_men', alunoId: 'a1', turmaId: 't', planoAulaId: 'p1', fichaId: '', ucId: 'UC1', microcompetenciaId: 'KNW-P-F-oral-dominio', nota: 5, data: '2026-10-09T12:00:00Z', validadoPor: 'professor' }]);
  b.anularAutoavaliacao('p1', 'a1', 'nao');
  igual(b.getValidacoes().length, 0, 'a validação dela deixa de contar:');
  igual(b.getHistoricoAvaliacoes().length, 0, 'e as notas dela também:');
  const pl: any = b.getPlanosAula().find(x => x.id === 'p1');
  igual(b.getSelecoes().map(s => s.id), ['s_out'], 'a anulada sai:');
  igual(b.selecoesDoProfessor().map(s => s.id), ['s_out'], 'nem fica para validar:');
  igual(b.respostasDoAlunoComAntigas('a1', 'p1').length, 0, 'o aluno recomeça do zero:');
  igual(pl.oralPeloProfessor, { a1: 'nao' }, 'o professor disse que não apresentou:');
  igual(b.reabertaPorResponder(pl, 'a1'), true, 'abre no telemóvel do aluno:');
  // A resposta nova conta e fecha a autoavaliação.
  const depois = new Date(Date.parse(pl.anuladaPara.a1) + 60000).toISOString();
  b.addOrUpdateSelecao({ id: 's_nova', alunoId: 'a1', turmaId: 't', planoAulaId: 'p1', criadaEm: depois, versaoPlano: pl.atualizadoEm } as any);
  igual(b.getSelecoes().map(s => s.id).sort(), ['s_nova', 's_out'], 'a nova conta:');
  igual(b.reabertaPorResponder(b.getPlanosAula().find(x => x.id === 'p1'), 'a1'), false, 'e fecha:');
  // Uma resposta dada depois, num telemóvel que ainda tinha o plano antigo, não se perde.
  b.addOrUpdateSelecao({ id: 's_velho', alunoId: 'a1', turmaId: 't', planoAulaId: 'p1', criadaEm: new Date(Date.parse(depois) + 60000).toISOString(), versaoPlano: '2026-10-09T08:00:00Z' } as any);
  igual(b.getSelecoes().some(s => s.id === 's_velho'), true, 'não se perde:');
});

regra('56. Numa aula teórica não há perguntas de cozinha nem de arrumação', () => {
  const pa2 = pa as any;
  const teorica = { cozinha: false, producao: false, equipa: false, colegas: true, servico: false, definido: true } as any;
  const pratica = { cozinha: true, producao: true, equipa: true, colegas: true, servico: false, definido: true } as any;
  const RX = /cozinha|descascar|alimentos|ingredientes|loiça|economato/i;
  for (const id of Object.keys(pa2.PERGUNTAS_ATITUDES)) {
    const sub = pa2.perguntaSubstituta(id, false, teorica);
    if (sub) igual(RX.test([sub.pergunta, ...sub.respostas].join(' ')), false, `${id} (${sub.pergunta}):`);
  }
  igual(pa2.perguntaSubstituta('ATI-010', false, pratica)?.pergunta, 'Hoje, com as tarefas mais chatas (descascar, lavar, limpar), como foi?', 'na prática fica a de sempre:');
  igual(RX.test(t5.concretizar(t5.perguntaPorId('co10') as any, { teorica: true }).frases.join(' ')), false, 'co10 na teórica:');
});

// 4. Um plano eliminado noutro aparelho: neste, as notas dele também saem.
{
  total++; mem.clear();
  (globalThis as any).fetch = async (url: string) => {
    const tipo = new URL(String(url)).searchParams.get('tipo');
    const corpo = tipo === 'get_planos' ? { ok: true, dados: [{ id: 'p_bom', turmaId: 't', data: '2026-09-29', estado: 'publicado' }], eliminados: ['p_apagado'] } : { ok: true, dados: [] };
    return { ok: true, json: async () => corpo, text: async () => JSON.stringify(corpo) };
  };
  por('ecl_planos', [{ id: 'p_bom', turmaId: 't', data: '2026-09-29', estado: 'publicado' }, { id: 'p_apagado', turmaId: 't', data: '2026-09-28', estado: 'publicado' }]);
  const reg = (id: string, p: string) => ({ id, alunoId: 'a1', turmaId: 't', planoAulaId: p, ucId: 'UC1', microcompetenciaId: 'ATI-001', nota: 4, data: '2026-09-28', validadoPor: 'professor' });
  por('ecl_historico_avaliacoes', [reg('r1', 'p_bom'), reg('r2', 'p_apagado')]);
  try {
    await b.sincronizarDoSheets('t', { forcar: true });
    igual(b.getHistoricoAvaliacoes().map(r => r.planoAulaId), ['p_bom'], 'notas que ficam:');
    console.log('  ✓ 4. Um plano eliminado noutro aparelho sai daqui, com as notas dele');
  } catch (e: any) { falhas++; console.log('  ✗ 4. Um plano eliminado noutro aparelho sai daqui, com as notas dele\n      ' + (e?.message || e)); }
}

// 57–59. Validações presas no tablet (Rosa, 13/out/2026).
{
  const enviados: any[] = [];
  let validacoesNoSheets: any[] = [];
  (globalThis as any).fetch = async (url: string, op?: any) => {
    if (op?.method === 'POST') {
      try { const c = JSON.parse(op.body); (c.tipo === 'lote' ? c.itens : [c]).forEach((x: any) => enviados.push(x)); } catch { /* */ }
      return { ok: true, json: async () => ({}), text: async () => '{}' };
    }
    const tipo = new URL(String(url)).searchParams.get('tipo');
    const corpo = tipo === 'get_validacoes' ? { ok: true, dados: validacoesNoSheets } : { ok: true, dados: [] };
    return { ok: true, json: async () => corpo, text: async () => JSON.stringify(corpo) };
  };
  const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));
  const T = '2026-10-13T09:00:00.000Z';
  const val = (id: string, nota: number) => ({ id, alunoId: 'a_' + id, turmaId: 't', planoAulaId: 'p1', validadoEm: T, validadoPor: 'professor', notas: [], notaMedia20: nota });
  const naEspera = (id: string, tentativas: number) => ({ tipo: 'validacao', id, rotulo: id, turmaId: 't', desde: T, tentativas });
  const foi = (id: string) => enviados.some(x => x.tipo === 'validacao' && x.id === id);
  const caso = async (nome: string, fn: () => Promise<void>) => {
    total++; mem.clear(); enviados.length = 0;
    por('ecl_planos', [{ id: 'p1', turmaId: 't', data: '2026-10-13', estado: 'publicado' }]);
    try { await fn(); console.log('  ✓ ' + nome); }
    catch (e: any) { falhas++; console.log('  ✗ ' + nome + '\n      ' + (e?.message || e)); }
  };

  await caso('57. A validação com nota 0 (falta) que está no Sheets dá-se por entregue', async () => {
    por('ecl_validacoes', [val('v0', 0)]);
    por('ecl_por_confirmar', [naEspera('v0', 6)]);
    validacoesNoSheets = [{ id: 'v0', validadoEm: T, notaMedia20: '' }];
    igual((await b.confirmarEReenviar()).aRepetir, 0, 'por confirmar:');
  });
  await caso('58. A validação que não chegou continua a ir depois de 5 tentativas', async () => {
    por('ecl_validacoes', [val('v1', 14)]);
    por('ecl_por_confirmar', [naEspera('v1', 7)]);
    validacoesNoSheets = [{ id: 'v1', validadoEm: T, notaMedia20: '' }];   // lá, mas sem a nota
    igual((await b.confirmarEReenviar()).aRepetir, 1, 'por confirmar:');
    await esperar(400);
    igual(foi('v1'), true, 'reenviada:');
  });
  await caso('59. «Tentar enviar agora» manda logo tudo, mesmo o que já esgotou as tentativas', async () => {
    por('ecl_validacoes', [val('v2', 12)]);
    por('ecl_por_confirmar', [naEspera('v2', 75)]);
    validacoesNoSheets = [];
    await b.confirmarEReenviar();
    await esperar(400);
    igual(foi('v2'), false, 'sem forçar (75.ª tentativa):');
    const r = await b.confirmarEReenviar({ forcar: true });
    await esperar(400);
    igual(r.enviados, 1, 'enviados:');
    igual(foi('v2'), true, 'forçado:');
  });
}

regra('60. Mudar o plano só pede outra resposta quando mudam as perguntas; cancelar o pedido devolve as respostas', () => {
  const plano: any = { id: 'p1', turmaId: 't', data: '2026-10-01', estado: 'publicado', titulo: 'Aula', tipoPlanAula: 'pratico', compAdicionadas: [] };
  por('ecl_planos', [{ ...plano, enviadoAosAlunos: g.fotografiaDoPlano(plano) }]);
  por('ecl_selecoes', [{ id: 's1', alunoId: 'a1', turmaId: 't', planoAulaId: 'p1', criadaEm: '2026-10-01T09:00:00Z', versaoPlano: '2026-10-01T08:00:00Z' }]);
  const pedido = () => !!(b.getPlanosAula().find(p => p.id === 'p1') as any)?.pedirDeNovoEm;
  // Só o título: não pede.
  b.addOrUpdatePlanoAula({ ...(b.getPlanosAula()[0] as any), titulo: 'Aula (corrigida)' });
  g.enviarAlteracoesAosAlunos('p1');
  igual(pedido(), false, 'título:');
  igual(b.getSelecoes().map(s => s.id), ['s1'], 'a resposta continua:');
  // Uma atitude nova: pede.
  b.addOrUpdatePlanoAula({ ...(b.getPlanosAula()[0] as any), compAdicionadas: ['ATI-020'] });
  g.enviarAlteracoesAosAlunos('p1');
  igual(pedido(), true, 'atitude nova:');
  b.cancelarNovaAutoavaliacao('p1');
  igual(pedido(), false, 'cancelado:');
  igual(b.getSelecoes().map(s => s.id), ['s1'], 'depois de cancelar:');
});

regra('63. Criar um plano antes de uma aula já gravada não lhe muda as perguntas do Consciente e do Criativo', () => {
  const aula = (id: string, data: string) => ({ id, turmaId: 't', data, estado: 'publicado', titulo: id, tipoPlanAula: 'pratico' });
  const dia = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  por('ecl_planos', [aula('pa', dia(-3)), aula('pb', dia(-2))]);
  b.fixarPerguntas5CEmFalta('t');
  const antes = [b.perguntaCODaAula('pb'), b.perguntaCRDaAula('pb')];
  b.addOrUpdatePlanoAula(aula('p0', dia(-9)) as any);
  igual([b.perguntaCODaAula('pb'), b.perguntaCRDaAula('pb')], antes, 'perguntas da aula já gravada:');
});

{
  const lf = await import('../src/lerFichaDaIA');
  regra('61. Requisição: o nome do prato vai sem o resto da ficha', () => {
    igual(lf.nomeDoPratoLimpo('Bolo de Bolacha FAMÍLIA PRINCIPAL: Pastelaria — Bolos ALERGÉNICOS: Glúten, Ovos'), 'Bolo de Bolacha');
    igual(lf.nomeDoPratoLimpo('Almôndegas com Molho de Tomate\nFAMÍLIA PRINCIPAL: Carnes'), 'Almôndegas com Molho de Tomate');
    igual(lf.nomeDoPratoLimpo('Bacalhau à Brás.'), 'Bacalhau à Brás');
    igual(lf.nomeDoPratoLimpo('Creme de Legumes — Sopa'), 'Creme de Legumes — Sopa');
  });
}

regra('62. O espaço do aparelho mede-se, e a lista do que falta enviar não se perde quando enche', () => {
  localStorage.setItem('ecl_grande', 'x'.repeat(4_100_000));
  igual(b.espacoOcupado().fracao >= 0.8, true, 'acima dos 80%:');
  const ls: any = localStorage, antes = ls.setItem;
  ls.setItem = (k: string, v: string) => { if (k === 'ecl_por_confirmar') throw new Error('QuotaExceededError'); return antes.call(ls, k, v); };
  try {
    b.porConfirmar('validacao', 'v_cheio', 'validação', 't');
    igual(b.estadoDaEspera().total, 1, 'na lista (na memória):');
    igual(b.espacoOcupado().cheio, true, 'aviso de cheio:');
  } finally { ls.setItem = antes; }
});

{
  const dd = await import('../src/diaDaAula');
  regra('64. Numa aula ou atividade que já passou, as perguntas dizem o dia e o topo diz o que se avalia', () => {
    const hoje = dd.hojeLocalISO();
    const passada = { data: '2026-10-10', tipoEvento: 'evento', titulo: 'Catering — 10/10/2026', horaInicio: '09:00', horaFim: '18:00' };
    const aula = { data: '2026-10-12', titulo: 'Aula prática — 12/10/2026' };
    igual(dd.textoParaODia('Hoje, quando acabaste a tua tarefa, o que fizeste?', aula), 'Na aula de segunda-feira, 12/10, quando acabaste a tua tarefa, o que fizeste?');
    igual(dd.textoParaODia('Em que atitude trabalhaste hoje?', passada), 'Em que atitude trabalhaste nesse dia?');
    igual(dd.textoParaODia('Depois da aula de hoje, já sabes isto?', aula), 'Depois da aula de segunda-feira, 12/10, já sabes isto?');
    igual(dd.textoParaODia('Hoje, quando acabaste a tua tarefa, o que fizeste?', { data: hoje }), 'Hoje, quando acabaste a tua tarefa, o que fizeste?', 'hoje fica:');
    const f = dd.faixaDaAula(passada);
    igual([f.atividade, f.titulo, f.linha.startsWith('sábado, 10 de outubro · 09:00–18:00')], [true, 'Catering', true]);
  });
}

console.log(`\n${total - falhas} de ${total} regras certas.`);
process.exit(falhas ? 1 : 0);
