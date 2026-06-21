import React, { useState } from 'react';
import { getAlunos, getPerfilProfissionalAluno, addAluno } from '../backend';

export function MapaCompetencias({ turmaId }: { turmaId: string }) {
  const [alunoAberto, setAlunoAberto] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const alunos = getAlunos().filter(a => a.turmaId === turmaId).sort((a, b) => a.numero - b.numero);

  return (
    <div style={{ background: 'var(--competencias-pale)', borderRadius: 16, padding: 16 }}>
      <div style={{ background: 'var(--competencias)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'white' }}>
          🗺️ Mapa de Competências
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
          Estado das competências de cada aluno — observadas, em desenvolvimento, consolidadas, por recuperar.
        </div>
      </div>

      {alunos.length === 0 && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>
          Ainda não há alunos registados nesta turma.
        </div>
      )}

      {alunos.map(a => {
        const perfil = getPerfilProfissionalAluno(a.id);
        const total = perfil.tecnicas.length + perfil.responsabilidades.length + perfil.atitudes.length;
        const consolidadas = [...perfil.tecnicas, ...perfil.responsabilidades, ...perfil.atitudes].filter(i => i.nivel >= 3).length;
        const aberto = alunoAberto === a.id;
        return (
          <div key={a.id} style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setAlunoAberto(aberto ? null : a.id)}
              style={{ width: '100%', padding: '10px 14px', background: aberto ? 'var(--copper-pale)' : '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--copper)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {a.numero}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.nome || `Aluno ${a.numero}`}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>{consolidadas}/{total} competências consolidadas</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--copper)' }}>{aberto ? '▲' : '▼'}</span>
            </button>

            {aberto && (
              <div style={{ padding: '12px 14px' }}>
                <div style={{ marginBottom: 12, padding: 10, background: 'var(--cream-dark)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.6)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Nível de Medidas Educativas — adapta os planos de recuperação gerados por IA
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => { addAluno({ ...a, nivelMedidas: n as 1|2|3 }); setAlunoAberto(a.id); setRefresh(k => k + 1); }}
                        style={{
                          flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          border: (a.nivelMedidas || 1) === n ? 'none' : '1px solid var(--border)',
                          background: (a.nivelMedidas || 1) === n ? 'var(--copper)' : '#fff',
                          color: (a.nivelMedidas || 1) === n ? 'white' : 'rgba(26,23,20,0.6)',
                        }}>
                        Nível {n}
                      </button>
                    ))}
                  </div>
                </div>

                {total === 0 && <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)' }}>Sem competências registadas ainda.</div>}

                {perfil.tecnicas.length > 0 && (
                  <MiniGrupo titulo="Técnicas" itens={perfil.tecnicas} />
                )}
                {perfil.responsabilidades.length > 0 && (
                  <MiniGrupo titulo="Responsabilidades" itens={perfil.responsabilidades} />
                )}
                {perfil.atitudes.length > 0 && (
                  <MiniGrupo titulo="Atitudes" itens={perfil.atitudes} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniGrupo({ titulo, itens }: { titulo: string; itens: { nome: string; nivel: number }[] }) {
  const cor = (n: number) => n >= 4 ? '#2980b9' : n === 3 ? 'var(--sage)' : n === 2 ? 'var(--copper)' : n === 1 ? '#b8985a' : 'rgba(26,23,20,0.3)';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{titulo}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {itens.map((item, i) => (
          <span key={i} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, color: 'white', background: cor(item.nivel), fontWeight: 600 }}>
            {item.nome}
          </span>
        ))}
      </div>
    </div>
  );
}

export default MapaCompetencias;
