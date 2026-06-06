"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cryptoHelper = void 0;
const crypto_1 = __importDefault(require("crypto"));
exports.cryptoHelper = {
    generateKey(name) {
        // Determine prefix based on name (e.g. prod -> 'prod', sandbox -> 'sand')
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'key';
        const randomPart = crypto_1.default.randomBytes(24).toString('base64url'); // ~32 characters
        const key = `sk_proj_${cleanName}_${randomPart}`;
        const prefix = `sk_proj_${cleanName}_...${key.slice(-4)}`;
        const hash = this.hashKey(key);
        return { key, prefix, hash };
    },
    hashKey(key) {
        return crypto_1.default.createHash('sha256').update(key).digest('hex');
    }
};
