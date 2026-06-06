"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const modelsSync_1 = require("../lib/modelsSync");
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['user', 'admin']).default('user'),
    plan: zod_1.z.enum(['free', 'pro', 'enterprise']).default('free'),
    status: zod_1.z.enum(['active', 'pending', 'suspended']).default('active'),
});
const createModelSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Model ID is required'),
    name: zod_1.z.string().min(1, 'Model name is required'),
    inputPricePerMillion: zod_1.z.number().min(0),
    outputPricePerMillion: zod_1.z.number().min(0),
    enabled: zod_1.z.boolean().default(true),
});
const updateModelSchema = zod_1.z.object({
    inputPricePerMillion: zod_1.z.number().min(0).optional(),
    outputPricePerMillion: zod_1.z.number().min(0).optional(),
    enabled: zod_1.z.boolean().optional(),
});
const updateBrandingSchema = zod_1.z.object({
    platformName: zod_1.z.string().min(1).optional(),
    accentColor: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
    logoUrl: zod_1.z.string().optional(),
    themePreset: zod_1.z.enum(['dark-violet', 'dark-amber', 'dark-teal', 'dark-rose']).optional(),
    supportEmail: zod_1.z.string().email().optional(),
});
const updateUserSchema = zod_1.z.object({
    plan: zod_1.z.enum(['free', 'pro', 'enterprise']).optional(),
    role: zod_1.z.enum(['user', 'admin']).optional(),
    status: zod_1.z.enum(['active', 'pending', 'suspended']).optional(),
});
const resetPasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
async function adminRoutes(fastify) {
    // --- PUBLIC ENDPOINTS ---
    // 1. GET /branding - Public branding data loaded at app startup
    fastify.get('/branding', async (request, reply) => {
        let branding = await db_1.prisma.brandingConfig.findUnique({
            where: { id: 1 },
        });
        if (!branding) {
            branding = await db_1.prisma.brandingConfig.create({
                data: {
                    id: 1,
                    platformName: 'APIaaS',
                    accentColor: '#8b5cf6',
                    themePreset: 'dark-violet',
                    supportEmail: 'support@example.com',
                },
            });
        }
        return reply.send(branding);
    });
    // --- ADMIN PROTECTED ENDPOINTS ---
    // Set hook to authenticate and enforce admin privileges
    fastify.register(async (adminSecured) => {
        adminSecured.addHook('preHandler', auth_1.requireAdmin);
        // 2. GET /admin/users - List all users with summary analytics
        adminSecured.get('/admin/users', async (request, reply) => {
            const users = await db_1.prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    apiKeys: {
                        select: {
                            id: true,
                            status: true,
                            usageLogs: {
                                select: {
                                    totalTokens: true,
                                    costUsd: true,
                                },
                            },
                        },
                    },
                },
            });
            const formatted = users.map((user) => {
                let totalRequests = 0;
                let totalTokens = 0;
                let totalCost = 0;
                let activeKeys = 0;
                for (const key of user.apiKeys) {
                    if (key.status === 'active')
                        activeKeys++;
                    totalRequests += key.usageLogs.length;
                    for (const log of key.usageLogs) {
                        totalTokens += log.totalTokens;
                        totalCost += log.costUsd;
                    }
                }
                return {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    plan: user.plan,
                    createdAt: user.createdAt,
                    activeKeys,
                    usage: {
                        totalRequests,
                        totalTokens,
                        totalCost,
                    },
                };
            });
            return reply.send(formatted);
        });
        // 3. PATCH /admin/users/:id - Change user tier or role
        adminSecured.patch('/admin/users/:id', async (request, reply) => {
            const { id } = request.params;
            const parsed = updateUserSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
            }
            const user = await db_1.prisma.user.findUnique({ where: { id } });
            if (!user) {
                return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
            }
            const updated = await db_1.prisma.user.update({
                where: { id },
                data: parsed.data,
                select: { id: true, email: true, role: true, plan: true },
            });
            return reply.send(updated);
        });
        // 4. DELETE /admin/keys/:id - Revoke user keys platform-wide
        adminSecured.delete('/admin/keys/:id', async (request, reply) => {
            const { id } = request.params;
            const key = await db_1.prisma.apiKey.findUnique({ where: { id } });
            if (!key) {
                return reply.status(404).send({ error: 'Not Found', message: 'API key not found' });
            }
            await db_1.prisma.apiKey.update({
                where: { id },
                data: { status: 'revoked' },
            });
            return reply.send({ success: true, message: 'API key revoked by admin' });
        });
        // 5. PATCH /admin/models/:id - Adjust model pricing
        adminSecured.patch('/admin/models/:id', async (request, reply) => {
            const { id } = request.params;
            const parsed = updateModelSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
            }
            const model = await db_1.prisma.model.findUnique({ where: { id } });
            if (!model) {
                return reply.status(404).send({ error: 'Not Found', message: 'Model not found' });
            }
            const updated = await db_1.prisma.model.update({
                where: { id },
                data: parsed.data,
            });
            return reply.send(updated);
        });
        // 6. PATCH /admin/branding - Update styling preferences
        adminSecured.patch('/admin/branding', async (request, reply) => {
            const parsed = updateBrandingSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
            }
            const updated = await db_1.prisma.brandingConfig.update({
                where: { id: 1 },
                data: parsed.data,
            });
            return reply.send(updated);
        });
        // 7. GET /admin/health - Retrieve system indicators
        adminSecured.get('/admin/health', async (request, reply) => {
            const totalUsers = await db_1.prisma.user.count();
            const activeKeys = await db_1.prisma.apiKey.count({ where: { status: 'active' } });
            const totalRequests = await db_1.prisma.usageLog.count();
            // Database ping
            let dbStatus = 'healthy';
            try {
                await db_1.prisma.$queryRaw `SELECT 1`;
            }
            catch (err) {
                dbStatus = 'unhealthy';
            }
            // Memory usage
            const memoryUsage = process.memoryUsage();
            return reply.send({
                status: dbStatus === 'healthy' ? 'OK' : 'DEGRADED',
                dbStatus,
                totalUsers,
                activeKeys,
                totalRequests,
                uptime: process.uptime(),
                memoryUsage: {
                    heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                },
            });
        });
        // 8. POST /admin/users - Create a new user account directly
        adminSecured.post('/admin/users', async (request, reply) => {
            const parsed = createUserSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
            }
            const { email, password, role, plan, status } = parsed.data;
            const existing = await db_1.prisma.user.findUnique({ where: { email } });
            if (existing) {
                return reply.status(409).send({ error: 'Conflict', message: 'Email already registered.' });
            }
            const passwordHash = await bcryptjs_1.default.hash(password, 10);
            const user = await db_1.prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    role,
                    plan,
                    status,
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    plan: true,
                    status: true,
                    createdAt: true,
                },
            });
            return reply.status(201).send(user);
        });
        // 9. POST /admin/users/:id/reset-password - Reset user password
        adminSecured.post('/admin/users/:id/reset-password', async (request, reply) => {
            const { id } = request.params;
            const parsed = resetPasswordSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
            }
            const { password } = parsed.data;
            const user = await db_1.prisma.user.findUnique({ where: { id } });
            if (!user) {
                return reply.status(404).send({ error: 'Not Found', message: 'User not found.' });
            }
            const passwordHash = await bcryptjs_1.default.hash(password, 10);
            await db_1.prisma.user.update({
                where: { id },
                data: { passwordHash },
            });
            return reply.send({ success: true, message: 'User password reset successful.' });
        });
        // 10. GET /admin/logs - Retrieve global platform transaction logs
        adminSecured.get('/admin/logs', async (request, reply) => {
            const logs = await db_1.prisma.usageLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100, // Show last 100 entries
                include: {
                    apiKey: {
                        select: {
                            name: true,
                            keyPrefix: true,
                            user: {
                                select: {
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });
            const formatted = logs.map((log) => ({
                id: log.id,
                model: log.model,
                inputTokens: log.inputTokens,
                outputTokens: log.outputTokens,
                totalTokens: log.totalTokens,
                costUsd: log.costUsd,
                createdAt: log.createdAt,
                keyName: log.apiKey?.name || 'Deleted Key',
                keyPrefix: log.apiKey?.keyPrefix || 'N/A',
                userEmail: log.apiKey?.user?.email || 'System / Orphaned',
            }));
            return reply.send(formatted);
        });
        // 10. GET /admin/models - Retrieve all models (including disabled)
        adminSecured.get('/admin/models', async (request, reply) => {
            try {
                await (0, modelsSync_1.syncModelsWithUpstream)();
            }
            catch (err) {
                request.log.error(err, 'Failed to sync models with upstream');
            }
            const models = await db_1.prisma.model.findMany({
                orderBy: { id: 'asc' },
            });
            return reply.send(models);
        });
        // 11. POST /admin/models - Register a new AI model in catalog
        adminSecured.post('/admin/models', async (request, reply) => {
            const parsed = createModelSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
            }
            const { id, name, inputPricePerMillion, outputPricePerMillion, enabled } = parsed.data;
            const existing = await db_1.prisma.model.findUnique({ where: { id } });
            if (existing) {
                return reply.status(409).send({ error: 'Conflict', message: 'Model ID already exists.' });
            }
            const model = await db_1.prisma.model.create({
                data: {
                    id,
                    name,
                    inputPricePerMillion,
                    outputPricePerMillion,
                    enabled,
                },
            });
            return reply.status(201).send(model);
        });
        // 11. DELETE /admin/models/:id - Deregister a model configuration
        adminSecured.delete('/admin/models/:id', async (request, reply) => {
            const { id } = request.params;
            const model = await db_1.prisma.model.findUnique({ where: { id } });
            if (!model) {
                return reply.status(404).send({ error: 'Not Found', message: 'Model configuration not found.' });
            }
            await db_1.prisma.model.delete({ where: { id } });
            return reply.send({ success: true, message: `Model '${id}' successfully deleted.` });
        });
    });
}
