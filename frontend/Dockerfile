# ── 1단계: Vite로 정적 빌드 ───────────────────────────
FROM node:18-alpine AS build
WORKDIR /app

# 의존성 캐싱: 매니페스트 먼저 복사
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 후 프로덕션 빌드 (dist/ 생성)
COPY . .
RUN npm run build

# ── 2단계: Nginx로 정적 서빙 + /api 프록시 ────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
