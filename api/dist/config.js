"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(8, 'JWT_REFRESH_SECRET must be at least 8 characters'),
    PORT: zod_1.z.coerce.number().default(443),
    UPSTREAM_OPENAI_API_KEY: zod_1.z.string().optional(),
    UPSTREAM_OPENAI_API_BASE_URL: zod_1.z.string().url().default('https://api.openai.com/v1'),
    ADMIN_EMAIL: zod_1.z.string().email().default('admin@example.com'),
    ADMIN_PASSWORD: zod_1.z.string().min(6).default('adminpassword123'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
    process.exit(1);
}
exports.config = parsed.data;
