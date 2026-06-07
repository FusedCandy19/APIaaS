"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
// Import routes
const auth_1 = require("./routes/auth");
const keys_1 = require("./routes/keys");
const usage_1 = require("./routes/usage");
const dashboard_1 = require("./routes/dashboard");
const settings_1 = require("./routes/settings");
const billing_1 = require("./routes/billing");
const models_1 = require("./routes/models");
const gateway_1 = require("./routes/gateway");
const admin_1 = require("./routes/admin");
async function startServer() {
    // 1. Try to load SSL Certificates for HTTPS
    let sslOptions = null;
    try {
        const defaultKeyPath = '/certs/server.key';
        const defaultCertPath = '/certs/server.crt';
        let keyPath = defaultKeyPath;
        let certPath = defaultCertPath;
        // Local development fallback
        if (!fs_1.default.existsSync(keyPath)) {
            keyPath = path_1.default.join(__dirname, '../../certs/server.key');
            certPath = path_1.default.join(__dirname, '../../certs/server.crt');
        }
        if (fs_1.default.existsSync(keyPath) && fs_1.default.existsSync(certPath)) {
            sslOptions = {
                key: fs_1.default.readFileSync(keyPath),
                cert: fs_1.default.readFileSync(certPath),
            };
            console.log(`[SSL] Loaded certificates from ${keyPath}`);
        }
        else {
            console.warn('[SSL] Certificates not found. Starting in HTTP mode.');
        }
    }
    catch (err) {
        console.error('[SSL] Error loading certificates, falling back to HTTP:', err);
    }
    // 2. Initialize Fastify Instance
    const fastify = (0, fastify_1.default)({
        https: sslOptions,
        logger: true,
    });
    // 3. Register Plugins
    await fastify.register(cors_1.default, {
        origin: true, // Allow all origins for dev/dashboard client
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
        strictPreflight: false,
    });
    await fastify.register(jwt_1.default, {
        secret: config_1.config.JWT_SECRET,
    });
    // 4. Register Routes
    // Dashboard management endpoints (mapped with /api prefixes)
    await fastify.register(auth_1.authRoutes, { prefix: '/api/auth' });
    await fastify.register(keys_1.keysRoutes, { prefix: '/api/v1' });
    await fastify.register(usage_1.usageRoutes, { prefix: '/api/v1' });
    await fastify.register(dashboard_1.dashboardRoutes, { prefix: '/api/v1' });
    await fastify.register(settings_1.settingsRoutes, { prefix: '/api/v1' });
    await fastify.register(billing_1.billingRoutes, { prefix: '/api/v1' });
    await fastify.register(admin_1.adminRoutes, { prefix: '/api' }); // Exposes /api/branding and /api/admin/*
    // OpenAI Compatible Gateway endpoints (mapped directly under /v1)
    await fastify.register(models_1.modelsRoutes, { prefix: '/v1' });
    await fastify.register(gateway_1.gatewayRoutes, { prefix: '/v1' });
    // Also register models under /api/v1 prefix for same-origin dashboard proxy access
    await fastify.register(models_1.modelsRoutes, { prefix: '/api/v1' });
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
        const address = await fastify.listen({ port: config_1.config.PORT, host: '0.0.0.0' });
        console.log(`Server listening on ${address}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
startServer();
