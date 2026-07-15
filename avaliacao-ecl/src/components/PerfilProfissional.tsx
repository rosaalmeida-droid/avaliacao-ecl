import React from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { Aluno } from '../types';
import { getPerfilProfissionalAluno, ItemPerfil } from '../backend';
import { NIVEL_DOMINIO_LABEL } from '../matrizEvidencias';

function corNivel(nivel: number): string {
  if (nivel >= 4) return '#2980b9';
  if (nivel === 3) return 'var(--sage)';
  if (nivel === 2) return 'var(--copper)';
  if (nivel === 1) return '#b8985a';
  return 'rgba(26,23,20,0.3)';
}

function GrupoCompetencias({ titulo, icone, itens }: { titulo: string; icone: string; itens: ItemPerfil[] }) {
  if (itens.length === 0) return null;
  const ordenados = [...itens].sort((a, b) => b.nivel - a.nivel);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--charcoal)' }}>
        {icone} {titulo} ({itens.length})
      </div>
      {ordenados.map(item => (
        <div key={item.competenciaId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 4, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ flex: 1, fontSize: 12 }}>{item.nome}</div>
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700, color: 'white', background: corNivel(item.nivel) }}>
            {NIVEL_DOMINIO_LABEL[item.nivel]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PerfilProfissionalAluno({ aluno }: { aluno: Aluno }) {
  const perfil = getPerfilProfissionalAluno(aluno.id);
  const totalCompetencias = perfil.tecnicas.length + perfil.responsabilidades.length + perfil.atitudes.length;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        O Meu Perfil Profissional
      </div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)', marginBottom: 16 }}>
        Resumo do teu desenvolvimento técnico, profissional e comportamental ao longo do curso.
      </div>

      {totalCompetencias === 0 && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>
          Ainda não há competências registadas. Vai aparecendo aqui à medida que participas nas aulas.
        </div>
      )}

      {perfil.pontosFortes.length > 0 && (
        <div style={{ background: 'var(--sage-pale)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sage)', marginBottom: 6 }}>💪 Pontos Fortes</div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.7)' }}>{perfil.pontosFortes.join(' · ')}</div>
        </div>
      )}

      {perfil.areasADesenvolver.length > 0 && (
        <div style={{ background: 'var(--copper-pale)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 6 }}>🎯 Áreas a Desenvolver</div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.7)' }}>{perfil.areasADesenvolver.join(' · ')}</div>
        </div>
      )}

      <GrupoCompetencias titulo="Competências Técnicas" icone="🔪" itens={perfil.tecnicas} />
      <GrupoCompetencias titulo="Responsabilidades" icone="⚠️" itens={perfil.responsabilidades} />
      <GrupoCompetencias titulo="Atitudes e Competências Transversais" icone="🪞" itens={perfil.atitudes} />
    </div>
  );
}

export default PerfilProfissionalAluno;
