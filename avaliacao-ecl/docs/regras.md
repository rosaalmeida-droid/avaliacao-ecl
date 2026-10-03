# Regras da aplicação (out/2026)

Estas regras valem em toda a aplicação: no professor, no aluno, na coordenação, no Sheets e no Firebase. Qualquer mudança nova tem de as cumprir.

## Plano de aula
1. **O aluno vê sempre a versão mais recente do plano.** Cada gravação leva a hora (`atualizadoEm`). O ecrã da aula do aluno não fica com a versão de quando a abriu.
2. **Mudar o dia, as horas, o título ou o sumário não obriga a responder outra vez.** Estas mudanças chegam aos alunos sozinhas.
3. **Mudar aquilo a que o aluno responde depois de alguém já ter respondido obriga a responder outra vez.** Isto inclui perguntas, tipo de aula, conteúdos do manual, competências, fichas e como é a aula. A nota que o professor já deu conta até validar a nova.
3a. **Finalizar alterações.** Num plano publicado, enquanto houver alterações por finalizar, aparece a barra «Finalizar alterações». As alterações feitas dentro do plano também contam. O professor vê o plano todo como fica e o que mudou agora, e só depois confirma. Quando os alunos têm de responder outra vez, aparece o botão «Avisar a turma no WhatsApp».
3b. **Trabalho com tema escolhido pelo aluno e um só conteúdo marcado é um engano do professor.** A aplicação avisa no plano e nos conteúdos.
4. Um plano anulado não volta, e o que dependia dele sai também.

## Autoavaliação do aluno
5. **Conta só a última resposta de cada aluno em cada aula.** As anteriores deixam de contar (`selecoesQueContam`, `ultimaResposta`).
6. **A última resposta tem de chegar ao professor.** O envio insiste até o Sheets ter essa versão (a hora da resposta) e nunca desiste. Se o professor já a validou, conta como chegada.
7. **O aluno não volta a responder por causa de um problema da aplicação.** Só responde outra vez quando o professor o pede (regra 3).
8. «Resposta nova» ou «antiga» decide-se pela **versão do plano** a que o aluno respondeu (`versaoPlano`), e não pela hora do telemóvel, que pode estar errada.
9. Num trabalho em que o aluno escolhe o tema, o tema que já trabalhava aparece sempre na lista.

## Validação do professor
10. **A última resposta está sempre ao alcance do professor para validar,** em «Por validar» ou em «Já validadas — tocar para alterar», mesmo dias depois.
11. **Conta a validação mais recente do professor.** Uma correção substitui a anterior (notas e registos).
12. O professor vê o tema que o aluno escolheu e se respondeu mais do que uma vez.

## Datas
13. As datas comparam-se como datas e não como texto (`quandoFoi`). A hora do Sheets, do Firebase e de cada telemóvel pode vir escrita de maneiras diferentes.

