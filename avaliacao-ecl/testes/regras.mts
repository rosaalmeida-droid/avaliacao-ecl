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

regra('13. As datas comparam-se como datas, venham escritas como vierem', () => {
  const sels: any[] = [
    { id: 'velha', alunoId: 'a1', planoAulaId: 'p1', criadaEm: '2026-10-01T23:00:00.000Z' },
    { id: 'nova', alunoId: 'a1', planoAulaId: 'p1', criadaEm: 'Fri Oct 02 2026 09:00:00 GMT+0100' },
  ];
  igual(b.selecoesQueContam(sels)[0].id, 'nova');
});

console.log(`\n${total - falhas} de ${total} regras certas.`);
process.exit(falhas ? 1 : 0);
