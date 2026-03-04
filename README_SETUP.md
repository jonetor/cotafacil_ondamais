# CotaFácil (Front + BFF Voalle) — Setup rápido

## 1) Pré-requisitos
- Node.js 18+ (recomendado 20+)

## 2) Variáveis de ambiente
1. Copie `.env.example` para `.env`
2. Preencha os valores do Voalle (CLIENT_ID, CLIENT_SECRET, SYNDATA, URLs)
3. **NUNCA** comite `.env` (contém segredos)

## 3) Instalação
Na raiz do projeto:

```bash
npm install
```

> Observação: este repositório inclui o BFF em `bff-node/`.
> O Vite já está configurado para proxy `/api` -> `http://localhost:3000`.

## 4) Rodar tudo
```bash
npm run dev-all
```

- Front: http://localhost:5173
- BFF:   http://localhost:3000

## 5) Login
O login usa o BFF: `POST /api/auth/login`.
O seed de admin é criado pelo BFF (ver `bff-node/api/auth.js` / `ensureAdminSeed()`).

## 6) Dica de produção
- Coloque o BFF e o Front atrás do mesmo domínio (Nginx/Traefik).
- Use `JWT_SECRET` forte.
