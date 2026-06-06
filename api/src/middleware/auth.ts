import { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired access token' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // First make sure they are authenticated
  await authenticate(request, reply);
  if (reply.sent) return;

  if (request.user.role !== 'admin') {
    reply.status(403).send({ error: 'Forbidden', message: 'Admin privileges required' });
  }
}
