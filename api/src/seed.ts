import { prisma } from './db';
import { config } from './config';
import bcrypt from 'bcryptjs';
import { cryptoHelper } from './lib/crypto'; // We will create this next!

async function main() {
  console.log('Seeding database started...');

  // 1. Seed Ollama Models
  const models = [
    { id: 'llama3', name: 'Llama 3 (8B)', inputPricePerMillion: 0.0, outputPricePerMillion: 0.0 },
    { id: 'mistral', name: 'Mistral (7B)', inputPricePerMillion: 0.0, outputPricePerMillion: 0.0 },
    { id: 'gemma', name: 'Gemma (7B)', inputPricePerMillion: 0.0, outputPricePerMillion: 0.0 },
    { id: 'deepseek-r1', name: 'DeepSeek R1', inputPricePerMillion: 0.0, outputPricePerMillion: 0.0 },
  ];

  for (const m of models) {
    await prisma.model.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        inputPricePerMillion: m.inputPricePerMillion,
        outputPricePerMillion: m.outputPricePerMillion,
      },
      create: {
        id: m.id,
        name: m.name,
        inputPricePerMillion: m.inputPricePerMillion,
        outputPricePerMillion: m.outputPricePerMillion,
        enabled: true,
      },
    });
  }
  console.log('Models seeded.');

  // 2. Seed Default Branding Config
  await prisma.brandingConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      platformName: 'APIaaS',
      accentColor: '#8b5cf6', // Violet-500
      logoUrl: '',
      themePreset: 'dark-violet',
      supportEmail: 'support@apiaas.io',
    },
  });
  console.log('Branding configurations seeded.');

  // 3. Seed Users
  const adminPasswordHash = await bcrypt.hash(config.ADMIN_PASSWORD, 10);
  const demoPasswordHash = await bcrypt.hash('demo123', 10);

  const admin = await prisma.user.upsert({
    where: { email: config.ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: config.ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: 'admin',
      plan: 'enterprise',
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: 'demo@example.com',
      passwordHash: demoPasswordHash,
      role: 'user',
      plan: 'pro',
    },
  });
  console.log('Users seeded.');

  // 4. Seed API Keys if none exist for demo user
  const existingKeys = await prisma.apiKey.findMany({
    where: { userId: demoUser.id },
  });

  if (existingKeys.length === 0) {
    // Let's create two keys
    // Generate key string and hash
    // We'll write cryptoHelper in ./lib/crypto.ts
    // Let's just generate mock keys directly using a simple method
    const prodDetails = cryptoHelper.generateKey('prod');
    const devDetails = cryptoHelper.generateKey('sandbox');
    const oldDetails = cryptoHelper.generateKey('old');

    const prodKey = await prisma.apiKey.create({
      data: {
        userId: demoUser.id,
        name: 'Production Server',
        keyHash: prodDetails.hash,
        keyPrefix: prodDetails.prefix,
        rateLimit: 200,
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    });

    const devKey = await prisma.apiKey.create({
      data: {
        userId: demoUser.id,
        name: 'Development Sandbox',
        keyHash: devDetails.hash,
        keyPrefix: devDetails.prefix,
        rateLimit: 50,
        status: 'active',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
    });

    await prisma.apiKey.create({
      data: {
        userId: demoUser.id,
        name: 'Obsolete Core API Key',
        keyHash: oldDetails.hash,
        keyPrefix: oldDetails.prefix,
        rateLimit: 100,
        status: 'revoked',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    });

    console.log('API Keys generated for demo user:');
    console.log(`- Production Server API Key: ${prodDetails.key} (save this for testing!)`);
    console.log(`- Development Sandbox API Key: ${devDetails.key}`);

    // 5. Seed Historical Usage Logs for the last 7 days
    const modelIds = ['llama3', 'mistral', 'gemma', 'deepseek-r1'];
    const modelMap = {
      'llama3': { inPrice: 0.05, outPrice: 0.15 },
      'mistral': { inPrice: 0.05, outPrice: 0.10 },
      'gemma': { inPrice: 0.03, outPrice: 0.08 },
      'deepseek-r1': { inPrice: 0.14, outPrice: 0.28 },
    };

    console.log('Generating historical usage logs...');
    const now = new Date();

    // Iterate last 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      
      // Generate multiple requests per day
      const numRequests = Math.floor(Math.random() * 20) + 10; // 10-30 requests per day
      for (let req = 0; req < numRequests; req++) {
        const selectedModel = modelIds[Math.floor(Math.random() * modelIds.length)] as 'llama3' | 'mistral' | 'gemma' | 'deepseek-r1';
        const apiKeyId = Math.random() > 0.3 ? prodKey.id : devKey.id;
        
        // Randomize token counts
        const inputTokens = Math.floor(Math.random() * 1500) + 100;
        const outputTokens = Math.floor(Math.random() * 2000) + 200;
        const totalTokens = inputTokens + outputTokens;

        const pricing = modelMap[selectedModel];
        const costUsd = (inputTokens / 1000000) * pricing.inPrice + (outputTokens / 1000000) * pricing.outPrice;

        // Spread requests throughout the day
        const requestTime = new Date(date.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000));

        await prisma.usageLog.create({
          data: {
            apiKeyId,
            model: selectedModel,
            inputTokens,
            outputTokens,
            totalTokens,
            costUsd,
            createdAt: requestTime,
          },
        });
      }
    }
    console.log('Usage logs seeded.');
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
