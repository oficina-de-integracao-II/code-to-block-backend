# Requisitos — Ferramenta de Tradução Arduino → Blocos Visuais

Este documento reúne todos os requisitos funcionais (RF) do projeto, independentemente de qual repositório (frontend ou backend) os implementa.

---

## Requisitos Funcionais (RF)

| ID | Descrição |
|---|---|
| RF01 | O sistema deve permitir cadastro de usuário com e-mail e senha. |
| RF02 | O sistema deve permitir login via conta Google (OAuth 2.0). |
| RF03 | O sistema deve manter sessão autenticada do usuário (token/JWT). |
| RF04 | O sistema deve permitir logout. |
| RF05 | O sistema deve associar os projetos/códigos salvos ao usuário autenticado. |
| RF06 | O sistema deve exibir uma lista de funções pré-definidas disponíveis (ex.: `Andar()`, `ParaFrente()`, `ParaTras()`, `VireEsquerda()`, `VireDireita()`, `Pare()`). |
| RF07 | Para cada função, o sistema deve exibir o código Arduino (C/C++) correspondente, pré-pronto e não editável. |
| RF08 | O sistema deve permitir ao usuário consultar a documentação/descrição de cada função (parâmetros, comportamento esperado). |
| RF09 | O sistema deve fornecer um editor de texto onde o usuário escreve/invoca as funções pré-definidas (ex.: `Andar(); VireEsquerda();`). |
| RF10 | O sistema deve validar sintaticamente se o texto digitado corresponde a chamadas de funções conhecidas (parser simples, não compilação real). |
| RF11 | O sistema deve sinalizar erros de reconhecimento (função inexistente, sintaxe inválida) sem travar a aplicação. |
| RF12 | Ao invocar (digitar e confirmar) uma função reconhecida, o sistema deve renderizar, em um painel lateral, o(s) bloco(s) visuais correspondentes (estilo Blockly/Scratch). |
| RF13 | A ordem dos blocos exibidos deve refletir a ordem de invocação das funções no editor. |
| RF14 | Cada bloco deve manter uma referência visual/rastreável à linha de código que o originou (ex.: destaque ao clicar). |
| RF15 | O sistema deve permitir remover uma função do código e refletir a remoção do bloco correspondente. |
| RF16 | O sistema não deve permitir edição direta dos blocos que gere alteração no código (fluxo é unidirecional: código → blocos). |
| RF17 | O sistema deve permitir salvar um "projeto" (conjunto de código + estado dos blocos) vinculado ao usuário. |
| RF18 | O sistema deve permitir carregar um projeto salvo anteriormente. |
| RF19 | Um usuário administrador pode cadastrar novas funções pré-definidas (nome, código Arduino, bloco visual correspondente). |

---

## Rastreabilidade — Requisito × Repositório

Para orientar a divisão de trabalho entre os dois repositórios (frontend e backend), segue o mapeamento de responsabilidade principal de cada requisito. Requisitos de fluxo completo (ex.: autenticação) envolvem os dois lados, mas a tabela indica onde está a lógica central.

| ID | Repositório principal |
|---|---|
| RF01 | Backend (regra/persistência) + Frontend (tela) |
| RF02 | Backend (validação do token Google) + Frontend (botão/fluxo) |
| RF03 | Backend (emissão/validação JWT) + Frontend (armazenamento/uso do token) |
| RF04 | Frontend |
| RF05 | Backend |
| RF06 | Backend (dados) + Frontend (exibição) |
| RF07 | Backend (dados) + Frontend (exibição) |
| RF08 | Backend (dados) + Frontend (exibição) |
| RF09 | Frontend |
| RF10 | Frontend |
| RF11 | Frontend (parser client-side) |
| RF12 | Frontend |
| RF13 | Frontend |
| RF14 | Frontend |
| RF15 | Frontend |
| RF16 | Frontend |
| RF17 | Backend (persistência) + Frontend (interface) |
| RF18 | Backend (persistência) + Frontend (interface) |
| RF19 | Backend (persistência) + Frontend (interface) |
