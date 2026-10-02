// ============================================================
// Manual do professor.
//
// Reescrito de raiz: o anterior falava de separadores que já não
// existem ("tab Autoavaliações", botão "+" no canto) e não explicava o
// que mais falta ao professor — como a nota se forma, quanto pesa cada
// parte, o que acontece quando um aluno falta.
//
// Os números deste manual vêm do código, não de memória:
//   PESOS_AULA em types.ts; o bónus de eventos em eventosAvaliacao.ts
//   OBRIGATORIAS em compatECL.ts
//   nivelConsolidado em motorAvaliacao.ts
// Se esses valores mudarem, este manual tem de mudar com eles.
// ============================================================

import React, { useState } from 'react';
import { PESOS_AULA } from '../types';

const C = {
  bordeaux: '#7B2233', bordeauxSuave: '#F6ECEE',
  cobre: '#b5651d', cobreSuave: '#fdf0e6',
  verde: '#5a7a4e', verdeSuave: '#eef4eb',
  tinta: '#1a1714', suave: 'rgba(26,23,20,0.62)',
  tenue: 'rgba(26,23,20,0.42)', linha: 'rgba(26,23,20,0.1)',
};

type Seccao = {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: React.ReactNode;
};

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: (string | React.ReactNode)[][] }) {
  return (
    <div style={{ overflowX: 'auto', margin: '12px 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr>
            {cabecalho.map((h, i) => (
              <th key={i} style={{
                textAlign: i === 0 ? 'left' : 'right', padding: '9px 11px',
                borderBottom: `2px solid ${C.linha}`, fontWeight: 800,
                fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: C.tenue, whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              {l.map((c, j) => (
                <td key={j} style={{
                  textAlign: j === 0 ? 'left' : 'right', padding: '9px 11px',
                  borderBottom: `1px solid ${C.linha}`,
                  fontWeight: j === 0 ? 600 : 400,
                }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Destaque({ children, cor = 'cobre' }: { children: React.ReactNode; cor?: 'cobre' | 'verde' | 'bordeaux' }) {
  const paleta = cor === 'verde'
    ? { fundo: C.verdeSuave, borda: C.verde, texto: '#2d4a22' }
    : cor === 'bordeaux'
      ? { fundo: C.bordeauxSuave, borda: C.bordeaux, texto: C.bordeaux }
      : { fundo: C.cobreSuave, borda: C.cobre, texto: '#78350f' };
  return (
    <div style={{
      background: paleta.fundo, border: `1px solid ${paleta.borda}`,
      borderRadius: 10, padding: '12px 14px', margin: '12px 0',
      fontSize: 13.5, color: paleta.texto, lineHeight: 1.6,
    }}>{children}</div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '10px 0', lineHeight: 1.65, fontSize: 14.5 }}>{children}</p>;
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      margin: '18px 0 6px', fontSize: 15, fontWeight: 800, color: C.tinta,
    }}>{children}</h4>
  );
}

function Passos({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ol style={{ margin: '10px 0', paddingLeft: 20, lineHeight: 1.75, fontSize: 14.5 }}>
      {itens.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
    </ol>
  );
}

// ══════════════════════════════════════════════════════════════

const SECCOES: Seccao[] = [

  // ── 1 ────────────────────────────────────────────────────
  {
    id: 'nota',
    titulo: 'Como se forma a nota',
    resumo: 'Os pesos de cada componente, a escala, e o que muda entre aula prática e teórica.',
    conteudo: (
      <>
        <P>
          Cada competência é avaliada numa escala de <b>1 a 5</b>. No fim,
          cada nível vale 0, 5, 10, 15 ou 20 (Não fiz · Tentei · Com ajuda · Sozinho · Muito bom),
          e a média ponderada dá a nota de <b>0 a 20</b>. «Não tive oportunidade» não conta:
          chega-te para confirmares; se não for verdade, passa a «Não fiz» (0).
          Numa aula prática sem conhecimentos, o peso deles passa para as técnicas (60%).
        </P>

        <H>Pesos por tipo de aula</H>
        <Tabela
          cabecalho={['Componente', 'Prática', 'Mista', 'Teórica']}
          linhas={[
            ['Obrigatórias', `${PESOS_AULA.pratico.OBR * 100}%`, `${PESOS_AULA.misto.OBR * 100}%`, `${PESOS_AULA.teorico.OBR * 100}%`],
            ['Técnicas (subtécnicas e aparelhos)', `${PESOS_AULA.pratico.SUB * 100}%`, `${PESOS_AULA.misto.SUB * 100}%`, '—'],
            ['Conhecimentos', `${PESOS_AULA.pratico.KNW * 100}%`, `${PESOS_AULA.misto.KNW * 100}%`, `${PESOS_AULA.teorico.KNW * 100}%`],
            ['Atitudes', `${PESOS_AULA.pratico.ATI * 100}%`, `${PESOS_AULA.misto.ATI * 100}%`, `${PESOS_AULA.teorico.ATI * 100}%`],
          ]}
        />

        <P>
          Numa aula teórica não há técnicas a avaliar, e por isso os
          conhecimentos passam a valer {PESOS_AULA.teorico.KNW * 100}%.
        </P>

        <H>Quando uma parte não é avaliada</H>
        <P>
          O peso dessa parte passa para as outras. Numa aula prática sem
          conhecimentos avaliados, as técnicas passam a valer 50%, e as
          obrigatórias e as atitudes 25% cada.
        </P>

        <H>A nota da aula e a nota da UC</H>
        <P>
          <b>Só conta a tua validação.</b> A autoavaliação do aluno é uma
          proposta — aparece-te já preenchida para corrigires, mas não entra
          em nota nenhuma.
        </P>
        <P>
          A nota da UC junta as tuas validações de todas as aulas dessa UC,
          com os mesmos pesos, e depois soma o bónus dos eventos e concursos.
          Não há bónus de assiduidade: quem falta já é penalizado (a aula conta 0).
        </P>

        <H>As competências obrigatórias</H>
        <P>
          São três, em <b>todas as aulas práticas</b>, tenha a aula fichas
          técnicas ou não — mas não contam todas no mesmo sítio:
        </P>
        <ul style={{ lineHeight: 1.75, fontSize: 14.5, paddingLeft: 20 }}>
          <li><b>HACCP e registos</b> — o KitchenFlow preenchido. É esta que entra na nota da aula.</li>
          <li><b>Higiene pessoal</b> — farda completa, sem adornos, mãos lavadas. Verificada à entrada. <b>Sem farda completa, avalia-se tudo (fica no percurso do aluno), mas as técnicas contam 0 na nota da aula.</b> As atitudes contam, com «Cuidado com a apresentação pessoal» sempre avaliada, e o aluno responde a três perguntas sobre o que aconteceu. Não conta como falta.</li>
          <li><b>Assiduidade e pontualidade</b> — contam no Comprometido da pauta. A aula faltada conta 0.</li>
        </ul>
        <P>
          Se o aluno não tiver registos no KitchenFlow, o HACCP que ele se
          propõe chega-te marcado com 1. Confirma antes de validar.
        </P>

        <H>As técnicas não são obrigatórias em cada aula</H>
        <Destaque>
          Uma aula pode não ter nenhuma competência técnica a avaliar — e
          isso é normal. As técnicas saem das fichas de produção: sem
          fichas, não há técnicas nessa aula.
          <br /><br />
          O que não for avaliado dentro da unidade é avaliado <b>ao longo
          do ano</b>, noutras aulas. A nota da unidade forma-se com o que
          houver; o percurso do aluno é que tem de ficar completo.
        </Destaque>
      </>
    ),
  },

  // ── 2 ────────────────────────────────────────────────────
  {
    id: 'bonus',
    titulo: 'O bónus dos eventos e os tetos',
    resumo: 'Eventos e concursos até +2. Tetos: 17 sem participar, 18 só com eventos, 20 com concurso. Sem bónus de assiduidade.',
    conteudo: (
      <>
        <H>Sem bónus de assiduidade</H>
        <P>
          Quem cumpre não ganha pontos extra, e quem falha é penalizado uma só vez,
          sem contar a mesma coisa duas vezes: a aula faltada conta 0, os atrasos e
          as faltas pesam no Comprometido da pauta, e com 10% de faltas o aluno vai
          para recuperação. Sem farda completa, as técnicas da aula contam 0 (não é falta).
        </P>

        <H>Eventos e concursos — até +2</H>
        <P>
          Não é uma componente ponderada: é um acréscimo à nota. O evento ou
          concurso avalia-se num <b>plano próprio</b>, criado em <b>Avaliar evento
          fora do horário</b> (ou, dentro do horário, marcando o plano como
          evento) — escolhe Evento externo, Concurso, Catering, Buffet ou
          Atividade fora da escola. As atitudes já vêm marcadas; o aluno
          autoavalia-se e tu ajustas, como numa aula.
        </P>
        <Tabela
          cabecalho={['', 'Evento', 'Concurso']}
          linhas={[
            ['Bónus', '+0,5', '+0,75'],
            ['Sempre avaliado', 'Chegar à hora, ficar até ao fim, farda', 'Chegar à hora, ficar até ao fim, farda'],
            ['Sugerido pelo tipo', 'Cooperação, higiene, postura… e a técnica geral', 'Autoconfiança, autocontrolo, iniciativa'],
            ['Para dar o bónus', 'Tudo em "Muito bom" (5), técnica incluída', 'As 3 fixas em "Muito bom"; técnica e resultado não contam'],
            ['Sem farda', 'Não conta', 'Não conta'],
            ['Aluno com menos de 10', 'Conta — ajuda a subir', 'Não vai a concurso'],
          ]}
        />
        <Tabela
          cabecalho={['Participou em', 'Nota máxima']}
          linhas={[['Nada', '17'], ['Só eventos', '18'], ['Pelo menos um concurso', '20']]}
        />
        <P>
          Porque o concurso vale mais: é expor-se, ser julgado por estranhos.
          Premeia-se a coragem de ir, não ganhar. Porque os tetos: o 20 exige
          mostrar o trabalho fora da sala, e ir a concurso.
        </P>
        <H>A ordem das contas</H>
        <P>
          Nota das competências (aulas faltadas ou sem farda a 0) → + bónus de
          eventos e concursos (até +2) → teto (17, 18 ou 20).
        </P>
        <Destaque cor="verde">
          <b>Exemplos.</b> 17 + 1 concurso + 3 eventos = <b>19</b>. 17 + 3 eventos = 18,5 → teto <b>18</b>.
          20 sem participar = <b>17</b>. 20 com 3 eventos = <b>18</b>. 18 + 1 concurso + 3 eventos = <b>20</b>.
          8 + 2 eventos = <b>9</b>.
        </Destaque>
      </>
    ),
  },

  // ── 3 ────────────────────────────────────────────────────
  {
    id: 'faltas',
    titulo: 'Faltas e atrasos',
    resumo: 'A aplicação regista a hora; a decisão é sempre tua.',
    conteudo: (
      <>
        <P>
          A tolerância conta-se a partir do momento em que <b>abres a
          aula</b>, não da hora marcada no plano. São 10 minutos. Mesmo que
          abras a aula a dez minutos do fim, os atrasos só contam a partir daí.
        </P>
        <Destaque>
          <b>Aula que não abriste não conta contra o aluno.</b> Sem a aula
          aberta ele não consegue marcar presença — a responsabilidade é do
          professor. Nessa aula não há faltas nem atrasos, a não ser que os
          decidas tu, aluno a aluno.
        </Destaque>

        <H>A aplicação não decide faltas</H>
        <P>
          Quando um aluno entra fora do tempo, a aplicação regista a hora
          e assinala. A decisão é tua, entre três:
        </P>
        <ul style={{ lineHeight: 1.75, fontSize: 14.5, paddingLeft: 20 }}>
          <li><b>Sem falta</b> — houve uma razão que aceitas</li>
          <li><b>Falta de atraso</b></li>
          <li><b>Falta de presença</b></li>
        </ul>

        <Destaque cor="bordeaux">
          <b>Uma falta de presença é zero na aula inteira</b> — técnicas,
          obrigatórias, conhecimentos e atitudes. Não há avaliação parcial
          de quem não esteve.
          <br /><br />
          Uma falta justificada conta zero na mesma. O mecanismo de
          salvaguarda é a <b>recuperação de módulo</b>, não o perdão da
          falta.
        </Destaque>

        <H>O limite dos 10%</H>
        <P>
          Os 10% contam-se sobre o <b>total de horas da UC</b> no cronograma,
          e não sobre as horas já dadas. Acima disso o aluno fica em
          recuperação; o alerta aparece-te sempre que se aproxima.
        </P>
        <P>
          <b>Faltar a parte de uma aula conta as horas faltadas.</b> Num plano
          de 2 horas, faltar 1 hora conta 1 hora. O almoço só se desconta nos
          planos que vão de manhã à tarde.
        </P>
        <P>
          Nos eventos e concursos fora do horário <b>não há faltas</b>: quem
          não vai simplesmente não recebe o bónus.
        </P>

        <H>Falha de ligação nunca gera falta</H>
        <P>
          Se a aplicação não conseguir sincronizar, o aluno não é
          prejudicado. A entrada fica registada no aparelho e sobe quando
          houver rede.
        </P>
      </>
    ),
  },

  // ── 4 ────────────────────────────────────────────────────
  {
    id: 'banco',
    titulo: 'O banco de competências',
    resumo: 'O que já está consolidado não desce.',
    conteudo: (
      <>
        <P>
          Cada competência guarda o <b>nível mais alto</b> que o aluno já
          atingiu. Se numa aula seguinte tiver pior desempenho nessa
          mesma competência, o nível consolidado <b>não desce</b>.
        </P>
        <P>
          A razão é pedagógica: uma competência demonstrada foi
          demonstrada. Um mau dia não apaga o que já se sabe fazer.
        </P>

        <Destaque>
          Isto <b>não</b> quer dizer que a nota da aula suba. A avaliação
          daquela aula é a que foi. O que não desce é o nível registado no
          percurso do aluno — o que conta para o fecho da unidade.
        </Destaque>

        <H>Consequência prática</H>
        <P>
          Se um aluno faltar a uma aula onde se avaliou uma técnica que
          ele já tinha consolidado, não perde o nível. Perde a nota
          daquela aula.
        </P>
      </>
    ),
  },

  // ── 5 ────────────────────────────────────────────────────
  {
    id: 'autoavaliacao',
    titulo: 'Autoavaliações e validação',
    resumo: 'O aluno dá-se uma nota; tu confirmas ou corriges.',
    conteudo: (
      <>
        <P>
          No fim da produção, o aluno <b>dá-se uma nota em cada
          competência</b>. Isso não é a nota dele — é a proposta dele.
        </P>
        <P>
          Tu vês onde ele se pôs e confirmas ou corriges. <b>A nota que
          conta é sempre a tua.</b>
        </P>

        <H>Onde validar</H>
        <Passos itens={[
          <>Abre o plano de aula.</>,
          <>No menu do plano, à esquerda, vê <b>Turma</b>.</>,
          <>Cada aluno que submeteu tem o botão <b>Validar agora</b>.</>,
          <>Vês as competências com a nota que ele se deu e ajustas onde for preciso.</>,
        ]} />

        <Destaque cor="bordeaux">
          Enquanto houver autoavaliações por validar, o plano assinala-o.
          Uma autoavaliação não validada <b>não conta para nada</b> — nem
          para a nota, nem para o banco de competências.
        </Destaque>

        <H>O aluno não vê números enquanto se avalia</H>
        <P>
          Nas opções não há números nem notas: o aluno escolhe a frase que diz
          o que fez, não o número que quer ter. Nas opções de cima pede-se-lhe
          um exemplo concreto do que fez — aparece-te na validação.
        </P>
        <P>
          <b>Só depois de enviar</b> vê a nota que a proposta dele dá nessa
          aula, com uma margem de 2 valores — por exemplo, "14, deve ficar
          entre 12 e 16" — e a indicação de que és tu quem confirma.
        </P>

        <H>A farda: «Não era verdade»</H>
        <P>
          A farda é declarada pelo aluno à entrada, com um aviso de que tem de
          ser verdade. Na validação confirmas: se não era verdade, carrega em
          <b> Não era verdade</b> — a farda e a Responsabilidade ficam a 1.
        </P>

        <H>Porquê pedir a autoavaliação</H>
        <P>
          Obriga o aluno a olhar para os critérios antes de ser avaliado.
          Muitas vezes a diferença entre o que ele acha e o que tu vês é a
          conversa mais útil da aula.
        </P>
      </>
    ),
  },

  // ── 6 ────────────────────────────────────────────────────
  {
    id: 'plano',
    titulo: 'Construir um plano de aula',
    resumo: 'Seis passos curtos; a aplicação deduz o resto e mostra tudo no fim.',
    conteudo: (
      <>
        <H>Criar o plano, passo a passo</H>
        <P>
          Em <b>Planos de aula › + Novo plano</b> abre-se uma janela de cada vez. Criar e
          <b> Editar o plano</b> são a mesma coisa: ao mudar um plano tens tudo outra vez,
          como se fosse novo (sumário, manual, perguntas).
        </P>
        <Passos itens={[
          <><b>Quando</b> — o dia e as horas (vêm do horário da turma).</>,
          <><b>Unidade</b> — a UC ou UFCD. Mudar a unidade muda também o manual e as competências.</>,
          <><b>Que aula é</b> — prática, mista, teórica ou só de atitudes.</>,
          <><b>Como é a aula</b> — perguntas numeradas, só as que fazem falta: onde é, se trabalham em grupo, se continua a aula anterior e em que fase está o trabalho (investigação, desenvolvimento, receita e ficha técnica, menu, requisição, apresentação escrita, oral, digital ou prática).</>,
          <><b>Conteúdos e sumário</b> — o índice do Manual do Aluno: <b>Incluir o manual todo</b>, uma parte, um capítulo ou só alguns pontos. O sumário escreve-se sozinho a partir do que escolheste.</>,
          <><b>Confirmar</b> — «O plano fica assim»: como é a aula, o manual, o sumário e o que o aluno responde, cada um com <b>mudar</b>.</>,
        ]} />
        <Destaque cor="verde">
          Enganaste-te nas perguntas? <b>↺ Recomeçar este plano do zero</b> volta ao início sem apagar o plano.
        </Destaque>

        <H>O que a aplicação deduz</H>
        <P>
          Da resposta «como é a aula» saem as perguntas da autoavaliação (numa aula teórica não se
          pergunta pela farda nem pelo KitchenFlow), os critérios de cada fase do trabalho e os pesos
          da nota. A linha <b>«Deduzido … não é assim? mudar»</b> mostra o que a aplicação concluiu.
        </P>

        <H>Fichas, guião e requisição</H>
        <P>
          Estão sempre no plano, no campo <b>Fichas, guião e requisição</b>. Nas aulas sem cozinha
          a aplicação não as pede, mas podes juntá-las. Se mudares as fichas depois de fazer a
          requisição, a aplicação avisa que a requisição está desatualizada.
        </P>
        <Destaque>
          Ao colar a resposta da IA numa ficha, confirma os ingredientes antes da requisição. Se uma
          ficha tiver tempos («3 min») no lugar dos ingredientes, a requisição deixa-os de fora e
          avisa qual é a ficha a corrigir.
        </Destaque>

        <H>Competências</H>
        <P>
          Com o manual todo, aparecem todas as competências de conhecimentos, por parte e por
          capítulo. O total mostra duas contas: <b>No plano</b> (todas) e <b>Cada aluno responde a</b>
          (as do capítulo que ele escolhe, mais as obrigatórias e as atitudes).
        </P>
        <P>
          O que tirares fica em <b>Retiradas desta aula</b>, com <b>+ Incluir</b> e <b>Repor todas</b>.
          <b> Repor as competências da aula</b> volta à lista completa. As obrigatórias (farda,
          higiene e segurança alimentar, assiduidade) tiram-se com <b>Obrigatória · tirar desta aula</b>
          e deixam de contar.
        </P>

        <H>Arquivar e eliminar</H>
        <P>
          O professor arquiva: o plano sai do calendário e fica no Arquivo, de onde o podes repor.
          <b> Eliminar para sempre é só com a coordenadora</b> (Dados e segurança).
        </P>

        <H>Publicar</H>
        <P>
          A aplicação pergunta para que turma é. <b>Enquanto não publicares, os alunos não veem a
          aula.</b> Depois de publicar aparece <b>A enviar…</b> e, quando chega, <b>Chegou</b>: a
          partir daí os telemóveis dos alunos já o têm.
        </P>
      </>
    ),
  },

  // ── 7 ────────────────────────────────────────────────────
  {
    id: 'aula',
    titulo: 'Durante a aula',
    resumo: 'Abrir a aula, ver a turma, grupos, telemóveis e PINs.',
    conteudo: (
      <>
        <H>O Início</H>
        <P>
          Em cima está <b>a aula de hoje</b>, com o botão da etapa em que vais: preparar, publicar,
          abrir a aula, ver a turma, validar. Por baixo, a unidade em curso, o que está por validar
          e quatro atalhos. O resto está no menu <b>☰</b>.
        </P>

        <H>Abrir a aula</H>
        <P>
          Os alunos só registam a entrada depois de <b>abrires a aula</b>; é daí que contam os 10
          minutos de tolerância. Por baixo aparece se a abertura <b>chegou aos alunos</b> — fica
          verde logo que está na base de dados.
        </P>

        <H>A vista de turma</H>
        <P>
          <b>Turma</b>, no menu do plano: quem entrou e a que horas, a farda, os registos do
          KitchenFlow e quem já se autoavaliou. As decisões de falta fazem-se daí.
        </P>

        <H>Grupos e líder do KitchenFlow</H>
        <P>
          Os alunos formam os grupos no telemóvel e tu vês, mudas e validas. Num grupo, os registos
          de HACCP fazem-se uma vez: escolhes o líder e podes trocar se faltar. Os grupos e o líder
          chegam na hora aos telemóveis.
        </P>

        <H>O PIN e o telemóvel</H>
        <P>
          Na primeira entrada, o PIN fica ligado ao telemóvel do aluno. Se o telemóvel parecer outro
          — o iPhone apaga a memória do site ao fim de 7 dias sem o abrir, e abrir o link pelo
          WhatsApp ou pelo Instagram conta como outro browser — o aluno <b>entra na mesma com o PIN
          certo</b> e o PIN passa para esse telemóvel.
        </P>
        <Destaque>
          Nesse caso recebes um aviso em <b>Avisos</b>: «… entrou noutro telemóvel ou browser». Se
          não foi o próprio aluno, muda-lhe o PIN no separador <b>PIN temp.</b> do plano.
        </Destaque>

        <H>Aluno sem PIN</H>
        <P>
          Se o aluno esqueceu o PIN, gera-lhe um PIN temporário no separador <b>PIN temp.</b>
          dentro do plano.
        </P>
      </>
    ),
  },


  // ── Técnicas ─────────────────────────────────────────────
  {
    id: 'tecnicas',
    titulo: 'As técnicas da aula: o ramo completo',
    resumo: 'Da ficha técnica ao que se vê: prato → aparelho → técnica → subtécnica.',
    conteudo: (
      <>
        <P>
          As técnicas a avaliar <b>vêm das fichas técnicas</b> do plano. Quando
          crias a ficha com a IA, ela escolhe da lista da escola o que o aluno
          faz naquela receita — mesmo que seja de outra área (um evento de
          pastelaria numa UC de cozinha, por exemplo).
        </P>
        <Tabela
          cabecalho={['Nível', 'O que é', 'Exemplo']}
          linhas={[
            ['Prato', 'A ficha técnica', 'Lasanha'],
            ['Aparelho', 'Uma preparação base, de cozinha ou pastelaria', 'Molho béchamel'],
            ['Técnica', 'O que se faz', 'Ligar'],
            ['Subtécnica', 'O que se vê quando está bem feito', 'Roux branco: cor de marfim, sem grumos'],
          ]}
        />
        <P>
          O aluno, as <b>Competências</b> do plano e a <b>Validação</b> mostram
          sempre o ramo: «Lasanha → Molho béchamel → Ligar · Roux branco ·
          Bem feito é: …». Nunca «roux branco» solto.
        </P>
        <Destaque>
          As fichas feitas antes desta mudança mostram só «Prato → Técnica»,
          porque não sabem o aparelho. Para o ramo completo, gera a ficha de
          novo com a IA.
        </Destaque>
        <H>Tirar ou voltar a incluir</H>
        <P>
          Em <b>Competências</b>, <b>− Remover</b> tira uma técnica desta aula.
          Fica riscada, com <b>+ Incluir</b> para a repor.
        </P>
        <H>O que falta na UC</H>
        <P>
          O aviso de cobertura mostra o que a UC pede e ainda não foi avaliado
          — prática, conhecimentos e atitudes. Fica vermelho nas duas últimas
          semanas da UC.
        </P>
        <H>Conhecimentos</H>
        <P>
          Em cada aula escreves os conhecimentos a avaliar, com sugestões do
          referencial da UC. O aluno autoavalia-se em cada um e tu validas.
        </P>
      </>
    ),
  },

  // ── Medidas ──────────────────────────────────────────────
  {
    id: 'medidas',
    titulo: 'Alunos com medidas educativas',
    resumo: 'Universais, seletivas ou adicionais: os mesmos resultados, perguntas mais fáceis.',
    conteudo: (
      <>
        <H>Onde se escolhe</H>
        <Passos itens={[
          <>No menu, <b>Mapa da turma</b>.</>,
          <>Abre o aluno.</>,
          <>Em <b>Medidas educativas</b>, escolhe <b>Universais</b>, <b>Seletivas</b> ou <b>Adicionais</b>.</>,
        ]} />
        <P>
          O nível fica guardado no arquivo da escola e chega ao telemóvel do
          aluno na próxima vez que ele entrar ou carregar em Atualizar.
        </P>
        <H>O que muda para o aluno</H>
        <Tabela
          cabecalho={['', 'Universais', 'Seletivas e adicionais']}
          linhas={[
            ['Frases das atitudes', 'As normais', 'Curtas, uma ideia de cada vez'],
            ['Opções das técnicas', 'As normais', '«Fiz com ajuda», «Fiz sozinho/a»…'],
            ['Exemplo pedido', 'Uma coisa concreta que fez', 'Uma frase'],
            ['Preparações base (aparelhos)', 'Todas', 'Todas, com «O que é» e uma frase simples a explicar'],
          ]}
        />
        <Destaque cor="verde">
          Os resultados a atingir são os mesmos. Muda o caminho: perguntas mais
          fáceis de ler, sobre o que se vê. As medidas adicionais que alteram
          o currículo ainda não estão na aplicação.
        </Destaque>
      </>
    ),
  },

  // ── Eventos ──────────────────────────────────────────────
  {
    id: 'eventos',
    titulo: 'Eventos: organizar e avaliar',
    resumo: 'O ecrã Eventos organiza; «Avaliar evento fora do horário» avalia os alunos.',
    conteudo: (
      <>
        <H>1. Organizar — menu Eventos</H>
        <Passos itens={[
          <><b>Novo evento</b>: perguntas rápidas, uma de cada vez (cliente, data, local, pessoas, serviço…). O que não souberes, salta.</>,
          <>No evento, o cartão <b>Agora</b> diz a próxima coisa a fazer, e os cartões mostram o que falta em cada parte.</>,
          <><b>Perguntas ao cliente</b>: só as que se aplicam; podes copiá-las para email ou imprimir.</>,
          <><b>Fichas e orçamentos</b>: juntas as fichas, crias um ou mais orçamentos e fazes a requisição de cada um.</>,
          <><b>Folha de orçamento</b>: juntas bebidas, descartáveis, transporte…, a Direção põe o valor por pessoa, e imprimes a folha para o cliente, com o logótipo. Sem valor da Direção, a folha diz «valor por definir».</>,
          <><b>Preparação</b>, <b>Material</b> e <b>Dia do evento</b> (hora a hora): listas que se vão marcando.</>,
          <><b>Fechar</b>: cinco perguntas e o relatório.</>,
        ]} />
        <H>2. Avaliar os alunos — «Avaliar evento fora do horário»</H>
        <P>
          Cria um plano de evento. Tem numeração própria (E-2026-001), não
          conta no «Plano 1 de 17» e aparece a roxo no calendário do professor
          e do aluno.
        </P>
        <Tabela
          cabecalho={['Participação', 'Como funciona']}
          linhas={[
            ['A turma toda (obrigatório)', 'Todos os alunos da turma participam'],
            ['Quem se inscrever', 'O aluno inscreve-se em «Atividades e concursos»; tu aceitas no plano do evento'],
          ]}
        />
        <P>
          Só os participantes se autoavaliam e só eles contam para o bónus
          (ver «O bónus dos eventos e os tetos»).
        </P>
      </>
    ),
  },

  // ── 8 ────────────────────────────────────────────────────
  {
    id: 'requisicoes',
    titulo: 'Requisições e orçamentos',
    resumo: 'A diferença, a numeração, e onde encontrar as antigas.',
    conteudo: (
      <>
        <H>A diferença</H>
        <Tabela
          cabecalho={['', 'Requisição', 'Orçamento']}
          linhas={[
            ['Ligada a uma aula', 'Sim', 'Não'],
            ['Para quê', 'Pedir ao economato para aquela aula', 'Calcular custos: um evento, um almoço, uma encomenda'],
            ['Identifica-se por', 'O plano a que pertence', 'Número próprio (O01, O02…)'],
          ]}
        />

        <P>
          Uma requisição feita fora de um plano também leva número próprio
          — R01, R02, e por aí.
        </P>

        <H>Onde estão as antigas</H>
        <P>
          Em <b>Orçamentos</b>, separador <b>Histórico</b>. Tens lá todas,
          com o número, a data, o custo e quantos ingredientes. Podes
          reabrir qualquer uma.
        </P>

        <H>Juntar fichas de outras aulas</H>
        <P>
          Ao fazer uma requisição, o separador <b>Biblioteca</b> mostra
          todas as fichas que já fizeste, não só as daquele plano. Podes
          juntar as que quiseres e ajustar as doses sem mexer na ficha
          original.
        </P>

        <Destaque>
          Se duas fichas pedirem o mesmo produto com nomes diferentes —
          "Ovos M" e "Ovos L" — a aplicação assinala antes de enviares.
          Não junta sozinha, porque às vezes a distinção é mesmo precisa.
        </Destaque>
      </>
    ),
  },

  // ── 9 ────────────────────────────────────────────────────
  {
    id: 'dados',
    titulo: 'Onde ficam guardados os dados',
    resumo: 'Na base de dados (rápida) e no Sheets da escola (arquivo).',
    conteudo: (
      <>
        <P>
          Tudo é guardado primeiro <b>no aparelho onde estás</b> e enviado a seguir para dois sítios:
        </P>
        <Tabela
          cabecalho={['Onde', 'Para quê', 'O que lá vai']}
          linhas={[
            ['Base de dados (Firebase)', 'Chega em cerca de 1 segundo aos outros aparelhos',
              'Planos, fichas, abertura da aula, presenças, autoavaliações, validações, notas, grupos, avaliação entre colegas e líder do KitchenFlow'],
            ['Sheets da escola', 'Arquivo de tudo, para ler e para as cópias de segurança',
              'Tudo o que está acima e ainda requisições, eventos, recuperações, pautas e preços'],
          ]}
        />

        <H>Ler o Sheets</H>
        <P>
          Cada turma tem um separador com o nome dela (por exemplo «1º BCR»), refeito sozinho de 10
          em 10 minutos:
        </P>
        <Passos itens={[
          <><b>Os alunos</b> — presenças, faltas, atrasos, autoavaliações, validadas, média e telemóvel.</>,
          <><b>As notas de cada UC</b> — um aluno por linha e uma aula por coluna: a nota validada, «AA» (autoavaliou-se, falta validar) ou «F» (faltou).</>,
          <><b>As aulas</b> — dia, horas, UC, tipo, se foi aberta e quantos vieram.</>,
        ]} />
        <Destaque cor="bordeaux">
          As folhas de dados (ALUNOS, PLANOS, PRESENCAS…) e as fichas por extenso estão
          <b> escondidas, não apagadas</b>: a aplicação grava nelas. Para as ver: menu
          <b> Ver › Folhas ocultas</b>. Não as apagues nem ordenes durante as aulas.
        </Destaque>

        <H>Se fechares com coisas por guardar</H>
        <P>
          O browser pergunta se queres mesmo sair. Na próxima vez que abrires, a aplicação envia
          sozinha o que ficou pendente.
        </P>
      </>
    ),
  },
];

// ══════════════════════════════════════════════════════════════

export function ManualProfessor() {
  const [aberta, setAberta] = useState<string | null>(SECCOES[0].id);

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{
        background: C.bordeaux, borderRadius: 14, padding: '18px 20px',
        marginBottom: 16, color: '#fff',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>
          Manual do professor
        </h2>
        <div style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.5 }}>
          Como a avaliação funciona, o que cada peça de um plano traz, e
          o que acontece aos dados.
        </div>
      </div>

      {SECCOES.map((s, i) => {
        const estaAberta = aberta === s.id;
        return (
          <div key={s.id} style={{
            border: `1px solid ${estaAberta ? C.bordeaux : C.linha}`,
            borderRadius: 12, marginBottom: 9, overflow: 'hidden',
            background: '#fff',
          }}>
            <button
              onClick={() => setAberta(estaAberta ? null : s.id)}
              style={{
                width: '100%', padding: '14px 16px', border: 'none',
                background: estaAberta ? C.bordeauxSuave : '#fff',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
              <span style={{
                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                background: estaAberta ? C.bordeaux : 'rgba(26,23,20,0.07)',
                color: estaAberta ? '#fff' : C.tenue,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12.5, fontWeight: 800, marginTop: 1,
              }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: 15.5, fontWeight: 700,
                  color: estaAberta ? C.bordeaux : C.tinta,
                }}>{s.titulo}</span>
                <span style={{
                  display: 'block', fontSize: 13, color: C.suave, marginTop: 2,
                  lineHeight: 1.45,
                }}>{s.resumo}</span>
              </span>
              <span style={{ fontSize: 17, color: C.tenue, flexShrink: 0 }}>
                {estaAberta ? '−' : '+'}
              </span>
            </button>

            {estaAberta && (
              <div style={{
                padding: '4px 18px 18px', fontSize: 14.5, color: C.tinta,
                borderTop: `1px solid ${C.linha}`,
              }}>
                {s.conteudo}
              </div>
            )}
          </div>
        );
      })}

      <div style={{
        marginTop: 18, padding: '13px 15px', borderRadius: 10,
        background: 'rgba(26,23,20,0.04)', fontSize: 13, color: C.suave,
        lineHeight: 1.6,
      }}>
        Os valores deste manual — pesos, bónus, tolerância — vêm
        directamente do código da aplicação. Se forem alterados, este
        texto acompanha.
      </div>
    </div>
  );
}

export default ManualProfessor;
