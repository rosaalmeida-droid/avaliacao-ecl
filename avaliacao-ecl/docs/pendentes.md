# Pendentes (para lembrar a Rosa)

## Resolvido — «não está associado a este telemóvel» (out/2026)
O código do telemóvel fica guardado no navegador, e o iPhone (Safari) apaga-o ao fim de 7 dias sem abrir o site. O ícone do ecrã principal, o Safari e os links abertos pelo WhatsApp ou pelo Instagram guardam cada um no seu sítio. Por isso o mesmo telemóvel parecia outro.

Agora, com o PIN certo, o aluno entra na mesma: o PIN passa para esse telemóvel e o professor recebe um aviso em «Avisos».

## Por fazer
- **Alunos de alta performance (Rosa, 6/out/2026) — feito o primeiro passo (perguntas extra no plano, desafio opcional ao aluno, avaliação do professor sem contar para a nota). Falta decidir como entra na avaliação quando o professor marca «Entra na avaliação», e se as perguntas boas ficam num banco por ficha.**
- Segurança: os PIN dos professores e da coordenação estão no código. A lista de alunos (com PIN) pode ser pedida ao Sheets por quem tiver o endereço. As regras do Firebase aceitam qualquer aparelho com a aplicação.
- Partir os ficheiros enormes (backend.ts, AlunoView.tsx, ProfessorView.tsx, VistaDePlano.tsx), aos poucos.
- **Banco novo de perguntas (docs/perguntas_novas.html, gerado por `npx tsx scripts/gerarPerguntasNovas.mts`)**: à espera da aprovação da Rosa. Ao ligá-lo, o Colaborativo novo tem um `cl03` («Dividir o trabalho») com o mesmo código da pergunta `cl03` que já está em uso («Participar e ajudar», CL_AULA): mudar os códigos do banco novo (e as chaves em perguntas5CMuitoSimples.ts) antes de ligar.
- **Espaço no tablet do professor (13/out/2026)**: o navegador dá cerca de 5 milhões de letras por site; o tablet guarda todas as turmas e ia em ~2,8 milhões ao fim de um mês (quase tudo do 3.º ACP). Já há aviso aos 80%. Falta guardar as coleções grandes comprimidas (ou noutro armazenamento) antes de encher.

