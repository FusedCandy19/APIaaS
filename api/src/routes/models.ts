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

    const getModelProvider = (id: string) => {
      const lower = id.toLowerCase();
      if (lower.startsWith('gpt') || lower.startsWith('text-davinci')) return 'openai';
      if (lower.startsWith('claude')) return 'anthropic';
      if (lower.startsWith('llama')) return 'meta';
      if (lower.startsWith('mistral') || lower.startsWith('mixtral')) return 'mistral';
      if (lower.startsWith('gemma') || lower.startsWith('google')) return 'google';
      if (lower.startsWith('deepseek')) return 'deepseek';
      if (lower.startsWith('qwen')) return 'alibaba';
      if (lower.startsWith('phi')) return 'microsoft';
      return 'ollama'; // Default to ollama/local
    };

    const openAiModels = dbModels.map((m) => ({
      id: m.id,
      object: 'model',
      created: 1677610000,
      owned_by: getModelProvider(m.id),
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
