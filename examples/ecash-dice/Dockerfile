FROM amd64/node:20-alpine

# install dependencies
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm build

WORKDIR /app/examples/ecash-dice
RUN pnpm build

EXPOSE 3000
CMD ["node", "./build"]