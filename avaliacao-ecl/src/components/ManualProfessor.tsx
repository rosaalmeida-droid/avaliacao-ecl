// ============================================================
// Manual do professor.
//
// Reescrito de raiz: o anterior falava de separadores que já não
// existem ("tab Autoavaliações", botão "+" no canto) e não explicava o
// que mais falta ao professor — como a nota se forma, quanto pesa cada
// parte, o que acontece quando um aluno falta.
//
// Os números deste manual vêm do código, não de memória:
//   PESOS_AULA e BONUS_PARTICIPACAO em types.ts
//   OBRIGATORIAS em compatECL.ts
//   nivelConsolidado em motorAvaliacao.ts
// Se esses valores mudarem, este manual tem de mudar com eles.
// ============================================================

import React, { useState } from 'react';
import { PESOS_AULA, BONUS_PARTICIPACAO } from '../types';
import { DESCONTO_POR_ATRASO, DESCONTO_POR_FALTA, DESCONTO_POR_FARDA_INCOMPLETA } from '../backend';

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
          a média ponderada é multiplicada por 4 para dar a nota de <b>0 a 20</b>.
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
          com os mesmos pesos, e depois soma os dois bónus: o de
          assiduidade e o de eventos.
        </P>

        <H>As competências obrigatórias</H>
        <P>
          São três, em <b>todas as aulas práticas</b>, tenha a aula fichas
          técnicas ou não — mas não contam todas no mesmo sítio:
        </P>
        <ul style={{ lineHeight: 1.75, fontSize: 14.5, paddingLeft: 20 }}>
          <li><b>HACCP e registos</b> — o KitchenFlow preenchido. É esta que entra na nota da aula.</li>
          <li><b>Higiene pessoal</b> — farda completa, sem adornos, mãos lavadas. Verificada à entrada; conta no bónus de assiduidade da UC.</li>
          <li><b>Assiduidade e pontualidade</b> — contam também no bónus de assiduidade.</li>
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
    titulo: 'Os dois bónus da nota da UC',
    resumo: `Assiduidade até +2 · eventos até +${(BONUS_PARTICIPACAO.porAtividade * BONUS_PARTICIPACAO.maxAtividades).toFixed(2).replace('.', ',')}. Sem eventos, o teto é ${BONUS_PARTICIPACAO.tetoSemParticipacao}.`,
    conteudo: (
      <>
        <H>1. Assiduidade, pontualidade e farda — até +2</H>
        <P>
          Cada aluno começa com os 2 valores e perde uma parte por cada falha,
          ao longo de todas as aulas da UC:
        </P>
        <Tabela
          cabecalho={['', 'Parte do bónus', 'Desconto por falha']}
          linhas={[
            ['Pontualidade', '0,5', `−${String(DESCONTO_POR_ATRASO).replace('.', ',')} por atraso`],
            ['Assiduidade', '0,5', `−${String(DESCONTO_POR_FALTA).replace('.', ',')} por falta`],
            ['Farda', '1,0', `−${String(DESCONTO_POR_FARDA_INCOMPLETA).replace('.', ',')} por aula com farda incompleta`],
          ]}
        />
        <P>
          É por isso que a farda não entra na nota da aula: conta aqui.
        </P>

        <H>2. Eventos e concursos</H>
        <P>
          A participação em eventos e concursos <b>não é uma componente
          ponderada</b>. É um acréscimo à nota já calculada. Conta quem
          participou mesmo, não quem se inscreveu.
        </P>
        <P>
          Foi desenhado assim de propósito: quem participa <b>sobe</b>, em
          vez de quem não participa <b>descer</b> por razões que muitas
          vezes não dependem dele — trabalha, mora longe, toma conta de
          irmãos.
        </P>

        <Tabela
          cabecalho={['', 'Valor']}
          linhas={[
            ['Por atividade concluída', `+${BONUS_PARTICIPACAO.porAtividade.toFixed(2).replace('.', ',')} valores`],
            ['Máximo de atividades contadas', `${BONUS_PARTICIPACAO.maxAtividades}`],
            ['Acréscimo máximo', `+${(BONUS_PARTICIPACAO.porAtividade * BONUS_PARTICIPACAO.maxAtividades).toFixed(2).replace('.', ',')} valores`],
            ['Nota mínima para o bónus contar', `${BONUS_PARTICIPACAO.notaBaseMinima} valores`],
            ['Teto sem qualquer participação', `${BONUS_PARTICIPACAO.tetoSemParticipacao} valores`],
          ]}
        />

        <H>Porquê a nota mínima de {BONUS_PARTICIPACAO.notaBaseMinima}</H>
        <P>
          Não se leva a concurso quem tem negativa. Um aluno com
          dificuldades pode e deve concorrer — mas tem de estar acima do
          mínimo, senão o concurso serve para tapar o que falta em vez de
          premiar o que já se conquistou.
        </P>

        <H>Porquê o teto de {BONUS_PARTICIPACAO.tetoSemParticipacao}</H>
        <P>
          Um {BONUS_PARTICIPACAO.tetoSemParticipacao + 1} ou mais exige
          mostrar o trabalho fora da sala. Quem nunca participou em nada
          chega no máximo a {BONUS_PARTICIPACAO.tetoSemParticipacao}.
        </P>

        <H>A ordem das contas</H>
        <P>
          Primeiro a nota das competências; depois soma-se o bónus de
          assiduidade; por fim o de eventos — ou o teto de{' '}
          {BONUS_PARTICIPACAO.tetoSemParticipacao}, se o aluno não participou
          em nada. O mínimo de {BONUS_PARTICIPACAO.notaBaseMinima} para o bónus
          de eventos olha para a nota das competências, antes de qualquer bónus.
        </P>

        <Destaque cor="verde">
          <b>Exemplo.</b> Aluno com 15 nas competências, sem faltas nem
          atrasos, farda sempre completa, participou em duas atividades:
          15 + 2 + (2 × {BONUS_PARTICIPACAO.porAtividade.toFixed(2).replace('.', ',')})
          = <b>{Math.min(20, 15 + 2 + 2 * BONUS_PARTICIPACAO.porAtividade).toFixed(1).replace('.', ',')} valores</b>.
          <br /><br />
          Aluno com 16 nas competências, bónus de assiduidade completo, nenhuma
          participação: 16 + 2 = 18, mas fica em <b>{BONUS_PARTICIPACAO.tetoSemParticipacao}</b>.
          <br /><br />
          Aluno com 8 nas competências e bónus de assiduidade completo: fica
          em 10. Participou em três eventos, mas não recebe esse bónus, porque
          a nota das competências está abaixo de {BONUS_PARTICIPACAO.notaBaseMinima}.
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

        <H>A nota prevista</H>
        <P>
          Enquanto se autoavalia, o aluno vê a nota que a proposta dele dá
          nessa aula, com uma margem de 2 valores para cima e para baixo — por
          exemplo, "14, deve ficar entre 12 e 16". A aplicação diz-lhe sempre
          que és tu quem confirma.
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
    resumo: 'Nada é obrigatório, mas cada peça traz alguma coisa.',
    conteudo: (
      <>
        <H>O que um plano pode ter</H>
        <Tabela
          cabecalho={['Peça', 'Obrigatória?', 'O que traz']}
          linhas={[
            ['Ficha técnica', 'Não', 'As competências técnicas, os ingredientes e os alergénios'],
            ['Guião de produção', 'Não', 'O passo a passo para o aluno seguir sozinho'],
            ['Requisição', 'Não', 'O pedido ao economato e o custo da aula'],
            ['Competências', 'Sim', 'Sem fichas, escolhes tu quais avaliar'],
          ]}
        />

        <Destaque>
          <b>Sem ficha técnica</b>, a aula continua a funcionar: as
          obrigatórias e as atitudes são avaliadas na mesma. O que tens de
          fazer é escolher à mão as competências técnicas, se quiseres
          avaliar alguma.
        </Destaque>

        <H>Mudar um plano já feito</H>
        <P>
          Podes a qualquer momento acrescentar fichas, tirar fichas,
          escrever ou apagar o guião, e refazer a requisição. Se
          acrescentares uma ficha depois de a requisição estar feita, a
          aplicação avisa que os ingredientes mudaram.
        </P>

        <H>Corrigir um plano</H>
        <P>
          No menu do plano, <b>Editar o plano</b> muda a data, as horas, o tipo
          de aula, a unidade e o título — a qualquer momento, mesmo com a aula
          já aberta e os alunos avaliados. As avaliações ficam; se mudares a
          unidade, passam a contar para a nova. As fichas mudam-se no Preparar.
        </P>

        <H>Eliminar um plano</H>
        <P>
          Se a aula ainda não tem trabalho dos alunos, podes arquivá-la ou
          eliminá-la. Se já tem — entradas, autoavaliações, validações — a
          aplicação mostra-te tudo o que existe e dá-te duas saídas:
        </P>
        <ul style={{ lineHeight: 1.75, fontSize: 14.5, paddingLeft: 20 }}>
          <li><b>Corrigir o plano e manter as avaliações</b> — para enganos na ficha, na unidade ou na data.</li>
          <li><b>Anular a aula e apagar as avaliações</b> — a aula não devia ter contado. Pede uma segunda confirmação e apaga mesmo: as notas, as presenças e os atrasos dessa aula deixam de contar. A requisição fica, fora de plano.</li>
        </ul>

        <H>Publicar</H>
        <P>
          <b>Enquanto não publicares, os alunos não veem a aula</b> — nem
          no calendário, nem nas próximas aulas. Podes publicar mesmo sem
          ficha associada e acrescentá-la depois.
        </P>
      </>
    ),
  },

  // ── 7 ────────────────────────────────────────────────────
  {
    id: 'aula',
    titulo: 'Durante a aula',
    resumo: 'Abrir a aula, ver a turma, resolver PINs.',
    conteudo: (
      <>
        <H>Abrir a aula</H>
        <P>
          Os alunos só conseguem registar a entrada depois de <b>abrires a
          aula</b>. Antes disso podem consultar o plano, a ficha e o
          guião, mas nada fica registado.
        </P>
        <P>
          É a partir da abertura que contam os 10 minutos de tolerância.
        </P>

        <H>A vista de turma</H>
        <P>
          No menu do plano, <b>Turma</b> mostra numa lista: quem entrou e a
          que horas, quem tem farda incompleta e o que falta, quem fez os
          registos do KitchenFlow, e quem já se autoavaliou.
        </P>
        <P>
          As decisões de falta fazem-se daí, sem sair do ecrã.
        </P>

        <H>O PIN e o telemóvel</H>
        <P>
          Na primeira entrada, o PIN do aluno fica ligado ao telemóvel onde
          ele entrou. Nas seguintes, só esse telemóvel entra com esse PIN — um
          colega que o saiba não consegue entrar noutro.
        </P>
        <Destaque>
          Se o aluno mudar de telemóvel, limpar o browser ou usar uma janela
          anónima, fica recusado. <b>Liberta-o</b> no separador <b>PIN temp.</b>{' '}
          do plano — a próxima entrada volta a ligar. Não experimentes a
          aplicação com o PIN de um aluno no teu computador: o PIN fica ligado
          a ele.
        </Destaque>

        <H>Aluno sem PIN</H>
        <P>
          Se um aluno esqueceu o PIN e não consegue entrar, gera-lhe um
          PIN temporário no separador <b>PIN temp.</b> dentro do plano. O
          telemóvel fica libertado ao mesmo tempo.
        </P>

        <H>Líder do KitchenFlow</H>
        <P>
          Num grupo, os registos de HACCP fazem-se uma vez. Escolhes quem
          é o líder e podes trocar se ele faltar.
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
    resumo: 'O que está guardado só aqui e o que já está no arquivo da escola.',
    conteudo: (
      <>
        <P>
          Tudo é guardado primeiro <b>no computador onde estás</b>, e
          enviado a seguir para o arquivo da escola.
        </P>

        <Destaque cor="bordeaux">
          <b>O envio não devolve confirmação.</b> É uma limitação do Google
          Apps Script, não do código. Por isso a aplicação confirma de
          outra maneira: vai ler o arquivo e vê se o que enviou lá está.
          <br /><br />
          No topo do painel há uma linha a dizer o estado. Se disser que
          há coisas por guardar, <b>não feches o browser</b> sem carregar
          em "Guardar agora".
        </Destaque>

        <H>Mudar de computador</H>
        <P>
          Ao abrir a aplicação noutro computador, ela vai buscar ao arquivo
          o que lá estiver. Se alguma coisa não tiver chegado lá, não
          aparece — daí a importância do aviso acima.
        </P>

        <H>Se fechares com coisas por guardar</H>
        <P>
          O browser pergunta se queres mesmo sair. E na próxima vez que
          abrires, a aplicação tenta enviar sozinha o que ficou pendente.
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
