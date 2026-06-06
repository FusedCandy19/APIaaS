import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

const profileUpdateSchema = z.object({
  email: z.string().email().optional(),
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // 1. GET /v1/settings/profile
  fastify.get('/settings/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({
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
  fastify.patch('/settings/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
    }

    const { email } = parsed.data;

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: request.user.id } },
      });
      if (existing) {
        return reply.status(409).send({ error: 'Conflict', message: 'Email already in use' });
      }
    }

    const updated = await prisma.user.update({
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
  fastify.patch('/settings/password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
    });

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Incorrect current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: request.user.id },
      data: { passwordHash: newPasswordHash },
    });

    return reply.send({ success: true, message: 'Password updated successfully' });
  });
}
