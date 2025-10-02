# OpenIM CMS Dockerfile
# 纯前端静态文件部署

# ==================== 构建阶段 ====================
FROM node:18-alpine as builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# ==================== 生产阶段 ====================
FROM nginx:alpine

# 安装必要的工具
RUN apk add --no-cache gettext curl

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 直接复制nginx配置文件，不使用模板
COPY deployment/nginx-template.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80 443

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 启动NGINX
CMD ["nginx", "-g", "daemon off;"]