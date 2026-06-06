import crypto from 'crypto';

export const cryptoHelper = {
  generateKey(name: string): { key: string; prefix: string; hash: string } {
    // Determine prefix based on name (e.g. prod -> 'prod', sandbox -> 'sand')
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'key';
    const randomPart = crypto.randomBytes(24).toString('base64url'); // ~32 characters
    const key = `sk_proj_${cleanName}_${randomPart}`;
    const prefix = `sk_proj_${cleanName}_...${key.slice(-4)}`;
    const hash = this.hashKey(key);
    return { key, prefix, hash };
  },

  hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
};
