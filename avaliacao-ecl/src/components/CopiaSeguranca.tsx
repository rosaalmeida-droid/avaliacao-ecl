import React, { useState, useRef } from 'react';
import { descarregarCopiaSeguranca, restaurarCopiaSeguranca, exportarTudo, CopiaSeguranca } from '../backend';

export function CopiaSegurancaView() {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [ficheiroEscolhido, setFicheiroEscolhido] = useState<CopiaSeguranca | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dadosActuais = exportarTudo();
  const contagens = [
    { label: 'Planos de aula', n: dadosActuais.planos.length },
    { label: 'Fichas de produção', n: dadosActuais.fichas.length },
    { label: 'Requisições', n: dadosActuais.requisicoes.length },
    { label: 'Alunos', n: dadosActuais.alunos.length },
    { label: 'Registos de avaliação', n: dadosActuais.historicoAvaliacoes.length },
  ];

  function lerFicheiro(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResultado(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const texto = ev.target?.result as string;
        const json = JSON.parse(texto);
        if (!json.versao || !Array.isArray(json.planos)) {
          setResultado({ ok: false, msg: 'Este ficheiro não parece ser uma cópia de segurança válida.' });
          return;
        }
        setFicheiroEscolhido(json);
      } catch {
        setResultado({ ok: false, msg: 'Não foi possível ler este ficheiro. Confirma que é um .json exportado por esta app.' });
      }
    };
    reader.readAsText(file);
  }

  function confirmarRestauro(modo: 'substituir' | 'juntar') {
    if (!ficheiroEscolhido) return;
    if (modo === 'substituir') {
      const ok = confirm('Isto vai APAGAR tudo o que está guardado agora e substituir pelo conteúdo do ficheiro. Tens a certeza?');
      if (!ok) return;
    }
    try {
      restaurarCopiaSeguranca(ficheiroEscolhido, modo);
      setResultado({ ok: true, msg: `Restauro concluído (modo: ${modo === 'substituir' ? 'substituir tudo' : 'juntar com o existente'}). A app vai recarregar.` });
      setTimeout(() => window.location.reload(), 1800);
    } catch (e) {
      setResultado({ ok: false, msg: 'Erro ao restaurar: ' + String(e) });
    }
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        Cópia de Segurança
      </div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)', marginBottom: 16 }}>
        Guarda uma cópia de tudo no teu computador. Útil se mudares de dispositivo ou se algo correr mal.
      </div>

      {/* O que está guardado agora */}
      <div style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          O que está guardado agora neste dispositivo
        </div>
        {contagens.map(c => (
          <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
            <span>{c.label}</span>
            <strong>{c.n}</strong>
          </div>
        ))}
      </div>

      {/* Exportar */}
      <div style={{ background: 'var(--sage-pale)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(90,122,78,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--sage)', marginBottom: 6 }}>📥 Descarregar cópia</div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 12 }}>
          Cria um ficheiro .json com tudo o que está guardado agora. Guarda-o num sítio seguro (Google Drive, email para ti própria, etc.)
        </div>
        <button onClick={descarregarCopiaSeguranca}
          style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          📥 Descarregar cópia de segurança
        </button>
      </div>

      {/* Restaurar */}
      <div style={{ background: 'var(--copper-pale)', borderRadius: 12, padding: 16, border: '1px solid rgba(181,101,29,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--copper)', marginBottom: 6 }}>📤 Restaurar de um ficheiro</div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 12 }}>
          Escolhe um ficheiro .json exportado anteriormente para recuperar os dados.
        </div>
        <input ref={inputRef} type="file" accept=".json" onChange={lerFicheiro} style={{ marginBottom: 10, fontSize: 12 }} />

        {ficheiroEscolhido && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              Ficheiro lido — criado em {new Date(ficheiroEscolhido.criadoEm).toLocaleString('pt-PT')}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 10 }}>
              {ficheiroEscolhido.planos?.length || 0} planos · {ficheiroEscolhido.fichas?.length || 0} fichas · {ficheiroEscolhido.requisicoes?.length || 0} requisições
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => confirmarRestauro('juntar')}
                style={{ padding: '12px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                ➕ Juntar com o que já existe (recomendado)
              </button>
              <button onClick={() => confirmarRestauro('substituir')}
                style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--danger)', background: '#fff', color: 'var(--danger)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                ⚠️ Substituir tudo (apaga o actual)
              </button>
            </div>
          </div>
        )}

        {resultado && (
          <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, background: resultado.ok ? 'var(--sage-pale)' : 'rgba(179,65,58,0.1)', color: resultado.ok ? 'var(--sage)' : 'var(--danger)' }}>
            {resultado.msg}
          </div>
        )}
      </div>
    </div>
  );
}

export default CopiaSegurancaView;
