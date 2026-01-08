FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript --save-dev && npm run build && npm remove typescript

# Run as non-root
USER node

# Cloud Run uses PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
