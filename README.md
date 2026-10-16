# Code to Block — Backend

API REST responsável pela autenticação de usuários (local e Google OAuth), pelo catálogo de funções pré-definidas do Arduino (com seu código-fonte e a definição do bloco visual correspondente) e pela persistência dos projetos dos usuários.

> **Importante:** este backend não compila nem executa código Arduino. Ele apenas armazena e serve os dados que o frontend usa para renderizar a visualização em blocos (Blockly).

---

## Sumário
- [Requisitos Funcionais](#requisitos-funcionais)
- [Arquitetura](#arquitetura)
- [Modelo de Dados](#modelo-de-dados)
- [Tecnologias](#tecnologias)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Endpoints da API](#endpoints-da-api-visão-geral)
- [Estratégia de Testes](#estratégia-de-testes)
- [Cronograma](#cronograma-fase-de-planejamento)

---

## Requisitos Funcionais

Disponíveis no documento: [Requisitos Funcionais](https://github.com/oficina-de-integracao-II/code-to-block-backend/blob/914f112bb02363edcdb1277af5652e3afdf38e36/REQUISITOS.md)

---

## Arquitetura

```
┌───────────────────────────┐
│  Frontend (repositório     │
│  separado) — SPA           │
└────────────┬───────────────┘
             │ HTTPS/REST (JSON)
             ▼
┌───────────────────────────────────────────────────────┐
│                      BACKEND (API REST)                  │
│                                                             │
│  ┌────────────┐   ┌─────────────────┐   ┌──────────────┐ │
│  │ Auth Module │   │ Functions       │   │ Projects     │ │
│  │ (local +    │   │ Catalog Module  │   │ Module       │ │
│  │ Google OAuth│   │ (CRUD funções)  │   │ (CRUD        │ │
│  │ + JWT)      │   │                 │   │ projetos)    │ │
│  └──────┬──────┘   └────────┬────────┘   └──────┬───────┘ │
│         └───────────────────┼────────────────────┘        │
│                              ▼                              │
│                    Camada de Persistência (ORM)             │
└──────────────────────────┬──────────────────────────────┘
                            ▼
                  ┌───────────────────┐
                  │   PostgreSQL       │
                  │ users | functions_ │
                  │ catalog | projects │
                  └───────────────────┘

        Serviço externo: Google OAuth 2.0 (Identity Platform)
```

**Decisões-chave:**

1. **Monólito modular**  (Auth / Catálogo / Projetos como módulos separados dentro da mesma aplicação), evitando complexidade desnecessária de microsserviços para o escopo do projeto, mas mantendo fronteiras claras entre responsabilidades para facilitar testes isolados e uma eventual separação futura.

2. **Catálogo de funções como dado, não código hardcoded.** Cada função é um registro no banco: `{ nome, parametros, codigo_arduino, bloco_definicao (JSON compatível com Blockly), descricao }`. O backend não interpreta nem valida logicamente o código Arduino — apenas armazena e serve.

3. **Autenticação híbrida:** cadastro local (e-mail/senha com hash bcrypt) e login via Google OAuth 2.0 (validação do token do Google no backend, criação/associação automática de usuário). Ambos os fluxos emitem o mesmo tipo de token de sessão (JWT) para o restante da API.

4. **Sem execução/compilação de código.** Não há sandbox, container de compilação ou qualquer execução de código do usuário — isso reduz drasticamente a superfície de segurança do backend.

---

## Modelo de Dados (visão inicial)

```
users
├── id (PK)
├── nome
├── email (unique)
├── senha_hash (nullable — null se login exclusivo via Google)
├── google_id (nullable, unique)
├── role (USER | ADMIN, padrão USER)
├── criado_em

functions_catalog
├── id (PK)
├── nome (unique, ex.: "Andar")
├── parametros (JSON, opcional)
├── codigo_arduino (text)
├── bloco_definicao (JSON — spec do bloco Blockly)
├── descricao (text)
├── criado_por (FK users, nullable — se cadastro via admin; SET NULL ao remover o usuário)

projects
├── id (PK)
├── usuario_id (FK users, ON DELETE CASCADE)
├── nome
├── codigo_fonte (text — código digitado pelo usuário)
├── estado_blocos (JSON — snapshot do estado dos blocos renderizados)
├── criado_em
├── atualizado_em
```

---

## Tecnologias

| Item | Escolha |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS (estrutura modular, DI nativa, facilita testes) |
| Linguagem | TypeScript |
| ORM | Prisma |
| Banco de dados | PostgreSQL |
| Autenticação | JWT (`@nestjs/jwt`) + bcrypt; login local validado direto no `AuthService` (Google: BE-11) |
| Validação de dados | class-validator / Zod |
| Testes unitários | Vitest |
| Testes de integração | Vitest + Supertest |
| Banco de testes | Testcontainers (PostgreSQL em container efêmero) |
| Lint/Format | oxlint + Prettier |
| Containerização | Docker + Docker Compose (banco local) |
| CI | GitHub Actions |

---

## Estrutura de Pastas

```
backend/
├── src/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/          # google.strategy.ts, jwt.strategy.ts (se adotados em BE-10/BE-11)
│   │   └── dto/
│   ├── functions/
│   │   ├── functions.module.ts
│   │   ├── functions.controller.ts
│   │   ├── functions.service.ts
│   │   └── dto/
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   └── dto/
│   ├── prisma/
│   │   └── prisma.service.ts   # schema e migrations ficam em prisma/ na raiz
│   ├── common/                   # guards, interceptors, filters
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/                       # testes de fluxo de API completo
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Configuração do Ambiente

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose (para banco local)
- Credenciais OAuth 2.0 do Google Console (Client ID e Secret)

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/oficina-de-integracao-II/code-to-block-backend.git
cd code-to-block-backend

# 2. Instalar dependências
npm install   # também gera o Prisma Client (postinstall)

# 3. Subir banco de dados local
docker-compose up -d

# 4. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com os valores necessários (ver abaixo)

# 5. Rodar migrations
npx prisma migrate dev

# 6. (Opcional) Popular catálogo de funções inicial (a partir de BE-15)
npx prisma db seed

# 7. Rodar em modo desenvolvimento
npm run start:dev

# 8. Rodar testes
npm run test              # unitários (Vitest)
npm run test:cov          # com cobertura
npm run test:integration  # integração (usa TEST_DATABASE_URL ou Testcontainers)

# 9. Lint e formatação
npm run lint
npm run format
```

### Variáveis de ambiente (`.env.example`)
```
# Postgres (usado pelo docker-compose.yml)
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=arduino_blocks
POSTGRES_PORT=5432

# Aplicação
DATABASE_URL=postgresql://user:password@localhost:5432/arduino_blocks
JWT_SECRET=
# Número + unidade (s, m, h, d), ex.: 15m, 12h, 1d
JWT_EXPIRES_IN=1d
GOOGLE_CLIENT_ID=
PORT=3000
# Origens liberadas no CORS, separadas por vírgula
CORS_ORIGIN=http://localhost:5173
```

As variáveis são validadas na inicialização (Zod, em `src/common/env.schema.ts`): a aplicação falha com uma mensagem clara caso `DATABASE_URL` ou `JWT_SECRET` estejam ausentes. `GOOGLE_CLIENT_SECRET` e `GOOGLE_CALLBACK_URL` serão adicionadas quando o login com Google for implementado (BE-11).

Os testes de integração usam `TEST_DATABASE_URL` quando definida. No CI, ela aponta para
um serviço PostgreSQL efêmero do GitHub Actions; localmente, na ausência dessa variável,
os testes sobem um PostgreSQL via Testcontainers.

### `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_DB: ${POSTGRES_DB:-arduino_blocks}
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-user}']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  db_data:
```

---

## Endpoints da API (visão geral)

Documentação interativa (Swagger): `http://localhost:3000/docs`. Erros sempre no formato `{ statusCode, message, error }`.

Rotas protegidas: `@UseGuards(JwtAuthGuard)` + `@CurrentUser()` (em `src/auth/jwt-auth.guard.ts`), com o cabeçalho `Authorization: Bearer <accessToken>`.

| Método | Rota | Descrição | RF |
|---|---|---|---|
| GET | `/health` | Verifica se a API está no ar | — |
| POST | `/auth/register` | Cadastro local de usuário | RF01 |
| POST | `/auth/login` | Login local (e-mail/senha) | RF01, RF03 |
| GET | `/auth/me` | Usuário autenticado (Bearer token) | RF03, RF05 |
| GET | `/auth/google` | Inicia fluxo OAuth com Google | RF02 |
| GET | `/auth/google/callback` | Callback do Google, emite JWT | RF02, RF03 |
| POST | `/auth/logout` | Invalida sessão/token (se aplicável) | RF04 |
| GET | `/functions` | Lista todas as funções do catálogo | RF06 |
| GET | `/functions/:id` | Detalhe de uma função (código + descrição + bloco) | RF07, RF08 |
| POST | `/functions` | Cria nova função (admin) | RF21 |
| PUT | `/functions/:id` | Atualiza função (admin) | RF21 |
| DELETE | `/functions/:id` | Remove função (admin) | RF21 |
| POST | `/projects` | Cria/salva um projeto | RF05, RF18 |
| GET | `/projects` | Lista projetos do usuário autenticado | RF05, RF19 |
| GET | `/projects/:id` | Recupera um projeto específico | RF19 |
| PUT | `/projects/:id` | Atualiza um projeto existente | RF18 |
| DELETE | `/projects/:id` | Remove um projeto | — |

---

## Estratégia de Testes

| Tipo | Escopo | Ferramenta |
|---|---|---|
| Unitário | Regras de negócio dos services (Auth, Functions, Projects) com mocks de repositório | Vitest |
| Integração | Endpoints reais da API contra banco de teste efêmero | Vitest + Supertest + Testcontainers |
| Auth/OAuth | Fluxo Google mockado (stub do provedor, sem chamadas reais em CI) | Vitest (mocks de estratégia Passport) |
| Contrato | Validação de payloads de entrada/saída (DTOs) | class-validator + testes de schema |

**Meta de cobertura:** 70–80% nos módulos `auth/` e `functions/`, por concentrarem regras de negócio e segurança mais sensíveis.

**Pipeline de CI (GitHub Actions):**
```
lint → build → testes unitários → subir banco de teste (Testcontainers/serviço Postgres do CI)
→ testes de integração
```

### Onde colocar cada tipo de teste

- **Unitário:** arquivo `*.spec.ts` ao lado do código testado (ex.: `src/auth/auth.service.ts` → `src/auth/auth.service.spec.ts`). Roda com `npm run test` / `npm run test:cov`, sem Docker. Mocke dependências externas (repositórios Prisma, serviços HTTP, estratégias Passport) com `vi.fn()`/`vi.mock()` do Vitest ou providers fake no `Test.createTestingModule`, para o teste não depender de rede ou banco.
- **Integração:** arquivo `*.spec.ts` em `test/integration/`. Roda com `npm run test:integration`, que sobe um PostgreSQL efêmero via Testcontainers e aplica as migrations do Prisma (ver `test/integration/setup.ts`). Use `getTestDatabase()` para obter o `PrismaClient` conectado ao container e `cleanDatabase()` no `afterEach` para limpar as tabelas entre testes do mesmo arquivo. Para testar endpoints HTTP reais, suba a aplicação Nest com `Test.createTestingModule` + `setupApp()` e bata nela com `supertest` (veja `test/integration/health.spec.ts`).
- **Contrato/DTO:** valide payloads de entrada/saída com `class-validator` nos próprios testes unitários do controller, sem precisar de banco.

**Meta de cobertura:** o `vitest.config.ts` aplica um limite mínimo de 70% (statements, branches, functions, lines) para os módulos `src/auth/**` e `src/functions/**`, validado em `npm run test:cov` e no CI.

---

## Cronograma

| Sprint | Entregas do Backend |
|---|---|
| 0 | Setup do projeto (NestJS + TS), README, modelagem inicial do banco (schema Prisma) |
| 1 | Módulo de Auth (cadastro local + JWT); configuração Docker Compose; migrations iniciais + Integração Google OAuth |
| 2 | Módulo de Functions Catalog (CRUD + seed de funções pré-definidas); testes unitários + Módulo de Projects (CRUD); testes de integração com Testcontainers; documentação da API (Swagger/OpenAPI); revisão final |
