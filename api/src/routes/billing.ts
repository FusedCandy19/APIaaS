import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

const upgradeSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
});

export async function billingRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // 1. GET /v1/billing
  fastify.get('/billing', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { plan: true, createdAt: true },
    });

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    // Calculate spend in current billing cycle (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const logsThisMonth = await prisma.usageLog.findMany({
      where: {
        apiKey: { userId: request.user.id },
        createdAt: { gte: startOfMonth },
      },
      select: { costUsd: true },
    });

    const currentSpend = logsThisMonth.reduce((sum, log) => sum + log.costUsd, 0);

    // Mock invoice history
    const invoices = [
      { id: 'INV-2026-003', date: '2026-05-01', amount: 14.85, status: 'Paid', downloadUrl: '#' },
      { id: 'INV-2026-002', date: '2026-04-01', amount: 8.24, status: 'Paid', downloadUrl: '#' },
      { id: 'INV-2026-001', date: '2026-03-01', amount: 0.00, status: 'Paid', downloadUrl: '#' },
    ];

    // Mock payment method
    const paymentMethod = {
      brand: 'Visa',
      last4: '4242',
      expiry: '12/28',
    };

    return reply.send({
      plan: user.plan,
      currentSpend,
      billingCycleStart: startOfMonth.toISOString().slice(0, 10),
      paymentMethod,
      invoices,
    });
  });

  // 2. POST /v1/billing/upgrade
  fastify.post('/billing/upgrade', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = upgradeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
    }

    const { plan } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: request.user.id },
      data: { plan },
      select: { id: true, email: true, plan: true },
    });

    return reply.send({
      message: `Successfully updated plan to ${plan}`,
      user: updated,
    });
  });
}
