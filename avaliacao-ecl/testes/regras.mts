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

console.log(`\n${total - falhas} de ${total} regras certas.`);
process.exit(falhas ? 1 : 0);
