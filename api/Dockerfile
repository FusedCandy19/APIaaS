FROM node:20-alpine

# Install openssl for cert generation
RUN apk add --no-repeat --no-cache openssl

WORKDIR /app

# Copy package dependencies
COPY package.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Ensure entrypoint is executable and convert line endings if created on Windows
RUN chmod +x entrypoint.sh && sed -i 's/\r$//' entrypoint.sh

# Expose API gateway / dashboard management port (shared on 443)
EXPOSE 443

ENTRYPOINT ["./entrypoint.sh"]
