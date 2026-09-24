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
├── criado_em

functions_catalog
├── id (PK)
├── nome (ex.: "Andar")
├── parametros (JSON, opcional)
├── codigo_arduino (text)
├── bloco_definicao (JSON — spec do bloco Blockly)
├── descricao (text)
├── criado_por (FK users, nullable — se cadastro via admin)

projects
├── id (PK)
├── usuario_id (FK users)
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
| Autenticação | Passport.js (estratégias Local + Google OAuth2) + JWT |
| Validação de dados | class-validator / Zod |
| Testes unitários | Jest |
| Testes de integração | Jest + Supertest |
| Banco de testes | Testcontainers (PostgreSQL em container efêmero) |
| Lint/Format | ESLint + Prettier |
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
│   │   ├── strategies/          # local.strategy.ts, google.strategy.ts, jwt.strategy.ts
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
│   │   ├── schema.prisma
│   │   └── prisma.service.ts
│   ├── common/                   # guards, interceptors, filters
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/                       # testes de fluxo de API completo
├── prisma/
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
git clone <url-do-repo-backend>
cd backend

# 2. Instalar dependências
npm install

# 3. Subir banco de dados local
docker-compose up -d

# 4. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com os valores necessários (ver abaixo)

# 5. Rodar migrations
npx prisma migrate dev

# 6. (Opcional) Popular catálogo de funções inicial
npx prisma db seed

# 7. Rodar em modo desenvolvimento
npm run start:dev

# 8. Rodar testes
npm run test              # unitários
npm run test:integration  # integração (usa Testcontainers)
npm run test:e2e          # e2e de API
```

### Variáveis de ambiente (`.env.example`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/arduino_blocks
JWT_SECRET=
JWT_EXPIRES_IN=1d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
PORT=3000
```

### `docker-compose.yml` (referência)
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: arduino_blocks
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
volumes:
  db_data:
```

---

## Endpoints da API (visão geral)

| Método | Rota | Descrição | RF |
|---|---|---|---|
| POST | `/auth/register` | Cadastro local de usuário | RF01 |
| POST | `/auth/login` | Login local (e-mail/senha) | RF01, RF03 |
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
| Unitário | Regras de negócio dos services (Auth, Functions, Projects) com mocks de repositório | Jest |
| Integração | Endpoints reais da API contra banco de teste efêmero | Jest + Supertest + Testcontainers |
| Auth/OAuth | Fluxo Google mockado (stub do provedor, sem chamadas reais em CI) | Jest (mocks de estratégia Passport) |
| Contrato | Validação de payloads de entrada/saída (DTOs) | class-validator + testes de schema |

**Meta de cobertura:** 70–80% nos módulos `auth/` e `functions/`, por concentrarem regras de negócio e segurança mais sensíveis.

**Pipeline de CI (GitHub Actions):**
```
lint → build → testes unitários → subir banco de teste (Testcontainers/serviço Postgres do CI)
→ testes de integração
```

---

## Cronograma

| Sprint | Entregas do Backend |
|---|---|
| 0 | Setup do projeto (NestJS + TS), README, modelagem inicial do banco (schema Prisma) |
| 1 | Módulo de Auth (cadastro local + JWT); configuração Docker Compose; migrations iniciais + Integração Google OAuth |
| 2 | Módulo de Functions Catalog (CRUD + seed de funções pré-definidas); testes unitários + Módulo de Projects (CRUD); testes de integração com Testcontainers; documentação da API (Swagger/OpenAPI); revisão final |
