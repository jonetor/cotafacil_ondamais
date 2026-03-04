# Proxy PHP (Hostinger compartilhado)

Use esta opção se seu plano **não** suporta Node.js.

## Publicação

1) Gere o build do front:

```bash
npm i
npm run build
```

2) Envie o conteúdo de `dist/` para `public_html/`.

3) Envie também a pasta `php-proxy/api/` para `public_html/api/` e o arquivo `php-proxy/.htaccess` para `public_html/.htaccess` (ou mescle com o seu).

4) Configure as credenciais da Voalle no arquivo `public_html/api/voalle/index.php` (ou via env, se disponível).

## Teste

Abra no navegador:

`https://SEU_DOMINIO/api/voalle/health`

No painel do seu front, a página **Integração de API via HTTPS** já chama `/api/voalle/...`.
