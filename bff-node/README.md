# Voalle BFF (Hostinger)

Este BFF (backend-for-frontend) expõe rotas **/api/voalle/** para o seu front React.

## Rodando local

```bash
cd bff-node
cp .env.example .env
npm i
npm run dev
```

No front, crie `.env.local` (na raiz do projeto) com:

```env
VITE_BFF_BASE_URL=http://localhost:3001
```

Depois:

```bash
npm i
npm run dev
```

## Produção na Hostinger

### Cenário 1 — Hostinger com suporte a Node.js
1. Suba a pasta `bff-node/` como app Node.
2. Configure as variáveis de ambiente do app (VOALLE_*).
3. Configure o app para iniciar com `npm start`.
4. O ideal é colocar o BFF no **mesmo domínio** (ou subdomínio) do front.

> Se o BFF ficar em subdomínio, no front você pode definir `VITE_BFF_BASE_URL=https://api.seudominio.com`.

### Cenário 2 — Hostinger só com hospedagem compartilhada (PHP)
Use o proxy PHP em `php-proxy/` (na raiz do projeto). Ele implementa `/api/voalle/*` usando cURL.
