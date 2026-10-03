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
  perguntaCODaAula, perguntaCRDaAula, pedirNovaAutoavaliacao, estadoDaTurmaNaAula, anotarNoPlano, gruposDaAula, alunosDoPlano, atitudesNoPlanoDaTurma,
} from '../backend';
import {
  triagemDoPlano, tipoDaTriagem, obrigatoriasDaTriagem,
  TEXTO_ONDE, TEXTO_TRABALHO, TEXTO_TIPO, EXPLICA_TIPO, CINCO_C, tipoDe, TEXTO_MODO, TEXTO_FORMATO, escolheTema,
  FASES, NOME_FASE, fasesDoTrabalho, faseSeguinte,
  type TriagemAula, type OndeAula, type TrabalhoAula, type TipoAula,
} from '../contextoAula';
import { ecrasDoAluno, pesosDaAula, resumoParaComparar } from '../autoavaliacaoDaAula';
import { conhecimentosDaAula } from '../compatECL';
import { sumarioDoPlano } from '../sumarioAutomatico';
import { capituloDoCampo, rotuloConteudo } from '../bancoManuais';

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
    // O que se deduz (Rosa, out/2026: não perguntar o que já se sabe).
    // Teórica: na sala; a turma toda se é o professor a dar a matéria.
    if (('tipo' in parcial || 'modo' in parcial) && nova.tipo === 'teorico') {
      if (nova.onde === 'cozinha') nova.onde = 'sala';
      nova.trabalho = nova.modo === 'grupo' ? 'grupos' : nova.modo === 'individual' ? 'individual' : 'turma';
    }
    // O modo do trabalho decide como trabalham (as perguntas de grupo dependem disto).
    if (parcial.modo === 'grupo') nova.trabalho = 'grupos';
    if (parcial.modo === 'individual') nova.trabalho = 'individual';
    if (nova.tipo === 'atitudinal') { delete nova.modo; delete nova.formatos; delete nova.fase; delete nova.fases; delete nova.continuaDe; }
    if (!escolheTema(nova)) { delete nova.fases; delete nova.continuaDe; }
    // Um trabalho novo começa pela investigação.
    else if (!nova.fases?.length && !nova.fase) nova.fases = ['investigacao'];
    if (nova.fases && !nova.cozinham) nova.fases = nova.fases.filter(f => f !== 'apres_pratico');
    if (nova.fases && !nova.fases.length) nova.fases = ['investigacao'];
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
    // Passou a trabalho com tema: o conteúdo que vinha marcado sozinho (o
    // próximo do manual) deixava os alunos com um só tema. Sem nada marcado,
    // escolhem entre todos; o professor marca, se quiser restringir.
    if ('modo' in parcial && escolheTema(nova) && !escolheTema(valor)) novo.conhecimentosProf = [];
    // Trabalho de grupo: os alunos formam os grupos na aplicação.
    if (nova.modo === 'grupo' && !novo.gruposAlunos?.ativo) novo.gruposAlunos = { ativo: true, tamanho: novo.gruposAlunos?.tamanho || 4 };
    addOrUpdatePlanoAula(novo);
    onPlanoActualizado(getPlanosAula().find(x => x.id === plano.id) || novo);
  }

  // O trabalho da aula anterior (mesma turma e unidade), para «continua?».
  const anterior: any = (() => {
    const dia = (x: any) => String(x.data || '').slice(0, 10);
    const meu = dia(p) + String(p.criadoEm || '');
    return getPlanosAula()
      .filter((x: any) => x.id !== plano.id && x.turmaId === plano.turmaId && x.ucId === p.ucId && x.estado !== 'arquivado'
        && escolheTema(triagemDoPlano(x)) && dia(x) + String(x.criadoEm || '') < meu)
      .sort((a: any, b: any) => (dia(b) + String(b.criadoEm || '')).localeCompare(dia(a) + String(a.criadoEm || '')))[0];
  })();
  const triAnt = anterior ? triagemDoPlano(anterior) : null;
  const ehTrabalho = escolheTema(valor);
  const fases = fasesDoTrabalho(valor);
  const [outraSituacao, setOutraSituacao] = useState(false);
  const dataCurta = (iso: string) => `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}`;
  const fasesPossiveis = FASES.filter(f => !f.so || valor.cozinham);
  const Q = ({ n, titulo, ajuda, children }: { n: number; titulo: string; ajuda?: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.fundo, color: C.cobre, fontWeight: 800, fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{titulo}</div>
        {ajuda && <div style={{ fontSize: 13, color: C.suave, marginTop: -4 }}>{ajuda}</div>}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{children}</div>
      </div>
    </div>
  );
  // Recomeçar (Rosa, out/2026): apaga as escolhas e volta à 1.ª pergunta.
  // Ficam a data, as horas, a turma, a unidade e as fichas.
  function recomecar() {
    const responderam = new Set(getSelecoes().filter(s => s.planoAulaId === plano.id).map(s => s.alunoId)).size;
    if (!confirm('Recomeçar este plano do zero?\n\nApaga o tipo de aula, a forma de trabalhar, as fases, os conteúdos e o sumário. '
      + 'Ficam a data, as horas, a turma, a unidade e as fichas.'
      + (responderam ? `\n\nAtenção: ${responderam} aluno${responderam === 1 ? ' já respondeu' : 's já responderam'} à autoavaliação desta aula.` : ''))) return;
    const atual: any = getPlanosAula().find(x => x.id === plano.id) || plano;
    const novo: any = { ...atual };
    ['triagemAula', 'sumario', 'conhecimentosProf', 'compAdicionadas', 'compRemovidas', 'perguntaCO', 'perguntaCR', 'trabalhos']
      .forEach(k => { delete novo[k]; });
    addOrUpdatePlanoAula(novo);
    onPlanoActualizado(getPlanosAula().find(x => x.id === plano.id) || novo);
  }
  let n = 1;
  const ModoOpcoes = ({ semProfessor }: { semProfessor?: boolean }) => (<>
    {!semProfessor && <Opcao ativo={!!definida && !ehTrabalho} onClick={() => gravar({ modo: 'professor' })}>Dou eu a matéria</Opcao>}
    {semProfessor && <Opcao ativo={!!definida && !ehTrabalho} onClick={() => gravar({ modo: undefined })}>Não</Opcao>}
    <Opcao ativo={!!definida && valor.modo === 'grupo'} onClick={() => gravar({ modo: 'grupo' })}>Trabalho de grupo (cada grupo o seu tema)</Opcao>
    <Opcao ativo={!!definida && valor.modo === 'individual'} onClick={() => gravar({ modo: 'individual' })}>Trabalho individual (cada aluno o seu tema)</Opcao>
  </>);

  return (
    <div style={cart}>
      <CabecalhoPasso n={1} titulo="Como é esta aula?"
        sub="Uma pergunta de cada vez: só aparecem as que fazem falta. O resto a aplicação deduz." />
      {!definida && (
        <div style={{ background: C.ambarP, color: '#5C3A08', borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 14, lineHeight: 1.5 }}>
          <b>Escolhe o tipo de aula.</b> Sem ele, a aplicação não sabe o que avaliar nem se há farda e higiene e
          segurança alimentar — e não adivinha.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 1. O tipo de aula: decide a farda e a higiene e segurança alimentar. */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.fundo, color: C.cobre, fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n++}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 7 }}>{(plano as any).tipoEvento ? 'Que tipo de atividade é?' : 'Que tipo de aula é?'}</div>
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
          </div>
        </div>

        {definida && (tipo === 'teorico' || tipo === 'misto') && (
          <Q n={n++} titulo={tipo === 'misto' ? 'Como se trabalha a parte teórica?' : 'Como se trabalha?'}>
            <ModoOpcoes />
          </Q>
        )}
        {definida && (tipo === 'pratico' || tipo === 'misto') && (<>
          <Q n={n++} titulo="Na cozinha, como trabalham?">
            <Opcao ativo={valor.trabalho === 'grupos'} onClick={() => gravar({ trabalho: 'grupos' })}>Em grupos (brigadas)</Opcao>
            <Opcao ativo={valor.trabalho === 'individual'} onClick={() => gravar({ trabalho: 'individual' })}>Cada um sozinho</Opcao>
          </Q>
          <Q n={n++} titulo="Há serviço a clientes?">
            <Opcao ativo={valor.servico} onClick={() => gravar({ servico: true })}>Sim (almoço, evento)</Opcao>
            <Opcao ativo={!valor.servico} onClick={() => gravar({ servico: false })}>Não</Opcao>
          </Q>
          {tipo === 'pratico' && (
            <Q n={n++} titulo="Faz parte de um trabalho com tema (um projeto em várias aulas)?">
              <ModoOpcoes semProfessor />
            </Q>
          )}
        </>)}
        {definida && tipo === 'atitudinal' && (<>
          <Q n={n++} titulo="Onde é?">
            <Opcao ativo={valor.onde !== 'fora'} onClick={() => gravar({ onde: 'sala' })}>Na escola</Opcao>
            <Opcao ativo={valor.onde === 'fora'} onClick={() => gravar({ onde: 'fora' })}>Fora da escola (visita, evento)</Opcao>
          </Q>
          <Q n={n++} titulo="Avalia-se a farda?">
            <Opcao ativo={ob.farda} onClick={() => gravar({ farda: true })}>Sim</Opcao>
            <Opcao ativo={!ob.farda} onClick={() => gravar({ farda: false })}>Não</Opcao>
          </Q>
        </>)}

        {/* Um trabalho com tema: continua o da aula anterior? Em que fase está? */}
        {definida && ehTrabalho && anterior && triAnt && (
          <Q n={n++} titulo={`Continua o trabalho da aula de ${dataCurta(anterior.data)}?`}
            ajuda={`Nessa aula: ${fasesDoTrabalho(triAnt).map(f => NOME_FASE[f].replace(/ \(.*\)$/, '').toLowerCase()).join(', ')}.`}>
            <Opcao ativo={valor.continuaDe === anterior.id} onClick={() => {
                const seguinte = faseSeguinte(fasesDoTrabalho(triAnt));
                gravar({ continuaDe: anterior.id, modo: triAnt.modo,
                  fases: valor.continuaDe === anterior.id ? fases : [seguinte && (!FASES.find(f => f.id === seguinte)?.so || valor.cozinham) ? seguinte : fasesDoTrabalho(triAnt).slice(-1)[0]] });
              }}>Sim, continua</Opcao>
            <Opcao ativo={valor.continuaDe === ''} onClick={() => gravar({ continuaDe: '' })}>Não, é um trabalho novo</Opcao>
          </Q>
        )}
        {definida && ehTrabalho && (
          <Q n={n++} titulo="Em que fase está hoje? (pode ser mais do que uma)"
            ajuda="O aluno avalia-se só no que faz nesta fase: na investigação não se avalia a apresentação oral.">
            {fasesPossiveis.map(f => {
              const on = fases.includes(f.id);
              return <Opcao key={f.id} ativo={on} onClick={() => {
                const novas = on ? fases.filter(x => x !== f.id) : [...fases, f.id];
                if (novas.length) gravar({ fases: FASES.map(x => x.id).filter(x => novas.includes(x)) });
              }}>{f.nome}</Opcao>;
            })}
          </Q>
        )}
      </div>

      {/* O que a aplicação deduziu — muda-se só nas exceções. */}
      {definida && (
        <div style={{ marginTop: 14, fontSize: 13.5, color: C.suave, lineHeight: 1.55 }}>
          <b style={{ color: C.tinta }}>Deduzido:</b> {TEXTO_ONDE[valor.onde].toLowerCase()} · {TEXTO_TRABALHO[valor.trabalho].toLowerCase()}
          {' · '}farda: {ob.farda ? 'avalia-se' : 'não'} · higiene e segurança alimentar: {ob.registos ? 'avalia-se' : 'não'}
          {' · '}<button onClick={() => setOutraSituacao(v => !v)} style={{ background: 'none', border: 'none', padding: 0, color: C.cobre,
            fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13.5 }}>
            {outraSituacao ? 'fechar' : 'não é assim? mudar'}</button>
        </div>
      )}
      {definida && outraSituacao && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px 22px', marginTop: 10,
          background: C.fundo, borderRadius: 12, padding: '12px 14px' }}>
          <Pergunta titulo="Onde é?">
            {(['cozinha', 'sala', 'fora'] as OndeAula[]).map(o => (
              <Opcao key={o} ativo={valor.onde === o} onClick={() => gravar({ onde: o })}>{TEXTO_ONDE[o]}</Opcao>
            ))}
          </Pergunta>
          <Pergunta titulo="Como trabalham?">
            {(['grupos', 'individual', 'turma'] as TrabalhoAula[]).map(t => (
              <Opcao key={t} ativo={valor.trabalho === t} onClick={() => gravar({ trabalho: t })}>{TEXTO_TRABALHO[t]}</Opcao>
            ))}
          </Pergunta>
        </div>
      )}

      {definida && <ResultadoDaAula plano={plano} triagem={valor} />}
      {definida && (
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button onClick={recomecar} style={{ background: 'none', border: `1px solid ${C.linha}`, borderRadius: 9, padding: '7px 12px',
            color: C.vinho, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↺ Recomeçar este plano do zero
          </button>
        </div>
      )}
    </div>
  );
}

/** O resultado da triagem, num cartão só (Rosa, out/2026): o professor vê
 *  logo o sumário, o que o aluno vai responder e como conta para a nota. */
function ResultadoDaAula({ plano, triagem }: { plano: PlanoAula; triagem: TriagemAula }) {
  let ecras: { rotulo: string; nome: string }[] = [], pesos: { nome: string; pct: number }[] = [];
  try {
    const r = oQueOAlunoVe(plano);
    ecras = r.ecras;
    pesos = pesosDaAula(plano, r.regras).filter(x => x.pct > 0);
  } catch { /* */ }
  const fichas = getFichasProducao().filter(f => (plano.fichasIds || []).includes(f.id));
  const alunos = alunosDoPlano(plano);
  const grupos = triagem.modo === 'grupo' ? gruposDaAula(plano.id) : [];
  const emGrupo = new Set(grupos.flatMap(g => g.membros.map(m => m.alunoId)));
  const linha = (rot: string, txt: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5 }}>
      <b style={{ width: 120, flexShrink: 0, color: C.azul }}>{rot}</b><span style={{ flex: 1, minWidth: 0 }}>{txt}</span>
    </div>
  );
  return (
    <div style={{ marginTop: 16, background: C.azulP, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.azul }}>Ficou assim</div>
      {linha((plano as any).tipoEvento ? 'A atividade' : 'O plano de aula', fraseDaAula(triagem) + (escolheTema(triagem) ? ` ${triagem.modo === 'grupo' ? 'Trabalho de grupo' : 'Trabalho individual'}: ${fasesDoTrabalho(triagem).map(f => NOME_FASE[f].toLowerCase()).join(', ')}.` : ''))}
      {linha('Sumário', <span style={{ whiteSpace: 'pre-line' }}>{sumarioDoPlano(plano, fichas)}</span>)}
      {linha(`O aluno responde`, ecras.length ? `${ecras.length}: ${ecras.map(e => e.nome).join(' → ')}` : '—')}
      {linha('Conta para a nota', pesos.map(x => `${x.nome} ${x.pct}%`).join(' · ') || '—')}
      {escolheTema(triagem) && linha('Tema', triagem.modo === 'grupo'
        ? `cada grupo escolhe o seu, na autoavaliação.${grupos.length ? ` Grupos: ${grupos.length}; ${alunos.filter(a => !emGrupo.has(a.id)).length} alunos sem grupo.` : ' Os alunos formam os grupos na aplicação.'}`
        : 'cada aluno escolhe o seu, na autoavaliação' + (triagem.continuaDe ? ' (vem já escolhido o da aula anterior).' : '.'))}
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
  return ecrasDoAluno(plano, fichas, ctx, perguntaCODaAula(plano.id), perguntaCRDaAula(plano.id), anoDaTurma(plano.turmaId), atitudesNoPlanoDaTurma(plano));
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

// (out/2026) Também o dia, as horas, a unidade, o título, o tipo de aula, o
// manual, o sumário, as fases, as competências e as faltas: mudava-se um
// plano publicado e a aplicação dizia «os alunos têm a versão atual».
interface EnvioRegistado {
  em: string; triagem?: TriagemAula | null; ecras: string[]; fichas: string[];
  quando?: string; ucId?: string; titulo?: string; tipo?: string; manual?: string[]; sumario?: string;
  competencias?: string[]; faltas?: boolean;
  grupos?: string;
}

function fotografia(plano: PlanoAula): EnvioRegistado {
  const p: any = plano;
  let sumario = '';
  try { sumario = sumarioDoPlano(plano, getFichasProducao().filter(f => (plano.fichasIds || []).includes(f.id))); } catch { /* */ }
  return {
    em: new Date().toISOString(),
    triagem: triagemDoPlano(plano),
    ecras: resumoParaComparar(oQueOAlunoVe(plano).ecras),
    fichas: [...(plano.fichasIds || [])],
    quando: `${String(plano.data || '').slice(0, 10)} ${p.horaInicio || ''}-${p.horaFim || ''}`,
    ucId: plano.ucId || '',
    titulo: plano.titulo || '',
    tipo: String(p.tipoPlanAula || ''),
    manual: conhecimentosDaAula(plano).map(k => k.id).sort(),
    sumario,
    competencias: [...(p.compRemovidas || []).map((x: string) => '-' + x), ...(p.compAdicionadas || []).map((x: string) => '+' + x)].sort(),
    faltas: p.contaAssiduidade !== false,
    grupos: textoGrupos(plano),
  };
}
/** Os grupos formados pelos alunos, em texto (para o «o que mudou»). */
function textoGrupos(plano: PlanoAula): string {
  const g = (plano as any).gruposAlunos;
  return g?.ativo ? `Ligados (até ${Number(g.tamanho) || 4} por grupo)` : 'Desligados';
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
  // Só se compara o que o registo antigo já guardava (os de antes de out/2026 não tinham estes campos).
  const igual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
  if (antes.quando !== undefined && antes.quando !== agora.quando) out.push({ sinal: '~', texto: `Dia ou horas: «${antes.quando}» → «${agora.quando}»` });
  if (antes.ucId !== undefined && antes.ucId !== agora.ucId) out.push({ sinal: '~', texto: `Unidade: «${antes.ucId}» → «${agora.ucId}»` });
  if (antes.titulo !== undefined && antes.titulo !== agora.titulo) out.push({ sinal: '~', texto: `Título: «${agora.titulo}»` });
  if (antes.tipo !== undefined && antes.tipo !== agora.tipo) out.push({ sinal: '~', texto: 'Tipo de aula' });
  if (antes.manual !== undefined && !igual(antes.manual, agora.manual)) {
    const mais = (agora.manual || []).filter(x => !(antes.manual || []).includes(x)).length;
    const menos = (antes.manual || []).filter(x => !(agora.manual || []).includes(x)).length;
    out.push({ sinal: '~', texto: `Conteúdos do manual${mais ? ` (+${mais})` : ''}${menos ? ` (−${menos})` : ''}` });
  }
  if (antes.sumario !== undefined && antes.sumario !== agora.sumario) out.push({ sinal: '~', texto: 'Sumário' });
  if (antes.competencias !== undefined && !igual(antes.competencias, agora.competencias)) out.push({ sinal: '~', texto: 'Competências (tiradas ou repostas)' });
  if (antes.faltas !== undefined && antes.faltas !== agora.faltas) out.push({ sinal: '~', texto: `Faltas e atrasos: ${agora.faltas ? 'contam' : 'não contam'}` });
  // Os grupos mudam-se num sítio à parte: o professor tem de o ver aqui (Rosa, out/2026).
  if ((antes.grupos ?? 'Desligados') !== agora.grupos) out.push({ sinal: '~', texto: `Grupos formados pelos alunos: «${antes.grupos ?? 'Desligados'}» → «${agora.grupos}»` });
  return out;
}

/** Regra (Rosa, out/2026): só se pede aos alunos que respondam outra vez
 *  quando muda AQUILO A QUE RESPONDEM — as perguntas, o tipo de aula, os
 *  conteúdos do manual, as competências, as fichas ou como é a aula. O dia,
 *  as horas, o título e o sumário chegam-lhes sozinhos e não mudam a resposta. */
export function mudaramAsPerguntas(antes: EnvioRegistado, agora: EnvioRegistado): boolean {
  const igual = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const t = (x: any) => x ? { onde: x.onde, cozinham: x.cozinham, trabalho: x.trabalho, servico: x.servico } : null;
  if (!igual([...antes.ecras].sort(), [...agora.ecras].sort())) return true;
  if (!igual([...antes.fichas].sort(), [...agora.fichas].sort())) return true;
  if (antes.triagem && !igual(t(antes.triagem), t(agora.triagem))) return true;
  if (antes.tipo !== undefined && antes.tipo !== agora.tipo) return true;
  if (antes.manual !== undefined && !igual(antes.manual, agora.manual)) return true;
  if (antes.competencias !== undefined && !igual(antes.competencias, agora.competencias)) return true;
  return false;
}

/** O estado todo do plano, como fica, para o professor confirmar antes de
 *  finalizar as alterações (Rosa, out/2026). As mudanças de agora vêm em cima. */
export function EstadoDoPlano({ plano, mudancas }: { plano: PlanoAula; mudancas: { sinal: string; texto: string }[] }) {
  const p: any = plano;
  const f = fotografia(plano);
  const tri = triagemDoPlano(plano);
  const fichas = getFichasProducao().filter(x => (plano.fichasIds || []).includes(x.id)).map(x => x.nomePrato);
  const caps = [...new Set(conhecimentosDaAula(plano).map(k => capituloDoCampo(k.id)).filter(Boolean)
    .map(c => `${c!.capitulo.n}. ${rotuloConteudo(c!.capitulo)}`))];
  const dia = String(plano.data || '').slice(0, 10).split('-').reverse().join('/');
  const linha = (rotulo: string, valor: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(26,23,20,0.08)', fontSize: 14 }}>
      <div style={{ width: 130, flexShrink: 0, color: 'rgba(26,23,20,0.55)', fontWeight: 600 }}>{rotulo}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{valor}</div>
    </div>
  );
  return (
    <div>
      {mudancas.length > 0 && (
        <div style={{ background: '#FDF0E6', border: '1.5px solid #e8c98f', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#7A3E0C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>O que mudaste agora</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
            {mudancas.map((d, i) => <li key={i}>{d.texto}</li>)}
          </ul>
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(26,23,20,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>O plano como fica</div>
      {linha('Aula', `${plano.titulo || '—'}`)}
      {linha('Quando', `${dia} · ${p.horaInicio || '?'}–${p.horaFim || '?'}`)}
      {linha('Unidade', plano.ucId || '—')}
      {linha('Tipo de aula', f.tipo ? (TEXTO_TIPO as any)[f.tipo] || f.tipo : '—')}
      {tri && linha('Como é', `${TEXTO_ONDE[tri.onde]} · ${tri.cozinham ? 'cozinham' : 'não cozinham'} · ${TEXTO_TRABALHO[tri.trabalho]}`)}
      {tri?.modo && linha('Trabalho', TEXTO_MODO[tri.modo])}
      {caps.length > 0 && linha('Conteúdos do manual', caps.length > 6 ? `${caps.length} conteúdos (${caps.slice(0, 3).join(' · ')}…)` : caps.join(' · '))}
      {linha('Fichas', fichas.length ? fichas.join(' · ') : 'nenhuma')}
      {linha('Faltas e atrasos', f.faltas ? 'contam' : 'não contam')}
      {linha('Grupos', (() => {
        const gs = gruposDaAula(plano.id);
        return <>{f.grupos}{gs.length > 0 && (
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.65)', marginTop: 2 }}>
            {gs.map(g => `${g.nome}: ${g.membros.map(m => String(m.nomeAluno || '').split(' ')[0] || '?').join(', ')}`).join(' · ')}
          </div>)}</>;
      })())}
      {linha('O aluno responde a', `${f.ecras.length} pergunta${f.ecras.length === 1 ? '' : 's'}`)}
      {f.sumario && linha('Sumário', <span style={{ whiteSpace: 'pre-wrap' }}>{f.sumario}</span>)}
    </div>
  );
}

/** Para comparar o plano antes e depois de o mudar (ecrã de editar). */
export const fotografiaDoPlano = (plano: PlanoAula) => fotografia(plano);
export const diferencasEntre = (antes: ReturnType<typeof fotografia>, depois: ReturnType<typeof fotografia>) => diferencas(antes, depois);

/** O que mudou num plano publicado desde o último envio aos alunos (vazio se não mudou ou nunca se enviou). */
export function alteracoesPorEnviar(plano: PlanoAula): { sinal: '+' | '−' | '~'; texto: string }[] {
  const registado: EnvioRegistado | undefined = (plano as any).enviadoAosAlunos;
  if (plano.estado !== 'publicado' || !registado) return [];
  try { return diferencas(registado, fotografia(plano)); } catch { return []; }
}

/** Envia aos alunos a versão atual do plano; se já havia respostas, pede que respondam outra vez. */
export function enviarAlteracoesAosAlunos(planoId: string, pedirOutraVez = true, sabeQueMudou = false): PlanoAula | undefined {
  const atual: any = getPlanosAula().find(x => x.id === planoId);
  if (!atual) return undefined;
  const mudou = sabeQueMudou || alteracoesPorEnviar(atual).length > 0;
  addOrUpdatePlanoAula({ ...atual, enviadoAosAlunos: fotografia(atual) });
  const responderam = new Set(getSelecoes().filter(s => s.planoAulaId === planoId).map(s => s.alunoId)).size;
  if (mudou && pedirOutraVez && responderam > 0) pedirNovaAutoavaliacao(planoId);
  return getPlanosAula().find(x => x.id === planoId);
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
  // Regra (Rosa, out/2026): mudou aquilo a que respondem → respondem outra vez, sempre.
  const pedirOutraVez = !!registado && mudaramAsPerguntas(registado, agora);
  const [enviado, setEnviado] = useState(false);
  const cart = useCartao(mudou.length ? { border: `2px solid ${C.ambarL}` } : {});

  function enviar() {
    const novo = enviarAlteracoesAosAlunos(plano.id, !!registado && pedirOutraVez);
    if (novo) onPlanoActualizado(novo);
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
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                {pedirOutraVez
                  ? `Mudaram as perguntas: ${responderam === 1 ? 'este aluno vai responder' : `estes ${responderam} vão responder`} outra vez.`
                  : 'As perguntas não mudaram: não precisam de responder outra vez.'}
              </div>
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
