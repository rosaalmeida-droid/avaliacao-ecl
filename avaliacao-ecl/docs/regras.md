# Regras da aplicação (out/2026)

Estas regras valem em toda a aplicação: no professor, no aluno, na coordenação, no Sheets e no Firebase. Qualquer mudança nova tem de as cumprir. Há testes automáticos para as principais (`testes/regras.mts`, corre-se com `npm run testar`).

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

## Plano de aula e atividade extra
23. **«Quem vai?» decide como conta.** Se vai a turma toda dentro do ano letivo, é um **plano de aula** com um evento lá dentro (`eventoNaAula`), que conta como aula. Se vai a turma toda fora do ano letivo (férias, antes das UC), é uma **atividade extra** com bónus, agregada ao plano de aula seguinte da UC, mesmo semanas depois. Se vão só alguns alunos, é uma **atividade extra** com bónus e sem faltas.
24. **«Onde é?»** (na escola ou fora da escola, no exterior) é só o sítio e não muda a avaliação. O tipo «Atividade fora da escola» aparece como «Visita ou outra atividade».
25. **A mesma metodologia para tudo o que é extra:** participantes confirmados; ficha técnica e guião opcionais; as técnicas avaliadas ficam no perfil e contam para a consolidação, mas na nota só contam dentro do bónus; os outros alunos só veem («Para ver»).
26. Tudo isto está explicado no Manual do professor («Plano de aula e atividade extra») e no guia do aluno (passos 6 a 8).

## Atividades (eventos, concursos) dentro de uma aula
16. **Uma atividade nunca muda a aula.** Se o professor escolhe um tipo de atividade ao editar uma aula, a aula fica igual para todos. A atividade é criada à parte, ligada a essa aula (`aulaLigada`), e só a veem os alunos que foram.
16a. **Atividade ≠ plano de aula.** Uma atividade nunca cria nem altera um plano de aula. O botão «Separar a atividade da aula» foi retirado. Nos ecrãs, um plano de aula diz «Como é o plano de aula» e uma atividade diz «Como é a atividade».
17. **O professor pode pôr diretamente quem foi** («Acrescentar um aluno que foi»), sem esperar pelas inscrições.
18. **«Confirmar participantes»** mostra quem participa, o que cada um vai responder e como conta (bónus ou pontos, sem faltas). Publica a atividade e grava.
19. **O plano da turma desse dia** é encontrado sozinho: o da mesma turma, no mesmo dia e às mesmas horas. Aparece escrito com o dia, as horas, o n.º e o título. Não muda com a atividade, e o conteúdo e o sumário da atividade são da atividade.
20. **A atividade é um extra (bónus até 0,5); os alunos continuam a responder ao plano da turma como os outros.** Por omissão respondem a tudo. O professor pode tirar uma parte para esses alunos (técnicas, conhecimentos, atitudes e 5 C), ou escolher «Nada: só respondem à atividade». O aluno vê na aula só essas perguntas, com a explicação.
20b. **Atitudes na atividade, decididas pela aplicação:** se os alunos da atividade já respondem às atitudes no plano de aula da turma desse dia, a atividade não as repete; se não respondem, a atividade avalia-as. O resumo da atividade explica qual é o caso.
20a. **Atividade com ficha técnica:** os alunos avaliam-se na atividade também nas técnicas da ficha, além das atitudes e da técnica geral. **E as técnicas contam na nota da atividade** (e por isso no bónus), com os pesos de uma aula prática: técnicas 60%, higiene e farda 20%, atitudes 20%. Sem ficha, só as atitudes contam.
20c. **As técnicas vêm da ficha e estão sempre à vista.** Em «Competências» (num plano de aula ou numa atividade), em cima, aparecem as técnicas de cada ficha, com «Abrir a ficha». Abrir uma ficha do plano abre essa ficha, com as técnicas escolhidas; nunca abre uma ficha nova. Numa atividade extra, «Competências» mostra o que os alunos respondem na atividade, e não as competências do plano de aula da turma.
20d. **Nomes:** diz-se sempre «atividade extra», nunca «aula», numa atividade («Preparar a atividade extra», «Abrir a atividade agora», «Quem participa nesta atividade extra?»). Se é na escola ou fora da escola pergunta-se em «Onde é?» (por omissão, na escola). O antigo tipo «Atividade fora da escola» aparece como «Atividade extra».
20f. **O tipo que o professor escolhe numa atividade vale em todo o lado.** Se escolheu «Prática» em «Como é a atividade», a atividade é prática na nota, na validação, nos registos e no Sheets. (Antes ficava «atitudinal» por dentro; as atividades já criadas corrigem-se sozinhas ao abrir, sem pedir aos alunos que respondam outra vez.)
20e. **Dentro de uma atividade só se mostra a atividade.** O botão diz «Editar a atividade» (e o ecrã «Alterar a atividade extra»). Do plano de aula da turma aparece só a ligação, à esquerda: «Atividade extra ligada ao plano …», e a que partes desse plano os alunos da atividade continuam a responder. Os avisos da aula (última aula da UC, cobertura da UC, eventos pedagógicos) não aparecem. O plano de aula trabalha-se à parte.
21. **Numa atividade com alunos escolhidos, todas as listas mostram só esses alunos** (`alunosDoPlano`): quem falta responder, a turma na aula e as faltas, as funções, os grupos, a validação e o reabrir.
22. **Aviso ao aluno:** quem esteve numa atividade que já aconteceu recebe «Estiveste na atividade … autoavalia-te», com o dia e o plano da turma a que também responde.
22a. **Recuperar uma UC numa atividade extra.** Quem escolhe a atividade é o professor (no plano de recuperação, ou em «Alunos em recuperação» na atividade). Também pode ser o aluno em recuperação: candidata-se, mesmo numa atividade só para alguns, e o professor aceita ou escolhe outra. No resumo da atividade, o aluno aparece «a recuperar a UC …». **Só recupera se o professor confirmar que participou.** Quando o professor valida a autoavaliação dele na atividade, a aplicação sugere essa nota como resultado da recuperação e o professor confirma. **Para ele, a atividade não dá bónus.**

## Alunos externos
27. **Os alunos externos (de fora das turmas) que vêm recuperar UC ficam no Sheets e em todos os aparelhos** (folha ALUNOS_EXTERNOS). Antes ficavam só no aparelho da coordenação.
28. **Tratam das recuperações deles o professor da UC e a coordenação** (Recuperações › «Alunos externos», ou Coordenação › Externos): o plano (UC, como recupera, o que tem de fazer, prazo), o que o aluno entregou e o resultado (0-20). **O aluno não entra na aplicação.**
29. **Sai uma pauta por UC** com os externos que a recuperaram: imprimir/PDF e Excel. No Sheets, a folha «EXTERNOS (recuperações)» mostra tudo por UC.

## Pauta
30. **Pauta provisória:** a coordenação (Simular pauta) vê a pauta de qualquer turma e UC, a qualquer momento, com as notas validadas até hoje. Sai marcada «PAUTA PROVISÓRIA»; não fecha a UC, não publica notas nem envia nada.

## Validação do professor
10. **A última resposta está sempre ao alcance do professor para validar,** em «Por validar» ou em «Já validadas — tocar para alterar», mesmo dias depois. Também quando o telemóvel do aluno respondeu com a versão antiga do plano (depois de um «responder outra vez»): a resposta aparece com a nota «Respondeu antes da última alteração do plano» e conta até chegar outra (`selecoesDoProfessor`). Num plano, a lista procura pelo plano e não pela turma escolhida no menu. «Procurar autoavaliações agora» diz a hora e o resultado («nada de novo» ou «chegaram N»).
11. **Conta a validação mais recente do professor.** Uma correção substitui a anterior (notas e registos).
12. O professor vê o tema que o aluno escolheu e se respondeu mais do que uma vez.
12a. **Reabrir a autoavaliação de um aluno, sem PIN novo.** No plano, em «Reabrir a autoavaliação de um aluno», o professor carrega em «Reabrir» ao lado do aluno. A autoavaliação abre sozinha no telemóvel desse aluno, com um aviso. Os outros alunos continuam fechados. Até ele responder, conta o que já tinha. Quando responde, fecha outra vez e a resposta nova fica «Por validar». O PIN temporário fica só para quem se esqueceu do PIN.

## Datas
13. As datas comparam-se como datas e não como texto (`quandoFoi`). A hora do Sheets, do Firebase e de cada telemóvel pode vir escrita de maneiras diferentes.

