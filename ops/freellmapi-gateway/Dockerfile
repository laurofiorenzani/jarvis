FROM node:22-alpine
WORKDIR /app
COPY proxy.mjs ./proxy.mjs
USER node
EXPOSE 3002
CMD ["node", "proxy.mjs"]
