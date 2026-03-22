FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
WORKDIR /app
COPY ./frontend/package.json ./frontend/package-lock.json ./ || true
RUN npm ci --loglevel=error || npm install --no-audit --no-fund

COPY . .
WORKDIR /app/frontend
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/frontend/build /usr/share/nginx/html
COPY ./frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
