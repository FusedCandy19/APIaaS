"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelsRoutes = modelsRoutes;
const db_1 = require("../db");
const modelsSync_1 = require("../lib/modelsSync");
async function modelsRoutes(fastify) {
    // GET /v1/models - Public endpoint to retrieve models (OpenAI format + pricing metadata)
    fastify.get('/models', async (request, reply) => {
        try {
            await (0, modelsSync_1.syncModelsWithUpstream)();
        }
        catch (err) {
            fastify.log.error(err, 'Failed to sync models with upstream');
        }
        const dbModels = await db_1.prisma.model.findMany({
            where: { enabled: true },
        });
        const getModelProvider = (id) => {
            const lower = id.toLowerCase();
            if (lower.startsWith('gpt') || lower.startsWith('text-davinci'))
                return 'openai';
            if (lower.startsWith('claude'))
                return 'anthropic';
            if (lower.startsWith('llama'))
                return 'meta';
            if (lower.startsWith('mistral') || lower.startsWith('mixtral'))
                return 'mistral';
            if (lower.startsWith('gemma') || lower.startsWith('google'))
                return 'google';
            if (lower.startsWith('deepseek'))
                return 'deepseek';
            if (lower.startsWith('qwen'))
                return 'alibaba';
            if (lower.startsWith('phi'))
                return 'microsoft';
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
