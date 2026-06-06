import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { cryptoHelper } from '../lib/crypto';
import { config } from '../config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionsBody {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

export async function gatewayRoutes(fastify: FastifyInstance) {
  // POST /v1/chat/completions
  fastify.post('/chat/completions', async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Authenticate via Bearer Token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          message: 'You must provide a valid API key in the Authorization header.',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const tokenHash = cryptoHelper.hashKey(token);

    // Find the API Key
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash: tokenHash },
      include: { user: true },
    });

    if (!apiKeyRecord || apiKeyRecord.status !== 'active') {
      return reply.status(401).send({
        error: {
          message: 'The API key provided is invalid or has been revoked.',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      });
    }

    // 2. Validate Request Body
    const body = request.body as ChatCompletionsBody;
    if (!body || !body.messages || !Array.isArray(body.messages)) {
      return reply.status(400).send({
        error: {
          message: "We expect a JSON body containing a 'messages' array.",
          type: 'invalid_request_error',
          code: 'invalid_body',
        },
      });
    }

    const requestedModelId = body.model || 'gpt-4o';
    
    // Find model in DB
    let modelRecord = await prisma.model.findUnique({
      where: { id: requestedModelId },
    });

    const upstreamKey = config.UPSTREAM_OPENAI_API_KEY;

    if (!modelRecord) {
      if (upstreamKey) {
        // Dynamically register the model so it can be queried and shown on the dashboard
        modelRecord = await prisma.model.create({
          data: {
            id: requestedModelId,
            name: requestedModelId,
            inputPricePerMillion: 0.0,
            outputPricePerMillion: 0.0,
            enabled: true,
          },
        });
        console.log(`Dynamically registered new model: ${requestedModelId}`);
      } else {
        return reply.status(400).send({
          error: {
            message: `The model '${requestedModelId}' is not supported or is currently disabled.`,
            type: 'invalid_request_error',
            code: 'model_not_found',
          },
        });
      }
    } else if (!modelRecord.enabled) {
      return reply.status(400).send({
        error: {
          message: `The model '${requestedModelId}' is currently disabled.`,
          type: 'invalid_request_error',
          code: 'model_not_found',
        },
      });
    }

    // Update lastUsedAt
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // 3. Handle Request (Proxy vs. Simulation)
    if (upstreamKey) {
      // PROXY MODE: Forward to real OpenAI compatible endpoint
      try {
        console.log(`Proxying request for model ${requestedModelId} to ${config.UPSTREAM_OPENAI_API_BASE_URL}...`);
        
        const response = await fetch(`${config.UPSTREAM_OPENAI_API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${upstreamKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: requestedModelId,
            messages: body.messages,
            // Forward other fields if passed
            ...(body.stream !== undefined ? { stream: body.stream } : {}),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return reply.status(response.status).send(errData);
        }

        const data = await response.json() as any;

        // Extract usage metrics
        const inputTokens = data.usage?.prompt_tokens || 10;
        const outputTokens = data.usage?.completion_tokens || 10;
        const totalTokens = inputTokens + outputTokens;

        // Calculate custom cost
        const costUsd = (inputTokens / 1000000) * modelRecord.inputPricePerMillion +
                        (outputTokens / 1000000) * modelRecord.outputPricePerMillion;

        // Log to DB
        await prisma.usageLog.create({
          data: {
            apiKeyId: apiKeyRecord.id,
            model: requestedModelId,
            inputTokens,
            outputTokens,
            totalTokens,
            costUsd,
          },
        });

        return reply.send(data);

      } catch (err: any) {
        console.error('Upstream proxy error:', err);
        return reply.status(502).send({
          error: {
            message: 'Failed to communicate with upstream AI provider.',
            type: 'api_error',
            code: 'upstream_error',
          },
        });
      }
    } else {
      // SIMULATION MODE
      // Compute input tokens based on messages (approx: 1 token = 4 chars)
      const inputText = body.messages.map((m) => m.content).join(' ');
      const inputTokens = Math.max(1, Math.ceil(inputText.length / 4));

      // Generate simulated response
      const lastUserMessage = body.messages.filter(m => m.role === 'user').pop();
      const userContent = lastUserMessage ? lastUserMessage.content : 'Hello';
      
      const simulatedText = `[APIaaS SIMULATION] Hello! I am a simulated response from your APIaaS platform. Your key (prefix: ${apiKeyRecord.keyPrefix}) was successfully authorized. You requested the model "${requestedModelId}". Here is a reflection of your prompt: "${userContent.substring(0, 60)}${userContent.length > 60 ? '...' : ''}"`;
      
      const outputTokens = Math.max(1, Math.ceil(simulatedText.length / 4));
      const totalTokens = inputTokens + outputTokens;

      // Calculate cost
      const costUsd = (inputTokens / 1000000) * modelRecord.inputPricePerMillion +
                      (outputTokens / 1000000) * modelRecord.outputPricePerMillion;

      // Log usage
      await prisma.usageLog.create({
        data: {
          apiKeyId: apiKeyRecord.id,
          model: requestedModelId,
          inputTokens,
          outputTokens,
          totalTokens,
          costUsd,
        },
      });

      // Construct OpenAI response payload
      const responsePayload = {
        id: `chatcmpl-${Math.random().toString(36).substring(2, 15)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModelId,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: simulatedText,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: totalTokens,
        },
      };

      return reply.send(responsePayload);
    }
  });
}
