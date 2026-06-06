"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch (err) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired access token' });
    }
}
async function requireAdmin(request, reply) {
    // First make sure they are authenticated
    await authenticate(request, reply);
    if (reply.sent)
        return;
    if (request.user.role !== 'admin') {
        reply.status(403).send({ error: 'Forbidden', message: 'Admin privileges required' });
    }
}
