import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '../api/client';
import { useBrandingStore } from '../store/branding.store';
import { 
  BookOpen, 
  Terminal, 
  Code2, 
  Cpu, 
  Check, 
  Copy, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface ModelInfo {
  id: string;
  owned_by: string;
  pricing: {
    inputPricePerMillion: number;
    outputPricePerMillion: number;
  };
}

export default function Docs() {
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'python'>('curl');
  const [selectedKey, setSelectedKey] = useState('YOUR_API_KEY');
  const [copiedCode, setCopiedCode] = useState(false);

  const { settings } = useBrandingStore();

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost') {
      return 'https://localhost/v1';
    }
    const baseDomain = hostname.replace(/^(web|console|dashboard|admin)\./, '');
    return `https://api.${baseDomain}/v1`;
  };

  const baseUrl = getApiBaseUrl();

  // Fetch keys (to inject in documentation examples)
  const { data: keys = [] } = useQuery<any[]>({
    queryKey: ['docsKeysDropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/keys');
      return res.data.filter((k: any) => k.status === 'active');
    },
  });

  // Fetch models pricing (using raw axios to call the public /v1/models route dynamically)
  const { data: modelsData } = useQuery<{ data: ModelInfo[] }>({
    queryKey: ['docsModelsList'],
    queryFn: async () => {
      const res = await axios.get(`${baseUrl}/models`);
      return res.data;
    },
  });

  const models = modelsData?.data || [];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCodeSnippet = () => {
    const key = selectedKey === 'YOUR_API_KEY' ? 'sk_proj_xxxx_xxxxxxxxxxxx' : selectedKey;
    const defaultModel = models.length > 0 ? models[0].id : 'gpt-4o';
    
    if (activeLang === 'curl') {
      return `curl -X POST ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${defaultModel}",
    "messages": [
      {"role": "user", "content": "Hello, explain ${settings.platformName} in one sentence!"}
    ]
  }'`;
    }

    if (activeLang === 'js') {
      return `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '${key}',
  baseURL: '${baseUrl}'
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: '${defaultModel}',
    messages: [
      { role: 'user', content: 'Hello, explain ${settings.platformName} in one sentence!' }
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();`;
    }

    // Python snippet
    return `from openai import OpenAI

client = OpenAI(
    api_key="${key}",
    base_url="${baseUrl}"
)

completion = client.chat.completions.create(
    model="${defaultModel}",
    messages=[
        {"role": "user", "content": "Hello, explain ${settings.platformName} in one sentence!"}
    ]
)

print(completion.choices[0].message.content)`;
  };

  return (
    <div className="space-y-6 font-sans grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      {/* Table of Contents Sidebar */}
      <aside className="lg:col-span-1 hidden lg:block sticky top-6 space-y-4">
        <div className="flex items-center gap-2 text-brand font-bold text-lg mb-4">
          <BookOpen size={20} />
          <span>Documentation</span>
        </div>
        <div className="space-y-1">
          <a href="#quickstart" className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
            <ChevronRight size={12} className="text-zinc-600" />
            Quick Start
          </a>
          <a href="#auth" className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
            <ChevronRight size={12} className="text-zinc-600" />
            Authentication
          </a>
          <a href="#endpoints" className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
            <ChevronRight size={12} className="text-zinc-600" />
            API Gateways
          </a>
          <a href="#examples" className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
            <ChevronRight size={12} className="text-zinc-600" />
            Code Templates
          </a>
          <a href="#models" className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
            <ChevronRight size={12} className="text-zinc-600" />
            Models & Pricing
          </a>
        </div>
      </aside>

      {/* Main Documentation Content */}
      <div className="lg:col-span-3 space-y-10">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-white flex items-center gap-3">
            Developer Documentation
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Build applications utilizing our high-speed, secure OpenAI-compatible API Gateway.
          </p>
        </div>

        {/* Section 1: Quick Start */}
        <section id="quickstart" className="space-y-3 pt-6 border-t border-zinc-900">
          <h2 className="text-xl font-display font-bold text-white">1. Quick Start</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Our gateway endpoints are fully compatible with the official OpenAI SDKs in Python, Node.js, and raw HTTP clients. To query our services, generate an API key from the developer console, override the client's `base_url` target to direct to our server, and call your completions.
          </p>
        </section>

        {/* Section 2: Authentication */}
        <section id="auth" className="space-y-3 pt-6 border-t border-zinc-900">
          <h2 className="text-xl font-display font-bold text-white">2. Authentication</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Authenticate all requests by passing your generated API token inside the HTTP header structure:
          </p>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-850 font-mono text-[11px] text-zinc-300">
            Authorization: Bearer <span className="text-brand">YOUR_API_KEY</span>
          </div>
        </section>

        {/* Section 3: API Gateways */}
        <section id="endpoints" className="space-y-4 pt-6 border-t border-zinc-900">
          <h2 className="text-xl font-display font-bold text-white">3. API Gateways</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Exposed endpoint routes for authenticating AI model requests.
          </p>
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  POST
                </span>
                <span className="font-mono text-white font-semibold">{baseUrl}/chat/completions</span>
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                Creates a completion for the chat message logs. Supports streaming response configurations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  GET
                </span>
                <span className="font-mono text-white font-semibold">{baseUrl}/models</span>
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                Returns a list of supported and enabled LLM models, along with pricing metadata.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Code Examples */}
        <section id="examples" className="space-y-4 pt-6 border-t border-zinc-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-xl font-display font-bold text-white">4. Code Templates</h2>
            
            {/* Dynamic key injection selector */}
            {keys.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Demo Key:</span>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="YOUR_API_KEY">Select Active Key</option>
                  {keys.map((k) => (
                    <option key={k.id} value={k.keyPrefix}>
                      {k.name} ({k.keyPrefix.slice(0, 12)}...)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Run requests instantly using standard packages.
          </p>

          {/* Lang Tabs & Code Block */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-lg">
            <div className="flex border-b border-zinc-850 bg-zinc-900/40 px-4 py-2 justify-between items-center">
              <div className="flex gap-2">
                {(['curl', 'js', 'python'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors ${
                      activeLang === lang
                        ? 'bg-zinc-800 text-brand'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {lang === 'js' ? 'Node.js' : lang}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleCopy(getCodeSnippet())}
                className="p-1.5 border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:text-white rounded-lg text-zinc-400 transition-colors"
                title="Copy snippet"
              >
                {copiedCode ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed max-h-96">
              <code>{getCodeSnippet()}</code>
            </pre>
          </div>
        </section>

        {/* Section 5: Models & Pricing */}
        <section id="models" className="space-y-4 pt-6 border-t border-zinc-900">
          <h2 className="text-xl font-display font-bold text-white">5. Models & Pricing</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Token pricing models. Bills are calculated based on tokens consumed per request.
          </p>

          <div className="glass-card rounded-xl border border-zinc-850 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400 font-semibold">
                  <th className="p-3">Model ID</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3 text-right">Input Price (1M tokens)</th>
                  <th className="p-3 text-right">Output Price (1M tokens)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-900/20 text-zinc-300 transition-colors">
                    <td className="p-3 font-semibold text-white uppercase">{m.id}</td>
                    <td className="p-3 text-zinc-500 capitalize">{m.owned_by}</td>
                    <td className="p-3 text-right font-mono text-zinc-400">${m.pricing.inputPricePerMillion.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono text-zinc-400">${m.pricing.outputPricePerMillion.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
