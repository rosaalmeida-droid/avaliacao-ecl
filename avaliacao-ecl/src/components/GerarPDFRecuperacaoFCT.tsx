import { RecuperacaoModulo } from '../types';

// ═══════════════════════════════════════════════════════════════
// Gerador de PDF — Plano de Recuperação via FCT
// Segue o modelo oficial ECL_GAE_031_0 (Plano de Recuperação), adaptado
// para o caso específico de recuperação evidenciada em FCT.
// Mesmo padrão de impressão que gerarPDFGuiao — abre janela, imprime.
// ═══════════════════════════════════════════════════════════════

export interface OpcoesPDFRecuperacaoFCT {
  nomeAluno: string;
  numero: number | string;
  turmaId: string;
  ucId: string;
  ucNome: string;
  recuperacao: RecuperacaoModulo;
}

function checkbox(marcado: boolean, label: string): string {
  return `<span style="white-space:nowrap;">( ${marcado ? 'X' : '&nbsp;'} ) ${label}</span>`;
}

export function gerarPDFRecuperacaoFCT(opts: OpcoesPDFRecuperacaoFCT): void {
  const { nomeAluno, numero, turmaId, ucId, ucNome, recuperacao } = opts;
  const fct = recuperacao.fct;
  if (!fct) { alert('Esta recuperação não tem dados de FCT associados.'); return; }

  const dataHoje = new Date().toLocaleDateString('pt-PT');

  const linhasEvidencias = (fct.evidencias || []).map((e, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #999;font-size:10px;vertical-align:top;">${i + 1}</td>
      <td style="padding:8px;border:1px solid #999;font-size:10px;vertical-align:top;">${e.competenciaId}</td>
      <td style="padding:8px;border:1px solid #999;font-size:10px;vertical-align:top;">${e.descricao || ''}</td>
      <td style="padding:8px;border:1px solid #999;font-size:10px;vertical-align:top;">${e.dataOcorrencia || ''}</td>
      <td style="padding:8px;border:1px solid #999;font-size:10px;text-align:center;vertical-align:top;">${e.validadoPeloSupervisor ? '✓' : ''}</td>
    </tr>`).join('') || `
    <tr><td colspan="5" style="padding:12px;border:1px solid #999;font-size:10px;text-align:center;color:#999;">Sem evidências registadas ainda.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Plano de Recuperação — ${nomeAluno}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Calibri', Arial, sans-serif; font-size: 12px; color: #1a1714; margin: 0; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .titulo-principal { text-align:center; font-size:18px; font-weight:700; margin-bottom:4px; letter-spacing:0.05em; }
  .subtitulo { text-align:center; font-size:12px; color:#555; margin-bottom:18px; }
  .cab-secao { background:#1f1b16; color:#fff; font-weight:700; font-size:12px; padding:8px 10px; }
  .celula { border:1px solid #999; padding:10px; font-size:11px; vertical-align:top; }
  .linha-assinatura { margin-top:6px; font-size:10px; }
  .rotulo { font-weight:700; font-size:10px; text-transform:uppercase; color:#555; }
</style>
</head>
<body>

  <div class="titulo-principal">PLANO DE RECUPERAÇÃO — VIA FCT</div>
  <div class="subtitulo">Formação em Contexto de Trabalho · Escola de Comércio de Lisboa</div>

  <table>
    <tr>
      <td class="celula" style="width:50%;"><span class="rotulo">Aluno</span><br>${nomeAluno} (nº ${numero})</td>
      <td class="celula" style="width:25%;"><span class="rotulo">Turma</span><br>${turmaId}</td>
      <td class="celula" style="width:25%;"><span class="rotulo">Data</span><br>${dataHoje}</td>
    </tr>
    <tr>
      <td class="celula" colspan="2"><span class="rotulo">Unidade de Competência</span><br>${ucId} — ${ucNome}</td>
      <td class="celula"><span class="rotulo">Local de FCT</span><br>${fct.localFCT || '—'}</td>
    </tr>
  </table>

  <table style="margin-top:10px;">
    <tr><td class="cab-secao" colspan="2">DIAGNÓSTICO DA SITUAÇÃO</td></tr>
    <tr>
      <td class="celula" colspan="2">
        ${checkbox(false, 'O Aluno excedeu o número limite de ausências.')}<br>
        ${checkbox(true, 'O Aluno não atingiu os objetivos.')}<br>
        ${checkbox(true, 'Situação de recuperação — via evidências de FCT.')}
      </td>
    </tr>
  </table>

  <table style="margin-top:10px;">
    <tr><td class="cab-secao" colspan="2">COMPETÊNCIAS A EVIDENCIAR NA FCT</td></tr>
    <tr>
      <td class="celula" colspan="2">
        ${(fct.competenciasAEvidenciar || []).map(c => `• ${c}`).join('<br>') || '(nenhuma definida)'}
      </td>
    </tr>
  </table>

  <table style="margin-top:10px;">
    <tr><td class="cab-secao" colspan="2">HORAS DE FORMAÇÃO</td></tr>
    <tr>
      <td class="celula" colspan="2">
        ${fct.exigirHoras
          ? `${checkbox(true, `Horas mínimas exigidas: ${fct.horasMinimasExigidas || 0}h`)}<br>Horas registadas pelo aluno: ${fct.horasRegistadasPeloAluno ?? '____'}h`
          : `${checkbox(true, 'Horas não são o critério — contam apenas as evidências das competências, independentemente do nº de horas.')}`}
        ${fct.supervisorFCT ? `<br><br><span class="rotulo">Orientador/Supervisor na empresa</span><br>${fct.supervisorFCT}` : ''}
      </td>
    </tr>
  </table>

  <table style="margin-top:10px;">
    <tr><td class="cab-secao" colspan="5">EVIDÊNCIAS APRESENTADAS</td></tr>
    <tr>
      <td style="padding:6px;border:1px solid #999;font-size:10px;font-weight:700;background:#f0ede6;">Nº</td>
      <td style="padding:6px;border:1px solid #999;font-size:10px;font-weight:700;background:#f0ede6;">Competência</td>
      <td style="padding:6px;border:1px solid #999;font-size:10px;font-weight:700;background:#f0ede6;">Descrição da situação real</td>
      <td style="padding:6px;border:1px solid #999;font-size:10px;font-weight:700;background:#f0ede6;">Data</td>
      <td style="padding:6px;border:1px solid #999;font-size:10px;font-weight:700;background:#f0ede6;">Validado pelo supervisor</td>
    </tr>
    ${linhasEvidencias}
  </table>

  <table style="margin-top:10px;">
    <tr><td class="cab-secao" colspan="2">AVALIAÇÃO</td></tr>
    <tr>
      <td class="celula" style="width:50%;">
        <b>Autoavaliação</b><br><br>
        ${checkbox(false, 'Atingi os objetivos.')}<br>
        ${checkbox(false, 'Não atingi os objetivos.')}<br><br>
        <b>Justificação:</b><br><br><br>
        Proposta de classificação: ______ valores
      </td>
      <td class="celula" style="width:50%;">
        <b>Avaliação do Formador</b><br><br>
        ${checkbox(false, 'Atingiu os objetivos.')}<br>
        ${checkbox(false, 'Não atingiu os objetivos.')}<br><br>
        <b>Justificação:</b><br><br><br>
        Classificação atribuída: ______ valores
      </td>
    </tr>
  </table>

  <div class="linha-assinatura" style="margin-top:24px;display:flex;justify-content:space-between;">
    <span>_____________________________<br>O Formador</span>
    <span>_____________________________<br>O Aluno</span>
  </div>

  <div style="margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between;">
    <span>Plano de Recuperação via FCT · ${ucId}</span>
    <span>Avaliação ECL · Escola de Comércio de Lisboa</span>
  </div>

</body>
</html>`;

  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) { alert('Permite popups para gerar o PDF'); return; }
  janela.document.write(html);
  janela.document.close();
  janela.onload = () => {
    setTimeout(() => {
      janela.focus();
      janela.print();
    }, 500);
  };
}
