#!/usr/bin/env bash
set -euo pipefail

# 从 Git 仓库直接部署 OpenIM
# 适用于服务端独立运行

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

echo "=========================================="
echo "OpenIM 从 Git 仓库部署脚本"
echo "=========================================="
echo "命名空间: $NS"
echo "Docker用户: $DOCKER_USER"
echo "镜像标签: $TAG"
echo "=========================================="

# 先执行清理脚本
echo "🧹 执行预清理..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/cleanup-installation.sh" ]; then
    echo "执行清理脚本..."
    bash "$SCRIPT_DIR/cleanup-installation.sh"
    echo "✅ 清理完成"
else
    echo "⚠️  清理脚本不存在，跳过清理步骤"
fi

echo "=========================================="
echo "开始安装 OpenIM..."
echo "=========================================="

# 创建命名空间
echo "📦 创建命名空间..."
kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"
kubectl config set-context --current --namespace="$NS"

# 1. 部署 RBAC
echo "🔐 部署 RBAC..."
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/clusterRole.yml

# 2. 创建 Secrets
echo "🔑 创建基础设施 Secrets..."

# Redis Secret
kubectl create secret generic openim-redis-secret -n "$NS" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# MongoDB Secret
kubectl create secret generic openim-mongo-secret -n "$NS" \
  --from-literal=mongo_openim_username="$MONGO_USERNAME" \
  --from-literal=mongo_openim_password="$MONGO_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# MinIO Secret
kubectl create secret generic openim-minio-secret -n "$NS" \
  --from-literal=minio-root-user="$MINIO_ACCESS_KEY" \
  --from-literal=minio-root-password="$MINIO_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

# Kafka Secret
kubectl create secret generic openim-kafka-secret -n "$NS" \
  --from-literal=kafka-password="$KAFKA_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. 部署外部基础设施服务
echo "🏗️ 部署外部基础设施服务..."

# Redis 服务
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/redis-service.yml
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/redis-secret.yml

# MongoDB 服务
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/mongo-service.yml
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/mongo-secret.yml

# MinIO 服务
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/minio-service.yml
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/minio-secret.yml

# Kafka 服务
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/kafka-service.yml
kubectl apply -f https://raw.githubusercontent.com/OpenIMSDK/Open-IM-Server/main/deployments/deploy/kafka-secret.yml

# 4. 使用本地配置文件
echo "🔧 使用本地配置文件..."

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/../config"
OPENIM_DEPLOY_DIR="$CONFIG_DIR/open-im-server"
CHAT_DEPLOY_DIR="$CONFIG_DIR/chat"

# 检查配置文件是否存在
if [ ! -d "$OPENIM_DEPLOY_DIR" ]; then
    echo "❌ 错误: 找不到 OpenIM 配置文件目录: $OPENIM_DEPLOY_DIR"
    echo "请确保 config/open-im-server 目录存在并包含配置文件"
    exit 1
fi

if [ ! -d "$CHAT_DEPLOY_DIR" ]; then
    echo "❌ 错误: 找不到 Chat 配置文件目录: $CHAT_DEPLOY_DIR"
    echo "请确保 config/chat 目录存在并包含配置文件"
    exit 1
fi

# 创建临时目录并复制配置文件
TEMP_DIR=$(mktemp -d)
echo "📁 临时目录: $TEMP_DIR"

echo "📋 复制 OpenIM 配置文件..."
cp -r "$OPENIM_DEPLOY_DIR"/* "$TEMP_DIR/"

echo "📋 复制 Chat 配置文件..."
cp -r "$CHAT_DEPLOY_DIR"/* "$TEMP_DIR/"

# 修改配置文件中的外部服务地址
echo "🔄 更新配置文件..."
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/REDIS_HOST/$REDIS_HOST/g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/REDIS_PORT/$REDIS_PORT/g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/MONGO_HOST/$MONGO_HOST/g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/MONGO_PORT/$MONGO_PORT/g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/MINIO_HOST/$MINIO_HOST/g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/MINIO_API_PORT/$MINIO_API_PORT/g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/KAFKA_HOST/$KAFKA_HOST/g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s/KAFKA_PORT/$KAFKA_PORT/g" {} \;

# 5. 部署 OpenIM Server 组件（按照官方文档顺序）
echo "🚀 部署 OpenIM Server 组件..."

# 5.1 部署配置
echo "📄 部署 openim-config.yml..."
kubectl apply -f "$TEMP_DIR/openim-config.yml"

# 5.2 按照官方文档顺序部署各个组件
echo "📄 部署 OpenIM API 相关组件..."
kubectl apply -f "$TEMP_DIR/openim-api-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-api-service.yml"
kubectl apply -f "$TEMP_DIR/openim-crontask-deployment.yml"

echo "📄 部署用户相关组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-user-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-user-service.yml"

echo "📄 部署消息网关组件..."
kubectl apply -f "$TEMP_DIR/openim-msggateway-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-msggateway-service.yml"

echo "📄 部署推送组件..."
kubectl apply -f "$TEMP_DIR/openim-push-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-push-service.yml"

echo "📄 部署消息传输组件..."
kubectl apply -f "$TEMP_DIR/openim-msgtransfer-service.yml"
kubectl apply -f "$TEMP_DIR/openim-msgtransfer-deployment.yml"

echo "📄 部署会话组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-conversation-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-conversation-service.yml"

echo "📄 部署认证组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-auth-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-auth-service.yml"

echo "📄 部署群组组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-group-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-group-service.yml"

echo "📄 部署好友组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-friend-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-friend-service.yml"

echo "📄 部署消息组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-msg-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-msg-service.yml"

echo "📄 部署第三方组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-third-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-third-service.yml"

# 更新所有部署文件中的镜像标签
echo "🔄 更新镜像标签..."
find "$TEMP_DIR" -name "*-deployment.yml" -type f -exec sed -i.bak "s|image: .*openim|image: $DOCKER_USER/openim|g" {} \;
find "$TEMP_DIR" -name "*-deployment.yml" -type f -exec sed -i.bak "s|:latest|:$TAG|g" {} \;
# 恢复 im-cms 的镜像标签为 latest
find "$TEMP_DIR" -name "*im-cms*.yml" -type f -exec sed -i.bak "s|mag1666888/im-cms:$TAG|mag1666888/im-cms:latest|g" {} \;

# 6. 部署 Chat 组件（按照官方文档顺序）
echo "💬 部署 Chat 组件..."

# 6.1 部署 Chat 相关 Secrets
echo "📄 部署 Chat 相关 Secrets..."
kubectl apply -f "$TEMP_DIR/redis-secret.yml"
kubectl apply -f "$TEMP_DIR/mongo-secret.yml"

# 6.2 更新 Chat 部署文件中的镜像标签
echo "🔄 更新 Chat 镜像标签..."
find "$TEMP_DIR" -name "*-deployment.yml" -type f -exec sed -i.bak "s|image: .*openim-chat|image: $DOCKER_USER/openim-chat|g" {} \;
find "$TEMP_DIR" -name "*-deployment.yml" -type f -exec sed -i.bak "s|:latest|:$TAG|g" {} \;
# 恢复 im-cms 的镜像标签为 latest
find "$TEMP_DIR" -name "*im-cms*.yml" -type f -exec sed -i.bak "s|mag1666888/im-cms:$TAG|mag1666888/im-cms:latest|g" {} \;

# 6.3 部署 Chat 配置和服务
echo "📄 部署 Chat 配置和服务..."
kubectl apply -f "$TEMP_DIR/chat-config.yml"
kubectl apply -f "$TEMP_DIR/openim-admin-api-service.yml"
kubectl apply -f "$TEMP_DIR/openim-chat-api-service.yml"
kubectl apply -f "$TEMP_DIR/openim-admin-rpc-service.yml"
kubectl apply -f "$TEMP_DIR/openim-chat-rpc-service.yml"

# 6.4 部署 Chat 部署文件
echo "📄 部署 Chat 部署文件..."
kubectl apply -f "$TEMP_DIR/openim-chat-api-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-admin-api-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-chat-rpc-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-admin-rpc-deployment.yml"

# 7. 部署前端和管理界面
echo "🖥️ 部署前端和管理界面..."

# 检查 im-cms 文件是否存在
if [ -f "$TEMP_DIR/im-cms-simple.yml" ]; then
    echo "📄 部署 im-cms-simple.yml..."
    kubectl apply -f "$TEMP_DIR/im-cms-simple.yml"
elif [ -f "$TEMP_DIR/im-cms-deployment.yml" ]; then
    echo "📄 部署 im-cms-deployment.yml..."
    kubectl apply -f "$TEMP_DIR/im-cms-deployment.yml"
    kubectl apply -f "$TEMP_DIR/im-cms-nginx-configmap.yml"
    kubectl apply -f "$TEMP_DIR/im-cms-loadbalancer.yml"
else
    echo "⚠️ 警告: 找不到 im-cms 部署文件，跳过前端部署"
fi

# 8. 部署公网访问
echo "🌐 部署公网访问..."

# 部署 Ingress 配置
if [ -f "$TEMP_DIR/ingress.yml" ]; then
    echo "📄 部署 ingress.yml..."
    kubectl apply -f "$TEMP_DIR/ingress.yml"
else
    echo "⚠️ 警告: 找不到 ingress.yml 文件，跳过 Ingress 部署"
fi

# 7. 等待部署完成
echo "⏳ 等待部署完成..."
kubectl wait --for=condition=available --timeout=300s deployment/openim-api -n "$NS" || true

# 8. 显示部署状态
echo "📊 部署状态:"
kubectl get pods -n "$NS"
kubectl get svc -n "$NS"
kubectl get ingress -n "$NS"

# 9. 清理临时文件
cd /
rm -rf "$TEMP_DIR"

echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo "访问地址:"
echo "  - OpenIM API: http://your-server-ip:10002"
echo "  - Message Gateway: http://your-server-ip:10001"
echo "=========================================="
