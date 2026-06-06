import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/auth';

const updateModelSchema = z.object({
  inputPricePerMillion: z.number().min(0).optional(),
  outputPricePerMillion: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

const updateBrandingSchema = z.object({
  platformName: z.string().min(1).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  logoUrl: z.string().optional(),
  themePreset: z.enum(['dark-violet', 'dark-amber', 'dark-teal', 'dark-rose']).optional(),
  supportEmail: z.string().email().optional(),
});

const updateUserSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  // --- PUBLIC ENDPOINTS ---
  
  // 1. GET /branding - Public branding data loaded at app startup
  fastify.get('/branding', async (request: FastifyRequest, reply: FastifyReply) => {
    let branding = await prisma.brandingConfig.findUnique({
      where: { id: 1 },
    });

    if (!branding) {
      branding = await prisma.brandingConfig.create({
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
    adminSecured.addHook('preHandler', requireAdmin);

    // 2. GET /admin/users - List all users with summary analytics
    adminSecured.get('/admin/users', async (request: FastifyRequest, reply: FastifyReply) => {
      const users = await prisma.user.findMany({
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
          if (key.status === 'active') activeKeys++;
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
    adminSecured.patch('/admin/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = updateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: parsed.data,
        select: { id: true, email: true, role: true, plan: true },
      });

      return reply.send(updated);
    });

    // 4. DELETE /admin/keys/:id - Revoke user keys platform-wide
    adminSecured.delete('/admin/keys/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const key = await prisma.apiKey.findUnique({ where: { id } });
      if (!key) {
        return reply.status(404).send({ error: 'Not Found', message: 'API key not found' });
      }

      await prisma.apiKey.update({
        where: { id },
        data: { status: 'revoked' },
      });

      return reply.send({ success: true, message: 'API key revoked by admin' });
    });

    // 5. PATCH /admin/models/:id - Adjust model pricing
    adminSecured.patch('/admin/models/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = updateModelSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
      }

      const model = await prisma.model.findUnique({ where: { id } });
      if (!model) {
        return reply.status(404).send({ error: 'Not Found', message: 'Model not found' });
      }

      const updated = await prisma.model.update({
        where: { id },
        data: parsed.data,
      });

      return reply.send(updated);
    });

    // 6. PATCH /admin/branding - Update styling preferences
    adminSecured.patch('/admin/branding', async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = updateBrandingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
      }

      const updated = await prisma.brandingConfig.update({
        where: { id: 1 },
        data: parsed.data,
      });

      return reply.send(updated);
    });

    // 7. GET /admin/health - Retrieve system indicators
    adminSecured.get('/admin/health', async (request: FastifyRequest, reply: FastifyReply) => {
      const totalUsers = await prisma.user.count();
      const activeKeys = await prisma.apiKey.count({ where: { status: 'active' } });
      const totalRequests = await prisma.usageLog.count();

      // Database ping
      let dbStatus = 'healthy';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
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
  });
}
