// ============================================================
// Painel inicial do aluno.
//
// Identidade: cartões violeta cheios sobre fundo cinzento claro, com
// ícones desenhados a branco. Cada destino é um bloco de cor com um
// ícone e uma palavra.
//
// O violeta foi escolhido em vez do vermelho porque o vermelho lê-se
// como erro, e a maior parte do que está aqui são coisas boas.
//
// Os valores — cores, tamanhos, espaçamentos — são os da maquete
// aprovada. Não aproximar: se a maquete diz ícone a 40px e altura
// mínima 126px, é isso que fica.
// ============================================================

import React from 'react';
import { PlanoAula } from '../types';

const C = {
  fundo:        '#F3F2F5',
  branco:       '#FFFFFF',
  violeta:      '#6B3FA0',
  violetaSuave: '#F0EBF7',
  violetaClaro: '#DCCFF0',
  tinta:        '#1A1A1A',
  texto:        '#555555',
  suave:        '#777777',
  verde:        '#3E7A31',
  verdeSuave:   '#E8F3E5',
  sombra:       '0 1px 3px rgba(0,0,0,0.06)',
};

export type DestinoAluno =
  | 'entrar' | 'fichas' | 'guiao' | 'requisicao'
  | 'avaliar' | 'nota' | 'perfil'
  | 'manual' | 'calendario' | 'recuperacoes' | 'kitchenflow' | 'proximas'
  | 'avisar_professor';

// ── Ícones ────────────────────────────────────────────────────
// Desenhados, não emojis: um emoji muda de forma conforme o aparelho
// e não tem o peso de traço do resto da interface.

const svg = (d: React.ReactNode, t = 40) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

export const Icones = {
  entrar: (t?: number) => svg(<>
    <path d="M13 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6" />
    <path d="M3 12h11m0 0-3.5-3.5M14 12l-3.5 3.5" />
  </>, t),
  panela: (t?: number) => svg(
    <path d="M3 11h18M5 11V8.5a7 7 0 0 1 14 0V11M4 11v2a8 8 0 0 0 16 0v-2M2 21h20" />, t),
  documento: (t?: number) => svg(<>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h4" />
  </>, t),
  requisicao: (t?: number) => svg(<>
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
    <path d="M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2" />
    <path d="M9 12l1.8 1.8L15 10" />
  </>, t),
  visto: (t?: number) => svg(<>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </>, t),
  alvo: (t?: number) => svg(<>
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </>, t),
  livro: (t?: number) => svg(<>
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5A2.5 2.5 0 0 1 4 19.5z" />
  </>, t),
  calendario: (t?: number) => svg(<>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>, t),
  repetir: (t?: number) => svg(<>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
  </>, t),
  registos: (t?: number) => svg(<>
    <path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="3" />
  </>, t),
  semPlano: (t?: number) => svg(<>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6M8 19l8-12" />
  </>, t),
  proximas: (t?: number) => svg(<>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M11 14l2.5 2L11 18" />
  </>, t),
  pessoa: (t = 26) => (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
    </svg>
  ),
  relogio: (t?: number) => svg(<>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </>, t),
};

// ── Ícones do fardamento ──────────────────────────────────────

const svgP = (d: React.ReactNode, t = 26) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

export const IconesFarda: Record<string, () => React.ReactNode> = {
  farda:   () => svgP(<path d="M4 8l4-4h8l4 4-3 2v10H7V10z" />),
  touca:   () => svgP(<><path d="M5 12a7 7 0 0 1 14 0" /><path d="M4 12h16v2H4z" /><path d="M6 14v5h12v-5" /></>),
  sapatos: () => svgP(<><path d="M4 17h16l-1-4H5z" /><path d="M6 13V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" /></>),
  avental: () => svgP(<><path d="M7 21v-6a5 5 0 0 1 10 0v6" /><path d="M9 11V6a3 3 0 0 1 6 0v5" /></>),
  cabelo:  () => svgP(<><path d="M12 3a6 6 0 0 0-6 6v3l-1 4h14l-1-4V9a6 6 0 0 0-6-6z" /><path d="M9 20h6" /></>),
  maos:    () => svgP(<><path d="M7 14a5 5 0 0 1 10 0v3H7z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /><path d="M5 20h14" /></>),
  fones:   () => svgP(<><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="2" y="14" width="5" height="6" rx="2" /><rect x="17" y="14" width="5" height="6" rx="2" /></>),
  adornos: () => svgP(<><circle cx="12" cy="12" r="9" /><path d="M12 3v18M5 8h14" /></>),
  unhas:   () => svgP(<><circle cx="12" cy="12" r="9" /><path d="M8 8l8 8M16 8l-8 8" /></>),
};

// ── Cartão da grelha ──────────────────────────────────────────

function Cartao({ icone, label, sub, valor, onClick }: {
  icone?: React.ReactNode; label: string; sub?: string;
  /** Substitui o ícone por um número grande — usado na nota. */
  valor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.violeta, border: 'none', borderRadius: 14,
        padding: '24px 12px', minHeight: 126, width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: valor ? 8 : 13,
        cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {valor
        ? <span style={{ fontSize: 32, fontWeight: 600, lineHeight: 1 }}>{valor}</span>
        : icone}
      <span style={{ fontSize: 16, fontWeight: 500, textAlign: 'center', lineHeight: 1.25 }}>
        {label}
      </span>
      {sub && <span style={{ fontSize: 13, color: C.violetaClaro, textAlign: 'center' }}>{sub}</span>}
    </button>
  );
}

const painelBranco: React.CSSProperties = {
  background: C.branco, borderRadius: 16, boxShadow: C.sombra,
};

interface Props {
  nomeAluno: string;
  turmaId: string;
  numeroAluno?: number;
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
  proximasAulas?: number;
  onAbrir: (destino: DestinoAluno) => void;
}

export function PainelAluno({
  nomeAluno, turmaId, numeroAluno, ucId, ucNome,
  planoHoje, numeroPlano, totalPlanos,
  fichasAtribuidas = 0,
  autoavaliacoesPorFazer = 0,
  notaProgressiva = null,
  recuperacoesPendentes = 0,
  proximasAulas = 0,
  onAbrir,
}: Props) {
  return (
    <div style={{ background: C.fundo, minHeight: '100%', padding: 14 }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>

        {/* Quem sou */}
        <div style={{
          ...painelBranco, padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 13,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: C.violetaSuave,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9B87C4', flexShrink: 0,
          }}>
            {Icones.pessoa(26)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.tinta, lineHeight: 1.2 }}>
              {nomeAluno}
            </div>
            <div style={{ fontSize: 15, color: C.texto }}>
              {turmaId}
              {numeroAluno ? <> · nº <b style={{ color: C.tinta }}>{numeroAluno}</b></> : null}
            </div>
          </div>
        </div>

        {/* Onde estou — a unidade é o contexto de tudo o resto, e por isso
            leva cor própria. O nome vai completo: "molhos e fundos" não é
            o nome da unidade, é uma abreviatura que só a professora entende. */}
        <div style={{
          background: C.violetaSuave, borderRadius: 16,
          padding: '15px 17px', marginBottom: 14,
          borderLeft: `5px solid ${C.violeta}`,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.violeta,
          }}>
            {ucId || 'Sem unidade'}
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: C.tinta,
            marginTop: 4, lineHeight: 1.3,
          }}>
            {ucNome || 'Sem unidade atribuída'}
          </div>
          <div style={{ fontSize: 15, color: C.texto, marginTop: 7 }}>
            {planoHoje
              ? `${numeroPlano && totalPlanos ? `Aula ${numeroPlano} de ${totalPlanos} · ` : ''}hoje às ${planoHoje.horaInicio}`
              : 'Não tens aula hoje'}
          </div>
        </div>

        {/* Grelha */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>

          {planoHoje ? (
            <Cartao icone={Icones.entrar()} label="Entrar na aula" onClick={() => onAbrir('entrar')} />
          ) : (
            <Cartao icone={Icones.semPlano()} label="Sem aula hoje"
                    sub="avisar o professor" onClick={() => onAbrir('avisar_professor')} />
          )}

          {/* As próximas aulas ao lado: sem aula hoje, o aluno não fica sem
              nada para ver. Antes só lá chegava pelo calendário. */}
          <Cartao icone={Icones.proximas()} label="Próximas aulas"
                  sub={proximasAulas > 0
                    ? `${proximasAulas} marcada${proximasAulas > 1 ? 's' : ''}`
                    : 'nenhuma marcada'}
                  onClick={() => onAbrir('proximas')} />

          <Cartao icone={Icones.panela()} label="As minhas fichas"
                  sub={fichasAtribuidas ? `${fichasAtribuidas} ficha${fichasAtribuidas > 1 ? 's' : ''}` : undefined}
                  onClick={() => onAbrir('fichas')} />

          <Cartao icone={Icones.documento()} label="Guião" onClick={() => onAbrir('guiao')} />
          <Cartao icone={Icones.requisicao()} label="Requisição" onClick={() => onAbrir('requisicao')} />

          <Cartao icone={Icones.visto()} label="Avaliar-me"
                  sub={autoavaliacoesPorFazer ? `${autoavaliacoesPorFazer} por avaliar` : undefined}
                  onClick={() => onAbrir('avaliar')} />

          <Cartao valor={notaProgressiva != null ? notaProgressiva.toFixed(1).replace('.', ',') : '—'}
                  label="Nota progressiva" onClick={() => onAbrir('nota')} />

          <Cartao icone={Icones.alvo()} label="O meu perfil" onClick={() => onAbrir('perfil')} />
          <Cartao icone={Icones.livro()} label="Manual da UC" onClick={() => onAbrir('manual')} />
          <Cartao icone={Icones.registos()} label="KitchenFlow" onClick={() => onAbrir('kitchenflow')} />
          <Cartao icone={Icones.calendario()} label="Calendário" onClick={() => onAbrir('calendario')} />

          {/* Sempre visível: o ecrã mostra o percurso de TODOS os módulos —
              concluídos, por concluir, em recuperação e recuperados —, não
              só o que está em dívida. */}
          <Cartao icone={Icones.repetir()} label="Recuperações"
                  sub={recuperacoesPendentes > 0
                    ? `${recuperacoesPendentes} por recuperar`
                    : 'o meu percurso'}
                  onClick={() => onAbrir('recuperacoes')} />

        </div>
      </div>
    </div>
  );
}

/** Cabeçalho violeta dos ecrãs internos. A seta volta atrás. */
export function CabecalhoEcra({ ucId, ucNome, titulo, subtitulo, onVoltar }: {
  ucId?: string; ucNome?: string; titulo: string; subtitulo?: string;
  onVoltar?: () => void;
}) {
  return (
    <div style={{ background: C.violeta, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <button
        onClick={onVoltar} disabled={!onVoltar}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, background: 'transparent',
          border: 'none', padding: 0, cursor: onVoltar ? 'pointer' : 'default',
          fontFamily: 'inherit',
        }}
      >
        {onVoltar && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff"
               strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        )}
        <span style={{ fontSize: 13.5, color: C.violetaClaro }}>
          {ucId ? `${ucId}${ucNome ? ` · ${ucNome}` : ''}` : ''}
        </span>
      </button>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 8, lineHeight: 1.2 }}>
        {titulo}
      </div>
      {subtitulo && <div style={{ fontSize: 15, color: C.violetaClaro, marginTop: 3 }}>{subtitulo}</div>}
    </div>
  );
}

export const CORES = C;
export const PAINEL_BRANCO = painelBranco;
