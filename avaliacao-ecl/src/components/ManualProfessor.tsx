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
                // Fundo claro explícito: o estilo geral das tabelas punha o
                // cabeçalho escuro, e este texto cinzento deixava de se ler.
                color: C.tenue, whiteSpace: 'nowrap', background: 'transparent',
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

// Percentagem real de cada parte: os pesos de PESOS_AULA são repartidos
// pelo que a aula avalia (como em calcularNotaPlano). Numa aula teórica,
// 65% + 20% passam a valer 76% + 24%.
function pct(tipo: keyof typeof PESOS_AULA, cat: 'OBR' | 'SUB' | 'KNW' | 'ATI'): string {
  const p = PESOS_AULA[tipo];
  const soma = p.OBR + p.SUB + p.KNW + p.ATI;
  return p[cat] ? `${Math.round((100 * p[cat]) / soma)}%` : '—';
}

const SECCOES: Seccao[] = [

  // ── 1 ────────────────────────────────────────────────────
  {
    id: 'nota',
    titulo: 'Como se forma a nota',
    resumo: 'A escala, o peso de cada parte e as diferenças entre aula prática, mista, teórica e de atitudes.',
    conteudo: (
      <>
        <P>
          Cada competência é avaliada numa escala de <b>1 a 5</b>, e cada nível corresponde a
          0, 5, 10, 15 ou 20 valores (Não fiz · Tentei · Com ajuda · Sozinho · Muito bom).
          A média ponderada das partes dá a nota da aula, de <b>0 a 20</b> valores.
        </P>
        <P>
          A opção «Não tive oportunidade» não conta para a nota. Chega ao professor para
          confirmação: se não corresponder à verdade, o professor altera-a para «Não fiz»,
          que conta 0.
        </P>

        <H>Peso de cada parte, por tipo de aula</H>
        <Tabela
          cabecalho={['Parte', 'Prática', 'Mista', 'Teórica', 'Só atitudes']}
          linhas={[
            ['Obrigatórias (farda e registos)', pct('pratico', 'OBR'), pct('misto', 'OBR'), pct('teorico', 'OBR'), pct('atitudinal', 'OBR')],
            ['Técnicas (subtécnicas e preparações base)', pct('pratico', 'SUB'), pct('misto', 'SUB'), pct('teorico', 'SUB'), pct('atitudinal', 'SUB')],
            ['Conhecimentos', pct('pratico', 'KNW'), pct('misto', 'KNW'), pct('teorico', 'KNW'), pct('atitudinal', 'KNW')],
            ['Atitudes', pct('pratico', 'ATI'), pct('misto', 'ATI'), pct('teorico', 'ATI'), pct('atitudinal', 'ATI')],
          ]}
        />
        <P>
          Numa aula teórica não há técnicas nem registos de higiene e segurança alimentar, porque
          não há produção. Por isso, os conhecimentos passam a valer {pct('teorico', 'KNW')} e as
          atitudes {pct('teorico', 'ATI')}. Numa aula só de atitudes em que o professor decida
          avaliar também a farda e a higiene, estas valem {pct('atitudinal_obr', 'OBR')} e as
          atitudes {pct('atitudinal_obr', 'ATI')}.
        </P>

        <H>Quando uma parte não é avaliada</H>
        <P>
          O peso dessa parte é repartido pelas restantes, na mesma proporção. Por exemplo, numa
          aula prática sem conhecimentos avaliados, o peso dos conhecimentos passa para as
          técnicas: as técnicas valem 60%, as obrigatórias 20% e as atitudes 20%.
        </P>

        <H>A nota da aula e a nota da UC</H>
        <P>
          <b>Só conta a validação do professor.</b> A autoavaliação do aluno é uma proposta: chega
          ao professor já preenchida, para que este a confirme ou corrija, mas não entra em nenhuma
          nota.
        </P>
        <P>
          A nota da UC resulta das validações de todas as aulas dessa UC, com os mesmos pesos. A
          esse valor soma-se o bónus dos eventos e concursos. Não existe bónus de assiduidade,
          porque quem falta já é penalizado: a aula a que faltou conta 0.
        </P>
        <P>
          <b>Aula sem autoavaliação:</b> se o aluno esteve na aula e não se autoavaliou, essa aula
          conta 0 na nota da UC até o aluno se autoavaliar. Uma autoavaliação enviada e ainda por
          validar não conta 0: aguarda a validação do professor. O aluno vê o aviso na aplicação e
          recebe também um email no endereço da escola, que indica obrigatoriamente na primeira entrada.
        </P>

        <H>As competências obrigatórias</H>
        <P>
          São três e aplicam-se a <b>todas as aulas práticas</b>, com ou sem fichas técnicas.
          Não contam, no entanto, todas da mesma forma:
        </P>
        <ul style={{ lineHeight: 1.75, fontSize: 14.5, paddingLeft: 20 }}>
          <li>
            <b>Higiene e segurança alimentar (HACCP) e registos</b>: corresponde aos registos do
            KitchenFlow. É esta competência que entra na nota da aula.
          </li>
          <li>
            <b>Higiene pessoal</b>: farda completa, sem adornos e com as mãos lavadas. É verificada
            à entrada. <b>Se o aluno não tiver a farda completa, é avaliado em tudo (a avaliação
            fica no seu percurso), mas as técnicas contam 0 na nota da aula.</b> As atitudes contam
            normalmente, a atitude «Cuidado com a apresentação pessoal» é sempre avaliada e o aluno
            responde a três perguntas sobre o que aconteceu. A falta de farda não conta como falta
            de presença.
          </li>
          <li>
            <b>Assiduidade e pontualidade</b>: contam no Comprometido da pauta. A aula a que o aluno
            faltou conta 0.
          </li>
        </ul>
        <P>
          Se o aluno não tiver registos no KitchenFlow, a competência de higiene e segurança
          alimentar chega ao professor com o nível 1. Confirme-a antes de validar.
        </P>

        <H>As técnicas não são obrigatórias em todas as aulas</H>
        <Destaque>
          Uma aula pode não ter nenhuma competência técnica para avaliar, e isso é normal. As
          técnicas resultam das fichas técnicas de produção: se a aula não tiver fichas, não há
          técnicas para avaliar.
          <br /><br />
          Uma competência que não houve ocasião de avaliar numa UC é avaliada <b>ao longo do ano</b>,
          noutras aulas. A nota da UC é sempre a da pauta: as aulas dadas, cada uma pela sua nota,
          e as aulas em falta ou sem autoavaliação contam 0.
        </Destaque>
      </>
    ),
  },

  // ── 2 ────────────────────────────────────────────────────
  {
    id: 'bonus',
    titulo: 'O bónus dos eventos e as notas máximas',
    resumo: 'Os eventos e os concursos podem dar até 2 valores. A nota máxima é 17 sem participação, 18 só com eventos e 20 com concurso. Não há bónus de assiduidade.',
    conteudo: (
      <>
        <H>Não há bónus de assiduidade</H>
        <P>
          Quem cumpre não ganha valores extra, e quem falha é penalizado uma única vez, sem que a
          mesma situação conte duas vezes: a aula a que o aluno faltou conta 0, os atrasos e as
          faltas pesam no Comprometido da pauta e, a partir de 10% de faltas, o aluno fica em
          recuperação. Sem farda completa, as técnicas da aula contam 0, mas isso não conta como
          falta.
        </P>

        <H>Eventos e concursos: até 2 valores</H>
        <P>
          O bónus não é uma parte da média: é um acréscimo à nota. Cada evento ou concurso é uma
          <b> atividade extra</b> (ver «Plano de aula e atividade extra»). O aluno autoavalia-se e
          o professor valida, tal como numa aula.
        </P>
        <Tabela
          cabecalho={['', 'Evento', 'Concurso']}
          linhas={[
            ['Bónus', 'Até 0,5 valores, de acordo com a nota validada', 'Até 1 valor'],
            ['O que se avalia', 'As atitudes (se ainda não forem avaliadas no plano de aula), a técnica geral e as técnicas da ficha técnica', 'Candidatura: 0,2 · participação: 0,2 · cada fase: 0,2 · vitória: completa o valor'],
            ['Sem farda', 'Não conta', 'Não conta'],
            ['Aluno com nota inferior a 10', 'Conta e ajuda a subir a nota', 'Não participa em concursos'],
            ['Fora do ano letivo', 'Conta no plano de aula seguinte da UC', 'Conta no plano de aula seguinte da UC'],
          ]}
        />
        <Tabela
          cabecalho={['O aluno participou em', 'Nota máxima']}
          linhas={[['Nenhum evento ou concurso', '17'], ['Apenas eventos', '18'], ['Pelo menos um concurso', '20']]}
        />
        <P>
          O concurso vale mais porque obriga o aluno a expor o seu trabalho e a ser avaliado por
          pessoas de fora da escola. Valoriza-se a coragem de participar, e não apenas a vitória.
          As notas máximas existem porque o 20 exige que o aluno mostre o seu trabalho fora da
          sala de aula e participe num concurso.
        </P>
        <H>A ordem dos cálculos</H>
        <P>
          Primeiro calcula-se a nota das competências (as aulas a que o aluno faltou ou em que não
          tinha farda contam 0). Depois soma-se o bónus dos eventos e concursos (até 2 valores).
          Por fim, aplica-se a nota máxima (17, 18 ou 20).
        </P>
        <Destaque cor="verde">
          <b>Exemplos.</b> 17 + 1 concurso + 3 eventos = <b>19</b>. 17 + 3 eventos = 18,5, que
          fica em <b>18</b>. Um aluno com 20 que não participou em nada fica com <b>17</b>. Um
          aluno com 20 e 3 eventos fica com <b>18</b>. 18 + 1 concurso + 3 eventos = <b>20</b>.
          8 + 2 eventos = <b>9</b>.
        </Destaque>
      </>
    ),
  },

  // ── 3 ────────────────────────────────────────────────────
  {
    id: 'faltas',
    titulo: 'Faltas e atrasos',
    resumo: 'A aplicação regista a hora de entrada; a decisão é sempre do professor.',
    conteudo: (
      <>
        <P>
          A tolerância de 10 minutos conta a partir do momento em que o professor <b>abre a
          aula</b>, e não a partir da hora marcada no plano. Mesmo que a aula seja aberta perto do
          fim, os atrasos só contam a partir desse momento.
        </P>
        <P>
          <b>Ao abrir a aula, a aplicação pergunta se os atrasos contam.</b> Escolha «Não» quando o
          atraso não é dos alunos (por exemplo, se a aula foi enviada mais tarde): nessa aula ninguém
          fica com atraso. Nas aulas abertas depois do dia do plano (para os alunos se
          autoavaliarem), a aplicação não marca atrasos nem faltas: conta apenas o que o professor
          registou nas presenças.
        </P>
        <Destaque>
          <b>Uma aula que não foi aberta não conta contra o aluno.</b> Sem a aula aberta, o aluno
          não consegue registar a presença, e a responsabilidade é do professor. Nessa aula não há
          faltas nem atrasos, a não ser que o professor os registe, aluno a aluno.
        </Destaque>

        <H>A aplicação não marca faltas</H>
        <P>
          Quando um aluno entra depois da tolerância, a aplicação regista a hora e assinala o
          atraso. A decisão cabe ao professor, que escolhe uma de três opções:
        </P>
        <ul style={{ lineHeight: 1.75, fontSize: 14.5, paddingLeft: 20 }}>
          <li><b>Sem falta</b>: houve uma razão que o professor aceita.</li>
          <li><b>Falta de atraso</b>.</li>
          <li><b>Falta de presença</b>.</li>
        </ul>

        <H>O aluno esteve só parte da aula</H>
        <P>
          Quando o professor marca «Só algumas horas», ou quando o aluno entra depois de já ter
          passado um tempo da aula, a autoavaliação começa com três perguntas sobre o que isso
          fez ao grupo e à confiança. O aluno não escreve: escolhe. Se escolher uma resposta
          errada, a aplicação explica porquê e ele escolhe outra vez. No fim, escolhe um
          compromisso para a próxima aula.
        </P>
        <P>
          Na validação, o professor vê a primeira resposta e a resposta final de cada pergunta,
          e o compromisso. Na aula seguinte, a aplicação diz ao professor e ao aluno se o
          compromisso foi cumprido.
        </P>
        <P>
          <b>A nota desce pelos tempos em que o aluno não esteve.</b> Se esteve em 1 de 3 tempos,
          a nota da aula conta 1/3. O professor vê a conta na nota prevista e pode escolher
          «Não descontar» quando a falta tem justificação.
        </P>

        <Destaque cor="bordeaux">
          <b>Uma falta de presença conta 0 na aula inteira</b>: técnicas, obrigatórias,
          conhecimentos e atitudes. Quem não esteve presente não tem avaliação parcial.
          <br /><br />
          Uma falta justificada também conta 0. A forma de salvaguardar o aluno é a
          <b> recuperação do módulo</b>, e não a anulação da falta.
        </Destaque>

        <H>Alunos externos</H>
        <P>
          São alunos de fora das turmas que vêm recuperar uma UC. Em <b>Recuperações › «Alunos
          externos — recuperações e pauta»</b>, o professor acrescenta o aluno, cria o plano de
          recuperação (a UC, a modalidade, o que o aluno tem de fazer e o prazo) e regista o que o
          aluno entregou e o resultado, de 0 a 20. O aluno externo não entra na aplicação. Em
          «Pauta por UC» obtém-se a pauta dessa UC, para imprimir, guardar em PDF ou exportar para
          Excel. Fica tudo registado no Sheets, e a coordenação vê a mesma informação.
        </P>

        <H>O limite dos 10%</H>
        <P>
          Os 10% calculam-se sobre o <b>total de horas da UC</b> previsto no cronograma, e não
          sobre as horas já dadas. Acima desse limite, o aluno fica em recuperação. O professor
          recebe um alerta sempre que um aluno se aproxima do limite.
        </P>
        <P>
          <b>Quando o aluno falta a parte de uma aula, contam as horas em falta.</b> Num plano de
          2 horas, faltar 1 hora conta 1 hora. A hora de almoço só é descontada nos planos que
          ocupam a manhã e a tarde.
        </P>
        <P>
          Nos eventos e concursos fora do horário <b>não há faltas</b>: quem não participa
          apenas não recebe o bónus.
        </P>

        <H>Uma falha de ligação nunca dá origem a uma falta</H>
        <P>
          Se a aplicação não conseguir enviar os dados, o aluno não é prejudicado. A entrada fica
          registada no aparelho e é enviada assim que houver ligação à internet.
        </P>
      </>
    ),
  },

  // ── 4 ────────────────────────────────────────────────────
  {
    id: 'banco',
    titulo: 'O banco de competências',
    resumo: 'O nível que o aluno já consolidou não desce.',
    conteudo: (
      <>
        <P>
          Cada competência guarda o <b>nível mais alto</b> que o aluno já atingiu. Se, numa aula
          seguinte, o desempenho nessa competência for inferior, o nível consolidado
          <b> não desce</b>.
        </P>
        <P>
          A razão é pedagógica: uma competência que foi demonstrada continua demonstrada. Um dia
          menos bom não apaga aquilo que o aluno já sabe fazer.
        </P>

        <Destaque>
          Isto <b>não</b> significa que a nota da aula suba. A avaliação dessa aula mantém-se, e é
          ela que entra na nota da UC (na pauta). O que não desce é o nível registado no percurso
          do aluno: mostra o que ele já sabe fazer, mas não muda a nota.
        </Destaque>

        <H>Consequência prática</H>
        <P>
          Se um aluno faltar a uma aula em que se avaliou uma técnica que já tinha consolidado, não
          perde o nível dessa técnica. Perde apenas a nota dessa aula.
        </P>
      </>
    ),
  },

  // ── 5 ────────────────────────────────────────────────────
  {
    id: 'autoavaliacao',
    titulo: 'Autoavaliação e validação',
    resumo: 'O aluno propõe uma nota; o professor confirma ou corrige.',
    conteudo: (
      <>
        <P>
          No fim da produção, o aluno <b>avalia-se em cada competência</b>. Essa avaliação não é a
          nota do aluno: é a sua proposta.
        </P>
        <P>
          O professor vê a proposta do aluno e confirma-a ou corrige-a. <b>A nota que conta é
          sempre a do professor.</b>
        </P>

        <H>Onde validar</H>
        <Passos itens={[
          <>Abra o plano de aula.</>,
          <>No menu do plano, à esquerda, escolha <b>Turma</b>.</>,
          <>Cada aluno que enviou a autoavaliação tem o botão <b>Validar agora</b>.</>,
          <>Aparecem as competências com a nota que o aluno propôs. Corrija as que for necessário.</>,
        ]} />

        <Destaque cor="bordeaux">
          Enquanto houver autoavaliações por validar, o plano assinala-o. Uma autoavaliação que não
          foi validada <b>não conta para nada</b>: nem para a nota nem para o banco de
          competências.
        </Destaque>

        <H>O aluno não vê números enquanto se autoavalia</H>
        <P>
          As opções não mostram números nem notas: o aluno escolhe a frase que descreve o que fez,
          e não o número que gostaria de ter. Nas opções mais altas, pede-se ao aluno um exemplo
          concreto do que fez, que aparece ao professor na validação.
        </P>
        <P>
          <b>Só depois de enviar</b> é que o aluno vê a nota que a sua proposta daria nessa aula,
          com uma margem de 2 valores (por exemplo: «14, deverá ficar entre 12 e 16»), e a
          indicação de que é o professor quem confirma a nota.
        </P>

        <H>A farda: «Não era verdade»</H>
        <P>
          O aluno declara a farda à entrada, com o aviso de que a declaração tem de ser verdadeira.
          Na validação, o professor confirma-a. Se a declaração não corresponder à verdade, carregue
          em <b>Não era verdade</b>: a farda e a responsabilidade ficam com o nível 1.
        </P>

        <H>A ficha técnica antes da autoavaliação</H>
        <P>
          O aluno só chega à autoavaliação depois de marcar, na ficha técnica, todos os passos da
          preparação. A aplicação guarda a hora de cada passo. Na validação, por baixo do nome do aluno,
          aparece por exemplo «Creme de legumes: 9 de 9 passos marcados, das 9:12 às 12:40». Se o aluno
          marcou três ou mais passos em menos de 2 minutos, aparece um aviso: provavelmente marcou tudo
          de seguida, sem os fazer. Numa aula teórica, ou numa ficha sem passos, não há esta regra.
        </P>

        <H>Para que serve a autoavaliação</H>
        <P>
          Obriga o aluno a ler os critérios antes de ser avaliado. Muitas vezes, a diferença entre
          o que o aluno pensa e o que o professor observou é o ponto de partida para a conversa mais
          útil da aula.
        </P>
      </>
    ),
  },

  // ── 6 ────────────────────────────────────────────────────
  {
    id: 'plano',
    titulo: 'Criar um plano de aula',
    resumo: 'Seis passos curtos. A aplicação deduz o resto e mostra tudo no fim, para confirmação.',
    conteudo: (
      <>
        <H>Criar o plano, passo a passo</H>
        <P>
          Em <b>Planos de aula › + Novo plano</b>, as perguntas aparecem uma de cada vez. Criar e
          <b> Editar o plano</b> funcionam da mesma forma: ao alterar um plano, o professor volta a
          ver todos os passos (sumário, manual e perguntas), como se o plano fosse novo.
        </P>
        <Passos itens={[
          <><b>Quando</b>: o dia e as horas, que vêm do horário da turma.</>,
          <><b>Unidade</b>: a UC ou a UFCD. Ao mudar a unidade, mudam também o manual e as competências.</>,
          <><b>Tipo de aula</b>: prática, mista, teórica ou só de atitudes.</>,
          <><b>Como é a aula</b>: perguntas numeradas, apenas as necessárias. Onde decorre a aula, se os alunos trabalham em grupo, se é a continuação da aula anterior e em que fase está o trabalho (pesquisa, desenvolvimento, receita e ficha técnica, menu, requisição, apresentação escrita, oral, digital ou prática).</>,
          <><b>Conteúdos e sumário</b>: o índice do Manual do Aluno. Pode escolher <b>Incluir o manual todo</b>, uma parte, um capítulo ou apenas alguns pontos. A aplicação escreve o sumário a partir do que for escolhido.</>,
          <><b>Confirmar</b>: o ecrã «O plano fica assim» mostra como é a aula, o manual, o sumário e o que o aluno vai responder. Cada parte tem o botão <b>mudar</b>.</>,
        ]} />
        <Destaque cor="verde">
          Se se enganar nas respostas, o botão <b>↺ Recomeçar este plano do zero</b> volta ao
          início sem apagar o plano.
        </Destaque>

        <H>O que a aplicação deduz</H>
        <P>
          A partir das respostas sobre a aula, a aplicação define as perguntas da autoavaliação
          (numa aula teórica, por exemplo, não pergunta pela farda nem pelo KitchenFlow), os
          critérios de cada fase do trabalho e os pesos da nota. A linha <b>«Deduzido … não é
          assim? mudar»</b> mostra o que a aplicação concluiu, para que o professor o possa
          corrigir.
        </P>

        <H>Fichas, guião e requisição</H>
        <P>
          Estão sempre disponíveis no plano, no campo <b>Fichas, guião e requisição</b>. Nas aulas
          sem cozinha, a aplicação não as pede, mas o professor pode juntá-las. Se as fichas forem
          alteradas depois de feita a requisição, a aplicação avisa que a requisição está
          desatualizada.
        </P>
        <Destaque>
          Depois de colar a resposta da IA numa ficha, confirme os ingredientes antes de fazer a
          requisição. Se uma ficha tiver tempos (por exemplo, «3 min») no lugar das quantidades dos
          ingredientes, a requisição deixa essas linhas de fora e indica qual é a ficha a corrigir.
        </Destaque>

        <H>Competências</H>
        <P>
          Quando se inclui o manual todo, aparecem todas as competências de conhecimentos,
          organizadas por parte e por capítulo. O total mostra dois números: <b>No plano</b> (todas
          as competências) e <b>Cada aluno responde a</b> (as do capítulo que o aluno escolher,
          mais as obrigatórias e as atitudes).
        </P>
        <P>
          As competências retiradas ficam em <b>Retiradas desta aula</b>, com os botões
          <b> + Incluir</b> e <b>Repor todas</b>. O botão <b>Repor as competências da aula</b> volta
          à lista completa. As obrigatórias (farda, higiene e segurança alimentar e assiduidade)
          retiram-se com <b>Obrigatória · tirar desta aula</b> e, nesse caso, deixam de contar.
        </P>

        <H>Arquivar e eliminar</H>
        <P>
          O professor pode arquivar um plano: o plano sai do calendário e fica no Arquivo, de onde
          pode ser reposto. <b>Só a coordenação pode eliminar um plano definitivamente</b>, em
          «Dados e segurança».
        </P>

        <H>Publicar</H>
        <P>
          Ao publicar, a aplicação pergunta para que turma é o plano. <b>Enquanto o plano não for
          publicado, os alunos não veem a aula.</b> Depois de publicar, aparece <b>A enviar…</b> e,
          quando o envio termina, <b>Chegou</b>: a partir desse momento, a aula já está nos
          telemóveis dos alunos.
        </P>
      </>
    ),
  },

  // ── 7 ────────────────────────────────────────────────────
  {
    id: 'aula',
    titulo: 'Durante a aula',
    resumo: 'Abrir a aula, acompanhar a turma, os grupos, os telemóveis e os PIN.',
    conteudo: (
      <>
        <H>O ecrã Início</H>
        <P>
          No topo aparece <b>a aula de hoje</b>, com o botão do passo seguinte: preparar,
          publicar, abrir a aula, ver a turma ou validar. Mais abaixo estão a unidade em curso, o
          que falta validar e quatro atalhos. As restantes opções estão no menu <b>☰</b>.
        </P>

        <H>Abrir a aula</H>
        <P>
          Os alunos só conseguem registar a entrada depois de o professor <b>abrir a aula</b>, e é
          a partir desse momento que contam os 10 minutos de tolerância. Por baixo do botão aparece
          a indicação de que a abertura <b>chegou aos alunos</b>, que fica verde assim que é
          guardada na base de dados.
        </P>

        <H>A vista da turma</H>
        <P>
          Em <b>Turma</b>, no menu do plano, o professor vê quem entrou e a que horas, a farda, os
          registos do KitchenFlow e quem já se autoavaliou. É também aí que se decidem as faltas.
        </P>

        <H>Grupos e líder do KitchenFlow</H>
        <P>
          O professor faz os grupos no plano (Grupos): põe cada aluno num grupo e dá uma ficha a
          cada grupo. Os alunos não criam nem escolhem grupo: veem o seu (colegas e ficha) logo que
          abrem a aplicação, antes de a aula abrir, e um visto em quem do grupo já entrou e já se avaliou.
          No fim, a avaliação dos colegas do grupo é obrigatória: o aluno só vê «Aula feita» depois de
          avaliar todos. Em «Turma e faltas» aparece «falta avaliar N colegas do grupo» a quem ainda não o fez. Num grupo, os registos de higiene e segurança alimentar fazem-se uma só vez:
          o professor escolhe o líder e pode substituí-lo se este faltar. Os grupos e o líder
          chegam de imediato aos telemóveis dos alunos.
        </P>

        <H>O PIN e o telemóvel</H>
        <P>
          Na primeira entrada, o PIN fica associado ao telemóvel do aluno. Por vezes, a aplicação
          deixa de reconhecer o telemóvel: o iPhone apaga os dados do site ao fim de 7 dias sem o
          abrir, e abrir o link a partir do WhatsApp ou do Instagram conta como outro navegador.
          Nesses casos, o aluno <b>entra normalmente com o PIN correto</b>, e o PIN passa a ficar
          associado a esse telemóvel.
        </P>
        <Destaque>
          Quando isso acontece, o professor recebe um aviso em <b>Avisos</b>: «… entrou noutro
          telemóvel ou navegador». Se não tiver sido o próprio aluno, altere-lhe o PIN no
          separador <b>PIN temp.</b> do plano.
        </Destaque>

        <H>Aluno sem PIN</H>
        <P>
          Se o aluno se esquecer do PIN, crie-lhe um PIN temporário no separador <b>PIN temp.</b>
          do plano.
        </P>
      </>
    ),
  },


  // ── Técnicas ─────────────────────────────────────────────
  {
    id: 'tecnicas',
    titulo: 'As técnicas da aula: o percurso completo',
    resumo: 'Da ficha técnica ao resultado observado: prato → preparação base → técnica → subtécnica.',
    conteudo: (
      <>
        <P>
          As técnicas a avaliar <b>vêm das fichas técnicas</b> do plano. Quando a ficha é criada
          com a IA, esta escolhe, da lista da escola, o que o aluno faz naquela receita, mesmo que
          pertença a outra área (por exemplo, um evento de pastelaria numa UC de cozinha).
        </P>
        <Tabela
          cabecalho={['Nível', 'O que é', 'Exemplo']}
          linhas={[
            ['Prato', 'A ficha técnica', 'Lasanha'],
            ['Preparação base', 'Uma preparação de cozinha ou de pastelaria', 'Molho béchamel'],
            ['Técnica', 'O que se faz', 'Ligar'],
            ['Subtécnica', 'O resultado que se observa quando está bem feito', 'Roux branco: cor de marfim, sem grumos'],
          ]}
        />
        <P>
          O ecrã do aluno, as <b>Competências</b> do plano e a <b>Validação</b> mostram sempre o
          percurso completo, por exemplo: «Lasanha → Molho béchamel → Ligar · Roux branco · Está
          bem feito quando: …». Nunca aparece apenas «roux branco», sem contexto.
        </P>
        <Destaque>
          As fichas criadas antes desta alteração mostram apenas «Prato → Técnica», porque não têm
          a preparação base. Para obter o percurso completo, volte a gerar a ficha com a IA.
        </Destaque>
        <H>Retirar ou voltar a incluir uma técnica</H>
        <P>
          Em <b>Competências</b>, o botão <b>− Remover</b> retira uma técnica desta aula. A técnica
          fica riscada, com o botão <b>+ Incluir</b> para a repor.
        </P>
        <H>O que falta avaliar na UC</H>
        <P>
          O aviso de cobertura mostra o que a UC exige e ainda não foi avaliado: prática,
          conhecimentos e atitudes. Nas duas últimas semanas da UC, o aviso fica a vermelho.
        </P>
        <H>Conhecimentos</H>
        <P>
          Em cada aula, o professor indica os conhecimentos a avaliar, com sugestões retiradas do
          referencial da UC. O aluno autoavalia-se em cada um e o professor valida.
        </P>
      </>
    ),
  },

  // ── Medidas ──────────────────────────────────────────────
  {
    id: 'medidas',
    titulo: 'Alunos com medidas de suporte à aprendizagem',
    resumo: 'Medidas universais, seletivas ou adicionais: os mesmos objetivos, com perguntas mais simples.',
    conteudo: (
      <>
        <H>Onde se indica a medida</H>
        <Passos itens={[
          <>No menu, abra o <b>Mapa da turma</b>.</>,
          <>Abra a ficha do aluno.</>,
          <>Em <b>Medidas educativas</b>, escolha <b>Universais</b>, <b>Seletivas</b> ou <b>Adicionais</b>.</>,
        ]} />
        <P>
          A medida fica guardada no arquivo da escola e chega ao telemóvel do aluno da próxima vez
          que este entrar na aplicação ou carregar em «Atualizar».
        </P>
        <H>O que muda para o aluno</H>
        <Tabela
          cabecalho={['', 'Universais', 'Seletivas e adicionais']}
          linhas={[
            ['Frases das atitudes', 'As habituais', 'Curtas, com uma ideia de cada vez'],
            ['Opções das técnicas', 'As habituais', '«Fiz com ajuda», «Fiz sozinho/a»…'],
            ['Exemplo pedido', 'Um exemplo concreto do que fez', 'Uma frase'],
            ['Preparações base', 'Todas', 'Todas, com «O que é» e uma frase simples de explicação'],
          ]}
        />
        <Destaque cor="verde">
          Os objetivos a atingir são os mesmos. O que muda é o caminho: as perguntas são mais
          fáceis de ler e referem-se ao que se observa. As medidas adicionais que implicam
          adaptações ao currículo ainda não estão contempladas na aplicação.
        </Destaque>
      </>
    ),
  },

  // ── Plano de aula e atividade extra (Rosa, out/2026) ────────────
  {
    id: 'extras',
    titulo: 'Plano de aula e atividade extra',
    resumo: 'A pergunta «Quem vai?» decide: se for a turma toda, conta como aula (fora das horas da aula, como mais uma aula, na aula desse dia ou na seguinte da UC); se forem só alguns alunos, é uma atividade extra, que dá bónus.',
    conteudo: (
      <>
        <H>Dois conceitos diferentes</H>
        <P>
          O <b>plano de aula</b> é a aula da turma toda. É avaliado e conta para a nota da UC.
          A <b>atividade extra</b> é tudo o que fica fora dos planos de aula: eventos, concursos,
          visitas, serviços de catering, entre outros. Dá <b>bónus</b>, e as competências avaliadas
          ficam registadas no perfil do aluno. Uma atividade extra <b>nunca cria nem altera</b> um
          plano de aula.
        </P>

        <H>A resposta a «Quem vai?» define como conta</H>
        <Tabela
          cabecalho={['Quem vai', 'O que é', 'Como conta']}
          linhas={[
            ['A turma toda, dentro das horas da aula', 'O plano de aula desse dia, com o evento', 'Como uma aula: as técnicas, os conhecimentos e as atitudes contam para a nota, e as faltas contam'],
            ['A turma toda, fora das horas da aula (depois das aulas, ao sábado, nas férias ou antes do início das UC)', 'Atividade obrigatória (não se cria um plano de aula)', 'Como mais uma aula: a avaliação entra na aula desse dia ou na seguinte da mesma UC (se a UC já acabou, na aula seguinte da mesma disciplina) e na pauta. Não dá bónus nem faltas; quem não se autoavaliou conta 0'],
            ['Apenas alguns alunos (inscritos ou escolhidos pelo professor)', 'Atividade extra', 'Bónus; não há faltas'],
          ]}
        />
        <P>
          A pergunta <b>«Onde é?»</b> (na escola ou fora da escola) indica apenas o local e não
          altera a avaliação. «Fora da escola» significa no exterior, e não «fora do horário das
          aulas».
        </P>

        <H>Como criar uma atividade extra</H>
        <Passos itens={[
          <>Crie a atividade em «Atividades e concursos» ou, a partir de uma aula, em «Editar o plano», escolhendo o tipo e a opção «Só alguns alunos». Se a atividade partir de uma aula, a aula <b>mantém-se igual</b> para a turma toda, e a atividade fica à parte, associada a essa aula.</>,
          <>Indique quem participou: aceite os alunos inscritos ou use «+ Acrescentar um aluno que foi».</>,
          <>Se houve produção, junte a <b>ficha técnica e o guião</b> à atividade. As técnicas em que os alunos se avaliam vêm da ficha: aparecem em «Competências», no topo («Técnicas da ficha técnica»), e alteram-se abrindo a ficha («Abrir a ficha»).</>,
          <>Carregue em <b>«Confirmar participantes»</b>. Aparece a lista dos participantes, o que cada um vai responder e como conta. Confirme.</>,
        ]} />
        <H>A que respondem os alunos da atividade</H>
        <P>
          <b>Na atividade:</b> às técnicas da ficha técnica (se houver), à técnica geral e, quando
          for o caso, às atitudes.
        </P>
        <P>
          <b>No plano de aula da turma desse dia</b> (que a aplicação encontra automaticamente:
          a mesma turma, o mesmo dia e as mesmas horas): por predefinição, respondem a tudo, como
          os colegas. O professor pode retirar uma parte apenas para estes alunos (técnicas,
          conhecimentos, atitudes ou 5 C) ou escolher «Nada: só respondem à atividade».
        </P>
        <P>
          <b>As atitudes não se repetem:</b> se os alunos já respondem às atitudes no plano de
          aula, a atividade não as volta a perguntar; caso contrário, a atividade avalia-as. O
          resumo da atividade indica qual das situações se aplica.
        </P>
        <H>Como conta</H>
        <P>
          <b>Evento:</b> bónus até <b>0,5 valores</b>, de acordo com a nota validada pelo professor
          (atitudes, técnica geral e técnicas da ficha). Sem farda, não conta.
          <b> Concurso:</b> até 1 valor (candidatura: 0,2 · participação: 0,2 · cada fase: 0,2 ·
          vitória: completa o valor). As técnicas avaliadas numa atividade <b>contam apenas para o
          bónus</b>, mas ficam registadas no <b>perfil</b> do aluno e contam para a
          <b> consolidação</b>, tal como as de qualquer aula.
        </P>
        <H>Os restantes alunos</H>
        <P>
          Os alunos que não participaram veem a atividade <b>apenas para consulta</b>, em
          «Atividades e concursos › Para ver»: o que se fez, a ficha técnica e o guião. Não se
          podem inscrever nem autoavaliar. Os alunos que participaram recebem o aviso «Estiveste na
          atividade… autoavalia-te».
        </P>
        <Destaque cor="verde">
          <b>Exemplos.</b> <b>18 de setembro</b>, a turma toda, antes do início do ano letivo: é
          uma atividade extra. As atitudes validadas ficam no perfil, e o bónus aparece no plano de
          aula seguinte da UC (21 de setembro). <b>Catering com 3 alunos</b> à hora de uma aula
          teórica: é uma atividade extra só para esses 3 alunos, com a ficha técnica e o guião. Os
          3 alunos continuam a responder ao plano de aula da turma, e os colegas veem a atividade
          apenas para consulta.
        </Destaque>

        <H>Recuperar uma UC numa atividade extra</H>
        <P>
          Um aluno em recuperação (com faltas acima dos 10%) pode recuperar a UC participando numa
          atividade extra.
        </P>
        <Passos itens={[
          <><b>Quem escolhe:</b> o professor ou o aluno. Em «UC em atraso — recuperação», escolha a modalidade «atividade» e a atividade. Em alternativa, na própria atividade, em «Alunos em recuperação», carregue em «Recuperar nesta atividade».</>,
          <><b>O aluno pode candidatar-se</b> em «Atividades e concursos › Recuperar numa atividade», mesmo que a atividade seja só para alguns alunos. Na atividade aparece «Candidatou-se para recuperar»: o professor carrega em «Aceitar para recuperar» ou em «Não aceitar» (e escolhe outra atividade).</>,
          <>No resumo da atividade («Confirmar participantes»), o aluno aparece com a indicação <b>«a recuperar a UC …»</b>.</>,
          <><b>O aluno só recupera se tiver participado:</b> o professor tem de confirmar os participantes e validar a autoavaliação do aluno nessa atividade.</>,
          <>Depois, em «Registar realização e resultado», a aplicação <b>sugere a nota</b> validada na atividade, que o professor confirma ou corrige.</>,
        ]} />
        <Destaque cor="bordeaux">
          <b>Para o aluno que está a recuperar, a atividade não dá bónus.</b> Serve apenas para
          recuperar a UC.
        </Destaque>
      </>
    ),
  },

  // ── Eventos ──────────────────────────────────────────────
  {
    id: 'eventos',
    titulo: 'Eventos: organizar e avaliar',
    resumo: 'O ecrã Eventos serve para organizar; a opção «Avaliar evento fora do horário» serve para avaliar os alunos.',
    conteudo: (
      <>
        <H>1. Organizar: menu Eventos</H>
        <Passos itens={[
          <><b>Novo evento</b>: perguntas rápidas, uma de cada vez (cliente, data, local, número de pessoas, tipo de serviço…). As perguntas a que ainda não souber responder podem ser saltadas.</>,
          <>No evento, o cartão <b>Agora</b> indica o próximo passo, e os restantes cartões mostram o que falta em cada parte.</>,
          <><b>Perguntas ao cliente</b>: aparecem apenas as que se aplicam e podem ser copiadas para um email ou impressas.</>,
          <><b>Fichas e orçamentos</b>: junte as fichas, crie um ou mais orçamentos e faça a requisição de cada um.</>,
          <><b>Folha de orçamento</b>: acrescente bebidas, descartáveis, transporte, etc. A Direção indica o valor por pessoa, e a folha pode ser impressa para o cliente, com o logótipo da escola. Enquanto a Direção não indicar o valor, a folha mostra «valor por definir».</>,
          <><b>Preparação</b>, <b>Material</b> e <b>Dia do evento</b> (hora a hora): listas de verificação que se vão assinalando.</>,
          <><b>Fechar</b>: cinco perguntas e o relatório final.</>,
        ]} />
        <H>2. Avaliar os alunos: «Avaliar evento fora do horário»</H>
        <P>
          Esta opção cria um plano de evento. Tem numeração própria (E-2026-001), não entra na
          contagem dos planos da UC («Plano de Aula 1 de 17») e aparece a roxo no calendário do professor e
          do aluno.
        </P>
        <Tabela
          cabecalho={['Participação', 'Como funciona']}
          linhas={[
            ['A turma toda (obrigatória)', 'Todos os alunos da turma participam'],
            ['Por inscrição', 'O aluno inscreve-se em «Atividades e concursos», e o professor aceita a inscrição no plano do evento'],
          ]}
        />
        <P>
          Só os participantes se autoavaliam e só eles contam para o bónus (ver «O bónus dos
          eventos e as notas máximas»).
        </P>
      </>
    ),
  },

  // ── 8 ────────────────────────────────────────────────────
  {
    id: 'requisicoes',
    titulo: 'Requisições e orçamentos',
    resumo: 'A diferença entre os dois, a numeração e onde encontrar os antigos.',
    conteudo: (
      <>
        <H>A diferença</H>
        <Tabela
          cabecalho={['', 'Requisição', 'Orçamento']}
          linhas={[
            ['Ligada a uma aula', 'Sim', 'Não'],
            ['Para que serve', 'Pedir ao economato os produtos para essa aula', 'Calcular custos: um evento, um almoço, uma encomenda'],
            ['Identifica-se pelo', 'Plano a que pertence', 'Número próprio (O01, O02…)'],
          ]}
        />

        <P>
          Uma requisição feita fora de um plano também tem numeração própria: R01, R02, e assim
          sucessivamente.
        </P>

        <H>Onde encontrar as antigas</H>
        <P>
          Em <b>Orçamentos</b>, no separador <b>Histórico</b>. Estão lá todas, com o número, a data,
          o custo e o número de ingredientes. Qualquer uma pode ser reaberta.
        </P>

        <H>Juntar fichas de outras aulas</H>
        <P>
          Ao fazer uma requisição, o separador <b>Biblioteca</b> mostra todas as fichas já criadas
          pelo professor, e não apenas as desse plano. Pode juntar as que quiser e ajustar as doses
          sem alterar a ficha original.
        </P>

        <Destaque>
          Se duas fichas pedirem o mesmo produto com nomes diferentes (por exemplo, «Ovos M» e
          «Ovos L»), a aplicação assinala-o antes do envio. Não os junta automaticamente, porque
          por vezes a distinção é necessária.
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
          Tudo é guardado primeiro <b>no aparelho que está a ser usado</b> e enviado depois para
          dois locais:
        </P>
        <Tabela
          cabecalho={['Onde', 'Para que serve', 'O que é guardado']}
          linhas={[
            ['Base de dados (Firebase)', 'Faz chegar a informação aos outros aparelhos em cerca de 1 segundo',
              'Planos, fichas, abertura da aula, presenças, autoavaliações, validações, notas, grupos, avaliação entre colegas e líder do KitchenFlow'],
            ['Sheets da escola', 'Arquivo de toda a informação, para consulta e para cópias de segurança',
              'Tudo o que está acima e ainda requisições, eventos, recuperações, pautas e preços'],
          ]}
        />

        <H>Como ler o Sheets</H>
        <P>
          Cada turma tem um separador com o seu nome (por exemplo, «1º BCR»), que é atualizado
          automaticamente de 10 em 10 minutos. No topo de cada separador há um resumo do que lá
          está, seguido destas partes:
        </P>
        <Passos itens={[
          <><b>Os alunos</b>: presenças, faltas, atrasos, autoavaliações, validações, média e telemóvel.</>,
          <><b>As notas de cada UC</b>: um aluno por linha e um plano por coluna, com a nota validada, «AA» (o aluno autoavaliou-se, mas falta a validação) ou «F» (faltou). No fim de cada linha estão a média, as faltas, o bónus e a nota da UC, calculados da mesma forma que na aplicação.</>,
          <><b>As aulas</b>: dia, horas, UC, tipo de aula, se foi aberta e quantos alunos estiveram presentes.</>,
          <><b>Grupos e colegas</b>: em que grupo esteve cada aluno, quem foi o líder do KitchenFlow e o que os colegas disseram uns dos outros (apenas o professor vê).</>,
          <><b>O que chegou a cada aluno</b>: nas últimas aulas, as perguntas a que cada aluno respondeu, a nota e os casos particulares.</>,
        ]} />
        <Destaque cor="bordeaux">
          As folhas de dados (ALUNOS, PLANOS, PRESENCAS…) e as fichas por extenso estão
          <b> ocultas, e não apagadas</b>, porque a aplicação escreve nelas. Para as ver, use o
          menu <b>Ver › Folhas ocultas</b>. Não as apague nem as ordene durante as aulas.
        </Destaque>

        <H>Se fechar a aplicação com dados por enviar</H>
        <P>
          O navegador pergunta se pretende mesmo sair. Da próxima vez que abrir a aplicação, esta
          envia automaticamente o que ficou pendente.
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
          Como funciona a avaliação, o que contém cada parte de um plano e
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
        Os valores deste manual (pesos, bónus e tolerância) vêm diretamente
        das regras da aplicação. Se forem alterados, este texto é atualizado.
      </div>
    </div>
  );
}

export default ManualProfessor;
