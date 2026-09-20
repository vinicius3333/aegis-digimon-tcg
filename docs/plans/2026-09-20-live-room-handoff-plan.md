# Migração rápida de partidas entre deploys

Status: proposta para validação; implementação e deploy não iniciados.
Data: 2026-09-20.

## 1. Objetivo e experiência esperada

Subir e aquecer o green enquanto o blue continua atendendo normalmente. Quando o green estiver pronto, transferir cada sala em andamento, reconectar automaticamente seus jogadores e desligar o blue assim que a transferência estiver concluída. Não esperar o término das partidas.

Blue e green descrevem origem e destino. Manter os identificadores imutáveis de geração já existentes evita mudanças desnecessárias no controlador e colisões de rotas. O objetivo é encurtar a coexistência, não necessariamente voltar a dois nomes fixos.

Durante build, inicialização, verificações de compatibilidade e preparação, os jogadores continuam jogando. Apenas a passagem final de cada sala bloqueia ações temporariamente. O navegador mostra “Atualizando servidor, retomando partida…” e volta ao mesmo tabuleiro e à mesma escolha, sem login, matchmaking, refresh obrigatório ou intervenção do jogador.

Metas propostas, a validar com carga representativa:

- Pausa percebida por sala: p95 até 2 segundos e p99 até 5 segundos em clientes conectados e rede saudável.
- Medir do bloqueio de ações no cliente até a aplicação do estado completo e liberação de ações no destino; registrar separadamente o tempo de transferência no servidor.
- Build e aquecimento não entram na pausa, mas entram nas métricas de duração total do deploy.
- Jogadores já offline podem retornar posteriormente ao green; sua ausência não deve reter o blue.
- Nenhuma ação confirmada perdida, ação aplicada duas vezes, carta oculta exposta ou derrota causada pelo deploy.

Esses tempos são critérios de aceitação propostos, não garantias já demonstradas. Rede móvel, navegador suspenso e indisponibilidade externa precisam de métricas próprias.

## 2. Evidências e limites atuais

- `apps/api/src/rooms/AegisRoom.ts`: estado em memória; mapas de jogadores, bots, vínculo de torneio, temporizadores e eventos privados também estão fora do schema sincronizado. `onLeave` usa `allowReconnection`; `onDispose` remove registros e códigos de sala.
- `apps/api/src/engine/GameEngine.ts`: possui continuações assíncronas, janelas de resolução aninhadas, efeitos adiados, ledgers de modificadores e contadores que precisam sobreviver à transferência.
- `apps/api/src/engine/decisions/index.ts`: uma escolha pendente contém uma função `resolve` e um timer. Copiar apenas `pendingDecision` não reconstrói a execução suspensa.
- `apps/api/src/engine/effects/interpreter.ts` e submódulos: o IR das cartas oferece uma base para representar execução, mas não torna automaticamente persistíveis as chamadas assíncronas e primitivas que o executam.
- `apps/api/src/engine/effects/verbs/securityStack.ts`: há uso direto de `Math.random`; outras rotas precisam ser inventariadas antes de prometer recuperação determinística.
- `apps/web/src/net/client.ts`: reconecta à geração original; a fila atual de intenções não possui o protocolo de confirmação necessário à transferência segura.
- `apps/api/src/tournaments/scheduler/drain.ts`: já protege a ordem de encerramento do scheduler. Uma transferência precisa ainda proteger a sala específica e os prazos compartilhados da série.
- `apps/api/src/db/migrations/005-match-series-and-games.ts`: o vínculo de jogo de torneio com `room_id` possui invariantes que não podem ser quebradas por uma nova sala física.
- `tools/deploy/`: já oferece gerações, gateway estável e limpeza conservadora. Reutilizar essa infraestrutura durante a evolução.

Base: inspeção do código local. Não foi verificado o estado atual do host de produção nesta tarefa.

## 3. Alternativas e decisão recomendada

| Caminho                                                   | Benefício                                                                               | Limitação                                                                                                            | Decisão proposta                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Transferir só entre ações totalmente resolvidas           | Menor mudança inicial                                                                   | Pode esperar escolhas, efeitos e timers; não atende migração rápida em qualquer situação                             | Usar apenas no primeiro experimento         |
| Estado completo e execução retomável nos pontos de espera | Transferência curta mesmo com escolha pendente; recuperação diretamente do estado salvo | Refatoração relevante do motor e do interpretador                                                                    | Arquitetura final recomendada               |
| Reexecutar toda a partida a partir de comandos e semente  | Reconstrói algumas continuações sem serializá-las                                       | Latência cresce; regras novas podem divergir; exige controlar todos os efeitos externos e fontes de não determinismo | Não usar como caminho principal de migração |

Não tentar serializar funções, Promises, sockets ou a pilha JavaScript. Representar a execução necessária como dados e reconstruir serviços e conexões no destino.

## 4. Arquitetura proposta

### 4.1 Identidade e proprietário único

Introduzir uma identidade lógica de sessão de jogo, independente de geração, processo e conexão. Para salas existentes, avaliar usar o identificador original como identidade lógica, preservando o vínculo de torneio; o destino recebe um identificador físico de transporte separado quando necessário.

O cliente guarda a identidade lógica e uma credencial de retomada vinculada ao participante. Um diretório compartilhado resolve o proprietário atual: geração, processo, sala física e `ownerEpoch` monotônico.

Escolha de armazenamento definida nesta proposta a pedido do usuário: PostgreSQL, já presente no projeto, será a autoridade durável para propriedade, transferências e checkpoints. Ele é compartilhado pelas gerações e permite associar checkpoint, versão e troca de proprietário em transações. Redis continua apoiando descoberta e transporte; os Redis isolados por geração não serão a única cópia da partida transferida. O diretório pode ter cache, com invalidação e consulta autoritativa quando a época divergir.

Os payloads de transferência são temporários. Manter o último checkpoint confirmado de cada partida ativa e os comandos posteriores necessários à recuperação; remover checkpoints substituídos e comandos já compactados apenas após confirmar duravelmente seu substituto. Preparações abortadas expiram por limpeza periódica que verifica se não estão sendo utilizadas. Depois da conclusão da partida e consolidação dos resultados/outbox, remover o estado privado transitório por uma janela configurável, inicialmente proposta em 24 horas. Preservar no histórico normal apenas os dados de resultado já previstos pelo produto e os metadados operacionais sem segredos. Não usar um TTL cego que possa apagar uma partida ativa ou em recuperação.

Persistir somente no shutdown não atende às falhas durante a passagem: a origem pode cair antes de salvar. Por isso, checkpoints nos pontos estáveis e comandos duráveis fazem parte do desenho. Medir o custo de escrita antes do rollout; JSONB validado é a opção inicial para snapshots, com formato compacto/compressão avaliado apenas se as medidas justificarem. A escolha de PostgreSQL não é uma afirmação de que será mais rápido que Redis; é uma escolha de consistência e operação usando a infraestrutura existente.

Toda mutação autoritativa deve verificar a propriedade válida. O proprietário antigo não pode aceitar comandos, expirar timers ou gravar resultados depois da transferência. Uma lease sozinha não basta: transações e gravações externas precisam comparar a época, e os comandos devem passar por uma barreira de propriedade antes de produzir saída confirmada.

### 4.2 Snapshot completo e versionado

Contrato de snapshot inclui:

- Identidade da partida, modo, participantes, lugares, decks e vínculos com torneio.
- Estado autoritativo completo, incluindo zonas privadas e ordem exata das cartas.
- Frames da execução: programa/efeito identificado, posição, variáveis, pilha de retorno, contexto de origem e escolhas pendentes.
- Combate, mulligan, fases, janelas de efeitos, filas de gatilhos, modificadores, efeitos contínuos, usos por turno e efeitos adiados.
- Estado dos geradores de aleatoriedade, sequências de IDs, revisões e último comando confirmado por participante.
- Estado necessário dos bots; timers como dados, incluindo prazo ou tempo restante e política de pausa.
- Metadados de apresentação necessários para reabrir prompts, revelações de security e combate corretamente por jogador.
- `snapshotSchemaVersion`, `executionVersion`, versão das regras/cartas, revisão de origem, checksum e identificador da transferência.

O formato é explícito e validado. Mapas e conjuntos ganham representação definida; referências usam IDs estáveis. Serviços, assinaturas e projeções derivadas são reconstruídos sem reativar efeitos já executados. Não exportar genericamente todas as propriedades de `GameEngine`.

Checkpoints contêm dados secretos de jogo: armazenamento restrito ao servidor, sem payloads em logs, sem exposição em endpoints públicos, com retenção e limpeza definidas.

### 4.3 Execução retomável

Criar um executor cujos pontos de espera sejam representados por frames persistíveis. Uma escolha passa a suspender um frame identificado, em vez de depender exclusivamente de um callback `resolve` capturado em memória.

Converter também as primitivas que contêm escolhas internas, os controladores de fase/combate e os efeitos adiados. Cobrir cancelamento, efeitos opcionais, ordenação de gatilhos, substituições, custos e resoluções aninhadas. Registrar assinaturas por descritores estáveis, sem transportar closures.

O executor pode concluir um pequeno passo síncrono antes de congelar a sala. Deve haver limite mensurável para esse passo; não aguardar o jogador responder para poder migrar. Cartas em IR continuam registradas exclusivamente via `registerIrCard`. Caminhos legados usados em produção precisam ser convertidos ou explicitamente impedir a ativação da migração para aquela sala durante a transição.

### 4.4 Comandos duráveis e efeitos externos

Adicionar envelope de intenção com identidade da sessão, `commandId`, sequência por participante, época conhecida e revisão esperada quando aplicável. Persistir a admissão do comando antes de confirmá-la; distinguir “recebido” de “aplicado”.

Persistir nos pontos estáveis de execução o checkpoint, o progresso do comando e os efeitos externos pendentes de forma transacional. Se o processo cair entre admissão e conclusão, recuperar a partir do checkpoint e continuar apenas os comandos ainda não consolidados.

Transportes podem repetir mensagens: o servidor deduplica e retorna o resultado já conhecido. Não prometer entrega de rede exatamente uma vez; garantir efeito único dos comandos e resultados com IDs, transações e uma outbox para gravações externas.

Durante restauração, não repetir ranking, resultado de torneio, penalidade ou início de partida. Todos esses caminhos recebem chaves idempotentes e verificação de propriedade.

## 5. Protocolo de transferência de uma sala

1. **Preparar green:** build, migrações aditivas, carregamento do catálogo, health/readiness, capacidade e compatibilidade. Blue continua jogando.
2. **Preparar sala destino:** reservar recursos e, se útil após medição, carregar um checkpoint preliminar em modo inerte. Sem timers, bots, resultados, matchmaking ou comandos ativos. Esse estado preliminar não é suficiente para assumir a partida.
3. **Congelar origem:** fechar a admissão de novas ações dessa sala numa barreira ordenada, consolidar o último comando aceito e estacionar a execução no próximo ponto persistível. Suspender timers pertinentes e registrar o começo da pausa. Ações que chegarem depois recebem resposta de migração/retry, nunca são descartadas silenciosamente.
4. **Salvar estado final:** gravar snapshot final, sequência de comandos e estado da transferência. A origem permanece viva e congelada.
5. **Validar destino:** carregar exatamente o snapshot final, conferir checksum, invariantes e versões. Confirmar preparo para a mesma transferência e sequência. O destino permanece inerte.
6. **Transferir propriedade:** transação condicional troca origem por destino, incrementa `ownerEpoch` e publica a rota autoritativa. Somente um destino pode vencer. A origem permanece impedida de produzir novos efeitos.
7. **Ativar e reconectar:** destino verifica a nova propriedade, ativa o motor e aceita credenciais de retomada. Clientes buscam a rota atual, recebem estado completo filtrado, prompts abertos e confirmações de comandos antes de liberar ações.
8. **Liberar origem:** descartar a sala antiga por um caminho de migração que não executa abandono, resultado, liberação indevida de código ou desvinculação de torneio. Registrar conclusão durável.

A prova de entrega ao destino é a propriedade transferida com estado final recuperável e destino ativo, não a presença dos dois jogadores. Confirmar também ausência de tarefas autoritativas pendentes no blue antes de removê-lo.

O controlador migra salas em lotes com concorrência limitada. Começa por um canário e aumenta conforme latência, CPU, memória, banco e erros. Não congelar todas as salas durante a preparação nem reiniciar o gateway no deploy rotineiro.

## 6. Falhas, compensações e rollback

| Situação                                                       | Comportamento obrigatório                                                                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Green não fica pronto ou não entende uma sala                  | Não congelar a sala; manter blue; reportar incompatibilidade concreta                                                                         |
| Snapshot falha ou destino demora antes da troca de propriedade | Abortar por operação condicional; invalidar o destino preparado; descongelar blue e compensar o tempo pausado                                 |
| Confirmação da transação se perde                              | Consultar proprietário/época e estado da transferência; nunca presumir que falhou e reativar blue                                             |
| Blue cai antes de salvar o estado final                        | Recuperar checkpoint durável e comandos admitidos; não presumir que a cópia preliminar está atualizada                                        |
| Green cai após assumir                                         | Recuperar a partir do estado durável sob nova época; clientes continuam buscando o proprietário atual                                         |
| Blue antigo volta a responder                                  | Rejeitar comandos e gravações pela época obsoleta                                                                                             |
| PostgreSQL indisponível                                        | Não transferir nem confirmar novas mutações que não possam ser preservadas; sinalizar indisponibilidade e proteger relógios conforme política |
| Navegador perde aviso, recarrega ou estava offline             | Resolver a sessão lógica no diretório e retomar com autenticação; não depender do socket antigo                                               |
| Controlador reinicia ou comando de deploy se repete            | Retomar/reconciliar transferências persistidas por ID, sem criar donos duplicados                                                             |
| Novo deploy chega durante uma transferência                    | Serializar deploys inicialmente; rejeitar/enfileirar o segundo de forma explícita                                                             |

Antes da troca, rollback é descongelar o blue após invalidar a preparação. Depois da troca, voltar exige uma nova transferência do estado mais recente e compatibilidade inversa. Nunca reativar a cópia antiga do blue, pois o green já pode ter aceitado jogadas.

Se uma versão antiga não consegue ler o estado atual, preferir correção para frente. Guardar a imagem anterior não é suficiente para garantir rollback de dados ou regras.

## 7. Compatibilidade e relógios

Cada release declara formatos e versões de execução que consegue importar. Mudanças de layout exigem migradores e fixtures reais N→N+1. Alterações nas cartas precisam preservar o significado dos frames pendentes por IDs estáveis; não reinterpretar silenciosamente uma posição antiga contra um programa novo.

Política proposta: ações já iniciadas preservam sua semântica; a adoção de regras novas em uma partida existente deve ser explicitamente compatível. Quando necessário, o green contém um adaptador ou artefato de regras anterior, sem manter o processo blue. Uma release incompatível bloqueia a transferência e informa a causa; não força migração nem encerra partidas. Definir janela de compatibilidade suportada antes da ativação geral.

Timers de escolha, combate e tolerância de reconexão preservam o restante e não penalizam a pausa do deploy. Ausência anterior não ganha uma janela nova a cada deploy. Bots não tomam decisões no destino preparado.

Para torneios, propor compensação do intervalo real de suspensão no relógio da série, aplicada uma única vez por transferência. O scheduler consulta o estado de migração e não aplica no-show/forfeit durante esse intervalo. Separar relógios da partida/série de horários absolutos de eventos: não deslocar todo o calendário do torneio automaticamente. A política deve cobrir transferências repetidas e recuperação após falha prolongada.

## 8. Etapas de implementação e critérios de saída

### Etapa 0 — Contratos, inventário e baseline

- Inventariar todo estado necessário de sala, motor, decisões, combate, cartas, bots, temporizadores e resultados.
- Classificar cada item em persistido, derivado ou serviço reconstruído; identificar todos os `await` que podem aguardar input e callbacks armazenados.
- Medir tamanho de sala, CPU, memória, tempo de carregamento e distribuição de jogadores/partidas para definir carga de teste.
- Fechar formatos de identidade, snapshot, comandos, versão de regras e transferência; documentar invariantes no contrato da API e arquitetura.
- Mapear todas as fontes de RNG, relógio e IDs; incluir opções de teste versus execução real.

Saída: matriz de cobertura e contratos revisáveis, baseline medido e casos difíceis reproduzíveis. Nenhuma mudança de deploy.

### Etapa 1 — Prova vertical entre dois processos

- Implementar exportação/importação mínima explícita para uma partida parada em limite simples de ação.
- Iniciar dois processos de API distintos, transferir estado, reconectar dois clientes e continuar até o resultado.
- Encerrar de verdade o processo de origem para demonstrar independência de sua memória.
- Comparar com a mesma partida sem transferência, incluindo dados privados, próxima compra e resultado.

Saída: prova executável de continuidade. Experimento desabilitado em produção; escolhas pendentes ainda não cobertas não são consideradas conclusão do projeto.

### Etapa 2 — Motor e interpretador retomáveis

- Introduzir frames, pontos persistíveis e import/export dos subsistemas; migrar o runtime de decisões e os controladores de fases.
- Cobrir interpretador, primitivas com decisões internas, pilhas de efeitos, combate, security, custos, substituições e gatilhos adiados/aninhados.
- Centralizar RNG, relógio e geração de IDs; serializar estado dos geradores.
- Converter caminhos legados necessários sem introduzir registros de cartas duplicados.
- Reconstruir modificadores, assinaturas e projeções sem disparar novamente efeitos.

Saída: transferir durante qualquer tipo de espera suportado em produção, responder a escolha no destino e obter a mesma continuação. Suíte de motor/cartas afetadas verde; cobertura completa das classes de execução, não apenas de uma carta demonstrativa.

### Etapa 3 — Persistência, propriedade e recuperação

- Criar migrations aditivas usando o migrador existente: sessões lógicas, checkpoints, comandos, transferências e outbox, com índices e restrições de unicidade.
- Implementar repositório transacional, comparação de época, claims condicionais e reconciliação após reinício.
- Aplicar deduplicação e checkpoints nos limites de execução; proteger ranking, torneios e demais efeitos externos.
- Definir retenção, controle de acesso, limpeza de preparações abandonadas e métricas de custo de armazenamento.

Saída: testes com PostgreSQL real de concorrência, transações, processo interrompido, comandos repetidos e propriedade exclusiva. Fixtures em memória não substituem essas provas.

### Etapa 4 — Sala, autenticação e cliente

- Adaptar `AegisRoom` para criação/restauração, modo inerte, congelamento e descarte por migração.
- Implementar diretório de sessão e credenciais de retomada vinculadas ao lugar/participante; rotação, expiração e proteção contra reutilização indevida.
- Adaptar códigos de salas privadas e vínculos de torneio para identidade lógica estável.
- Alterar `useRoom`, `reconnectSession` e `client.ts`: resolver proprietário atual, tratar migração, deduplicar/reconciliar fila de intenções e restaurar listeners.
- Bloquear novas ações durante a sincronização, preservar apresentação e segredos por jogador, retomar sem refresh.
- Tratar abas concorrentes, jogador offline e reconexão após reinício do navegador segundo a política existente de sessão.

Saída: dois navegadores retomam a mesma partida e escolha, inclusive perdendo o aviso de migração ou reenviando uma ação cuja confirmação se perdeu.

### Etapa 5 — Torneios, bots e relógios

- Proteger leases/tarefas do scheduler durante a migração por sala e compensar prazos da série uma única vez.
- Preservar vínculos e autorizações de torneio sem consumir novamente o ingresso original.
- Restaurar bots, RNG e decisões pendentes, incluindo bot contra bot sem clientes.
- Validar conclusão de partida simultânea à preparação, atualização de ranking e avanço de série/round.

Saída: nenhum resultado, vitória, penalidade ou próximo jogo duplicado; nenhum timeout provocado pelo deploy.

### Etapa 6 — Controlador de deploy e passagem de tráfego

- Acrescentar modos de verificar compatibilidade, preparar, migrar, consultar progresso, abortar antes do commit e reconciliar.
- Fazer green subir sem disputar salas existentes nem executar trabalho autoritativo preparado.
- Liberar novas salas no green somente depois de readiness; migrar as antigas em canário e lotes limitados.
- Manter gateway estável e resolução de salas independente da geração gravada pelo cliente.
- Limpar blue apenas após verificar transferências, tarefas pendentes, propriedade e ausência de salas autoritativas; não aguardar clientes offline.
- Preservar deploy-web independente. Compatibilidade com abas antigas e publicação de assets integra a validação do protocolo.

Saída: deploy completo de duas gerações em ambiente de integração, partida mantida e blue removido antes de ela terminar. Um segundo deploy funciona sem acumular gerações desnecessariamente.

### Etapa 7 — Falhas e desempenho

- Injetar encerramentos em cada etapa, inclusive após commit sem resposta, comando recebido sem confirmação e resultado pendente na outbox.
- Testar duas tentativas concorrentes de assumir uma sala, diretório desatualizado, banco/Redis indisponíveis, conexão oscilante e reinício do controlador.
- Medir p50/p95/p99 da pausa, persistência, importação, reconexão e duração total com salas/estados representativos e concorrência máxima pretendida.
- Otimizar aquecimento, lotes e serialização com base nas medidas. Pré-cópia/deltas só entram se trouxerem ganho demonstrado e preservarem a barreira final.
- Fazer soak com migrações repetidas para detectar crescimento de memória, timers duplicados, assinaturas órfãs e vazamento de sockets.

Saída: metas acordadas atendidas, invariantes preservadas sob falhas e capacidade operacional medida. Se a meta não for atingida, registrar o gargalo e ajustar a implementação antes de ativar para todos.

### Etapa 8 — Adoção gradual e simplificação

- Publicar primeiro suporte de snapshot/cliente/contratos, mantendo o mecanismo atual de continuidade.
- Salas antigas criadas sem estado migrável terminam normalmente nesta transição inicial; não inventar snapshots incompletos para acelerá-la.
- Ativar por flag em staging; depois salas internas/casuais; ampliar para modos restantes após as provas correspondentes, com torneios liberados após a etapa 5.
- Em produção, começar com poucas salas e validar um deploy seguinte usando o mecanismo novo.
- Manter fallback de drain para falhas/incompatibilidades durante a adoção, com motivo visível. Não declarar a migração concluída se salas comuns dependem sistematicamente desse fallback.
- Atualizar `docs/deployment-room-continuity.md`, os documentos de arquitetura/API e o runbook do controlador. Só retirar caminhos obsoletos depois da validação operacional.

Saída: rotina normal mantém gerações sobrepostas apenas pelo preparo/transferência, e não pela duração das partidas. Compatibilidade e recuperação de exceções continuam explícitas.

## 9. Matriz mínima de validação

| Área          | Cenários obrigatórios                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Setup e fases | Sala aguardando, ready, mulligan, breeding, main, passagem e fim de turno                                  |
| Decisões      | Opcional, alvos, cartas ocultas, escolha do oponente, ordenação de gatilhos, timeout                       |
| Combate       | Declaração, bloqueio/counter, security revelada, múltiplos checks, fim do ataque                           |
| Efeitos       | Aninhados, custos parciais, substituições, efeitos adiados, once-per-turn, temporários e contínuos         |
| Transporte    | Aviso perdido, token antigo, reload, duas abas, intenção duplicada, revisão obsoleta, cliente offline      |
| Persistência  | Antes/depois de commit, admissão sem conclusão, checkpoint corrompido, claim concorrente, épocas antigas   |
| Torneios      | BO3, resultado simultâneo, prazo da série, no-show, bots, bot contra bot                                   |
| Versões       | N→N+1, snapshot antigo, mudança de IR, catálogo alterado, downgrade incompatível e rejeição antes da pausa |
| Operação      | Muitas salas, vários processos, dois deploys seguidos, controlador reiniciado, cleanup e gateway estável   |

Para cada cenário determinístico, comparar a execução contínua com a execução interrompida e restaurada: estado completo normalizado, fila/frames, decisões, RNG, próximos IDs e resultado. Separar metadados que devem mudar, como geração, época e compensação de pausa. Validar também as duas visões de cliente.

Usar testes focados por etapa, regressões de mecanismos/cartas afetadas e suítes completas relevantes antes do rollout. Na implementação da interface, incluir prova de navegador e do estado de reconexão. Cada entrega deve passar pelos checks documentados no repositório e `git diff --check`.

## 10. Observabilidade e conclusão

Eventos estruturados por `migrationId`, sessão lógica, origem, destino, época e fase. Nunca incluir mãos, decks ordenados, respostas privadas ou tokens. Métricas: salas preparadas/migradas/abortadas, duração da pausa, bytes do snapshot, latência de banco, reconexões, comandos deduplicados, epochs rejeitadas e gerações restantes.

Alertas para transferências estacionadas, falha de importação, latência acima da meta, divergência de proprietário, outbox atrasada e gerações antigas retidas. O runbook explica como consultar a autoridade atual, retomar o controlador e distinguir rollback pré-transferência de recuperação após transferência.

O projeto só está concluído quando uma partida real em andamento, inclusive com uma decisão pendente, atravessa um deploy, continua corretamente no green e permite desligar o blue antes do fim do jogo; isso deve funcionar também para salas privadas, ranqueadas, beta e torneios dentro das regras de cada modo.

## 11. Decisões propostas para validação

1. Blue/green temporários, com green aquecido e migração automática em lotes, mantendo os nomes imutáveis de geração existentes.
2. Meta inicial de pausa p95 ≤ 2 s / p99 ≤ 5 s em condições definidas; confirmar após o experimento e carga.
3. Investir em estado de execução retomável para migrar escolhas abertas; não depender de esperar a ação terminar.
4. Armazenamento escolhido: PostgreSQL para estado/propriedade temporários com limpeza segura; Redis mantém seu papel de coordenação/transporte.
5. Preservar semântica de execuções iniciadas e bloquear transferências incompatíveis, com fallback temporário visível durante a adoção.
6. Compensar a pausa nos relógios de jogo/série sem deslocar automaticamente horários globais de torneio.

Dependência principal: etapas 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Após os contratos da etapa 0, partes de persistência e cliente podem ser desenvolvidas independentemente, mas a transferência em produção depende de todas as garantias anteriores. A maior incerteza de esforço é converter todas as continuações do motor; estimar cronograma depois do inventário e da prova vertical, sem tratar a mudança como apenas uma alteração de infraestrutura.
