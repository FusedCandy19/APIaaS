import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fs from 'fs';
import path from 'path';
import { config } from './config';

// Import routes
import { authRoutes } from './routes/auth';
import { keysRoutes } from './routes/keys';
import { usageRoutes } from './routes/usage';
import { dashboardRoutes } from './routes/dashboard';
import { settingsRoutes } from './routes/settings';
import { billingRoutes } from './routes/billing';
import { modelsRoutes } from './routes/models';
import { gatewayRoutes } from './routes/gateway';
import { adminRoutes } from './routes/admin';

async function startServer() {
  // 1. Try to load SSL Certificates for HTTPS
  let sslOptions: { key: Buffer; cert: Buffer } | null = null;

  try {
    const defaultKeyPath = '/certs/server.key';
    const defaultCertPath = '/certs/server.crt';
    
    let keyPath = defaultKeyPath;
    let certPath = defaultCertPath;

    // Local development fallback
    if (!fs.existsSync(keyPath)) {
      keyPath = path.join(__dirname, '../../certs/server.key');
      certPath = path.join(__dirname, '../../certs/server.crt');
    }

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      console.log(`[SSL] Loaded certificates from ${keyPath}`);
    } else {
      console.warn('[SSL] Certificates not found. Starting in HTTP mode.');
    }
  } catch (err) {
    console.error('[SSL] Error loading certificates, falling back to HTTP:', err);
  }

  // 2. Initialize Fastify Instance
  const fastify = Fastify({
    https: sslOptions,
    logger: true,
  });

  // 3. Register Plugins
  await fastify.register(cors, {
    origin: true, // Allow all origins for dev/dashboard client
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    strictPreflight: false,
  });

  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  // 4. Register Routes
  // Dashboard management endpoints (mapped with /api prefixes)
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(keysRoutes, { prefix: '/api/v1' });
  await fastify.register(usageRoutes, { prefix: '/api/v1' });
  await fastify.register(dashboardRoutes, { prefix: '/api/v1' });
  await fastify.register(settingsRoutes, { prefix: '/api/v1' });
  await fastify.register(billingRoutes, { prefix: '/api/v1' });
  await fastify.register(adminRoutes, { prefix: '/api' }); // Exposes /api/branding and /api/admin/*

  // OpenAI Compatible Gateway endpoints (mapped directly under /v1)
  await fastify.register(modelsRoutes, { prefix: '/v1' });
  await fastify.register(gatewayRoutes, { prefix: '/v1' });

  // Also register models under /api/v1 prefix for same-origin dashboard proxy access
  await fastify.register(modelsRoutes, { prefix: '/api/v1' });

  // 5. Global Error Handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }
    return reply.status(error.statusCode || 500).send({
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected server error occurred',
    });
  });

  // 6. Bind Server
  try {
    const address = await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Server listening on ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
