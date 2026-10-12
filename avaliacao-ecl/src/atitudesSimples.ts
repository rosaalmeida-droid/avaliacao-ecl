// ============================================================
// O que quer dizer cada atitude, em palavras do dia a dia
// ============================================================
// Rosa, 12/out/2026: «os alunos não percebem o que é iniciativa ou
// assertividade». O nome oficial fica (é o do referencial), e por baixo
// aparece esta frase, dita como se fala na cozinha.
// ============================================================

const SIMPLES: Record<string, string> = {
  'ATI-001': 'Assumir o que fazes, de bom e de mau, sem pôr as culpas nos outros.',
  'ATI-002': 'Fazer o teu trabalho sem precisares que te digam cada passo.',
  'ATI-003': 'Vir arranjado: farda completa e limpa, cabelo apanhado, unhas curtas, sem adornos.',
  'ATI-004': 'Fazer o que é preciso sem esperar que te mandem: ver o que falta e avançar.',
  'ATI-005': 'Manter a calma quando alguma coisa corre mal ou alguém te irrita.',
  'ATI-006': 'Dizer o que pensas ou o que precisas com calma e respeito, sem gritar e sem ficar calado.',
  'ATI-007': 'Perceber como o colega se sente e ter isso em conta.',
  'ATI-008': 'Ouvir até ao fim e com atenção, antes de responder ou de fazer.',
  'ATI-009': 'Trabalhar com a equipa: ajudar, dividir as tarefas e acabar juntos.',
  'ATI-010': 'Não desistir quando é difícil: tentar outra vez e procurar uma solução.',
  'ATI-011': 'Ter o posto, o material e o tempo arrumados e pensados.',
  'ATI-012': 'Aceitar mudanças de planos e adaptar-te sem amuar.',
  'ATI-013': 'Querer aprender: perguntar, aceitar correções e experimentar.',
  'ATI-014': 'Não desperdiçar: aproveitar sobras, poupar água e energia, separar o lixo.',
  'ATI-015': 'Cumprir as regras da escola e da cozinha, mesmo quando ninguém está a ver.',
  'ATI-016': 'Cumprir as regras de higiene da comida: mãos, temperaturas, superfícies e validades.',
  'ATI-017': 'Trabalhar sem te magoares nem magoar ninguém: facas, calor, chão e postura.',
  'ATI-018': 'Tratar bem os outros: não gozar, não ofender, pensar em como se sentem.',
  'ATI-019': 'Acreditar que consegues e mostrá-lo: tentar sem medo de errar.',
  'ATI-020': 'Estar como um profissional: a horas, atento, com boa postura e a linguagem certa.',
  'ATI-021': 'Olhar para o que fizeste e saber dizer o que está bem e o que podia ser melhor.',
  'ATI-022': 'Respeitar quem é diferente de ti (país, cultura, forma de ser) e trabalhar com todos.',
};

/** A frase simples da atitude ('' se não houver). */
export function atitudeEmPalavrasSimples(id: string): string {
  return SIMPLES[id] || '';
}
