
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci --workspace=charging-stations-backend

COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src

WORKDIR /app/backend
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/dist ./backend/dist

WORKDIR /app/backend
RUN npm ci --omit=dev --workspace=charging-stations-backend

EXPOSE 8000
CMD ["npm", "start"]
