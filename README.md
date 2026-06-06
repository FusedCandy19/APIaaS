# APIaaS platform with User & Admin Console (Ollama Powered)

A production-ready, dockerized full-stack **API-as-a-Service (APIaaS)** platform. It enables you to sell or manage API tokens for local open-weights LLMs running on your own server. Users can generate API keys, inspect usage analytics, and monitor subscription billing. Admins can view platform metrics, manage accounts, and customize console themes (platform titles and accent colors) dynamically.

## 🏗️ Architecture Summary

- **Web Dashboard (`web/`)**: React 18 + TS + Vite + Tailwind CSS console served via Nginx on port **`8443`** (HTTPS).
- **API Gateway (`api/`)**: Fastify v4 + TypeScript backend on port **`443`** (HTTPS). Authenticates gateway calls via SHA-256 key matching and proxies requests to your local **Ollama** engine.
- **Database (`db/`)**: PostgreSQL 16 image storing users, keys, metadata, configuration branding, and transaction logs.
- **TLS Security**: Auto-generated self-signed SSL certificates shared across Nginx and Fastify containers.

---

## 🛠️ Step-by-Step Installation Guide

Follow these steps to set up the platform from scratch:

### Step 1: Install Requirements

#### 1. Install Docker & Docker Desktop
Docker Desktop coordinates multi-container orchestrations.
- **Windows / macOS / Linux**: Download and run the installer from the [Official Docker Website](https://www.docker.com/products/docker-desktop/).
- Verify Docker is running:
  ```bash
  docker --version
  docker compose version
  ```

#### 2. Install Ollama
Ollama is a lightweight runner for executing open-weights LLMs locally.
- **Windows**: Download the installer from [Ollama's Website](https://ollama.com/download/windows).
- **macOS / Linux**: Run the install command in your terminal:
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```
- Verify Ollama is running by visiting `http://localhost:11434` in your browser. You should see `Ollama is running`.

---

### Step 2: Download & Configure Models in Ollama

Before launching the console, you need to pull the models you want to use. We have seeded four popular models by default.

Open a command prompt or terminal and download the models:

```bash
# Pull Llama 3 (8B)
ollama pull llama3

# Pull Mistral (7B)
ollama pull mistral

# Pull Gemma (7B)
ollama pull gemma

# Pull DeepSeek R1 (Distilled Llama/Qwen)
ollama pull deepseek-r1
```

You can verify your downloaded models by running:
```bash
ollama list
```

---

### Step 3: Setup Platform Environment Variables

1. Go to the root directory of the `APIaaS` project folder.
2. Create a new file named **`.env`** (or copy from `.env.example`).
3. Add the following environment configuration, pointing the gateway to Ollama running on your host machine:

```env
# Database configuration url (Auto-loaded in compose DB container)
DATABASE_URL="postgresql://postgres:postgres123@db:5432/apiaas?schema=public"

# Session JWT keys (Update with random values in production)
JWT_SECRET="super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="super-secret-refresh-key-change-in-production"

# Internally exposed port
PORT=443

# Upstream proxy config mapping to Ollama on host machine
UPSTREAM_OPENAI_API_KEY="ollama"
UPSTREAM_OPENAI_API_BASE_URL="http://host.docker.internal:11434/v1"

# Seed Admin Account Credentials
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="adminpassword123"
```

> [!IMPORTANT]
> The domain `host.docker.internal` acts as a networking bridge enabling Docker containers to resolve services running directly on the host machine (like your local Ollama port `11434`).

---

### Step 4: Spin up Docker Services

In the root directory where `docker-compose.yml` is located, execute the builder:

```bash
docker compose up --build -d
```

#### What happens during boot?
1.  **PostgreSQL** container boots and creates the `apiaas` database.
2.  **Fastify API** generates self-signed TLS keys inside `/certs`, deploys Prisma database tables, seeds default developer accounts/models/branding preferences, and starts the API listener.
3.  **React Nginx** copies the SSL keys, builds Vite assets, and starts serving the dashboard interface.

You can verify that all containers are active:
```bash
docker compose ps
```

---

### Step 5: Access the Web Console

1. Open your browser and navigate to **`https://localhost:8443`**.
2. **Accept the SSL Warn**: Since we utilize self-signed certificates, your browser will display a `Connection not private` warning. Click *Advanced* -> *Proceed to localhost (unsafe)*.
3. Sign in utilizing one of the pre-seeded accounts:
   - **Developer Console**: `demo@example.com` / `demo123`
   - **Console Admin**: `admin@example.com` / `adminpassword123`

---

### Step 6: Test Gateway Queries Against Ollama

#### 1. Generate an API Token
- Log in as the user developer (`demo@example.com`).
- Navigate to **API Keys** -> click **Create API Key**.
- Give the key a label (e.g. `Dev Terminal`), set a request limit, and click *Create*.
- Copy the raw key (e.g. `sk_proj_dev_...`). Keep it safe.

#### 2. Execute cURL completions
Open your terminal and run a query targeting the locally running Llama 3 model (passing your copied API key):

```bash
curl -k -X POST https://localhost/v1/chat/completions \
  -H "Authorization: Bearer <YOUR_GENERATED_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "messages": [
      {"role": "user", "content": "Explain APIaaS in one sentence"}
    ]
  }'
```
*(Note: `-k` or `--insecure` tells curl to ignore self-signed certificate validation warnings)*.

#### 3. Inspect Usage Graphs
Navigate back to the **Usage** page on the developer dashboard console. You will see your local request query instantly registered in the token consumption and cost graphs!

---

## 🎨 Admin Dynamic Branding Customization

Admins can completely customize how the dashboard looks to match their brand:

1. Log into the console as **Admin** (`admin@example.com` / `adminpassword123`).
2. Go to the **Branding Theme** section in the sidebar.
3. Update the **Platform Name** (e.g. `Llama Hub`), accent color (via hex color picker), or preset style theme.
4. Preview your styling configurations dynamically on the **Live Preview** block.
5. Click **Apply Theme**. Global parameters, titles, buttons, icons, and chart color sequences update instantly across all pages without refresh!

---

## 🛑 Shutting Down Services

To stop the database and server containers without losing database logs:
```bash
docker compose down
```

To wipe database volumes clean for a fresh restart:
```bash
docker compose down -v
```
