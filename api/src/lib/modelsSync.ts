import { config } from '../config';
import { prisma } from '../db';

export async function syncModelsWithUpstream() {
  if (!config.UPSTREAM_OPENAI_API_KEY) {
    console.log('[Sync] No UPSTREAM_OPENAI_API_KEY configured. Skipping model catalog sync (running in simulation mode).');
    return;
  }

  const cleanBase = config.UPSTREAM_OPENAI_API_BASE_URL.replace(/\/+$/, '');
  const isOllama = config.UPSTREAM_OPENAI_API_KEY === 'ollama' || cleanBase.includes('11434');

  let upstreamModelIds: string[] = [];

  // Strategy 1: If using Ollama, query native tags endpoint first
  if (isOllama) {
    try {
      // Reconstruct Ollama native tags URL (e.g. "http://host.docker.internal:11434/api/tags")
      const nativeUrl = cleanBase.replace(/\/v1\/?$/, '') + '/api/tags';
      console.log(`[Sync] Querying Ollama native tags at: ${nativeUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

      const res = await fetch(nativeUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json() as any;
        if (data && Array.isArray(data.models)) {
          upstreamModelIds = data.models.map((m: any) => m.name as string);
          console.log(`[Sync] Found ${upstreamModelIds.length} models from Ollama native tags:`, upstreamModelIds);
        } else {
          console.warn(`[Sync] Ollama native tags returned non-standard payload:`, data);
        }
      } else {
        console.warn(`[Sync] Ollama native tags check failed with status: ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`[Sync] Ollama native tags strategy failed (attempting standard backup): ${err.message || err}`);
    }
  }

  // Strategy 2: Fallback to standard OpenAI-compatible /v1/models list
  if (upstreamModelIds.length === 0) {
    try {
      const upstreamUrl = `${cleanBase}/models`;
      console.log(`[Sync] Querying standard /v1/models at: ${upstreamUrl}`);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (config.UPSTREAM_OPENAI_API_KEY && config.UPSTREAM_OPENAI_API_KEY !== 'ollama') {
        headers['Authorization'] = `Bearer ${config.UPSTREAM_OPENAI_API_KEY}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

      const res = await fetch(upstreamUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json() as any;
        if (data && Array.isArray(data.data)) {
          upstreamModelIds = data.data.map((m: any) => m.id as string);
          console.log(`[Sync] Found ${upstreamModelIds.length} models from /v1/models:`, upstreamModelIds);
        } else {
          console.warn(`[Sync] Standard models check returned non-standard payload:`, data);
        }
      } else {
        console.warn(`[Sync] Standard models check failed with status: ${res.status}`);
      }
    } catch (err: any) {
      console.error(`[Sync] Standard models strategy failed: ${err.message || err}`);
    }
  }

  // Process sync if we successfully fetched model ids
  if (upstreamModelIds.length > 0) {
    try {
      // 1. Add/update database models in catalog
      for (const mId of upstreamModelIds) {
        const existing = await prisma.model.findUnique({ where: { id: mId } });
        if (!existing) {
          const cleanName = mId.includes(':') 
            ? mId.split(':')[0].charAt(0).toUpperCase() + mId.split(':')[0].slice(1) 
            : mId;

          await prisma.model.create({
            data: {
              id: mId,
              name: cleanName,
              inputPricePerMillion: 0.0,
              outputPricePerMillion: 0.0,
              enabled: true,
            },
          });
          console.log(`[Sync] Registered new model from upstream: ${mId}`);
        }
      }
    } catch (dbErr: any) {
      console.error(`[Sync] Failed database update step: ${dbErr.message || dbErr}`);
    }
  } else {
    console.warn('[Sync] No models resolved from upstream check. Catalog left unmodified.');
  }
}
