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
7. **O aluno não volta a responder por causa de um problema da aplicação.** Só responde outra vez quando mudam as perguntas (regra 3).
8. «Resposta nova» ou «antiga» decide-se pela **versão do plano** a que o aluno respondeu (`versaoPlano`), e não pela hora do telemóvel, que pode estar errada.
9. Num trabalho em que o aluno escolhe o tema, o tema que já trabalhava aparece sempre na lista.

## Grupos
14. **Ligar ou desligar os grupos é uma alteração do plano.** Aparece em «Finalizar alterações» e no plano como fica, com os grupos formados. O botão diz «Grupos LIGADOS» ou «Grupos DESLIGADOS».
15. **No mesmo grupo, o tema é o mesmo.** Se o aluno escolher um tema diferente do de um colega do grupo, é avisado («O teu colega … escolheu outro tema. Tens a certeza? Fala com o professor») e pode escolher o mesmo. Na validação, o professor vê «⚠ Tema diferente do grupo».

## Atividades (eventos, concursos) dentro de uma aula
16. **Uma atividade nunca muda a aula.** Se o professor escolhe um tipo de atividade ao editar uma aula, a aula fica igual para todos. A atividade é criada à parte, ligada a essa aula (`aulaLigada`), e só a veem os alunos que foram.
17. **O professor pode pôr diretamente quem foi** («Acrescentar um aluno que foi»), sem esperar pelas inscrições.
18. **«Confirmar participantes»** mostra quem participa, o que cada um vai responder e como conta (bónus ou pontos, sem faltas). Publica a atividade e grava.
19. **Os alunos da atividade também respondem à aula?** Decide o professor ao confirmar: «Também respondem à aula» ou «Só respondem à atividade». No segundo caso, a aula diz ao aluno que responde só à atividade, e ele não conta como «falta responder».

## Validação do professor
10. **A última resposta está sempre ao alcance do professor para validar,** em «Por validar» ou em «Já validadas — tocar para alterar», mesmo dias depois.
11. **Conta a validação mais recente do professor.** Uma correção substitui a anterior (notas e registos).
12. O professor vê o tema que o aluno escolheu e se respondeu mais do que uma vez.

## Datas
13. As datas comparam-se como datas e não como texto (`quandoFoi`). A hora do Sheets, do Firebase e de cada telemóvel pode vir escrita de maneiras diferentes.

