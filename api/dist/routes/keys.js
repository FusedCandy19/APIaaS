"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keysRoutes = keysRoutes;
const zod_1 = require("zod");
const db_1 = require("../db");
const crypto_1 = require("../lib/crypto");
const auth_1 = require("../middleware/auth");
const createKeySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Key name is required').max(100),
    rateLimit: zod_1.z.number().int().min(1).default(100),
});
async function keysRoutes(fastify) {
    // Add authentication hook for all routes in this plugin
    fastify.addHook('preHandler', auth_1.authenticate);
    // 1. GET /v1/keys - List all keys for user
    fastify.get('/keys', async (request, reply) => {
        const keys = await db_1.prisma.apiKey.findMany({
            where: { userId: request.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                rateLimit: true,
                status: true,
                createdAt: true,
                lastUsedAt: true,
            },
        });
        return reply.send(keys);
    });
    // 2. POST /v1/keys - Create new key
    fastify.post('/keys', async (request, reply) => {
        const parsed = createKeySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
        }
        const { name, rateLimit } = parsed.data;
        // Generate keys
        const { key, prefix, hash } = crypto_1.cryptoHelper.generateKey(name);
        const apiKey = await db_1.prisma.apiKey.create({
            data: {
                userId: request.user.id,
                name,
                keyHash: hash,
                keyPrefix: prefix,
                rateLimit,
                status: 'active',
            },
        });
        // Return raw key once
        return reply.status(201).send({
            id: apiKey.id,
            name: apiKey.name,
            rawKey: key, // ONLY SHOWN NOW
            keyPrefix: prefix,
            rateLimit: apiKey.rateLimit,
            status: apiKey.status,
            createdAt: apiKey.createdAt,
        });
    });
    // 3. DELETE /v1/keys/:id - Revoke key
    fastify.delete('/keys/:id', async (request, reply) => {
        const { id } = request.params;
        const key = await db_1.prisma.apiKey.findFirst({
            where: { id, userId: request.user.id },
        });
        if (!key) {
            return reply.status(404).send({ error: 'Not Found', message: 'API key not found' });
        }
        if (key.status === 'revoked') {
            return reply.status(400).send({ error: 'Bad Request', message: 'API key already revoked' });
        }
        const updatedKey = await db_1.prisma.apiKey.update({
            where: { id },
            data: { status: 'revoked' },
        });
        return reply.send({
            id: updatedKey.id,
            status: updatedKey.status,
            message: 'API key successfully revoked',
        });
    });
}
