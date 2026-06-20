import React from 'react';

interface Props { children: React.ReactNode; }
interface State { temErro: boolean; mensagem: string; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { temErro: false, mensagem: '' };
  }

  static getDerivedStateFromError(error: any): State {
    return { temErro: true, mensagem: String(error?.message || error) };
  }

  componentDidCatch(error: any, info: any) {
    console.error('Erro capturado pela app:', error, info);
  }

  render() {
    if (this.state.temErro) {
      return (
        <div style={{ padding: 24, textAlign: 'center', maxWidth: 420, margin: '40px auto' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ocorreu um problema</div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 20 }}>
            A app encontrou um erro inesperado. Os teus dados ficaram guardados — não foram perdidos.
          </div>
          <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginBottom: 20, fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {this.state.mensagem}
          </div>
          <button
            onClick={() => {
              // Limpar drafts que possam estar corrompidos e causar o mesmo erro outra vez
              try {
                localStorage.removeItem('ecl_ficha_draft');
                localStorage.removeItem('ecl_link_draft');
              } catch {}
              this.setState({ temErro: false, mensagem: '' });
              window.location.reload();
            }}
            style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🔄 Recarregar a aplicação
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
