# Stage 1: Build the React application
FROM node:20-alpine as builder

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

# Run build (outputs to dist/)
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:stable-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Nginx SSL port
EXPOSE 8443

CMD ["nginx", "-g", "daemon off;"]
