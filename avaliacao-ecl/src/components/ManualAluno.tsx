// ============================================================
// Manual do utilizador do aluno (Rosa, 6/out/2026: «manual de utilizador
// que não está na aplicação para o aluno»). Fica em Recursos.
//
// O guia curto «Como funciona a aplicação» (InicioAluno) continua no
// início; este é o manual completo, com uma secção por tema.
// Os pesos vêm de PESOS_AULA (types.ts): se mudarem, o texto acompanha.
// ============================================================
import React, { useState } from 'react';
import { PESOS_AULA } from '../types';

const C = {
  roxo: '#6B3FA0', roxoSuave: '#F0EBF7',
  cobre: '#b5651d', cobreSuave: '#fdf0e6',
  verde: '#2F7A3B', verdeSuave: '#eef4eb',
  tinta: '#1a1714', suave: 'rgba(26,23,20,0.62)', linha: 'rgba(26,23,20,0.1)',
};

const P = ({ children }: { children: React.ReactNode }) =>
  <p style={{ margin: '10px 0', lineHeight: 1.65, fontSize: 15 }}>{children}</p>;
const H = ({ children }: { children: React.ReactNode }) =>
  <h4 style={{ margin: '18px 0 6px', fontSize: 15.5, fontWeight: 800, color: C.tinta }}>{children}</h4>;
const Lista = ({ itens, numerada }: { itens: React.ReactNode[]; numerada?: boolean }) => {
  const Tag = numerada ? 'ol' : 'ul';
  return <Tag style={{ margin: '8px 0', paddingLeft: 22, lineHeight: 1.7, fontSize: 15 }}>
    {itens.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
  </Tag>;
};
function Destaque({ children, cor = 'cobre' }: { children: React.ReactNode; cor?: 'cobre' | 'verde' | 'roxo' }) {
  const p = cor === 'verde' ? { f: C.verdeSuave, b: C.verde, t: '#1f4d27' }
    : cor === 'roxo' ? { f: C.roxoSuave, b: C.roxo, t: '#2A1745' } : { f: C.cobreSuave, b: C.cobre, t: '#78350f' };
  return <div style={{ background: p.f, borderLeft: `4px solid ${p.b}`, borderRadius: 10, padding: '11px 14px',
    margin: '12px 0', fontSize: 14.5, lineHeight: 1.6, color: p.t }}>{children}</div>;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const PR = PESOS_AULA.pratico;

const SECCOES: { id: string; titulo: string; resumo: string; conteudo: React.ReactNode }[] = [
  { id: 'entrar', titulo: 'Entrar na aplicação', resumo: 'O teu número, o PIN e o email da escola.', conteudo: <>
    <Lista numerada itens={[
      'Escolhe a tua turma e o teu nome (ou número).',
      'Escreve o teu PIN de 4 algarismos. O PIN foi-te entregue em papel pelo professor.',
      'Na primeira vez, o PIN fica ligado ao teu telemóvel. A partir daí, só entras com ele nesse telemóvel.',
    ]} />
    <Destaque>Se mudares de telemóvel ou te esqueceres do PIN, pede ao professor que liberte o teu PIN. Não dês o teu PIN a ninguém.</Destaque>
    <P>No <b>Perfil</b> podes pôr ou mudar o teu email da escola. É para lá que vão os avisos.</P>
  </> },
  { id: 'menu', titulo: 'O ecrã e o menu', resumo: 'Início, Aula, Percurso, Recursos e Perfil.', conteudo: <>
    <P>Em baixo há sempre a mesma barra. Dentro ou fora da aula, tens sempre por onde sair.</P>
    <Lista itens={[
      <><b>Início:</b> os avisos do dia e o botão da aula de hoje.</>,
      <><b>Aula:</b> a aula de hoje e as aulas anteriores.</>,
      <><b>Percurso:</b> a tua nota, as aulas por autoavaliar, as tuas competências, as recuperações e as atividades e concursos.</>,
      <><b>Recursos:</b> este manual, o manual da unidade, as fichas técnicas, os guiões, o KitchenFlow, os preços e o dicionário de cozinha.</>,
      <><b>Perfil:</b> o teu perfil profissional e o teu email.</>,
    ]} />
    <P>Se a aplicação não mostrar a aula de hoje, carrega em <b>«Avisar o professor»</b> no Início. O aviso chega ao professor com a informação do teu telemóvel.</P>
  </> },
  { id: 'aula', titulo: 'Num dia de aula', resumo: 'A aplicação abre logo na aula de hoje.', conteudo: <>
    <P>Num dia de aula, a aplicação abre sozinha na aula desse dia. Em cima está a <b>comanda do teu grupo</b>: o nome do grupo, o prato de hoje e as caras dos colegas. Um visto verde mostra quem já entrou ou já se avaliou.</P>
    <P>Os grupos são feitos pelo professor. Se ele te mudar de grupo, a aplicação avisa-te.</P>
    <P>Cada ecrã tem uma cor e uma frase grande. Fazes uma coisa de cada vez:</P>
    <Lista numerada itens={[
      <><b>Esperar</b> (amarelo): o professor ainda não abriu a entrada.</>,
      <><b>Entrar</b> (verde): carrega em «Entrar». A tua hora de entrada fica registada.</>,
      <><b>A farda</b> (branco): dizes se a tua farda está completa.</>,
      <><b>As mãos</b> (azul): lavar as mãos antes de começar.</>,
      <><b>Produzir</b> (roxo): segues a ficha técnica e marcas os passos.</>,
      <><b>Avaliar-te</b>, depois <b>os colegas do grupo</b>, e por fim <b>«Aula feita»</b>.</>,
    ]} />
    <Destaque>Tens 10 minutos de tolerância, a contar do momento em que o professor abre a aula. Depois disso, fica registado como atraso.</Destaque>
    <P>Podes carregar em «Ver o que já fizeste» para rever os passos anteriores. Só podes ver: não podes mudar o que já respondeste.</P>
  </> },
  { id: 'farda', titulo: 'A farda', resumo: 'Sem farda completa, as técnicas contam 0.', conteudo: <>
    <P>À entrada, respondes «Sim, está completa» ou «Falta-me alguma coisa». Só ficas dentro da aula depois de responderes.</P>
    <P>A resposta tem de ser verdadeira: o professor confirma. Se não for verdade, a farda e a responsabilidade ficam com a nota mais baixa.</P>
    <Destaque cor="roxo">Sem a farda completa, as técnicas desse dia contam 0, porque não se cumprem as regras de higiene. O que fizeste fica no teu percurso, e na nota da aula vês quanto terias com a farda completa.</Destaque>
    <P>No início do curso, o professor pode dar uma tolerância uma vez. No teu Perfil aparece o aviso de que foi a última: na vez seguinte, as técnicas contam 0.</P>
  </> },
  { id: 'ficha', titulo: 'Durante a aula: a ficha técnica', resumo: 'Marcar cada passo quando estiver feito.', conteudo: <>
    <P>Na ficha técnica, marca cada passo da preparação <b>quando o acabares</b>. Só podes avaliar-te depois de marcares todos os passos.</P>
    <P>O professor vê a hora a que marcaste cada passo. Se marcares tudo de seguida, sem fazer, o professor recebe um aviso.</P>
    <P>Faz também os registos de higiene e segurança alimentar no <b>KitchenFlow</b> (temperaturas e prevenção de contaminações).</P>
    <P>Antes de começares, em «Ver o que vamos fazer hoje», podes ver o que vai ser avaliado.</P>
  </> },
  { id: 'autoavaliacao', titulo: 'A autoavaliação', resumo: 'Uma pergunta por ecrã, sem números.', conteudo: <>
    <P>No fim da aula, respondes a uma pergunta de cada vez. Para cada técnica ou conhecimento, escolhes a frase que descreve o que fizeste hoje.</P>
    <Lista itens={[
      <>As opções <b>não têm números nem estão por ordem</b>. Lê-as todas e escolhe o que fizeste, e não a nota que gostavas de ter.</>,
      'Cada técnica mostra de onde vem (o prato e a preparação) e como deve ficar quando está bem feita.',
      <><b>«Não tive oportunidade»</b> não conta para a nota, mas o professor confirma. <b>«Não fiz»</b> vale 0.</>,
      'Se escolheres uma das frases mais altas, escreve um exemplo concreto do que fizeste. O professor lê o que escreves.',
      'Respondes também às atitudes e às perguntas do Colaborativo, do Criativo e do Consciente (os 5 C).',
    ]} />
    <P>Depois de enviares, vês a nota que a tua proposta daria. <b>Quem decide a nota é o professor</b>, quando valida.</P>
    <Destaque>Enquanto não te autoavaliares numa aula, essa aula conta 0 na tua nota da UC.</Destaque>
  </> },
  { id: 'colegas', titulo: 'Avaliar os colegas do grupo', resumo: 'Obrigatório quando o trabalho é de grupo.', conteudo: <>
    <P>Quando o trabalho é feito em grupo, depois da tua autoavaliação avalias cada colega do grupo: se colaborou, se ouviu os outros, se aceitou outras ideias e como foi nos problemas do grupo.</P>
    <P>É obrigatório: a aula só fica feita depois disso. Sê justo/a. Só o professor vê o que respondeste, e não conta para a nota do colega.</P>
  </> },
  { id: 'tarde', titulo: 'Se chegaste tarde ou estiveste só parte da aula', resumo: 'A nota conta os tempos em que estiveste.', conteudo: <>
    <P>A aula está dividida em tempos. Se perdeste um tempo, a nota dessa aula conta só os tempos em que estiveste.</P>
    <Destaque cor="roxo">Exemplo: a nota da aula seria 15. Estiveste em 1 de 3 tempos. A nota conta 1/3: 15 × 1/3 = 5.</Destaque>
    <P>Antes de te avaliares, respondes a umas perguntas sobre a tua falta. Não escreves nada: escolhes. Se a resposta não estiver certa, a aplicação explica porquê e escolhes outra vez.</P>
    <P>Uma dor de cabeça ou de barriga não é uma urgência. Às vezes temos de nos aguentar e vir à aula; se piorares, fala com o professor.</P>
    <P>No fim, escolhes um compromisso para a próxima aula. A aplicação verifica se o cumpriste, e o professor vê.</P>
    <P>As horas em que não estiveste contam também como faltas.</P>
  </> },
  { id: 'nota', titulo: 'A minha nota', resumo: 'Como se forma a nota de cada aula e da UC.', conteudo: <>
    <P>Numa aula prática ou mista, a nota da aula forma-se assim:</P>
    <Lista itens={[
      <>Higiene e segurança alimentar (farda e registos): <b>{pct(PR.OBR)}</b></>,
      <>Técnicas: <b>{pct(PR.SUB)}</b></>,
      <>Conhecimentos: <b>{pct(PR.KNW)}</b></>,
      <>Atitude: <b>{pct(PR.ATI)}</b></>,
    ]} />
    <P>Numa aula teórica contam os conhecimentos e a atitude. Numa aula só de atitudes, contam as atitudes.</P>
    <P>A nota da UC é a média das tuas aulas. Uma aula só de atitudes vale meia aula; uma aula com técnicas ou conhecimentos vale uma aula inteira. Em <b>Percurso › Avaliação progressiva</b> vês a conta, aula a aula.</P>
    <Destaque>Uma falta conta 0 nessa aula. Uma aula em que não te autoavaliaste também conta 0.</Destaque>
    <H>O bónus das atividades</H>
    <P>A participação em eventos e concursos pode dar até 2 valores de bónus: 0,5 por evento e, em cada concurso, até 1 valor.</P>
    <P>Sem nenhuma atividade, a nota máxima é 17. Só com eventos, a nota máxima é 18. Para chegar a 20, tens de participar num concurso.</P>
  </> },
  { id: 'faltas', titulo: 'Faltas e recuperação', resumo: 'Mais de 10% das horas da UC: recuperação.', conteudo: <>
    <P>Se faltares a mais de 10% das horas de uma UC, ficas em recuperação. Recebes o aviso «Tens módulos por recuperar».</P>
    <P>Em <b>Percurso › Recuperações</b> vês o teu plano de recuperação e o prazo.</P>
    <H>Recuperar numa atividade</H>
    <Lista numerada itens={[
      <>Em <b>Percurso › Atividades e concursos</b>, carrega em «Candidatar-me para recuperar» numa atividade.</>,
      'O professor aceita, ou escolhe outra atividade por ti.',
      'Participas e autoavalias-te na atividade, como os outros.',
      'Só recuperas se participares e o professor o confirmar. Para ti, essa atividade não dá bónus.',
    ]} />
  </> },
  { id: 'atividades', titulo: 'Atividades e concursos', resumo: 'Eventos, concursos, visitas e catering.', conteudo: <>
    <P>Um <b>plano de aula</b> é a aula da turma toda e conta para a tua nota. Uma <b>atividade extra</b> é um evento, um concurso, uma visita ou um catering, só para alguns alunos ou fora das aulas. Dá bónus.</P>
    <P>Inscreves-te em <b>Percurso › Atividades e concursos</b>. O professor aceita a inscrição.</P>
    <P>Se foste, recebes o aviso «Estiveste na atividade… autoavalia-te». Chega a horas, fica até ao fim e leva a farda: sem farda, a participação não conta.</P>
    <P>Se não foste, em «Para ver» podes ver o que os colegas fizeram, a ficha técnica e o guião.</P>
  </> },
  { id: 'recursos', titulo: 'Os recursos', resumo: 'Manuais, fichas, guiões, preços e dicionário.', conteudo: <>
    <Lista itens={[
      <><b>Manual da unidade:</b> a matéria da UC que estás a ter.</>,
      <><b>Fichas técnicas:</b> todas as das aulas da turma.</>,
      <><b>Guiões de produção:</b> o apoio às fichas técnicas.</>,
      <><b>KitchenFlow:</b> os registos de higiene e segurança alimentar.</>,
      <><b>Preços das matérias-primas:</b> quanto custa cada produto.</>,
      <><b>Dicionário de cozinha:</b> o que é cada técnica e como se observa.</>,
    ]} />
  </> },
];

export function ManualAluno() {
  const [aberta, setAberta] = useState<string | null>(SECCOES[0].id);
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '4px 14px 24px' }}>
      <div style={{ background: C.roxo, borderRadius: 14, padding: '16px 18px', marginBottom: 14, color: '#fff' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>Manual do utilizador</h2>
        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5 }}>Como funciona a aplicação, passo a passo. Toca num tema para o abrir.</div>
      </div>
      {SECCOES.map((s, i) => {
        const aberto = aberta === s.id;
        return (
          <div key={s.id} style={{ border: `1px solid ${aberto ? C.roxo : C.linha}`, borderRadius: 12, marginBottom: 9, overflow: 'hidden', background: '#fff' }}>
            <button onClick={() => setAberta(aberto ? null : s.id)} style={{ width: '100%', padding: '14px 16px', border: 'none',
              background: aberto ? C.roxoSuave : '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: aberto ? C.roxo : 'rgba(26,23,20,0.07)',
                color: aberto ? '#fff' : C.suave, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: aberto ? C.roxo : C.tinta }}>{s.titulo}</span>
                <span style={{ display: 'block', fontSize: 13.5, color: C.suave, marginTop: 2, lineHeight: 1.45 }}>{s.resumo}</span>
              </span>
              <span style={{ fontSize: 18, color: C.suave, flexShrink: 0 }}>{aberto ? '−' : '+'}</span>
            </button>
            {aberto && <div style={{ padding: '2px 18px 16px', color: C.tinta, borderTop: `1px solid ${C.linha}` }}>{s.conteudo}</div>}
          </div>
        );
      })}
    </div>
  );
}
