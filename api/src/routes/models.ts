import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { syncModelsWithUpstream } from '../lib/modelsSync';

export async function modelsRoutes(fastify: FastifyInstance) {
  // GET /v1/models - Public endpoint to retrieve models (OpenAI format + pricing metadata)
  fastify.get('/models', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await syncModelsWithUpstream();
    } catch (err) {
      fastify.log.error(err, 'Failed to sync models with upstream');
    }

    const dbModels = await prisma.model.findMany({
      where: { enabled: true },
    });

    const openAiModels = dbModels.map((m) => ({
      id: m.id,
      object: 'model',
      created: 1677610000,
      owned_by: m.id.startsWith('claude') ? 'anthropic' : 'openai',
      // Custom metadata for our UI
      pricing: {
        inputPricePerMillion: m.inputPricePerMillion,
        outputPricePerMillion: m.outputPricePerMillion,
      },
    }));

    return reply.send({
      object: 'list',
      data: openAiModels,
    });
  });
}
