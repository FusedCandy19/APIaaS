"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const db_1 = require("../db");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
async function authRoutes(fastify) {
    // 1. POST /auth/register
    fastify.post('/register', async (request, reply) => {
        const parsed = registerSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
        }
        const { email, password } = parsed.data;
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return reply.status(409).send({ error: 'Conflict', message: 'Email already registered' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await db_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                role: 'user', // Defaults to user, admin can be seeded or set via DB
                plan: 'free',
            },
        });
        return reply.status(201).send({
            id: user.id,
            email: user.email,
            role: user.role,
            plan: user.plan,
            createdAt: user.createdAt,
        });
    });
    // 2. POST /auth/login
    fastify.post('/login', async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
        }
        const { email, password } = parsed.data;
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
        }
        const passwordMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!passwordMatch) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
        }
        // Enforce account status restrictions
        if (user.status === 'pending') {
            return reply.status(403).send({ error: 'Forbidden', message: 'Your account is pending admin approval.' });
        }
        if (user.status === 'suspended') {
            return reply.status(403).send({ error: 'Forbidden', message: 'Your account has been suspended.' });
        }
        // Generate tokens
        const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '15m' });
        const refreshTokenString = fastify.jwt.sign({ id: user.id }, { expiresIn: '7d' } // Refresh token lasts 7 days
        );
        // Save refresh token to DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await db_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshTokenString,
                expiresAt,
            },
        });
        return reply.send({
            accessToken,
            refreshToken: refreshTokenString,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                plan: user.plan,
            },
        });
    });
    // 3. POST /auth/refresh
    fastify.post('/refresh', async (request, reply) => {
        const parsed = refreshSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
        }
        const { refreshToken } = parsed.data;
        // Check if refresh token is in DB and valid
        const dbToken = await db_1.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!dbToken || dbToken.expiresAt < new Date()) {
            if (dbToken) {
                await db_1.prisma.refreshToken.delete({ where: { id: dbToken.id } });
            }
            return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
        }
        // Verify token cryptographically
        try {
            fastify.jwt.verify(refreshToken);
        }
        catch (err) {
            await db_1.prisma.refreshToken.delete({ where: { id: dbToken.id } });
            return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid refresh token signature' });
        }
        const user = dbToken.user;
        // Generate new access token
        const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '15m' });
        return reply.send({
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                plan: user.plan,
            },
        });
    });
    // 4. POST /auth/logout
    fastify.post('/logout', async (request, reply) => {
        const parsed = refreshSchema.safeParse(request.body);
        if (parsed.success) {
            // Delete the specific token
            await db_1.prisma.refreshToken.deleteMany({
                where: { token: parsed.data.refreshToken },
            });
        }
        return reply.send({ success: true });
    });
}
