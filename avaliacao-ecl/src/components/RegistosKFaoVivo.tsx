// ════════════════════════════════════════════════════════════
// REGISTOS DO KITCHENFLOW AO VIVO — no plano de aula do professor
// ════════════════════════════════════════════════════════════
// Enquanto os alunos registam no KitchenFlow, o professor vai vendo aqui o
// que chegou: quem registou, a que horas, e o quê. Lê as folhas do
// KitchenFlow (as mesmas que o relatório usa) e fica só com a turma e o
// dia desta aula. Não conta para nota nenhuma: é para acompanhar e para,
// no fim, marcar os registos na validação.
import React, { useEffect, useState } from 'react';
import type { PlanoAula } from '../types';
import { KITCHENFLOW_SHEET_URL, getTurmas } from '../backend';
import { organizacaoDe, FUNCOES_AULA, nomeDoAluno, type IdFuncao } from '../organizacaoAula';

// O endereço que a aplicação KitchenFlow usa hoje, e o que a Avaliação ECL já
// usava. Lê-se dos dois e juntam-se (sem repetidos), para não perder nada.
const URL_KF_APP = 'https://script.google.com/macros/s/AKfycbzmt7yGx09nFF_8HUbdD0p29q9iS1ttKku-vbnoGxm-w7eq2cp8WlzZRm_jJyVIcKwF/exec';
const URLS = [...new Set([URL_KF_APP, KITCHENFLOW_SHEET_URL].filter(Boolean))];

/** As folhas onde os alunos registam. Cada linha começa por data, hora, turma, nº, nome. */
const TABELAS = [
  'Higiene Pessoal', 'Temperaturas', 'Higienização', 'Panos Solução', 'Receção Matérias-Primas',
  'Conservação Produtos', 'Controlo Óleos', 'Desinfeção', 'Amostra Testemunho', 'Temperatura Serviço',
  'Regeneração', 'NãoConformidades', 'Faltas e Necessidades', 'Manutenção, Avarias e Prevenção', 'Encerramento',
];

export interface RegistoKF { tabela: string; hora: string; nome: string; detalhe: string; nc: boolean; alunoId: string }

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

/** A data da linha em AAAA-MM-DD (vem «29/09/2026» ou uma data do Sheets). */
function dataDaLinha(v: any): string {
  const s = String(v || '');
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  // O Sheets manda a data à meia-noite de Lisboa em UTC: usa a data local.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function horaDaLinha(v: any): string {
  const s = String(v || '');
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m && !/^\d{4}-/.test(s)) return `${m[1].padStart(2, '0')}:${m[2]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Os registos do KitchenFlow desta turma neste dia, dos mais recentes para os mais antigos. */
export async function registosKFdaAula(turmaId: string, dataISO: string): Promise<{ registos: RegistoKF[]; falhou: boolean }> {
  const turma = getTurmas().find(t => t.id === turmaId);
  const turmas = new Set([norm(turmaId), norm(turma?.nome || '')].filter(Boolean));
  const vistos = new Set<string>();
  const registos: RegistoKF[] = [];
  let respostas = 0;
  const pedidos = URLS.flatMap(url => TABELAS.map(async tabela => {
    const r = await fetch(`${url}?tabela=${encodeURIComponent(tabela)}`);
    const j = await r.json();
    respostas++;
    for (const l of (j?.dados || []) as any[][]) {
      if (!Array.isArray(l) || dataDaLinha(l[0]) !== dataISO || !turmas.has(norm(l[2]))) continue;
      const hora = horaDaLinha(l[1]);
      const detalhe = l.slice(5).map(x => String(x ?? '').trim()).filter(x => x && x !== 'avaliacao_ecl').join(' · ');
      const chave = [tabela, hora, l[3], detalhe].join('|');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      registos.push({ tabela, hora, nome: String(l[4] || l[3] || '').trim(), detalhe, nc: /(^|·\s)NC(\s|$)/.test(detalhe), alunoId: String(l[3] || '') });
    }
  }));
  await Promise.allSettled(pedidos);
  registos.sort((a, b) => b.hora.localeCompare(a.hora));
  return { registos, falhou: respostas === 0 };
}

/** Os PCC da ficha técnica e o registo que lhes corresponde no KitchenFlow.
 *  A temperatura interna de confeção ainda não tem registo próprio lá. */
export const PCC_NO_KF: { re: RegExp; modulo: string; tabela: string; nome: string }[] = [
  { re: /testemunho/i, modulo: 'testemunho', tabela: 'Amostra Testemunho', nome: 'Amostra testemunho' },
  { re: /regenera|reaquec|cook.?chill/i, modulo: 'regeneracao', tabela: 'Regeneração', nome: 'Regeneração' },
  { re: /arrefec|refrigera|conserva|congel|abatedor/i, modulo: 'conservacao', tabela: 'Conservação Produtos', nome: 'Conservação' },
  { re: /servi[çc]o|buffet|manter.{0,12}quente|banho.?maria/i, modulo: 'servico', tabela: 'Temperatura Serviço', nome: 'Temperatura de serviço' },
  { re: /desinfe|consumo em cru|hort[ií]col/i, modulo: 'desinfecao', tabela: 'Desinfeção', nome: 'Desinfeção' },
  { re: /[óo]leo|fritura/i, modulo: 'oleos', tabela: 'Controlo Óleos', nome: 'Óleo de fritura' },
];
export const pccNoKF = (texto: string) => PCC_NO_KF.find(x => x.re.test(texto || ''));

/**
 * Alguém do grupo já fez hoje este registo para este prato? (Rosa, set/2026:
 * quatro alunos na mesma ficha não registam o mesmo PCC quatro vezes.)
 * Vai à escola no momento, para estar certo.
 */
export async function registoPCCjaFeito(tabela: string, turmaId: string, dataISO: string, prato: string, alunosIds: string[]):
  Promise<{ nome: string; hora: string } | null> {
  const turma = getTurmas().find(t => t.id === turmaId);
  const turmas = new Set([norm(turmaId), norm(turma?.nome || '')].filter(Boolean));
  const ids = new Set(alunosIds.map(norm));
  const p = norm(prato).slice(0, 12);
  for (const url of URLS) {
    try {
      const j = await (await fetch(`${url}?tabela=${encodeURIComponent(tabela)}`)).json();
      for (const l of (j?.dados || []) as any[][]) {
        if (!Array.isArray(l) || dataDaLinha(l[0]) !== dataISO || !turmas.has(norm(l[2]))) continue;
        if (!ids.has(norm(l[3]))) continue;
        if (p && !norm(l.slice(5).join(' ')).includes(p)) continue;
        return { nome: String(l[4] || l[3] || ''), hora: horaDaLinha(l[1]) };
      }
    } catch { /* tenta o outro endereço */ }
  }
  return null;
}

const V = '#6B3FA0';

/** Onde fica o registo de cada função no KitchenFlow. «partilhado»: um registo
 *  por turma (se um colega o fez, está feito). */
const REGISTO_DA_FUNCAO: Record<IdFuncao, { tabelas: string[]; partilhado?: boolean }> = {
  lider: { tabelas: ['Encerramento'], partilhado: true },
  temp1: { tabelas: ['Temperaturas'], partilhado: true },
  temp2: { tabelas: ['Temperaturas'], partilhado: true },
  panos: { tabelas: ['Panos Solução'], partilhado: true },
  rececao: { tabelas: ['Receção Matérias-Primas'] },
  copa: { tabelas: ['Higienização'] }, economato: { tabelas: ['Higienização'] }, equipamentos: { tabelas: ['Higienização'] },
  fogoes_frio: { tabelas: ['Higienização'] }, lixo_carrinhos: { tabelas: ['Higienização'] }, chao_bancadas: { tabelas: ['Higienização'] },
};

/** Quem tem cada função hoje e se o seu registo já chegou ao KitchenFlow. */
function QuemRegistou({ plano, regs }: { plano: PlanoAula; regs: RegistoKF[] }) {
  const org = organizacaoDe(plano);
  if (!org?.lugares?.length) return null;
  const linhas = org.lugares.map(l => {
    const f = FUNCOES_AULA.find(x => x.id === l.funcaoId);
    const reg = REGISTO_DA_FUNCAO[l.funcaoId];
    const doAluno = regs.filter(r => reg?.tabelas.includes(r.tabela) && r.alunoId === l.alunoId);
    const daTurma = reg?.partilhado ? regs.filter(r => reg.tabelas.includes(r.tabela)) : [];
    const feito = doAluno.length > 0 || daTurma.length > 0;
    const quem = doAluno.length ? '' : daTurma.length ? `por ${daTurma[daTurma.length - 1].nome.split(' ')[0]}` : '';
    const hora = (doAluno.length ? doAluno : daTurma).map(r => r.hora).sort().pop() || '';
    return { chave: l.chave, funcao: f?.nome || l.funcaoId, aluno: nomeDoAluno(l.alunoId), feito, n: doAluno.length, quem, hora };
  });
  const feitos = linhas.filter(x => x.feito).length;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: V, marginBottom: 6 }}>Quem já registou · {feitos} de {linhas.length}</div>
      {linhas.map(x => (
        <div key={x.chave} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', marginBottom: 4, borderRadius: 10,
          background: x.feito ? '#EEF7EE' : '#FFF6EC' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.35 }}>
            <b>{x.aluno}</b><span style={{ display: 'block', fontSize: 12, color: 'rgba(26,23,20,0.6)' }}>{x.funcao}</span>
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: x.feito ? '#2F6B2F' : '#B5651D', textAlign: 'right', whiteSpace: 'nowrap' }}>
            {x.feito ? `✓ ${x.hora}${x.quem ? ' ' + x.quem : x.n > 1 ? ` · ${x.n}` : ''}` : 'ainda não'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RegistosKFaoVivo({ plano }: { plano: PlanoAula }) {
  const dataISO = String(plano.data || '').slice(0, 10);
  const hoje = dataISO === new Date().toISOString().slice(0, 10);
  const [estado, setEstado] = useState<{ registos: RegistoKF[]; falhou: boolean; em: string } | null>(null);
  const [aLer, setALer] = useState(false);
  const [aberto, setAberto] = useState(true);
  const [verTodos, setVerTodos] = useState(false);

  async function ler() {
    setALer(true);
    try {
      const r = await registosKFdaAula(plano.turmaId, dataISO);
      setEstado({ ...r, em: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) });
    } finally { setALer(false); }
  }
  // Durante a aula (o dia de hoje), volta a ler de 30 em 30 segundos.
  useEffect(() => {
    ler();
    if (!hoje) return;
    const t = setInterval(ler, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano.id, plano.turmaId, dataISO]);

  const regs = estado?.registos || [];
  const porTabela = TABELAS.map(t => ({ t, n: regs.filter(r => r.tabela === t).length })).filter(x => x.n > 0);
  const ncs = regs.filter(r => r.nc).length;

  return (
    <div style={{ marginBottom: 16, background: '#fff', border: `1.5px solid ${V}33`, borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={() => setAberto(!aberto)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', background: '#F3EEF8', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: V }}>
            Registos do KitchenFlow — quem já registou{hoje ? ' · ao vivo' : ''}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
            {!estado ? 'A ler…' : estado.falhou ? 'Não consegui ler o KitchenFlow' :
              `${regs.length} registo${regs.length === 1 ? '' : 's'} da turma hoje${ncs ? ` · ${ncs} não conforme${ncs === 1 ? '' : 's'}` : ''} · lido às ${estado.em}`}
          </span>
        </span>
        {regs.length > 0 && <span style={{ minWidth: 26, height: 26, borderRadius: 13, background: V, color: '#fff',
          fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 7px' }}>{regs.length}</span>}
        <span style={{ fontSize: 13, color: V }}>{aberto ? '▲' : '▼'}</span>
      </button>
      {aberto && (
        <div style={{ padding: '10px 14px 14px' }}>
          {estado && !estado.falhou && <QuemRegistou plano={plano} regs={regs} />}
          {regs.length > 0 && <button onClick={() => setVerTodos(!verTodos)} style={{ background: 'none', border: 'none', padding: '2px 0 8px',
            color: V, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
            {verTodos ? 'Esconder os registos' : `Ver os ${regs.length} registos`}</button>}
          {verTodos && porTabela.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {porTabela.map(x => (
                <span key={x.t} style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                  background: '#F3EEF8', color: V }}>{x.t} · {x.n}</span>
              ))}
            </div>
          )}
          {estado && !estado.falhou && regs.length === 0 && (
            <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)', lineHeight: 1.5 }}>
              Ainda não chegou nenhum registo desta turma hoje.
            </div>
          )}
          {estado?.falhou && (
            <div style={{ fontSize: 13.5, color: '#8e2418', lineHeight: 1.5 }}>
              Sem ligação ao KitchenFlow. Verifica a internet e toca em «Ler agora».
            </div>
          )}
          {verTodos && <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {regs.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: i ? '1px solid rgba(26,23,20,0.08)' : 'none',
                fontSize: 13.5, lineHeight: 1.45 }}>
                <span style={{ fontWeight: 700, color: 'rgba(26,23,20,0.55)', minWidth: 42 }}>{r.hora}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{r.tabela}</b> · {r.nome}
                  {r.nc && <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 800, padding: '1px 7px', borderRadius: 100,
                    background: '#fdf0ef', color: '#8e2418' }}>NC</span>}
                  {r.detalhe && <span style={{ display: 'block', fontSize: 12.5, color: 'rgba(26,23,20,0.6)',
                    overflowWrap: 'anywhere' }}>{r.detalhe}</span>}
                </span>
              </div>
            ))}
          </div>}
          <button onClick={ler} disabled={aLer} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 10,
            border: `1px solid ${V}`, background: '#fff', color: V, fontWeight: 700, fontSize: 13.5,
            cursor: aLer ? 'default' : 'pointer', fontFamily: 'inherit', opacity: aLer ? 0.5 : 1 }}>
            {aLer ? 'A ler…' : 'Ler agora'}
          </button>
        </div>
      )}
    </div>
  );
}
