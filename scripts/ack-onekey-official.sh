#!/usr/bin/env bash
set -euo pipefail

# 一键安装（ACK全新集群）- 使用官方部署文件
# 按照官方方式使用 kubectl apply -f xxxx.yml 部署

# 配置参数
NS=${NS:-default}
DOCKER_USER=${DOCKER_USER:-mag1666888}
TAG=${TAG:-dev}

# 外部基础设施地址与凭据
REDIS_HOST=${REDIS_HOST:-47.237.103.4}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-rI57PJsJhnz_qlRkfnTa0RPT}

MONGO_HOST=${MONGO_HOST:-47.237.103.4}
MONGO_PORT=${MONGO_PORT:-27017}
MONGO_USERNAME=${MONGO_USERNAME:-rI57PJsJhnz_qlRkfnTa0RPT}
MONGO_PASSWORD=${MONGO_PASSWORD:-mongo_Fc75Gn}
MONGO_DATABASE=${MONGO_DATABASE:-openim_v3}
MONGO_AUTHSOURCE=${MONGO_AUTHSOURCE:-openim_v3}

MINIO_HOST=${MINIO_HOST:-47.237.103.4}
MINIO_API_PORT=${MINIO_API_PORT:-9000}
MINIO_CONSOLE_PORT=${MINIO_CONSOLE_PORT:-9001}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minio_pC5wMB}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-rI57PJsJhnz_qlRkfnTa0RPT}

KAFKA_HOST=${KAFKA_HOST:-47.237.103.4}
KAFKA_PORT=${KAFKA_PORT:-9092}
KAFKA_USERNAME=${KAFKA_USERNAME:-myopenim}
KAFKA_PASSWORD=${KAFKA_PASSWORD:-rI57PJsJhnz_qlRkfnTa0RPT}

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENIM_DEPLOY_DIR="$PROJECT_ROOT/open-im-server/deployments/deploy"
CHAT_DEPLOY_DIR="$PROJECT_ROOT/chat/deployments/deploy"

echo "=========================================="
echo "OpenIM 一键安装脚本 (官方部署方式)"
echo "=========================================="
echo "命名空间: $NS"
echo "Docker用户: $DOCKER_USER"
echo "镜像标签: $TAG"
echo "=========================================="

# 检查必要目录
if [ ! -d "$OPENIM_DEPLOY_DIR" ]; then
    echo "❌ 错误: 找不到 open-im-server 部署目录: $OPENIM_DEPLOY_DIR"
    exit 1
fi

if [ ! -d "$CHAT_DEPLOY_DIR" ]; then
    echo "❌ 错误: 找不到 chat 部署目录: $CHAT_DEPLOY_DIR"
    exit 1
fi

# 创建命名空间
echo "📦 创建命名空间..."
kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

# 设置默认命名空间
kubectl config set-context --current --namespace="$NS"

# 1. 部署 RBAC
echo "🔐 部署 RBAC..."
kubectl apply -f "$OPENIM_DEPLOY_DIR/clusterRole.yml"

# 2. 部署基础设施 Secrets
echo "🔑 创建基础设施 Secrets..."

# Redis Secret
kubectl create secret generic my-open-im-redis-secret -n "$NS" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# MongoDB Secret
kubectl create secret generic my-open-im-mongo-secret -n "$NS" \
  --from-literal=mongo-username="$MONGO_USERNAME" \
  --from-literal=mongo-password="$MONGO_PASSWORD" \
  --from-literal=mongo-database="$MONGO_DATABASE" \
  --from-literal=mongo-authsource="$MONGO_AUTHSOURCE" \
  --dry-run=client -o yaml | kubectl apply -f -

# MinIO Secret
kubectl create secret generic my-open-im-minio-secret -n "$NS" \
  --from-literal=minio-access-key="$MINIO_ACCESS_KEY" \
  --from-literal=minio-secret-key="$MINIO_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

# Kafka Secret
kubectl create secret generic my-open-im-kafka-secret -n "$NS" \
  --from-literal=kafka-username="$KAFKA_USERNAME" \
  --from-literal=kafka-password="$KAFKA_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. 部署外部基础设施服务（用于服务发现）
echo "🏗️ 部署外部基础设施服务..."

# Redis 服务
kubectl apply -f "$OPENIM_DEPLOY_DIR/redis-service.yml"
kubectl apply -f "$OPENIM_DEPLOY_DIR/redis-secret.yml"

# MongoDB 服务
kubectl apply -f "$OPENIM_DEPLOY_DIR/mongo-service.yml"
kubectl apply -f "$OPENIM_DEPLOY_DIR/mongo-secret.yml"

# MinIO 服务
kubectl apply -f "$OPENIM_DEPLOY_DIR/minio-service.yml"
kubectl apply -f "$OPENIM_DEPLOY_DIR/minio-secret.yml"

# Kafka 服务
kubectl apply -f "$OPENIM_DEPLOY_DIR/kafka-service.yml"
kubectl apply -f "$OPENIM_DEPLOY_DIR/kafka-secret.yml"

# 4. 更新部署文件中的镜像和配置
echo "🔧 更新部署文件..."

# 创建临时目录
TEMP_DIR=$(mktemp -d)
cp -r "$OPENIM_DEPLOY_DIR"/* "$TEMP_DIR/"
cp -r "$CHAT_DEPLOY_DIR"/* "$TEMP_DIR/"

# 更新镜像标签
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|image: .*openim|image: $DOCKER_USER/openim|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|image: .*chat|image: $DOCKER_USER/chat|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|:latest|:$TAG|g" {} \;

# 更新外部服务地址
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|REDIS_HOST|$REDIS_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|REDIS_PORT|$REDIS_PORT|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MONGO_HOST|$MONGO_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MONGO_PORT|$MONGO_PORT|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MINIO_HOST|$MINIO_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MINIO_API_PORT|$MINIO_API_PORT|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|KAFKA_HOST|$KAFKA_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|KAFKA_PORT|$KAFKA_PORT|g" {} \;

# 5. 部署 OpenIM Server 组件
echo "🚀 部署 OpenIM Server 组件..."

# 部署配置
kubectl apply -f "$TEMP_DIR/openim-config.yml"

# 部署 RPC 服务
kubectl apply -f "$TEMP_DIR/openim-rpc-auth-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-auth-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-user-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-user-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-friend-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-friend-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-group-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-group-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-msg-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-msg-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-conversation-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-conversation-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-third-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-third-service.yml"

# 部署 API 服务
kubectl apply -f "$TEMP_DIR/openim-api-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-api-service.yml"

# 部署其他服务
kubectl apply -f "$TEMP_DIR/openim-msggateway-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-msggateway-service.yml"
kubectl apply -f "$TEMP_DIR/openim-msgtransfer-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-msgtransfer-service.yml"
kubectl apply -f "$TEMP_DIR/openim-push-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-push-service.yml"
kubectl apply -f "$TEMP_DIR/openim-crontask-deployment.yml"

# 6. 部署 Chat 组件
echo "💬 部署 Chat 组件..."

# 部署 Chat 配置
kubectl apply -f "$TEMP_DIR/chat-config.yml"

# 部署 Chat RPC 服务
kubectl apply -f "$TEMP_DIR/openim-chat-rpc-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-chat-rpc-service.yml"

# 部署 Chat API 服务
kubectl apply -f "$TEMP_DIR/openim-chat-api-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-chat-api-service.yml"

# 部署 Admin 服务
kubectl apply -f "$TEMP_DIR/openim-admin-rpc-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-admin-rpc-service.yml"
kubectl apply -f "$TEMP_DIR/openim-admin-api-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-admin-api-service.yml"

# 7. 部署前端和管理界面
echo "🖥️ 部署前端和管理界面..."

# 部署 im-cms
kubectl apply -f "$TEMP_DIR/im-cms-simple.yml"

# 8. 部署公网访问
echo "🌐 部署公网访问..."

# 部署 Ingress
kubectl apply -f "$TEMP_DIR/ingress.yml"

# 9. 等待部署完成
echo "⏳ 等待部署完成..."
kubectl wait --for=condition=available --timeout=300s deployment/openim-api -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/openim-chat-api -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/openim-admin-api -n "$NS" || true

# 10. 显示部署状态
echo "📊 部署状态:"
kubectl get pods -n "$NS"
kubectl get svc -n "$NS"
kubectl get ingress -n "$NS"

# 11. 清理临时文件
rm -rf "$TEMP_DIR"

echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo "访问地址:"
echo "  - im-cms: http://your-server-ip"
echo "  - OpenIM API: http://your-server-ip:10002"
echo "  - Chat API: http://your-server-ip:10008"
echo "  - Admin API: http://your-server-ip:10009"
echo "=========================================="
