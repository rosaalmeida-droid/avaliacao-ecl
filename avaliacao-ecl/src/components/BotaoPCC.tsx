// ============================================================
// PCC da ficha técnica → registo no KitchenFlow
// ============================================================
// O aluno vê o PCC na ficha e abre logo o registo certo no KitchenFlow,
// já com a sessão dele (Rosa, set/2026).
//
// (13/out/2026) «Os alunos não percebem o que têm de fazer quando carregam»:
// - o botão só aparece nos passos em que há mesmo um registo (o «conservação
//   da manteiga» de um cuidado já não abre a Conservação);
// - diz o que a ficha pede e «O que fazes», em passos curtos;
// - abre logo: é o KitchenFlow que avisa se o grupo já registou aquele prato
//   (antes ficava à espera de ler o Sheets).
import React from 'react';
import type { Aluno, PlanoAula } from '../types';
import { abrirKitchenFlow } from '../backend';
import { registoDoPasso, type RegistoDoPasso } from './RegistosKFaoVivo';

/** O que o aluno faz, em passos curtos, para cada registo. */
function oQueFazes(r: RegistoDoPasso, prato: string): { titulo: string; passos: string[]; botao: string } {
  const o = prato ? `«${prato}»` : 'o prato';
  switch (r.modulo) {
    case 'conservacao': {
      const sitio = r.onde === 'congelador' ? 'congelador' : r.onde === 'abatedor' ? 'abatedor' : 'frigorífico';
      const limite = r.onde === 'congelador' ? 'a −18 °C ou menos' : 'abaixo de 4 °C';
      return {
        titulo: 'Guardar no frio: registo obrigatório',
        passos: [
          `Vê no visor se o ${sitio} está ${limite}. Se não estiver, não guardes lá: avisa o professor.`,
          `Põe ${o} lá dentro, tapado.`,
          'Regista-o: o KitchenFlow diz-te até quando se pode usar e o lote para a etiqueta.',
        ],
        botao: `Registar no ${sitio}`,
      };
    }
    case 'testemunho': return {
      titulo: 'Amostra testemunho: registo obrigatório',
      passos: ['Guarda 150 g num recipiente fechado, com o nome do prato.', 'Põe no frigorífico das amostras (0 °C a 3 °C).', 'Regista-a: o KitchenFlow diz-te até quando a guardas.'],
      botao: 'Registar a amostra testemunho',
    };
    case 'regeneracao': return {
      titulo: 'Regeneração: registo obrigatório',
      passos: ['Aquece até o centro chegar a 75 °C ou mais.', 'Mede com a sonda, no centro.', 'Regista a temperatura que mediste.'],
      botao: 'Registar a regeneração',
    };
    case 'servico': return {
      titulo: 'Temperatura de serviço: registo obrigatório',
      passos: ['Mede com a sonda, no centro do prato que vai ser servido.', 'Quente: 65 °C ou mais. Frio: 4 °C ou menos.', 'Regista a temperatura que mediste.'],
      botao: 'Registar a temperatura de serviço',
    };
    case 'desinfecao': return {
      titulo: 'Desinfeção: registo obrigatório',
      passos: ['Desinfeta com o produto, a dose e o tempo do rótulo.', 'Passa por água limpa.', 'Regista o alimento, o produto e o tempo.'],
      botao: 'Registar a desinfeção',
    };
    default: return {
      titulo: 'Óleo de fritura: registo obrigatório',
      passos: ['Vê a temperatura da fritadeira (não pode passar dos 180 °C).', 'Olha para o óleo: cor, espuma e cheiro.', 'Regista o que viste.'],
      botao: 'Registar o óleo de fritura',
    };
  }
}

export function BotaoPCC({ texto, prato, aluno, plano, forcar, passo, temperatura, descricao }: {
  texto: string; prato: string; aluno: Aluno; plano: PlanoAula;
  /** Registo pedido diretamente (ex.: a amostra testemunho no fim da ficha). */
  forcar?: 'testemunho';
  /** O número do passo, a temperatura e o texto do passo (para saber se há registo). */
  passo?: number | string; temperatura?: string; descricao?: string;
}) {
  const r = registoDoPasso({ haccp: texto, temperatura, descricao, forcar });
  if (!r) return null;
  const guia = oQueFazes(r, prato);

  function registar() {
    abrirKitchenFlow(r!.modulo, {
      turma: aluno.turmaId, numero: aluno.numero, pin: aluno.pin, tipo: 'aluno',
      ucId: plano.ucId, pratos: [prato], planoData: plano.data,
      planoHoraInicio: plano.horaInicio, planoHoraFim: plano.horaFim,
      // O KitchenFlow abre já nas perguntas, com o prato e o que a ficha pede.
      daFicha: { passo: passo != null ? String(passo) : '', texto: (texto || '').slice(0, 300), temperatura: temperatura || '', onde: r!.onde || '' },
    });
  }

  // A amostra testemunho tem a sua caixa no fim da ficha: aqui só o botão.
  if (forcar) return (
    <button onClick={e => { e.preventDefault(); e.stopPropagation(); registar(); }}
      style={{ marginTop: 9, width: '100%', minHeight: 46, padding: '8px 12px', borderRadius: 11, border: 'none', background: '#c0392b',
        color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
      {guia.botao}
      <span style={{ display: 'block', fontSize: 12, fontWeight: 500, opacity: 0.9 }}>abre o KitchenFlow já no registo certo</span>
    </button>
  );
  return (
    <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      style={{ marginTop: 8, border: '2px solid #c0392b', borderRadius: 12, background: '#fdecea', padding: '10px 12px', color: '#7a1f14', cursor: 'default' }}>
      <div style={{ fontWeight: 800, fontSize: 14.5, textDecoration: 'none' }}>⚠️ {guia.titulo}</div>
      {texto && <div style={{ fontSize: 13, marginTop: 2 }}>A ficha diz: «{texto.replace(/^PCC:\s*/i, '')}»</div>}
      <div style={{ marginTop: 7, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>O que fazes</div>
      <ol style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 13.5, color: '#3d1410', lineHeight: 1.45 }}>
        {guia.passos.map((t, i) => <li key={i} style={{ marginTop: 3 }}>{t}</li>)}
      </ol>
      <button onClick={e => { e.preventDefault(); e.stopPropagation(); registar(); }}
        style={{ marginTop: 9, width: '100%', minHeight: 46, padding: '8px 12px', borderRadius: 11, border: 'none', background: '#c0392b',
          color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        {guia.botao}
        <span style={{ display: 'block', fontSize: 12, fontWeight: 500, opacity: 0.9 }}>abre o KitchenFlow já no registo certo</span>
      </button>
    </div>
  );
}
