// ============================================================
// Painel inicial do aluno — grelha de cartões.
//
// Substitui as três abas (hoje / calendário / perfil) por uma grelha
// onde cada destino é um cartão grande com ícone e uma palavra.
//
// Três blocos:
//   1. A aula de hoje ..... entrar, fichas, guião, requisição
//   2. O meu percurso ..... avaliar-me, nota progressiva, forte/fraco
//   3. Consulta ........... manual, calendário
//   + Recuperações, em barra, só quando existem
//
// Só "Entrar na aula" é um cartão cheio. Tudo o resto é branco, para
// não haver dúvida sobre qual é o primeiro passo.
// ============================================================

import React from 'react';
import { PlanoAula } from '../types';

const T = {
  cream:    '#faf7f2',
  charcoal: '#1a1714',
  copper:   '#b5651d',
  copperP:  '#fdf0e6',
  sage:     '#5a7a4e',
  sageP:    '#eef4eb',
  danger:   '#c0392b',
  dangerP:  '#fdf0ef',
  info:     '#2563eb',
  infoP:    '#eff6ff',
  border:   'rgba(26,23,20,0.10)',
};

export type DestinoAluno =
  | 'entrar' | 'fichas' | 'guiao' | 'requisicao'
  | 'avaliar' | 'nota' | 'perfil'
  | 'manual' | 'calendario' | 'recuperacoes' | 'kitchenflow' | 'avisar_professor';

interface Props {
  nomeAluno: string;
  turmaId: string;
  ucId?: string;
  ucNome?: string;
  planoHoje?: PlanoAula | null;
  numeroPlano?: number;
  totalPlanos?: number;
  fichasAtribuidas?: number;
  autoavaliacoesPorFazer?: number;
  notaProgressiva?: number | null;
  competenciasFracas?: number;
  recuperacoesPendentes?: number;
  onAbrir: (destino: DestinoAluno) => void;
}

function Cartao({
  icone, label, sub, onClick, cheio, alerta,
}: {
  icone: string; label: string; sub?: string;
  onClick: () => void; cheio?: boolean; alerta?: boolean;
}) {
  const fundo = cheio ? T.copper : alerta ? T.copperP : '#fff';
  const corTexto = cheio ? '#fff' : alerta ? T.copper : T.charcoal;
  const corSub = cheio ? 'rgba(255,255,255,0.85)' : alerta ? T.copper : 'rgba(26,23,20,0.55)';

  return (
    <button
      onClick={onClick}
      style={{
        background: fundo,
        border: cheio ? 'none' : `1px solid ${alerta ? T.copper : T.border}`,
        borderRadius: 14,
        padding: '18px 12px',
        minHeight: 104,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', width: '100%',
        fontFamily: 'inherit',
        transition: 'transform 0.12s ease',
      }}
      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span style={{ fontSize: 30, lineHeight: 1 }}>{icone}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: corTexto, textAlign: 'center' }}>
        {label}
      </span>
      {sub && (
        <span style={{ fontSize: 12.5, color: corSub, textAlign: 'center' }}>{sub}</span>
      )}
    </button>
  );
}

const grelha2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
};

const tituloBloco: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(26,23,20,0.45)',
  marginBottom: 10,
  paddingLeft: 2,
};

export function PainelAluno({
  nomeAluno, turmaId, ucId, ucNome,
  planoHoje, numeroPlano, totalPlanos,
  fichasAtribuidas = 0,
  autoavaliacoesPorFazer = 0,
  notaProgressiva = null,
  competenciasFracas = 0,
  recuperacoesPendentes = 0,
  onAbrir,
}: Props) {
  const iniciais = nomeAluno
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div style={{ padding: '16px 14px 32px', maxWidth: 640, margin: '0 auto' }}>

      {/* ── Cabeçalho: quem sou ── */}
      <div style={{
        background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14,
        padding: '14px 16px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: T.copperP,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700, color: T.copper, flexShrink: 0,
        }}>{iniciais || '·'}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: T.charcoal, lineHeight: 1.25 }}>
            {nomeAluno}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.55)' }}>{turmaId}</div>
        </div>
      </div>

      {/* ── Onde estou: sempre visível ── */}
      <div style={{
        background: T.copperP, borderRadius: 14,
        padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: T.copper, marginBottom: 4,
        }}>
          {planoHoje ? 'A trabalhar agora' : 'Unidade em curso'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.charcoal, lineHeight: 1.3 }}>
          {ucId ? `${ucId}${ucNome ? ` · ${ucNome}` : ''}` : 'Sem UC atribuída'}
        </div>
        <div style={{ fontSize: 14, color: T.copper, marginTop: 5 }}>
          {planoHoje
            ? `${numeroPlano && totalPlanos ? `Plano ${numeroPlano} de ${totalPlanos} · ` : ''}hoje, ${planoHoje.horaInicio}`
            : 'Não tens aula hoje'}
        </div>
      </div>

      {/* ── 1. A aula ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={tituloBloco}>A aula</div>
        <div style={grelha2}>
          {planoHoje ? (
            <Cartao
              icone="🚪" label="Entrar na aula" cheio
              onClick={() => onAbrir('entrar')}
            />
          ) : (
            <Cartao
              icone="📭" label="Sem plano de aula"
              sub="avisar o professor" alerta
              onClick={() => onAbrir('avisar_professor')}
            />
          )}
          <Cartao
            icone="🍳" label="As minhas fichas"
            sub={fichasAtribuidas
              ? `${fichasAtribuidas} ficha${fichasAtribuidas > 1 ? 's' : ''} atribuída${fichasAtribuidas > 1 ? 's' : ''}`
              : 'sem fichas atribuídas'}
            onClick={() => onAbrir('fichas')}
          />
          <Cartao icone="📄" label="Guião" onClick={() => onAbrir('guiao')} />
          <Cartao icone="📋" label="Requisição" onClick={() => onAbrir('requisicao')} />
        </div>
      </div>

      {/* ── 2. O meu percurso ── */}
      <div style={{
        background: T.sageP, border: `1px solid rgba(90,122,78,0.25)`,
        borderRadius: 14, padding: 12, marginBottom: 18,
      }}>
        <div style={{ ...tituloBloco, color: T.sage }}>O meu percurso</div>
        <div style={grelha2}>
          <Cartao
            icone="✅" label="Avaliar-me"
            sub={autoavaliacoesPorFazer
              ? `${autoavaliacoesPorFazer} competência${autoavaliacoesPorFazer > 1 ? 's' : ''} por avaliar`
              : 'tudo avaliado'}
            onClick={() => onAbrir('avaliar')}
          />
          <button
            onClick={() => onAbrir('nota')}
            style={{
              background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14,
              padding: '18px 12px', minHeight: 104, width: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 700, color: T.sage, lineHeight: 1 }}>
              {notaProgressiva != null ? notaProgressiva.toFixed(1).replace('.', ',') : '—'}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.charcoal }}>Nota progressiva</span>
            <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>
              {notaProgressiva != null ? 'em 20, se acabasse hoje' : 'ainda sem avaliações'}
            </span>
          </button>
        </div>
        <button
          onClick={() => onAbrir('perfil')}
          style={{
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14,
            padding: '15px 14px', marginTop: 12, width: '100%',
            display: 'flex', alignItems: 'center', gap: 13,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>🎯</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.charcoal }}>
              O meu perfil profissional
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>
              {competenciasFracas
                ? `pontos fortes e ${competenciasFracas} competência${competenciasFracas > 1 ? 's' : ''} a desenvolver`
                : 'pontos fortes e áreas a desenvolver'}
            </span>
          </span>
        </button>
      </div>

      {/* ── 3. Consulta ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={tituloBloco}>Consulta</div>
        <div style={grelha2}>
          <Cartao icone="📘" label="Manual da UC" onClick={() => onAbrir('manual')} />
          <Cartao icone="📅" label="Calendário" onClick={() => onAbrir('calendario')} />
        </div>
      </div>

      {/* ── KitchenFlow: sempre disponível ── */}
      <button
        onClick={() => onAbrir('kitchenflow')}
        style={{
          background: 'rgba(14,116,144,0.08)', border: '1px solid rgba(14,116,144,0.35)',
          borderRadius: 14, padding: '15px 14px', width: '100%', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 13,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 28, lineHeight: 1 }}>🔗</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#0e7490' }}>
            KitchenFlow
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: '#0e7490' }}>
            fazer os meus registos de higiene e temperaturas
          </span>
        </span>
      </button>

      {/* ── Recuperações: só quando há ── */}
      {recuperacoesPendentes > 0 && (
        <button
          onClick={() => onAbrir('recuperacoes')}
          style={{
            background: T.copperP, border: `1px solid ${T.copper}`, borderRadius: 14,
            padding: '15px 14px', width: '100%',
            display: 'flex', alignItems: 'center', gap: 13,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>🔁</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.copper }}>
              Recuperações
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: T.copper }}>
              {recuperacoesPendentes} módulo{recuperacoesPendentes > 1 ? 's' : ''} por recuperar
            </span>
          </span>
        </button>
      )}

    </div>
  );
}
