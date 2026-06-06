"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = dashboardRoutes;
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
async function dashboardRoutes(fastify) {
    fastify.addHook('preHandler', auth_1.authenticate);
    // GET /v1/dashboard/summary
    fastify.get('/dashboard/summary', async (request, reply) => {
        const userId = request.user.id;
        // Define 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Define 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // 1. Fetch count of active API keys
        const activeKeysCount = await db_1.prisma.apiKey.count({
            where: {
                userId,
                status: 'active',
            },
        });
        // 2. Fetch logs in the last 30 days
        const logs30Days = await db_1.prisma.usageLog.findMany({
            where: {
                apiKey: { userId },
                createdAt: { gte: thirtyDaysAgo },
            },
            select: {
                totalTokens: true,
                costUsd: true,
                model: true,
                createdAt: true,
            },
        });
        // Calculate 30-day stats
        const totalRequests30d = logs30Days.length;
        const totalTokens30d = logs30Days.reduce((sum, log) => sum + log.totalTokens, 0);
        const totalCost30d = logs30Days.reduce((sum, log) => sum + log.costUsd, 0);
        // 3. Generate 7-day sparkline data (requests and costs per day)
        const dailyMap = new Map();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().slice(0, 10);
            dailyMap.set(dayStr, { date: dayStr, requests: 0, cost: 0 });
        }
        for (const log of logs30Days) {
            if (log.createdAt >= sevenDaysAgo) {
                const dateStr = log.createdAt.toISOString().slice(0, 10);
                const dayData = dailyMap.get(dateStr);
                if (dayData) {
                    dayData.requests += 1;
                    dayData.cost += log.costUsd;
                }
            }
        }
        const sparkline = Array.from(dailyMap.values());
        // 4. Model breakdown (last 30 days)
        const modelBreakdownMap = new Map();
        for (const log of logs30Days) {
            const existing = modelBreakdownMap.get(log.model);
            if (existing) {
                existing.value += log.totalTokens;
                existing.cost += log.costUsd;
            }
            else {
                modelBreakdownMap.set(log.model, {
                    model: log.model,
                    value: log.totalTokens,
                    cost: log.costUsd,
                });
            }
        }
        const modelBreakdown = Array.from(modelBreakdownMap.values());
        // 5. Recent keys list with usage summaries
        const recentKeys = await db_1.prisma.apiKey.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                status: true,
                createdAt: true,
                lastUsedAt: true,
                usageLogs: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        createdAt: true,
                    },
                },
            },
        });
        const formattedRecentKeys = recentKeys.map((key) => ({
            id: key.id,
            name: key.name,
            keyPrefix: key.keyPrefix,
            status: key.status,
            createdAt: key.createdAt,
            lastUsedAt: key.lastUsedAt,
            recentRequestsCount: key.usageLogs.length,
        }));
        return reply.send({
            cards: {
                activeKeys: activeKeysCount,
                requests30d: totalRequests30d,
                tokens30d: totalTokens30d,
                spend30d: totalCost30d,
            },
            sparkline,
            modelBreakdown,
            recentKeys: formattedRecentKeys,
        });
    });
}
