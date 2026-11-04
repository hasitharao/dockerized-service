FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

# Dependency layer first so it's cached until package files change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only what runs
COPY server.js ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]
