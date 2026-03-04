# FIT.AI

Backend service da aplicação FIT.AI — personal trainer virtual com IA para montagem de planos de treino.

## Tecnologias

- **Runtime:** Node.js 24.x
- **Framework:** Fastify
- **Banco de dados:** PostgreSQL + Prisma
- **Autenticação:** Better Auth
- **IA:** Vercel AI SDK + Google Gemini

## Pré-requisitos

- Node.js 24.x
- pnpm
- PostgreSQL

## Instalação

```bash
pnpm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=8081
DATABASE_URL="postgresql://user:password@localhost:5432/fit-ai-db"
BETTER_AUTH_SECRET_KEY=sua-chave-secreta
BETTER_AUTH_URL=http://localhost:8081
GOOGLE_GENERATIVE_AI_API_KEY=sua-api-key-google
```

## Execução

```bash
pnpm dev
```

O servidor inicia em `http://localhost:8081`.

## Documentação da API

A documentação Swagger/OpenAPI está disponível em:

- **Swagger JSON:** `GET /swagger.json`
- **Docs interativos:** `GET /docs`

---

## Integração com a IA

O endpoint `/v1/ai` fornece um assistente de personal trainer via streaming. A conversa é stateless: o cliente envia o histórico completo a cada requisição.

### Autenticação

Todas as requisições à IA exigem autenticação. Use os endpoints do Better Auth:

```bash
# Criar conta
curl -X POST http://localhost:8081/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com", "password": "sua-senha", "name": "Seu Nome"}'

# Login
curl -X POST http://localhost:8081/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com", "password": "sua-senha"}' \
  -c cookies.txt
```

Os cookies de sessão são usados nas requisições seguintes.

### Endpoint

```
POST /v1/ai
Content-Type: application/json
```

### Formato do payload

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "Olá, quero criar um plano de treino!" }]
    }
  ]
}
```

### IDs das mensagens

**Cada mensagem deve ter um `id` único.** O histórico completo é enviado a cada requisição, então todas as mensagens anteriores precisam ser incluídas com IDs distintos:

| Requisição | Mensagens no payload | IDs |
|------------|----------------------|-----|
| 1ª         | Mensagem do usuário  | `msg-1` |
| 2ª         | Mensagem do usuário + resposta do assistente + nova mensagem | `msg-1`, `msg-2`, `msg-3` |
| 3ª         | Histórico completo + nova mensagem | `msg-1`, `msg-2`, `msg-3`, `msg-4`, `msg-5` |

Exemplo de conversa em andamento:

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "Olá!" }]
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "parts": [{ "type": "text", "text": "Olá! Como posso ajudar?" }]
    },
    {
      "id": "msg-3",
      "role": "user",
      "parts": [{ "type": "text", "text": "Quero criar um plano de treino" }]
    }
  ]
}
```

### Resposta

A resposta é um **stream** (Server-Sent Events). Use `--no-buffer` no curl para visualizar em tempo real:

```bash
curl -X POST http://localhost:8081/v1/ai \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"Olá!"}]}]}' \
  --no-buffer
```

### Exemplo em JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:8081/v1/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text: 'Olá!' }]
      }
    ]
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

### Checklist para testes

1. Servidor rodando (`pnpm dev`)
2. Banco de dados acessível
3. `GOOGLE_GENERATIVE_AI_API_KEY` configurada no `.env`
4. Usuário autenticado (login/sign-up antes de chamar `/v1/ai`)

---

## Rotas principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/v1/home/:date` | Dados da página inicial |
| GET | `/v1/me` | Dados de treino do usuário |
| GET | `/v1/stats?from=&to=` | Estatísticas de treino |
| GET | `/v1/workout/plans` | Listar planos (filtro `active` opcional) |
| GET | `/v1/workout/plans/:id` | Plano por ID |
| GET | `/v1/workout/plans/:planId/days/:dayId` | Dia de treino por ID |
| POST | `/v1/workout/plans` | Criar plano |
| POST | `/v1/ai` | Chat com personal trainer (IA) |
