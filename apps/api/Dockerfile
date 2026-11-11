FROM node:24-alpine

WORKDIR /app

RUN npm install --global pnpm@10.34.9

COPY --chown=node:node . .

RUN chown node:node /app

RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@biling/api...

USER node

CMD ["node", "apps/api/dist/main.js"]
