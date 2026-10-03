// ============================================================
// Área «Eventos e orçamentos» (Rosa, out/2026)
// ============================================================
// Para os adultos da escola que tratam de eventos, orçamentos, fichas
// técnicas e requisições — sem planos de aula nem alunos. Entram com um
// código comum, no ecrã de entrada.
//
// Pensada para quem não está habituado à aplicação: blocos grandes com
// uma frase a dizer para que servem, letra grande, muito espaço, e um
// botão «← Início» sempre à vista. Usa os ecrãs que já existem (eventos,
// requisição, fichas), não os muda. Os preços estão só para consulta.
// ============================================================
import React, { useMemo, useState } from 'react';
import { EventosECL } from './EventosECL';
import Requisicao from './Requisicao';
import { ProfessorView } from './ProfessorView';
import { getMateriaPrimasBase, getPrecosRevistos } from '../materiasPrimasBase';
import { getMateriasPrimasCustom } from '../backend';

const C = {
  fundo: '#F3F6F5',
  papel: '#FFFFFF',
  tinta: '#1C2B2A',
  suave: '#5B6B69',
  linha: '#DCE5E3',
  acento: '#1F6F6B',       // petróleo — a cor desta área
  acentoSuave: '#E3F0EE',
  quente: '#B5651D',
  quenteSuave: '#FBEFE3',
};

// Uma saudação divertida, com a hora do dia — muda de cada vez que se entra
// (Rosa, out/2026: «podemos saudar de forma divertida»).
const SAUDACOES: Record<'manha' | 'tarde' | 'noite', string[]> = {
  manha: ['Bom dia! Hoje é dia de pôr tudo em ordem ☀️', 'Bom dia! Pronto(a) para mais um dia em grande? 🚀',
    'Bom dia! Vamos fazer magia com os números? ✨', 'Bom dia! Que comece a organização 📋'],
  tarde: ['Boa tarde! Que bom tê-lo(a) por aqui 😊', 'Boa tarde! Vamos organizar coisas bonitas? 🎉',
    'Boa tarde! Mais uma ideia brilhante a caminho? 💡', 'Boa tarde! Contas certas, eventos felizes 🎈'],
  noite: ['Boa noite! Ainda por aqui? Que dedicação 🌙', 'Boa noite! Só mais um orçamento e já está ⭐',
    'Boa noite! Os melhores planos nascem à noite 🌟'],
};
function saudacao(): string {
  const h = new Date().getHours();
  const lista = SAUDACOES[h >= 6 && h < 13 ? 'manha' : h >= 13 && h < 20 ? 'tarde' : 'noite'];
  return lista[Math.floor(Math.random() * lista.length)];
}

type Seccao = 'inicio' | 'eventos' | 'orcamentos' | 'fichas' | 'precos' | 'guia';

const SECCOES: { id: Exclude<Seccao, 'inicio'>; icone: string; titulo: string; frase: string; ajuda: string }[] = [
  { id: 'eventos', icone: '🎪', titulo: 'Eventos',
    frase: 'Organizar um evento, do pedido do cliente ao fecho.',
    ajuda: 'Carregue em «Nova atividade» e depois em «Evento», e responda às perguntas, uma de cada vez. O cartão «Agora» diz sempre o que falta fazer.' },
  { id: 'orcamentos', icone: '🧾', titulo: 'Orçamentos e requisições',
    frase: 'Saber quanto custa e pedir os produtos ao economato.',
    ajuda: 'Escolha as fichas técnicas e o número de pessoas: a aplicação soma os ingredientes e os preços.' },
  { id: 'fichas', icone: '📄', titulo: 'Fichas técnicas',
    frase: 'Ver as receitas da escola e criar fichas novas.',
    ajuda: 'Procure na biblioteca, ou carregue em «+ Nova ficha» para criar uma a partir de uma receita.' },
  { id: 'precos', icone: '🏷️', titulo: 'Preços das matérias-primas',
    frase: 'Consultar os preços que a aplicação usa nas contas.',
    ajuda: 'Só para consulta. Os preços são revistos todos os meses pela coordenação.' },
  { id: 'guia', icone: '📘', titulo: 'Como usar',
    frase: 'O guia, passo a passo, para quem está a começar.',
    ajuda: '' },
];

export function EventosOrcamentos({ nome }: { nome: string }) {
  const [seccao, setSeccao] = useState<Seccao>('inicio');
  const atual = SECCOES.find(s => s.id === seccao);
  const ola = useMemo(() => saudacao(), []);

  return (
    <div style={{ background: C.fundo, minHeight: 'calc(100vh - 58px)', padding: '28px 20px 64px' }}>
      <div style={{ maxWidth: seccao === 'inicio' || seccao === 'guia' || seccao === 'precos' ? 980 : 1180, margin: '0 auto' }}>

        {seccao === 'inicio' ? (
          <>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: C.tinta, lineHeight: 1.2 }}>
              {ola}
            </h1>
            <p style={{ margin: '8px 0 28px', fontSize: 19, color: C.suave }}>O que quer fazer hoje?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 18 }}>
              {SECCOES.map(s => (
                <button key={s.id} onClick={() => setSeccao(s.id)} style={{
                  display: 'flex', gap: 18, alignItems: 'center', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  padding: '26px 24px', minHeight: 132, borderRadius: 20, background: C.papel,
                  border: `1.5px solid ${s.id === 'guia' ? C.quente : C.linha}`, boxShadow: '0 2px 10px rgba(28,43,42,0.06)' }}>
                  <span style={{ fontSize: 44, lineHeight: 1, flexShrink: 0, width: 64, height: 64, borderRadius: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: s.id === 'guia' ? C.quenteSuave : C.acentoSuave }}>{s.icone}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 22, fontWeight: 800, color: s.id === 'guia' ? C.quente : C.acento }}>{s.titulo}</span>
                    <span style={{ display: 'block', fontSize: 16.5, color: C.suave, marginTop: 6, lineHeight: 1.45 }}>{s.frase}</span>
                  </span>
                </button>
              ))}
            </div>
            <p style={{ marginTop: 28, fontSize: 15.5, color: C.suave, lineHeight: 1.6 }}>
              Tudo o que fizer aqui fica guardado e chega aos outros computadores da escola.
              É primeira vez? Comece por <button onClick={() => setSeccao('guia')} style={{ border: 'none', background: 'none', padding: 0,
                color: C.quente, fontWeight: 800, fontSize: 15.5, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Como usar</button>.
            </p>
          </>
        ) : (
          <>
            {/* Barra da secção: voltar ao início, o nome e o que se faz aqui. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 22 }}>
              <button onClick={() => setSeccao('inicio')} style={{ minHeight: 52, padding: '0 22px', borderRadius: 14, cursor: 'pointer',
                border: `1.5px solid ${C.acento}`, background: C.papel, color: C.acento, fontSize: 17, fontWeight: 800, fontFamily: 'inherit' }}>
                ← Início
              </button>
              <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.tinta }}>{atual?.icone} {atual?.titulo}</div>
                {atual?.ajuda && <div style={{ fontSize: 16, color: C.suave, marginTop: 4, lineHeight: 1.5 }}>{atual.ajuda}</div>}
              </div>
            </div>
            <div style={{ background: seccao === 'guia' || seccao === 'precos' ? 'transparent' : C.papel, borderRadius: 20,
              padding: seccao === 'guia' || seccao === 'precos' ? 0 : '18px 16px', border: seccao === 'guia' || seccao === 'precos' ? 'none' : `1px solid ${C.linha}` }}>
              {seccao === 'eventos' && <EventosECL turmaId="" nomeProfessor={nome} semAvaliacao />}
              {seccao === 'orcamentos' && <Requisicao nomeProfessor={nome} turmaId="" />}
              {seccao === 'fichas' && <ProfessorView turmaId="" nomeProfessor={nome} abrirBiblioteca />}
              {seccao === 'precos' && <PrecosConsulta />}
              {seccao === 'guia' && <Guia irPara={setSeccao} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Preços: só para consulta ────────────────────────────────────
/** Os preços das matérias-primas, só para consultar. O mesmo ecrã em
 *  «Eventos e orçamentos», no professor e no aluno (Rosa, out/2026). */
export function PrecosConsulta() {
  const [pesquisa, setPesquisa] = useState('');
  const [categoria, setCategoria] = useState('');
  const revistos = useMemo(() => new Map(getPrecosRevistos().map(p => [p.id, p])), []);
  const todos = useMemo(() => [
    ...getMateriaPrimasBase().map(m => ({ id: m.id, nome: m.nome, categoria: m.categoria, porUn: m.unidadeReceita === 'un',
      precoKg: m.precoKg, precoUn: m.precoUnitario, revisto: revistos.get(m.id)?.atualizadoEm || '', daEscola: false })),
    ...getMateriasPrimasCustom().map(m => ({ id: m.id, nome: m.nome, categoria: m.categoria || 'Outros', porUn: m.unidadeCompra === 'un',
      precoKg: m.precoKg, precoUn: m.precoUnitario, revisto: m.atualizadoEm || '', daEscola: true })),
  ], [revistos]);
  const categorias = useMemo(() => [...new Set(todos.map(t => t.categoria))].sort((a, b) => a.localeCompare(b, 'pt')), [todos]);
  const q = pesquisa.trim().toLowerCase();
  const lista = todos.filter(t => (!categoria || t.categoria === categoria) && (!q || t.nome.toLowerCase().includes(q)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const euro = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',') + ' €';
  const data = (iso: string) => iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const chip = (ativo: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 16px', borderRadius: 21, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 15, fontWeight: 700, border: `1.5px solid ${ativo ? C.acento : C.linha}`, background: ativo ? C.acento : C.papel, color: ativo ? '#fff' : C.tinta });

  return (
    <div>
      <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Procurar um produto (ex.: cenoura, bacalhau, manteiga)"
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 56, padding: '0 18px', borderRadius: 14, border: `1.5px solid ${C.linha}`,
          fontSize: 18, fontFamily: 'inherit', background: C.papel, color: C.tinta }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 18px' }}>
        <button onClick={() => setCategoria('')} style={chip(!categoria)}>Todas ({todos.length})</button>
        {categorias.map(c => <button key={c} onClick={() => setCategoria(c === categoria ? '' : c)} style={chip(c === categoria)}>{c}</button>)}
      </div>
      <div style={{ fontSize: 15, color: C.suave, marginBottom: 10 }}>{lista.length} produto{lista.length === 1 ? '' : 's'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
        {lista.map(t => (
          <div key={t.id} style={{ background: C.papel, borderRadius: 16, padding: '16px 18px', border: `1px solid ${C.linha}` }}>
            <div style={{ fontSize: 17.5, fontWeight: 800, color: C.tinta }}>{t.nome}</div>
            <div style={{ fontSize: 14, color: C.suave, marginTop: 2 }}>{t.categoria}{t.daEscola ? ' · acrescentado por um professor' : ''}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.acento, marginTop: 10 }}>
              {t.porUn ? `${euro(t.precoUn)} / unidade` : `${euro(t.precoKg)} / kg`}
            </div>
            {t.revisto && <div style={{ fontSize: 13.5, color: C.suave, marginTop: 4 }}>Atualizado a {data(t.revisto)}</div>}
          </div>
        ))}
      </div>
      {lista.length === 0 && <div style={{ fontSize: 17, color: C.suave, padding: '24px 0' }}>Não há nenhum produto com esse nome.</div>}
      <p style={{ marginTop: 22, fontSize: 15.5, color: C.suave, lineHeight: 1.6 }}>
        Encontrou um preço errado? Escreva o preço certo na requisição: vale para essa requisição e a coordenação revê-o na
        próxima atualização dos preços.
      </p>
    </div>
  );
}

// ── O guia, passo a passo ───────────────────────────────────────
function Guia({ irPara }: { irPara: (s: Seccao) => void }) {
  const Bloco = ({ icone, titulo, ir, passos, nota }: { icone: string; titulo: string; ir: Seccao; passos: React.ReactNode[]; nota?: React.ReactNode }) => (
    <section style={{ background: C.papel, borderRadius: 20, padding: '24px 24px 22px', border: `1px solid ${C.linha}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, flex: '1 1 260px', fontSize: 23, fontWeight: 800, color: C.tinta }}>{icone} {titulo}</h2>
        <button onClick={() => irPara(ir)} style={{ minHeight: 46, padding: '0 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
          border: 'none', background: C.acento, color: '#fff', fontSize: 16, fontWeight: 800 }}>Abrir →</button>
      </div>
      <ol style={{ margin: 0, paddingLeft: 26, fontSize: 17.5, lineHeight: 1.65, color: C.tinta }}>
        {passos.map((p, i) => <li key={i} style={{ marginBottom: 8 }}>{p}</li>)}
      </ol>
      {nota && <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 12, background: C.quenteSuave, color: '#7A3E0C', fontSize: 16, lineHeight: 1.55 }}>{nota}</div>}
    </section>
  );
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ background: C.acentoSuave, borderRadius: 20, padding: '22px 24px', fontSize: 17.5, lineHeight: 1.65, color: C.tinta }}>
        <b>Como esta área funciona.</b> No Início há um bloco para cada coisa. Toque num bloco para entrar; o botão
        <b> ← Início</b>, em cima, leva-o sempre de volta. Tudo o que fizer fica guardado sozinho e chega aos outros
        computadores da escola. Aqui não se mexe em aulas nem em alunos.
      </section>

      <Bloco icone="🎪" titulo="Organizar um evento" ir="eventos" passos={[
        <>Em <b>Eventos</b>, carregue em <b>Nova atividade</b> e escolha o tipo de <b>Evento</b> (externo ou interno).</>,
        <>Responda às perguntas, uma de cada vez: o pedido, o cliente, o local, o número de pessoas… Toque na resposta; se não souber, pode responder depois.</>,
        <>O evento abre com o cartão <b>Agora</b>: diz qual é a próxima coisa a fazer. Responda ali mesmo.</>,
        <>Por baixo estão as partes do evento: <b>Pedido</b>, <b>Perguntas ao cliente</b>, <b>Local</b>, <b>Fichas e orçamentos</b>, <b>Preparação</b>, <b>Material</b>, <b>Dia do evento</b> e <b>Fechar</b>. Abra a que quiser, em qualquer ordem.</>,
        <>Em <b>Fichas e orçamentos</b> junte as receitas do evento: a aplicação faz o orçamento e a folha para entregar.</>,
      ]} nota={<>A barra no topo do evento mostra quanto falta preparar. Quando chega a 100%, está pronto.</>} />

      <Bloco icone="📄" titulo="Criar uma ficha técnica" ir="fichas" passos={[
        <>Em <b>Fichas técnicas</b>, procure primeiro na biblioteca: a receita pode já existir.</>,
        <>Se não existir, carregue em <b>+ Nova ficha</b> e cole o endereço (link) da receita.</>,
        <>A aplicação prepara um pedido para uma IA (ChatGPT, Claude ou Gemini). Copie-o, cole-o na IA e espere pela resposta.</>,
        <>Copie a resposta da IA e cole-a na aplicação, em <b>Colar o resultado</b>.</>,
        <>Confirme o nome, as doses e os ingredientes. Corrija o que estiver mal e guarde.</>,
      ]} nota={<>Confirme sempre os ingredientes: cada um deve ter uma quantidade, uma unidade e um produto. Se aparecerem tempos, como «3 min», no lugar dos produtos, cole outra vez a resposta da IA.</>} />

      <Bloco icone="🧾" titulo="Fazer um orçamento ou uma requisição" ir="orcamentos" passos={[
        <>Em <b>Orçamentos e requisições</b>, escolha as fichas técnicas (da biblioteca ou de um evento).</>,
        <>Diga para quantas pessoas é cada ficha.</>,
        <>A aplicação junta os ingredientes de todas as fichas, converte as medidas e põe os preços: fica com o custo total.</>,
        <>Reveja a lista. Se um preço estiver errado, escreva o certo nessa linha.</>,
        <>Carregue em <b>✓ Guardar e enviar a requisição</b> para a mandar para a folha da escola.</>,
      ]} nota={<>Um preço que escreva à mão vale só para essa requisição. A coordenação revê-o na próxima atualização dos preços.</>} />

      <Bloco icone="🏷️" titulo="Consultar um preço" ir="precos" passos={[
        <>Em <b>Preços das matérias-primas</b>, escreva o nome do produto na caixa de pesquisa, ou toque numa categoria.</>,
        <>Cada produto mostra o preço por quilo (ou por unidade, nos que se contam um a um) e a data da última atualização.</>,
      ]} />

      <section style={{ background: C.papel, borderRadius: 20, padding: '22px 24px', border: `1px solid ${C.linha}`, fontSize: 17, lineHeight: 1.65, color: C.tinta }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800 }}>Dúvidas frequentes</h2>
        <p style={{ margin: '0 0 10px' }}><b>Fechei sem querer. Perdi o que fiz?</b> Não. O que já estava escrito fica guardado; volte a entrar com o código.</p>
        <p style={{ margin: '0 0 10px' }}><b>Os outros veem o que eu fiz?</b> Sim. Eventos, fichas e requisições chegam aos outros computadores da escola.</p>
        <p style={{ margin: 0 }}><b>Para sair:</b> carregue em <b>Sair</b>, no canto de cima. Num computador partilhado, saia sempre no fim.</p>
      </section>
    </div>
  );
}
