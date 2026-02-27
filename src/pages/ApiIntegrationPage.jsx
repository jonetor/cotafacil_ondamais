import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link as LinkIcon, Server, Lock, Key, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { voalleGet, voalleHealth, voalleListClientes } from '@/api/VoalleApi';

const ApiIntegrationPage = () => {
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [path, setPath] = useState('/clientes');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);

  const queryParams = useMemo(() => {
    if (!query?.trim()) return {};
    try {
      // Accept either JSON or key=value&key2=value2
      if (query.trim().startsWith('{')) return JSON.parse(query);

      const sp = new URLSearchParams(query);
      const obj = {};
      for (const [k, v] of sp.entries()) obj[k] = v;
      return obj;
    } catch {
      return { _raw: query };
    }
  }, [query]);

  async function run(fn) {
    setStatus({ type: 'loading', message: 'Consultando...' });
    setResult(null);
    try {
      const data = await fn();
      setResult(data);
      setStatus({ type: 'success', message: 'OK' });
    } catch (e) {
      const msg = e?.message || 'Falha na integração';
      setStatus({ type: 'error', message: msg });
      setResult(e?.raw || null);
    }
  }

  return (
    <div className="text-slate-200">
      <Helmet>
        <title>Integração de API via HTTPS | ONDA+</title>
        <meta name="description" content="Configure integrações de API via HTTPS para conectar sistemas externos" />
      </Helmet>
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LinkIcon className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-slate-100">Integração de API via HTTPS</h1>
        </div>
        <p className="text-slate-400 mt-2">
          Configure e gerencie integrações com sistemas externos através de APIs HTTPS seguras.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Server className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-slate-100">Endpoints</CardTitle>
                <CardDescription className="text-slate-400">Configure URLs de API</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Defina e gerencie endpoints de APIs externas para integração com o sistema.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-green-500/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Key className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-slate-100">Autenticação</CardTitle>
                <CardDescription className="text-slate-400">Gerenciar credenciais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Configure tokens de acesso, API keys e outros métodos de autenticação.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Lock className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-slate-100">Segurança</CardTitle>
                <CardDescription className="text-slate-400">Proteção de dados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Configurações de SSL/TLS e criptografia para comunicação segura.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Globe className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-slate-100">Webhooks</CardTitle>
                <CardDescription className="text-slate-400">Notificações em tempo real</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Configure webhooks para receber notificações de eventos externos.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Testar integração (via BFF)</CardTitle>
          <CardDescription className="text-slate-400">
            O front chama <span className="text-slate-200">/api/voalle</span> no seu domínio. O BFF é quem conversa com a Voalle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <div className="grid gap-2">
                <div className="text-sm text-slate-400">Endpoint (relativo ao BFF)</div>
                <Input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/clientes"
                  className="bg-slate-900/60 border-slate-700 text-slate-100"
                />
                <div className="text-xs text-slate-500">
                  Exemplos: <span className="text-slate-300">/clientes</span>, <span className="text-slate-300">/contratos</span>, <span className="text-slate-300">/titulos</span>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm text-slate-400">Query (JSON ou querystring)</div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='{"limit":20}  ou  limit=20&search=joao'
                  className="bg-slate-900/60 border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => run(() => voalleHealth())}
                  disabled={status.type === 'loading'}
                >
                  Testar /health
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => run(() => voalleListClientes(queryParams))}
                  disabled={status.type === 'loading'}
                >
                  Listar Clientes
                </Button>
                <Button
                  onClick={() => run(() => voalleGet(path, queryParams))}
                  disabled={status.type === 'loading'}
                >
                  Executar GET
                </Button>
              </div>

              <div className={`rounded-lg border p-3 text-sm ${
                status.type === 'success' ? 'border-green-500/40 bg-green-500/10 text-green-200' :
                status.type === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-200' :
                status.type === 'loading' ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' :
                'border-slate-700 bg-slate-900/40 text-slate-300'
              }`}>
                <div className="font-medium">Status: {status.type}</div>
                {status.message ? <div className="mt-1 opacity-90">{status.message}</div> : null}
                <div className="mt-2 text-xs text-slate-400">
                  Se der erro de CORS/401, quase sempre é porque o BFF ainda não está configurado no servidor.
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 overflow-auto max-h-[380px]">
              <div className="text-sm text-slate-300 font-medium mb-2">Resposta</div>
              <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words">
                {result ? JSON.stringify(result, null, 2) : '—'}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiIntegrationPage;