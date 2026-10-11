// ============================================================
// Ecrãs que só se descarregam quando são precisos (Rosa, 11/out/2026)
// ============================================================
// «Os alunos acham massacrador utilizar a aplicação: é muito lenta.» O
// telemóvel do aluno descarregava a aplicação inteira (3 MB), com os ecrãs
// do professor e da coordenadora que nunca abre. Cada ecrã grande passa a
// ser um ficheiro à parte: descarrega-se a primeira vez que é preciso, ou
// antes, em segundo plano, com `preparar()`.
//
// Se o ficheiro não chega (sem internet, ou saiu uma versão nova e o da
// versão antiga deixou de existir), aparece no sítio do ecrã um aviso com
// «Atualizar a aplicação». Não há «tentar outra vez» sem recarregar: o
// navegador guarda a falha e voltava a falhar. Nunca se recarrega a página
// sozinha: o aluno ou o professor podiam ter trabalho a meio.
// ============================================================
import React, { Suspense, lazy, useState } from 'react';

export type APedido<P> = React.FC<P> & { preparar: () => Promise<unknown> };

const aAbrir = (
  <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 15, color: 'rgba(26,23,20,0.55)' }}>A abrir…</div>
);

class SeNaoChegar extends React.Component<{ children: React.ReactNode }, { falhou: boolean }> {
  state = { falhou: false };
  static getDerivedStateFromError() { return { falhou: true }; }
  render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <div style={{ margin: '16px auto', maxWidth: 520, background: '#fdf0e6', border: '1.5px solid #B5651D', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: '#8A4A12' }}>Não foi possível abrir este ecrã.</div>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', margin: '4px 0 12px', lineHeight: 1.5 }}>
          Verifica a internet e toca em «Atualizar a aplicação».
        </div>
        <button onClick={() => window.location.reload()}
          style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#B5651D', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Atualizar a aplicação</button>
      </div>
    );
  }
}

/** Um componente que se descarrega só quando aparece (ou quando se chama `preparar()`). */
export function aPedido<P extends object>(carregar: () => Promise<React.ComponentType<P>>): APedido<P> {
  let pronto: React.ComponentType<P> | null = null;
  let aCaminho: Promise<React.ComponentType<P>> | null = null;
  const preparar = () => aCaminho || (aCaminho = carregar().then(
    c => (pronto = c),
    e => { aCaminho = null; throw e; },
  ));
  const Preguicoso = lazy(() => preparar().then(c => ({ default: c })));
  const C = ((props: P) => {
    // Já descarregado: aparece logo, sem «A abrir…». Escolhe-se uma vez por
    // ecrã, para não trocar de componente a meio (perdia-se o que lá está).
    const [jaPronto] = useState(() => pronto);
    if (jaPronto) return React.createElement(jaPronto, props);
    return (
      <SeNaoChegar>
        <Suspense fallback={aAbrir}>{React.createElement(Preguicoso as unknown as React.ComponentType<P>, props)}</Suspense>
      </SeNaoChegar>
    );
  }) as APedido<P>;
  C.preparar = preparar;
  return C;
}

/** Descarrega em segundo plano, quando o aparelho está livre. */
export function prepararDepois(componentes: { preparar: () => Promise<unknown> }[], atrasoMs = 1500) {
  const correr = () => componentes.forEach(c => { c.preparar().catch(() => { /* tenta outra vez quando for aberto */ }); });
  const t = setTimeout(() => {
    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(correr, { timeout: 4000 });
    else correr();
  }, atrasoMs);
  return () => clearTimeout(t);
}
