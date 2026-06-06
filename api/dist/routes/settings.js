"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = settingsRoutes;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const profileUpdateSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
});
const passwordUpdateSchema = zod_1.z.object({
    currentPassword: zod_1.z.string(),
    newPassword: zod_1.z.string().min(6),
});
async function settingsRoutes(fastify) {
    fastify.addHook('preHandler', auth_1.authenticate);
    // 1. GET /v1/settings/profile
    fastify.get('/settings/profile', async (request, reply) => {
        const user = await db_1.prisma.user.findUnique({
            where: { id: request.user.id },
            select: {
                id: true,
                email: true,
                role: true,
                plan: true,
                createdAt: true,
            },
        });
        if (!user) {
            return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
        }
        return reply.send(user);
    });
    // 2. PATCH /v1/settings/profile
    fastify.patch('/settings/profile', async (request, reply) => {
        const parsed = profileUpdateSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
        }
        const { email } = parsed.data;
        if (email) {
            const existing = await db_1.prisma.user.findFirst({
                where: { email, NOT: { id: request.user.id } },
            });
            if (existing) {
                return reply.status(409).send({ error: 'Conflict', message: 'Email already in use' });
            }
        }
        const updated = await db_1.prisma.user.update({
            where: { id: request.user.id },
            data: {
                ...(email ? { email } : {}),
            },
            select: {
                id: true,
                email: true,
                role: true,
                plan: true,
            },
        });
        return reply.send(updated);
    });
    // 3. PATCH /v1/settings/password
    fastify.patch('/settings/password', async (request, reply) => {
        const parsed = passwordUpdateSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
        }
        const { currentPassword, newPassword } = parsed.data;
        const user = await db_1.prisma.user.findUnique({
            where: { id: request.user.id },
        });
        if (!user) {
            return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
        }
        const match = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!match) {
            return reply.status(400).send({ error: 'Bad Request', message: 'Incorrect current password' });
        }
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 10);
        await db_1.prisma.user.update({
            where: { id: request.user.id },
            data: { passwordHash: newPasswordHash },
        });
        return reply.send({ success: true, message: 'Password updated successfully' });
    });
}
