# Pendentes (para lembrar a Rosa)

## Resolvido — «não está associado a este telemóvel» (out/2026)
O código do telemóvel fica guardado no navegador, e o iPhone (Safari) apaga-o ao fim de 7 dias sem abrir o site. O ícone do ecrã principal, o Safari e os links abertos pelo WhatsApp ou pelo Instagram guardam cada um no seu sítio. Por isso o mesmo telemóvel parecia outro.

Agora, com o PIN certo, o aluno entra na mesma: o PIN passa para esse telemóvel e o professor recebe um aviso em «Avisos».

## Por fazer
- **Firebase no plano Blaze (13/out/2026), com o teste gratuito do Google (90 dias, 300 dólares de crédito)**: o limite de 50 mil leituras por dia era passado nos dias de aulas (cerca de 70 mil a 8/10 e 52 mil a 12/10) e a base parava. Antes de o teste acabar (o Firebase diz: válido até 12/jan/2027; 264 € de crédito oferecido), ativar a conta completa na faturação do Google; sem isso, a base pode deixar de responder. Pôr um alerta de orçamento (5 €). Ver no gráfico das leituras se baixaram depois do PR #152.
- **Alunos de alta performance (Rosa, 6/out/2026) — feito o primeiro passo (perguntas extra no plano, desafio opcional ao aluno, avaliação do professor sem contar para a nota). Falta decidir como entra na avaliação quando o professor marca «Entra na avaliação», e se as perguntas boas ficam num banco por ficha.**
- Segurança: os PIN dos professores e da coordenação estão no código. A lista de alunos (com PIN) pode ser pedida ao Sheets por quem tiver o endereço. As regras do Firebase aceitam qualquer aparelho com a aplicação.
- Partir os ficheiros enormes (backend.ts, AlunoView.tsx, ProfessorView.tsx, VistaDePlano.tsx), aos poucos.
- **Banco novo de perguntas (docs/perguntas_novas.html, gerado por `npx tsx scripts/gerarPerguntasNovas.mts`)**: à espera da aprovação da Rosa. Ao ligá-lo, o Colaborativo novo tem um `cl03` («Dividir o trabalho») com o mesmo código da pergunta `cl03` que já está em uso («Participar e ajudar», CL_AULA): mudar os códigos do banco novo (e as chaves em perguntas5CMuitoSimples.ts) antes de ligar.
- **Espaço no tablet do professor (13/out/2026) — resolvido**: os dados grandes guardam-se comprimidos (src/armazenamento.ts, regra 83). Se um dia voltar a encher, passar as coleções grandes para o IndexedDB.

