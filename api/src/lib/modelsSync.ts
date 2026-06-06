import { config } from '../config';
import { prisma } from '../db';

export async function syncModelsWithUpstream() {
  // If no upstream provider key/base configured, skip sync (run in simulator mode)
  if (!config.UPSTREAM_OPENAI_API_KEY) {
    return;
  }

  try {
    const upstreamUrl = `${config.UPSTREAM_OPENAI_API_BASE_URL}/models`;
    console.log(`[Sync] Querying upstream models at: ${upstreamUrl}...`);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // Only pass Bearer authentication if a real key is present (skip for 'ollama')
    if (config.UPSTREAM_OPENAI_API_KEY && config.UPSTREAM_OPENAI_API_KEY !== 'ollama') {
      headers['Authorization'] = `Bearer ${config.UPSTREAM_OPENAI_API_KEY}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second network timeout

    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Sync] Upstream returned status ${res.status}`);
      return;
    }

    const data = await res.json() as any;
    if (data && Array.isArray(data.data)) {
      const upstreamModelIds = data.data.map((m: any) => m.id as string);
      console.log(`[Sync] Active upstream models:`, upstreamModelIds);

      // 1. Register new models from the upstream registry
      for (const mId of upstreamModelIds) {
        const existing = await prisma.model.findUnique({ where: { id: mId } });
        if (!existing) {
          // Pretty name extraction (e.g. "gemma4" from "gemma4:e4b")
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

      // 2. Clear any database model catalog records that are no longer installed upstream
      const deleteResult = await prisma.model.deleteMany({
        where: {
          id: {
            notIn: upstreamModelIds,
          },
        },
      });
      if (deleteResult.count > 0) {
        console.log(`[Sync] Removed ${deleteResult.count} obsolete model(s) from database catalog.`);
      }
    }
  } catch (err: any) {
    console.error(`[Sync] Failed to sync models with upstream: ${err.message || err}`);
  }
}
