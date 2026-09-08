// ============================================================
// Início do aluno — ecrã 1 da especificação.
//
// "Dar uma decisão imediata ao aluno, sem transformar o início num
// catálogo de cartões iguais."
//
// A aula de hoje é a ação principal, num cartão grande. Os avisos são
// calculados a partir do estado real — presenças, registos, prazos — e
// não de texto guardado à mão. Os atalhos gerais ficam por baixo,
// pequenos, sem competir com a aula.
// ============================================================

import React from 'react';
import { PlanoAula } from '../types';

const C = {
  fundo:        '#F3F2F5',
  branco:       '#FFFFFF',
  violeta:      '#6B3FA0',
  violetaSuave: '#F0EBF7',
  violetaMedio: '#8B63B0',
  violetaClaro: '#DCCFF0',
  tinta:        '#1A1A1A',
  texto:        '#555555',
  suave:        '#777777',
  cobre:        '#B5651D',
  cobreSuave:   '#FDF0E8',
  border:       '#E4E1E8',
  sombra:       '0 1px 3px rgba(0,0,0,0.06)',
};

export type SeparadorAluno = 'inicio' | 'aula' | 'percurso' | 'recursos' | 'perfil';

export type DestinoAluno =
  | 'entrar' | 'consultar_plano' | 'fichas' | 'guiao' | 'requisicao'
  | 'avaliar' | 'nota' | 'perfil' | 'manual' | 'calendario'
  | 'recuperacoes' | 'kitchenflow' | 'atividades'
  | 'avisar_professor' | 'proximas';

/** Aviso calculado a partir dos dados. Nunca texto guardado à mão. */
export interface AvisoAluno {
  id: string;
  titulo: string;
  detalhe: string;
  destino: DestinoAluno;
  urgente?: boolean;
}

const ico = (d: React.ReactNode, t = 20) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);


const svg = ico;

export const Icones = {
  panela: (t = 28) => svg(
    <path d="M3 11h18M5 11V8.5a7 7 0 0 1 14 0V11M4 11v2a8 8 0 0 0 16 0v-2M2 21h20" />, t),
  documento: (t = 28) => svg(<>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h4" />
  </>, t),
  requisicao: (t = 28) => svg(<>
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
    <path d="M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2" />
    <path d="M9 12l1.8 1.8L15 10" />
  </>, t),
  alvo: (t = 28) => svg(<>
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </>, t),
  repetir: (t = 28) => svg(<>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
  </>, t),
  atividades: (t = 28) => svg(
    <path d="M12 2l2.6 6.6L21 9.2l-4.8 4.3 1.4 6.5L12 16.8 6.4 20l1.4-6.5L3 9.2l6.4-.6z" />, t),
  livro: (t = 26) => svg(<>
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5A2.5 2.5 0 0 1 4 19.5z" />
  </>, t),
  calendario: (t = 26) => svg(<>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>, t),
};

const ICONES_NAV: Record<SeparadorAluno, React.ReactNode> = {
  inicio:   ico(<><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>, 22),
  aula:     ico(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>, 22),
  percurso: ico(<><path d="M3 17l5-5 4 4 8-8" /><path d="M15 8h5v5" /></>, 22),
  recursos: ico(<><path d="M4 4h5v16H4zM10 4h5v16h-5z" /><path d="M16.5 4.5l3.5.9-3.5 15-.5-.1" /></>, 22),
  perfil:   ico(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>, 22),
};

const LABEL_NAV: Record<SeparadorAluno, string> = {
  inicio: 'Início', aula: 'Aula', percurso: 'Percurso',
  recursos: 'Recursos', perfil: 'Perfil',
};

// ── Barra de navegação permanente ─────────────────────────────
// Mantém-se igual dentro e fora da aula: o aluno tem sempre saída.

export function NavegacaoAluno({ ativo, onNavegar }: {
  ativo: SeparadorAluno;
  onNavegar: (s: SeparadorAluno) => void;
}) {
  return (
    <nav style={{
      position: 'sticky', bottom: 0, background: C.branco,
      borderTop: `1px solid ${C.border}`, display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 0)', zIndex: 50,
    }}>
      {(Object.keys(LABEL_NAV) as SeparadorAluno[]).map(s => {
        const sel = ativo === s;
        return (
          <button key={s} onClick={() => onNavegar(s)} aria-label={LABEL_NAV[s]}
            aria-current={sel ? 'page' : undefined}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              // 44px de alvo tátil, como a especificação pede.
              padding: '10px 4px', minHeight: 56, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: sel ? C.violeta : C.suave, fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}>
            {ICONES_NAV[s]}
            <span style={{ fontSize: 11.5, fontWeight: sel ? 700 : 500 }}>{LABEL_NAV[s]}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Cabeçalho ─────────────────────────────────────────────────

function saudacao(d = new Date()): string {
  const h = d.getHours();
  if (h < 13) return 'Bom dia';
  if (h < 20) return 'Boa tarde';
  return 'Boa noite';
}

export function CabecalhoAluno({ nome, turmaId, onVoltar }: {
  nome: string; turmaId: string; onVoltar?: () => void;
}) {
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '').join('');
  const primeiro = nome.split(' ')[0] || nome;

  return (
    <header style={{
      background: C.branco, borderBottom: `1px solid ${C.border}`,
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      {onVoltar ? (
        <button onClick={onVoltar} aria-label="Voltar" style={{
          width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
          background: C.violetaSuave, color: C.violeta, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ico(<path d="M15 18l-6-6 6-6" />, 20)}
        </button>
      ) : <div style={{ width: 4 }} />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.tinta, lineHeight: 1.2 }}>
          {onVoltar ? nome : `${saudacao()}, ${primeiro}`}
        </div>
        <div style={{ fontSize: 14, color: C.texto }}>Turma {turmaId}</div>
      </div>

      <div style={{
        width: 42, height: 42, borderRadius: '50%', background: C.violeta,
        color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{iniciais || '·'}</div>
    </header>
  );
}

// ── Início ────────────────────────────────────────────────────

const rotulo: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: C.suave, marginBottom: 9,
};

interface Props {
  nomeAluno: string;
  turmaId: string;
  ucId?: string;
  ucNome?: string;
  planoHoje?: PlanoAula | null;
  numeroPlano?: number;
  /** true depois de o professor abrir a sessão. */
  sessaoAberta?: boolean;
  /** true depois de o aluno ter marcado presença. */
  jaEntrou?: boolean;
  proximasAulas?: number;
  avisos?: AvisoAluno[];
  fichasAtribuidas?: number;
  notaProgressiva?: number | null;
  recuperacoesPendentes?: number;
  atividadesAbertas?: number;
  onAbrir: (destino: DestinoAluno) => void;
}

export function InicioAluno({
  ucId, ucNome, planoHoje, numeroPlano,
  sessaoAberta = false, jaEntrou = false,
  proximasAulas = 0, avisos = [],
  fichasAtribuidas = 0, notaProgressiva = null,
  recuperacoesPendentes = 0, atividadesAbertas = 0,
  onAbrir,
}: Props) {
  // Antes da ativação o botão diz Consultar plano; depois, Iniciar aula.
  const acao = !planoHoje ? null
    : jaEntrou ? { texto: 'Continuar a aula', destino: 'entrar' as DestinoAluno }
    : sessaoAberta ? { texto: 'Iniciar aula', destino: 'entrar' as DestinoAluno }
    : { texto: 'Consultar plano', destino: 'consultar_plano' as DestinoAluno };

  return (
    <div style={{ background: C.fundo, minHeight: '100%', padding: '16px 14px 24px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>

        {/* ── A AULA DE HOJE ─────────────────────────────────
            O título diz ao aluno que tudo o que está aqui é daquela
            aula. Sem isto, o que é da aula e o que é geral misturam-se. */}
        <div style={rotulo}>A aula de hoje</div>

        {planoHoje ? (
          <>
            <div style={{ background: C.violeta, borderRadius: 18, padding: 18, marginBottom: 11 }}>
              <div style={{ fontSize: 13.5, color: C.violetaClaro }}>
                {planoHoje.horaInicio}–{planoHoje.horaFim}{ucId ? ` · ${ucId}` : ''}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 5, lineHeight: 1.25 }}>
                {ucNome || planoHoje.titulo}
              </div>
              <div style={{ fontSize: 14.5, color: C.violetaClaro, marginTop: 4 }}>
                {numeroPlano ? `Plano de aula ${String(numeroPlano).padStart(2, '0')}` : planoHoje.titulo}
                {planoHoje.titulo && numeroPlano ? ` · ${planoHoje.titulo}` : ''}
              </div>

              {!sessaoAberta && (
                <div style={{ fontSize: 13.5, color: C.violetaClaro, marginTop: 12,
                  paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
                  A entrada ainda não foi aberta pelo professor. Podes consultar
                  o plano e os materiais.
                </div>
              )}

              <button onClick={() => onAbrir(acao!.destino)} style={{
                width: '100%', marginTop: 16, minHeight: 54, borderRadius: 12,
                border: 'none', background: '#fff', color: C.violeta,
                fontSize: 17.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {acao!.texto}
              </button>
            </div>

            {/* Os materiais da aula, em violeta mais claro: pertencem à
                aula, mas não competem com o botão de entrar. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 9, marginBottom: 22 }}>
              {([
                ['fichas',     'A minha ficha', Icones.panela,
                  fichasAtribuidas ? `${fichasAtribuidas}` : undefined],
                ['guiao',      'Guião',         Icones.documento, undefined],
                ['requisicao', 'Requisição',    Icones.requisicao, undefined],
              ] as [DestinoAluno, string, (t?: number) => React.ReactNode, string | undefined][])
                .map(([d, lbl, ic, badge]) => (
                <button key={d} onClick={() => onAbrir(d)} style={{
                  background: C.violetaMedio, border: 'none', borderRadius: 14,
                  padding: '15px 6px', minHeight: 92, cursor: 'pointer',
                  fontFamily: 'inherit', color: '#fff', position: 'relative',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 7,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  {ic(28)}
                  <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'center',
                    lineHeight: 1.2 }}>{lbl}</span>
                  {badge && (
                    <span style={{ position: 'absolute', top: 8, right: 9,
                      background: '#fff', color: C.violeta, borderRadius: 20,
                      minWidth: 20, height: 20, fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px' }}>{badge}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background: C.branco, borderRadius: 18, padding: 20,
            marginBottom: 22, boxShadow: C.sombra }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.tinta }}>
              Não tens aula hoje
            </div>
            <div style={{ fontSize: 15, color: C.texto, marginTop: 6, lineHeight: 1.55 }}>
              {proximasAulas > 0
                ? `Tens ${proximasAulas} aula${proximasAulas > 1 ? 's' : ''} marcada${proximasAulas > 1 ? 's' : ''} para os próximos dias.`
                : 'Não há aulas marcadas para os próximos dias.'}
            </div>
            <button onClick={() => onAbrir('calendario')} style={{
              width: '100%', marginTop: 15, minHeight: 48, borderRadius: 12,
              border: `2px solid ${C.violeta}`, background: 'transparent',
              color: C.violeta, fontSize: 15.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Ver o calendário
            </button>
          </div>
        )}

        {/* ── AVISOS: só quando exigem uma ação ── */}
        {avisos.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={rotulo}>Avisos</div>
            {avisos.map(a => (
              <button key={a.id} onClick={() => onAbrir(a.destino)} style={{
                width: '100%', background: a.urgente ? C.cobreSuave : C.branco,
                border: 'none', borderLeft: `4px solid ${a.urgente ? C.cobre : C.violeta}`,
                borderRadius: 12, padding: '14px 15px', marginBottom: 8,
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: C.sombra, minHeight: 44,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700,
                    color: a.urgente ? C.cobre : C.tinta }}>{a.titulo}</span>
                  <span style={{ display: 'block', fontSize: 13.5,
                    color: a.urgente ? '#8A4E15' : C.suave, marginTop: 2 }}>{a.detalhe}</span>
                </span>
                <span style={{ color: a.urgente ? C.cobre : C.suave, fontSize: 20 }}>›</span>
              </button>
            ))}
          </div>
        )}

        {/* ── O MEU PERCURSO ─────────────────────────────────
            Cartões cheios: são destinos importantes, mas de consulta,
            não da aula que está a decorrer. */}
        <div style={rotulo}>O meu percurso</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 11, marginBottom: 22 }}>
          <button onClick={() => onAbrir('nota')} style={cartaoCheio}>
            <span style={{ fontSize: 27, fontWeight: 700, lineHeight: 1 }}>
              {notaProgressiva != null
                ? notaProgressiva.toFixed(1).replace('.', ',')
                : '—'}
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>A minha nota</span>
          </button>

          <button onClick={() => onAbrir('perfil')} style={cartaoCheio}>
            {Icones.alvo(28)}
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>O meu perfil</span>
          </button>

          <button onClick={() => onAbrir('recuperacoes')} style={cartaoCheio}>
            {Icones.repetir(28)}
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Recuperações</span>
            {recuperacoesPendentes > 0 && (
              <span style={{ fontSize: 12.5, color: C.violetaClaro }}>
                {recuperacoesPendentes} por recuperar
              </span>
            )}
          </button>

          <button onClick={() => onAbrir('atividades')} style={cartaoCheio}>
            {Icones.atividades(28)}
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Atividades</span>
            {atividadesAbertas > 0 && (
              <span style={{ fontSize: 12.5, color: C.violetaClaro }}>
                {atividadesAbertas} aberta{atividadesAbertas > 1 ? 's' : ''}
              </span>
            )}
          </button>
        </div>

        {/* ── CONSULTA: brancos com borda, para se distinguirem ── */}
        <div style={rotulo}>Consulta</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 11 }}>
          <button onClick={() => onAbrir('manual')} style={cartaoBranco}>
            {Icones.livro(26)}
            <span style={{ fontSize: 14, fontWeight: 600, color: C.tinta }}>Manual da UC</span>
          </button>
          <button onClick={() => onAbrir('calendario')} style={cartaoBranco}>
            {Icones.calendario(26)}
            <span style={{ fontSize: 14, fontWeight: 600, color: C.tinta }}>Calendário</span>
          </button>
        </div>

      </div>
    </div>
  );
}

const cartaoCheio: React.CSSProperties = {
  background: C.violeta, border: 'none', borderRadius: 14,
  padding: '18px 10px', minHeight: 104, cursor: 'pointer',
  fontFamily: 'inherit', color: '#fff',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 7,
  WebkitTapHighlightColor: 'transparent',
};

const cartaoBranco: React.CSSProperties = {
  background: C.branco, border: `1.5px solid #D8D3E0`, borderRadius: 14,
  padding: '16px 10px', minHeight: 88, cursor: 'pointer',
  fontFamily: 'inherit', color: C.violeta,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 7,
  WebkitTapHighlightColor: 'transparent',
};

export const CORES_ALUNO = C;

// ── Ícones do fardamento ──────────────────────────────────────

const icoF = (d: React.ReactNode) => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

export const IconesFarda: Record<string, () => React.ReactNode> = {
  farda:   () => icoF(<path d="M4 8l4-4h8l4 4-3 2v10H7V10z" />),
  touca:   () => icoF(<><path d="M5 12a7 7 0 0 1 14 0" /><path d="M4 12h16v2H4z" /><path d="M6 14v5h12v-5" /></>),
  sapatos: () => icoF(<><path d="M4 17h16l-1-4H5z" /><path d="M6 13V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" /></>),
  avental: () => icoF(<><path d="M7 21v-6a5 5 0 0 1 10 0v6" /><path d="M9 11V6a3 3 0 0 1 6 0v5" /></>),
  cabelo:  () => icoF(<><path d="M12 3a6 6 0 0 0-6 6v3l-1 4h14l-1-4V9a6 6 0 0 0-6-6z" /><path d="M9 20h6" /></>),
  maos:    () => icoF(<><path d="M7 14a5 5 0 0 1 10 0v3H7z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /><path d="M5 20h14" /></>),
  fones:   () => icoF(<><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="2" y="14" width="5" height="6" rx="2" /><rect x="17" y="14" width="5" height="6" rx="2" /></>),
  adornos: () => icoF(<><circle cx="12" cy="12" r="9" /><path d="M12 3v18M5 8h14" /></>),
  unhas:   () => icoF(<><circle cx="12" cy="12" r="9" /><path d="M8 8l8 8M16 8l-8 8" /></>),
};

/** Cabeçalho violeta dos ecrãs internos. */
export function CabecalhoEcra({ ucId, ucNome, titulo, subtitulo, onVoltar }: {
  ucId?: string; ucNome?: string; titulo: string; subtitulo?: string;
  onVoltar?: () => void;
}) {
  return (
    <div style={{ background: C.violeta, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <button onClick={onVoltar} disabled={!onVoltar} aria-label="Voltar"
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent',
          border: 'none', padding: 0, cursor: onVoltar ? 'pointer' : 'default',
          fontFamily: 'inherit' }}>
        {onVoltar && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff"
            strokeWidth={2.2} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
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
