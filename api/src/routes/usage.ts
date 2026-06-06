import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

const usageQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  apiKeyId: z.string().optional(),
});

export async function usageRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // 1. GET /v1/usage - Retrieve detailed usage logs
  fastify.get('/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = usageQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
    }

    const { startDate, endDate, apiKeyId } = parsed.data;

    // Default to last 7 days if not provided
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : defaultStart;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : now;

    // Fetch matching logs
    const logs = await prisma.usageLog.findMany({
      where: {
        apiKey: {
          userId: request.user.id,
        },
        createdAt: {
          gte: start,
          lte: end,
        },
        ...(apiKeyId ? { apiKeyId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        apiKey: {
          select: { name: true, keyPrefix: true },
        },
      },
    });

    // 1. Group by Day
    const dailyMap = new Map<string, { date: string; requests: number; tokens: number; cost: number }>();
    
    // Pre-populate all days in range to avoid empty gaps in graphs
    let current = new Date(start);
    while (current.getTime() <= end.getTime()) {
      const dayStr = current.toISOString().slice(0, 10);
      dailyMap.set(dayStr, { date: dayStr, requests: 0, tokens: 0, cost: 0 });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Populate data
    for (const log of logs) {
      const dateStr = log.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.requests += 1;
        existing.tokens += log.totalTokens;
        existing.cost += log.costUsd;
      } else {
        dailyMap.set(dateStr, {
          date: dateStr,
          requests: 1,
          tokens: log.totalTokens,
          cost: log.costUsd,
        });
      }
    }

    // Convert map to sorted list
    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Group by Model
    const modelMap = new Map<string, { model: string; requests: number; tokens: number; cost: number }>();
    for (const log of logs) {
      const existing = modelMap.get(log.model);
      if (existing) {
        existing.requests += 1;
        existing.tokens += log.totalTokens;
        existing.cost += log.costUsd;
      } else {
        modelMap.set(log.model, {
          model: log.model,
          requests: 1,
          tokens: log.totalTokens,
          cost: log.costUsd,
        });
      }
    }
    const modelStats = Array.from(modelMap.values());

    // 3. Group by API Key
    const keyMap = new Map<string, { keyId: string; keyName: string; keyPrefix: string; requests: number; tokens: number; cost: number }>();
    for (const log of logs) {
      const existing = keyMap.get(log.apiKeyId);
      if (existing) {
        existing.requests += 1;
        existing.tokens += log.totalTokens;
        existing.cost += log.costUsd;
      } else {
        keyMap.set(log.apiKeyId, {
          keyId: log.apiKeyId,
          keyName: log.apiKey.name,
          keyPrefix: log.apiKey.keyPrefix,
          requests: 1,
          tokens: log.totalTokens,
          cost: log.costUsd,
        });
      }
    }
    const keyStats = Array.from(keyMap.values());

    return reply.send({
      summary: {
        totalRequests: logs.length,
        totalTokens: logs.reduce((sum, log) => sum + log.totalTokens, 0),
        totalCost: logs.reduce((sum, log) => sum + log.costUsd, 0),
      },
      daily: dailyStats,
      models: modelStats,
      keys: keyStats,
    });
  });
}
