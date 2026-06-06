"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelsRoutes = modelsRoutes;
const db_1 = require("../db");
async function modelsRoutes(fastify) {
    // GET /v1/models - Public endpoint to retrieve models (OpenAI format + pricing metadata)
    fastify.get('/models', async (request, reply) => {
        const dbModels = await db_1.prisma.model.findMany({
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
