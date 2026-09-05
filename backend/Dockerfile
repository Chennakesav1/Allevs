FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm install

COPY frontend ./frontend
COPY backend ./backend
RUN npm run build -w frontend

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm install --omit=dev

COPY backend/src ./backend/src
COPY backend/.env ./backend/.env
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/backend/uploads
EXPOSE 5000
CMD ["node","backend/src/server.js"]
