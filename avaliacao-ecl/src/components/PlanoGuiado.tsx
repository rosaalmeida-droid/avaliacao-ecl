// ============================================================
// O plano do professor, guiado de cima para baixo (Rosa, out/2026)
// ============================================================
//   1. Como é esta aula — quatro perguntas; tudo o resto sai daqui.
//   2. O que se faz — o sumário e as fichas (já existiam).
//   3. O que se avalia — os pesos e o telemóvel do aluno: exatamente o
//      que ele vai responder, com o C de cada pergunta e o que fica de fora.
//   4. Enviar aos alunos — o que mudou desde o último envio, quem já
//      respondeu, e o estado da turma (quem se avaliou, quem falta, se as
//      presenças contam).
// O que o aluno responde vem das mesmas regras que o ecrã do aluno usa
// (autoavaliacaoDaAula): o professor vê o que o aluno vai ver.
// ============================================================
import React, { useState, useContext, createContext } from 'react';
import type { PlanoAula } from '../types';
import {
  addOrUpdatePlanoAula, getPlanosAula, getFichasProducao, getAlunos, getSelecoes, contextoDoPlano,
  perguntaCODaAula, perguntaCRDaAula, pedirNovaAutoavaliacao, estadoDaTurmaNaAula, anotarNoPlano, gruposDaAula,
} from '../backend';
import {
  triagemDoPlano, tipoDaTriagem, obrigatoriasDaTriagem,
  TEXTO_ONDE, TEXTO_TRABALHO, TEXTO_TIPO, EXPLICA_TIPO, CINCO_C, tipoDe, TEXTO_MODO, TEXTO_FORMATO, escolheTema,
  TEXTO_FASE, faseDoTrabalho,
  type ModoTrabalho, type FormatoTrabalho, type FaseTrabalho,
  type TriagemAula, type OndeAula, type TrabalhoAula, type TipoAula,
} from '../contextoAula';
import { ecrasDoAluno, pesosDaAula, resumoParaComparar } from '../autoavaliacaoDaAula';
import { conhecimentosDaAula } from '../compatECL';

const C = {
  tinta: '#1F1A16', suave: 'rgba(26,23,20,0.62)', linha: 'rgba(26,23,20,0.12)',
  cobre: '#9A4E14', cobreP: '#F8EADB', fundo: '#F6F1E8', azul: '#1F4E79', azulP: '#E6EEF7',
  verde: '#3F6136', verdeP: '#E7F0E2', ambar: '#7A4F0E', ambarP: '#FFF2DC', ambarL: '#E8B866', vinho: '#8A2F2F',
  violeta: '#4B2C7A',
};

const cartao: React.CSSProperties = {
  background: '#fff', border: `1px solid ${C.linha}`, borderRadius: 16, padding: '18px 20px', margin: '0 0 14px',
};

// Onde o passo aparece: sozinho (com o número), dentro de uma gaveta do
// plano em duas colunas (a gaveta já tem o título) ou na coluna «Na aula»
// (com título, sem número).
type ModoPasso = 'normal' | 'gaveta' | 'coluna';
const ModoDoPasso = createContext<ModoPasso>('normal');

/** O cartão do passo: dentro de uma gaveta não tem moldura (a gaveta já tem). */
function useCartao(extra?: React.CSSProperties): React.CSSProperties {
  return useContext(ModoDoPasso) === 'gaveta' ? { margin: 0 } : { ...cartao, ...extra };
}

export function CabecalhoPasso({ n, titulo, sub, direita }: { n: number; titulo: string; sub?: string; direita?: React.ReactNode }) {
  const modo = useContext(ModoDoPasso);
  if (modo === 'gaveta') return sub || direita ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 12px' }}>
      {sub && <div style={{ flex: 1, fontSize: 13.5, color: C.suave, lineHeight: 1.45 }}>{sub}</div>}
      {direita}
    </div>
  ) : null;
  if (modo === 'coluna') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{titulo}</div>
        {sub && <div style={{ fontSize: 13.5, color: C.suave, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {direita}
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ width: 32, height: 32, borderRadius: '50%', background: C.tinta, color: '#fff', fontWeight: 800,
        fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display, Fraunces, serif)', fontSize: 20, fontWeight: 700 }}>{titulo}</div>
        {sub && <div style={{ fontSize: 13.5, color: C.suave, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {direita}
    </div>
  );
}

/** Uma parte do plano que abre e fecha (Rosa, out/2026: «campo a campo»).
 *  Fechada, mostra só o resumo e se está feita ou por fazer. Lembra-se,
 *  neste aparelho, de como o professor a deixou. */
export function Gaveta({ id, n, titulo, resumo, feito, abertaAoInicio, children }: {
  id: string; n: number; titulo: string; resumo?: string; feito?: boolean; abertaAoInicio?: boolean; children: React.ReactNode;
}) {
  const chave = `ecl_gaveta_${id}`;
  const [aberta, setAberta] = useState<boolean>(() => {
    try { const v = localStorage.getItem(chave); if (v === '1' || v === '0') return v === '1'; } catch { /* */ }
    return !!abertaAoInicio;
  });
  const mudar = () => {
    const nova = !aberta;
    setAberta(nova);
    try { localStorage.setItem(chave, nova ? '1' : '0'); } catch { /* */ }
  };
  return (
    <div style={{ ...cartao, padding: 0, overflow: 'hidden', ...(feito === false ? { border: `2px solid ${C.ambarL}` } : {}) }}>
      <button onClick={mudar} aria-expanded={aberta} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: C.tinta }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: feito ? C.verde : C.tinta, color: '#fff', fontWeight: 800,
          fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{feito ? '✓' : n}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 17, fontWeight: 700 }}>{titulo}</span>
          {!aberta && resumo && (
            <span style={{ display: 'block', fontSize: 13.5, color: C.suave, marginTop: 2, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumo}</span>
          )}
        </span>
        {feito === false && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ambar, background: C.ambarP,
          borderRadius: 999, padding: '3px 10px', flexShrink: 0 }}>Por fazer</span>}
        <span aria-hidden style={{ fontSize: 14, color: C.suave, flexShrink: 0, transform: aberta ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {aberta && (
        <div style={{ padding: '2px 18px 18px', borderTop: `1px solid ${C.linha}` }}>
          <div style={{ height: 14 }} />
          <ModoDoPasso.Provider value="gaveta">{children}</ModoDoPasso.Provider>
        </div>
      )}
    </div>
  );
}

/** Os passos da coluna «Na aula»: com título, sem número. */
export function NaColuna({ children }: { children: React.ReactNode }) {
  return <ModoDoPasso.Provider value="coluna">{children}</ModoDoPasso.Provider>;
}

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'inherit', fontSize: 14.5, fontWeight: ativo ? 700 : 500, padding: '9px 13px', borderRadius: 10,
      cursor: 'pointer', minHeight: 40,
      border: ativo ? `2px solid ${C.cobre}` : '1px solid rgba(26,23,20,0.22)',
      background: ativo ? C.cobre : '#fff', color: ativo ? '#fff' : C.tinta,
    }}>{children}</button>
  );
}

function Pergunta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{titulo}</div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

/** A frase que resume a aula: «Aula prática, em grupos, na cozinha, com serviço». */
export function fraseDaAula(t: TriagemAula): string {
  const tt = tipoDe(t);
  const tipo = tt === 'pratico' ? 'Aula prática' : tt === 'misto' ? 'Aula mista' : tt === 'teorico' ? 'Aula teórica'
    : t.onde === 'fora' ? 'Visita ou atividade fora da escola' : 'Aula atitudinal';
  const como = t.trabalho === 'grupos' ? 'em grupos' : t.trabalho === 'individual' ? 'cada um sozinho' : 'a turma toda junta';
  const onde = t.onde === 'cozinha' ? 'na cozinha' : t.onde === 'sala' ? 'na sala' : 'fora da escola';
  return `${tipo}, ${como}${t.onde === 'fora' && !t.cozinham ? '' : `, ${onde}`}${t.servico && t.cozinham ? ', com serviço' : ''}.`;
}

// ── 1. Como é esta aula ───────────────────────────────────────

export function PassoComoEAula({ plano, onPlanoActualizado }: { plano: PlanoAula; onPlanoActualizado: (p: PlanoAula) => void }) {
  const p: any = plano;
  const definida = triagemDoPlano(plano);
  const ctx = contextoDoPlano(plano);
  // Sem triagem, mostra o que a aplicação deduziu do plano, para confirmar.
  const tipoDoPlano = String(p.tipoPlanAula || 'pratico').replace('_obr', '') as TipoAula;
  const valor: TriagemAula = definida ? { ...definida, tipo: tipoDe(definida) } : {
    tipo: tipoDoPlano, onde: ctx.cozinha ? 'cozinha' : 'sala', cozinham: ctx.producao,
    trabalho: ctx.equipa ? 'grupos' : 'individual', servico: false,
    ...(tipoDoPlano === 'atitudinal' ? { farda: p.tipoPlanAula === 'atitudinal_obr' } : {}),
  };
  const tipo = tipoDe(valor);
  const ob = obrigatoriasDaTriagem(valor);
  const cart = useCartao(definida ? {} : { border: `2px solid ${C.ambarL}` });

  function gravar(parcial: Partial<TriagemAula>) {
    const nova: TriagemAula = { ...valor, ...parcial };
    nova.cozinham = tipoDe(nova) === 'pratico' || tipoDe(nova) === 'misto';
    // Mudar para cozinhar leva a aula para a cozinha; teórica sai da cozinha.
    if ('tipo' in parcial && nova.cozinham && !('onde' in parcial) && nova.onde === 'sala') nova.onde = 'cozinha';
    if ('tipo' in parcial && nova.tipo === 'teorico' && nova.onde === 'cozinha') nova.onde = 'sala';
    // O modo do trabalho decide como trabalham (as perguntas de grupo dependem disto).
    if (parcial.modo === 'grupo') nova.trabalho = 'grupos';
    if (parcial.modo === 'individual') nova.trabalho = 'individual';
    if (nova.tipo === 'pratico' || nova.tipo === 'atitudinal') { delete nova.modo; delete nova.formatos; delete nova.fase; }
    const atual: any = getPlanosAula().find(x => x.id === plano.id) || plano;
    const novo: any = { ...atual, triagemAula: nova };
    // O tipo da aula (os pesos da nota) e a farda e os registos acompanham a
    // triagem. Os eventos têm as regras deles e não mudam.
    if (!atual.tipoEvento) {
      const temKnw = conhecimentosDaAula(atual).length > 0
        || ((atual.compAdicionadas || []) as string[]).some(id => id.startsWith('KNW-'));
      novo.tipoPlanAula = tipoDaTriagem(nova, temKnw, atual.tipoPlanAula);
      // O nome da atividade e o título acompanham o tipo (uma teórica chamava-se «Aula prática»).
      const nomes: Record<string, string> = { pratico: 'Aula prática', misto: 'Aula mista', teorico: 'Aula teórica', atitudinal: 'Dinâmica de grupo — atitudes' };
      const nomeNovo = nomes[tipoDe(nova)];
      if (Object.values(nomes).includes(atual.tipoAtividade || 'Aula prática') && atual.tipoAtividade !== nomeNovo) {
        const tituloPadrao = `${atual.tipoAtividade || 'Aula prática'} — ${String(atual.data || '').slice(0, 10)}`;
        if (!atual.titulo || atual.titulo === tituloPadrao) novo.titulo = `${nomeNovo} — ${String(atual.data || '').slice(0, 10)}`;
        novo.tipoAtividade = nomeNovo;
      }
      if ('onde' in parcial || 'tipo' in parcial || 'farda' in parcial || !definida) {
        const ob = obrigatoriasDaTriagem(nova);
        const tiradas = new Set<string>(atual.compRemovidas || []);
        if (ob.farda) tiradas.delete('OBR_01'); else tiradas.add('OBR_01');
        if (ob.registos) tiradas.delete('OBR_02'); else tiradas.add('OBR_02');
        novo.compRemovidas = [...tiradas];
      }
    }
    // Trabalho de grupo: os alunos formam os grupos na aplicação.
    if (nova.modo === 'grupo' && !novo.gruposAlunos?.ativo) novo.gruposAlunos = { ativo: true, tamanho: novo.gruposAlunos?.tamanho || 4 };
    addOrUpdatePlanoAula(novo);
    onPlanoActualizado(getPlanosAula().find(x => x.id === plano.id) || novo);
  }

  return (
    <div style={cart}>
      <CabecalhoPasso n={1} titulo="Como é esta aula?"
        sub="Primeiro o tipo de aula. O que o aluno responde e o que conta para a nota sai daqui." />
      {!definida && (
        <div style={{ background: C.ambarP, color: '#5C3A08', borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 14, lineHeight: 1.5 }}>
          <b>Escolhe o tipo de aula.</b> Sem ele, a aplicação não sabe o que avaliar nem se há farda e higiene e
          segurança alimentar — e não adivinha.
        </div>
      )}
      {/* O tipo de aula primeiro: decide a farda e a higiene e segurança alimentar. */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 7 }}>Que tipo de aula é?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {(['pratico', 'misto', 'teorico', 'atitudinal'] as TipoAula[]).map(t => {
            const on = !!definida && tipo === t;
            return (
              <button key={t} onClick={() => gravar({ tipo: t })} style={{ fontFamily: 'inherit', textAlign: 'left', padding: '10px 12px',
                borderRadius: 11, cursor: 'pointer', border: on ? `2px solid ${C.cobre}` : '1px solid rgba(26,23,20,0.22)',
                background: on ? C.cobre : '#fff', color: on ? '#fff' : C.tinta }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{TEXTO_TIPO[t]}</div>
                <div style={{ fontSize: 12.5, opacity: 0.85 }}>{EXPLICA_TIPO[t]}</div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 13.5, marginTop: 8, color: C.suave, lineHeight: 1.5, display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center' }}>
          <span>
            <b style={{ color: C.tinta }}>Farda:</b> {ob.farda ? 'avalia-se (à entrada)' : 'não se avalia'}
            {' · '}<b style={{ color: C.tinta }}>Higiene e segurança alimentar (registos do KitchenFlow):</b> {ob.registos ? 'avalia-se' : 'não se avalia'}
          </span>
          {tipo === 'atitudinal' && (
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>Avaliar a farda nesta dinâmica?</span>
              <Opcao ativo={!!definida && ob.farda} onClick={() => gravar({ farda: true })}>Sim</Opcao>
              <Opcao ativo={!!definida && !ob.farda} onClick={() => gravar({ farda: false })}>Não</Opcao>
            </span>
          )}
        </div>
      </div>
      {/* Teórica ou mista: como se trabalha o manual, e o formato do trabalho. */}
      {(tipo === 'teorico' || tipo === 'misto') && (
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Pergunta titulo="Como se trabalha o manual?">
            {(['professor', 'grupo', 'individual'] as ModoTrabalho[]).map(m => (
              <Opcao key={m} ativo={!!definida && (valor.modo || 'professor') === m} onClick={() => gravar({ modo: m })}>{TEXTO_MODO[m]}</Opcao>
            ))}
          </Pergunta>
          {escolheTema(valor) && (
            <Pergunta titulo="Em que fase está o trabalho?">
              {(['preparar', 'apresentar'] as FaseTrabalho[]).map(f => (
                <Opcao key={f} ativo={!!definida && faseDoTrabalho(valor) === f} onClick={() => gravar({ fase: f })}>{TEXTO_FASE[f]}</Opcao>
              ))}
            </Pergunta>
          )}
          {escolheTema(valor) && (
            <Pergunta titulo="Como vai ser apresentado? (podes escolher vários)">
              {(['escrito', 'oral', 'digital', 'pratico'] as FormatoTrabalho[]).map(f => {
                const on = (valor.formatos || []).includes(f);
                return <Opcao key={f} ativo={!!definida && on} onClick={() => gravar({ formatos: on
                  ? (valor.formatos || []).filter(x => x !== f) : [...(valor.formatos || []), f] })}>{TEXTO_FORMATO[f]}</Opcao>;
              })}
            </Pergunta>
          )}
          {definida && escolheTema(valor) && <AvisoDoTrabalho plano={plano} triagem={valor} />}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px 26px' }}>
        <Pergunta titulo="Onde é?">
          {(['cozinha', 'sala', 'fora'] as OndeAula[]).map(o => (
            <Opcao key={o} ativo={!!definida && valor.onde === o} onClick={() => gravar({ onde: o })}>{TEXTO_ONDE[o]}</Opcao>
          ))}
        </Pergunta>
        <Pergunta titulo="Como trabalham?">
          {(['grupos', 'individual', 'turma'] as TrabalhoAula[]).map(t => (
            <Opcao key={t} ativo={!!definida && valor.trabalho === t} onClick={() => gravar({ trabalho: t })}>{TEXTO_TRABALHO[t]}</Opcao>
          ))}
        </Pergunta>
        {(tipo === 'pratico' || tipo === 'misto') && (
          <Pergunta titulo="Há serviço a clientes?">
            <Opcao ativo={!!definida && valor.servico} onClick={() => gravar({ servico: true })}>Sim (almoço, evento)</Opcao>
            <Opcao ativo={!!definida && !valor.servico} onClick={() => gravar({ servico: false })}>Não</Opcao>
          </Pergunta>
        )}
      </div>
      {/* O peso da aula na nota do módulo decide-se na pauta, não aqui (Rosa, out/2026). */}
      {definida && (
        <div style={{ background: C.fundo, borderRadius: 12, padding: '11px 14px', marginTop: 14, fontSize: 14.5, fontWeight: 700 }}>
          {fraseDaAula(valor)}
        </div>
      )}
    </div>
  );
}

/** O que é importante num trabalho sobre o manual, logo à vista (Rosa, out/2026). */
function AvisoDoTrabalho({ plano, triagem }: { plano: PlanoAula; triagem: TriagemAula }) {
  const alunos = getAlunos().filter(a => a.turmaId === plano.turmaId && a.ativo !== false);
  const grupos = triagem.modo === 'grupo' ? gruposDaAula(plano.id) : [];
  const emGrupo = new Set(grupos.flatMap(g => g.membros.map(m => m.alunoId)));
  const semGrupo = alunos.filter(a => !emGrupo.has(a.id));
  const linhas: { ok: boolean; texto: string }[] = [];
  if (triagem.modo === 'grupo') {
    linhas.push({ ok: grupos.length > 0 && semGrupo.length === 0,
      texto: grupos.length ? `Grupos: ${grupos.length} formados · ${semGrupo.length ? `${semGrupo.length} alunos ainda sem grupo` : 'todos os alunos têm grupo'}`
        : 'Grupos: os alunos formam-nos na aplicação (separador «Grupos»)' });
    linhas.push({ ok: true, texto: 'Tema: cada grupo escolhe, na autoavaliação, o seu conteúdo de entre todos os do manual' });
  } else {
    linhas.push({ ok: true, texto: 'Tema: cada aluno escolhe, na autoavaliação, o seu conteúdo de entre todos os do manual' });
  }
  const f = triagem.formatos || [];
  if (faseDoTrabalho(triagem) === 'preparar') {
    linhas.push({ ok: true, texto: 'Hoje é a preparação: o aluno avalia-se no que já sabe do tema, na pesquisa, no material e no tempo da aula — não na apresentação, que ainda não aconteceu' });
    linhas.push({ ok: f.length > 0, texto: f.length ? `Vai ser apresentado: ${f.map(x => TEXTO_FORMATO[x].toLowerCase()).join(', ')} (avalia-se na aula em que se apresenta)`
      : 'Escolhe acima como vai ser apresentado' });
  } else {
    linhas.push({ ok: f.length > 0, texto: f.length ? `Hoje apresentam: ${f.map(x => TEXTO_FORMATO[x].toLowerCase()).join(', ')} — o aluno avalia-se em cada um${f.includes('oral') ? ', incluindo a defesa do tema' : ''}`
      : 'Escolhe acima como se apresenta o trabalho' });
  }
  return (
    <div style={{ background: C.azulP, borderRadius: 10, padding: '10px 14px', fontSize: 14, lineHeight: 1.55 }}>
      {linhas.map((l, i) => (
        <div key={i}><b style={{ color: l.ok ? C.verde : C.ambar }}>{l.ok ? '✓' : '!'}</b> {l.texto}</div>
      ))}
    </div>
  );
}

// ── 3. O que se avalia — e o telemóvel do aluno ───────────────

function anoDaTurma(turmaId: string): number {
  return getAlunos().find(a => a.turmaId === turmaId && a.ativo !== false)?.ano ?? 1;
}

export function oQueOAlunoVe(plano: PlanoAula) {
  const fichas = getFichasProducao().filter(f => (plano.fichasIds || []).includes(f.id));
  const ctx = contextoDoPlano(plano);
  return ecrasDoAluno(plano, fichas, ctx, perguntaCODaAula(plano.id), perguntaCRDaAula(plano.id), anoDaTurma(plano.turmaId));
}

export function PassoOQueSeAvalia({ plano }: { plano: PlanoAula }) {
  const cart = useCartao();
  // Sem o tipo de aula escolhido, não se mostra avaliação nenhuma: era
  // adivinhada (uma teórica aparecia «só atitudes, 100%»).
  if (!triagemDoPlano(plano)) return (
    <div style={cart}>
      <CabecalhoPasso n={3} titulo="O que se avalia" sub="Escolhe primeiro, no passo 1, o tipo de aula: é ele que diz o que se avalia." />
    </div>
  );
  const { ecras, fora, regras } = oQueOAlunoVe(plano);
  const pesos = pesosDaAula(plano, regras);
  const corCat: Record<string, string> = { SUB: C.cobre, KNW: C.azul, OBR: C.verde, ATI: C.violeta };
  return (
    <div style={cart}>
      <CabecalhoPasso n={3} titulo="O que se avalia"
        sub="Sai sozinho do 1 e do 2. À direita está o que o aluno vai ver no telemóvel, por esta ordem." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Peso na nota desta aula</div>
          {pesos.map(x => (
            <div key={x.cat}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, marginBottom: 4 }}>
                <span>{x.nome}</span><b>{x.pct}%</b>
              </div>
              <div style={{ height: 10, background: '#EFE7DA', borderRadius: 5 }}>
                <div style={{ width: `${x.pct}%`, height: 10, background: corCat[x.cat], borderRadius: 5 }} />
              </div>
            </div>
          ))}
          {pesos.some(x => x.cat === 'OBR') && (
            <div style={{ fontSize: 13, color: C.suave, lineHeight: 1.5 }}>
              A farda vês à entrada e os registos marcas tu pelo relatório do KitchenFlow — o aluno não responde a isso.
            </div>
          )}
          <div style={{ fontSize: 13, color: C.suave, lineHeight: 1.5 }}>
            Se um aluno chegar sem a farda completa, aparece-lhe também «Cuidado com a apresentação pessoal».
          </div>
        </div>

        {/* O telemóvel do aluno */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: '100%', maxWidth: 360, borderRadius: 34, background: C.tinta, padding: 10, boxSizing: 'border-box' }}>
            <div style={{ borderRadius: 26, background: '#F7F4FB', padding: '18px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.violeta, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Autoavaliação · {ecras.length} pergunta{ecras.length === 1 ? '' : 's'}
              </div>
              {ecras.map((e, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '9px 11px', fontSize: 13.5, lineHeight: 1.4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: C.suave, fontSize: 12.5 }}>{i + 1} · {e.rotulo}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 100,
                      background: CINCO_C[e.c].fundo, color: CINCO_C[e.c].cor }}>{CINCO_C[e.c].sigla}</span>
                  </div>
                  <div style={{ fontWeight: 700 }}>{e.nome}</div>
                  {e.perguntas.map((q, k) => <div key={k} style={{ color: '#4A4139' }}>«{q}»</div>)}
                  <div style={{ fontSize: 12, color: C.suave, marginTop: 2 }}>{e.porque}</div>
                </div>
              ))}
              {ecras.length === 0 && <div style={{ fontSize: 13.5, color: C.suave }}>Ainda não há nada para o aluno responder.</div>}
            </div>
          </div>
          {fora.length > 0 && (
            <div style={{ width: '100%', maxWidth: 360, boxSizing: 'border-box', background: C.fundo, borderRadius: 12,
              padding: '10px 13px', fontSize: 13.5, lineHeight: 1.5 }}>
              <b>Não se pergunta hoje, e porquê</b>
              {fora.map((f, i) => <div key={i}>{f.nome} — <span style={{ color: C.suave }}>{f.motivo}</span></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 4. Enviar aos alunos ──────────────────────────────────────

interface EnvioRegistado { em: string; triagem?: TriagemAula | null; ecras: string[]; fichas: string[] }

function fotografia(plano: PlanoAula): EnvioRegistado {
  return {
    em: new Date().toISOString(),
    triagem: triagemDoPlano(plano),
    ecras: resumoParaComparar(oQueOAlunoVe(plano).ecras),
    fichas: [...(plano.fichasIds || [])],
  };
}

function diferencas(antes: EnvioRegistado, agora: EnvioRegistado): { sinal: '+' | '−' | '~'; texto: string }[] {
  const out: { sinal: '+' | '−' | '~'; texto: string }[] = [];
  const a = antes.triagem, b = agora.triagem;
  if (b && (!a || a.onde !== b.onde)) out.push({ sinal: '~', texto: `Onde é: ${a ? `«${TEXTO_ONDE[a.onde]}» → ` : ''}«${TEXTO_ONDE[b.onde]}»` });
  if (b && (!a || a.cozinham !== b.cozinham)) out.push({ sinal: '~', texto: `Cozinham: ${a ? `«${a.cozinham ? 'Sim' : 'Não'}» → ` : ''}«${b.cozinham ? 'Sim' : 'Não'}»` });
  if (b && (!a || a.trabalho !== b.trabalho)) out.push({ sinal: '~', texto: `Como trabalham: ${a ? `«${TEXTO_TRABALHO[a.trabalho]}» → ` : ''}«${TEXTO_TRABALHO[b.trabalho]}»` });
  if (b && (!a || a.servico !== b.servico)) out.push({ sinal: '~', texto: `Serviço: «${b.servico ? 'Sim' : 'Não'}»` });
  const nomeFicha = (id: string) => getFichasProducao().find(f => f.id === id)?.nomePrato || 'ficha';
  agora.fichas.filter(f => !antes.fichas.includes(f)).forEach(f => out.push({ sinal: '+', texto: `Ficha «${nomeFicha(f)}»` }));
  antes.fichas.filter(f => !agora.fichas.includes(f)).forEach(f => out.push({ sinal: '−', texto: `Ficha «${nomeFicha(f)}» (tiraste)` }));
  agora.ecras.filter(e => !antes.ecras.includes(e)).forEach(e => out.push({ sinal: '+', texto: `Entra: ${e}` }));
  antes.ecras.filter(e => !agora.ecras.includes(e)).forEach(e => out.push({ sinal: '−', texto: `Sai: ${e}` }));
  return out;
}

/** Ao publicar: o que os alunos recebem fica registado, para depois se ver o que mudou. */
export function registarVersaoEnviada(planoId: string): void {
  const plano = getPlanosAula().find(x => x.id === planoId);
  if (plano) try { anotarNoPlano(planoId, { enviadoAosAlunos: fotografia(plano) }); } catch { /* */ }
}

const hora = (iso: string) => new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function PassoEnviar({ plano, onPlanoActualizado }: { plano: PlanoAula; onPlanoActualizado: (p: PlanoAula) => void }) {
  const p: any = plano;
  const publicado = plano.estado === 'publicado';
  const registado: EnvioRegistado | undefined = p.enviadoAosAlunos;
  const agora = fotografia(plano);
  const mudou = registado ? diferencas(registado, agora) : [];
  // Os que já responderam (às perguntas que tinham antes destas alterações).
  const responderam = new Set(getSelecoes().filter(s => s.planoAulaId === plano.id).map(s => s.alunoId)).size;
  const [pedirOutraVez, setPedirOutraVez] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const cart = useCartao(mudou.length ? { border: `2px solid ${C.ambarL}` } : {});

  function enviar() {
    const atual: any = getPlanosAula().find(x => x.id === plano.id) || plano;
    addOrUpdatePlanoAula({ ...atual, enviadoAosAlunos: fotografia(atual) });
    if (registado && mudou.length && pedirOutraVez && responderam > 0) pedirNovaAutoavaliacao(plano.id);
    onPlanoActualizado(getPlanosAula().find(x => x.id === plano.id) || atual);
    setEnviado(true);
  }

  return (
    <div style={cart}>
      <CabecalhoPasso n={4} titulo="Enviar aos alunos"
        sub={!publicado ? 'Os alunos ainda não veem esta aula: publica-a no botão «Publicar».'
          : registado ? `O que mudou desde o último envio (${hora(registado.em)})` : 'O que os alunos têm'} />
      {/* Publicado antes de haver este registo: ainda não se sabe o que os alunos têm. */}
      {publicado && !registado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14.5 }}>
          <span style={{ flex: '1 1 260px', color: C.suave }}>
            Ainda não há registo do que os alunos receberam. Envia a versão atual: a partir daí, o que mudares aparece aqui.
          </span>
          <button onClick={enviar} style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: 700, padding: '10px 16px',
            borderRadius: 10, border: 'none', background: C.cobre, color: '#fff', cursor: 'pointer' }}>Enviar aos alunos</button>
        </div>
      )}
      {publicado && registado && (mudou.length === 0 ? (
        <div style={{ fontSize: 14.5, color: C.verde, fontWeight: 700 }}>
          ✓ Os alunos têm a versão atual{registado ? ` (enviada em ${hora(registado.em)})` : ''}.
          {enviado && <span style={{ fontWeight: 500, color: C.suave }}> Espera até aparecer «Chegou» no topo do plano.</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14.5 }}>
            {mudou.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <b style={{ width: 16, color: d.sinal === '+' ? C.azul : d.sinal === '−' ? C.vinho : C.ambar }}>{d.sinal}</b>
                <span>{d.texto}</span>
              </div>
            ))}
          </div>
          {responderam > 0 && (
            <div style={{ background: C.ambarP, borderRadius: 12, padding: '11px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14.5, color: '#5C3A08' }}>
                <b>{responderam} aluno{responderam === 1 ? ' já respondeu' : 's já responderam'} às perguntas antigas.</b> A nota que já
                deste continua a contar até validares a nova.
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={pedirOutraVez} onChange={e => setPedirOutraVez(e.target.checked)}
                  style={{ width: 19, height: 19 }} />
                Pedir {responderam === 1 ? 'a este aluno que responda' : `a estes ${responderam} que respondam`} outra vez
              </label>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={enviar} style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 700, padding: '12px 20px',
              borderRadius: 11, border: 'none', background: C.cobre, color: '#fff', cursor: 'pointer' }}>
              Enviar alterações aos alunos
            </button>
            <span style={{ fontSize: 13.5, color: C.suave }}>Depois de enviar, espera até aparecer «Chegou» no topo do plano.</span>
          </div>
        </div>
      ))}
      <EstadoDaTurma plano={plano} onPlanoActualizado={onPlanoActualizado} />
    </div>
  );
}

/** Quem já se avaliou, quem falta, quem está validado, e se as presenças contam. */
function EstadoDaTurma({ plano, onPlanoActualizado }: { plano: PlanoAula; onPlanoActualizado: (p: PlanoAula) => void }) {
  const p: any = plano;
  const estados = estadoDaTurmaNaAula(plano.id, plano.turmaId);
  const veio = estados.filter(e => e.entrou);
  const avaliaram = veio.filter(e => e.autoavaliou);
  const faltamAvaliar = veio.filter(e => !e.autoavaliou);
  const validados = estados.filter(e => e.validado);
  const porValidar = estados.filter(e => e.autoavaliou && !e.validado);
  const naoVieram = estados.filter(e => !e.entrou);
  const contam = p.contaAssiduidade !== false;
  const nomes = (l: typeof estados) => l.map(e => e.nome.split(' ')[0] + (e.nome.split(' ').length > 1 ? ' ' + e.nome.split(' ').slice(-1)[0] : '')).join(', ');
  const linha = (rotulo: string, n: number, quem: string, cor = C.tinta) => (
    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
      <b style={{ color: cor }}>{rotulo}: {n}</b>{quem && <span style={{ color: C.suave }}> — {quem}</span>}
    </div>
  );
  return (
    <div style={{ borderTop: `1px solid ${C.linha}`, marginTop: 16, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>A turma nesta aula</span>
        <span style={{ fontSize: 13.5 }}>As faltas e os atrasos contam para a assiduidade?</span>
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => {
              const atual: any = getPlanosAula().find(x => x.id === plano.id) || plano;
              addOrUpdatePlanoAula({ ...atual, contaAssiduidade: v });
              onPlanoActualizado(getPlanosAula().find(x => x.id === plano.id) || atual);
            }}
            style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${C.cobre}`, background: contam === v ? C.cobre : '#fff', color: contam === v ? '#fff' : C.cobre }}>
            {v ? 'Sim' : 'Não'}
          </button>
        ))}
      </div>
      {linha('Entraram na aula', veio.length, '')}
      {linha('Já se avaliaram', avaliaram.length, '', C.verde)}
      {linha('Falta avaliarem-se', faltamAvaliar.length, nomes(faltamAvaliar), faltamAvaliar.length ? C.ambar : C.tinta)}
      {linha('Por validar', porValidar.length, nomes(porValidar), porValidar.length ? C.ambar : C.tinta)}
      {linha('Validados', validados.length, '', C.verde)}
      {linha('Não entraram', naoVieram.length, nomes(naoVieram))}
    </div>
  );
}
