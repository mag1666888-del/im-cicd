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
CONFIG_DIR="$SCRIPT_DIR/../config"

# 使用 config 目录中的配置文件
OPENIM_DEPLOY_DIR="$CONFIG_DIR/open-im-server"
CHAT_DEPLOY_DIR="$CONFIG_DIR/chat"

echo "📁 使用配置文件目录:"
echo "  OpenIM: $OPENIM_DEPLOY_DIR"
echo "  Chat: $CHAT_DEPLOY_DIR"

echo "=========================================="
echo "OpenIM 一键安装脚本 (官方部署方式)"
echo "=========================================="
echo "命名空间: $NS"
echo "Docker用户: $DOCKER_USER"
echo "镜像标签: $TAG"
echo "OpenIM部署目录: $OPENIM_DEPLOY_DIR"
echo "Chat部署目录: $CHAT_DEPLOY_DIR"
echo "=========================================="

# 先执行清理脚本
echo "🧹 执行预清理..."
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

# 2. 部署基础设施 Secrets（使用官方命名）
echo "🔑 创建基础设施 Secrets..."

# Redis Secret（官方命名：openim-redis-secret）
kubectl create secret generic openim-redis-secret -n "$NS" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# MongoDB Secret（官方命名：openim-mongo-secret）
kubectl create secret generic openim-mongo-secret -n "$NS" \
  --from-literal=mongo_openim_username="$MONGO_USERNAME" \
  --from-literal=mongo_openim_password="$MONGO_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# MinIO Secret（官方命名：openim-minio-secret）
kubectl create secret generic openim-minio-secret -n "$NS" \
  --from-literal=minio-root-user="$MINIO_ACCESS_KEY" \
  --from-literal=minio-root-password="$MINIO_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

# Kafka Secret（官方命名：openim-kafka-secret）
kubectl create secret generic openim-kafka-secret -n "$NS" \
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
echo "📁 临时目录: $TEMP_DIR"

# 复制文件
echo "📋 复制 OpenIM 部署文件..."
cp -r "$OPENIM_DEPLOY_DIR"/* "$TEMP_DIR/"

echo "📋 复制 Chat 部署文件..."
cp -r "$CHAT_DEPLOY_DIR"/* "$TEMP_DIR/"

# 验证关键文件是否存在
if [ ! -f "$TEMP_DIR/im-cms-simple.yml" ]; then
    echo "❌ 错误: im-cms-simple.yml 文件不存在"
    echo "📁 临时目录内容:"
    ls -la "$TEMP_DIR"
    echo "📁 OpenIM 部署目录内容:"
    ls -la "$OPENIM_DEPLOY_DIR"
    exit 1
fi

echo "✅ 文件复制完成，开始更新配置..."

# 更新镜像标签
echo "🔄 更新镜像标签..."
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|image: .*openim|image: $DOCKER_USER/openim|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|image: .*openim-chat|image: $DOCKER_USER/openim-chat|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|:latest|:$TAG|g" {} \;
# 恢复 im-cms 的镜像标签为 latest
find "$TEMP_DIR" -name "*im-cms*.yml" -type f -exec sed -i.bak "s|mag1666888/im-cms:$TAG|mag1666888/im-cms:latest|g" {} \;

# 更新外部服务地址
echo "🔄 更新外部服务地址..."
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|REDIS_HOST|$REDIS_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|REDIS_PORT|$REDIS_PORT|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MONGO_HOST|$MONGO_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MONGO_PORT|$MONGO_PORT|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MINIO_HOST|$MINIO_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|MINIO_API_PORT|$MINIO_API_PORT|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|KAFKA_HOST|$KAFKA_HOST|g" {} \;
find "$TEMP_DIR" -name "*.yml" -type f -exec sed -i.bak "s|KAFKA_PORT|$KAFKA_PORT|g" {} \;

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

echo "📄 部署 RPC 服务..."
# 先部署所有 RPC 服务
kubectl apply -f "$TEMP_DIR/openim-rpc-msg-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-msg-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-friend-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-friend-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-group-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-group-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-conversation-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-conversation-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-third-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-third-service.yml"
kubectl apply -f "$TEMP_DIR/openim-push-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-push-service.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-auth-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-auth-service.yml"

# 等待其他 RPC 服务启动
echo "⏳ 等待其他 RPC 服务启动..."
sleep 15

# 最后部署 user-rpc（依赖其他 RPC 服务）
echo "📄 部署用户相关组件..."
kubectl apply -f "$TEMP_DIR/openim-rpc-user-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-rpc-user-service.yml"

echo "📄 部署消息网关组件..."
kubectl apply -f "$TEMP_DIR/openim-msggateway-deployment.yml"
kubectl apply -f "$TEMP_DIR/openim-msggateway-service.yml"

echo "📄 部署推送组件..."
# push 服务已在 RPC 服务部分部署，跳过重复部署

echo "📄 部署消息传输组件..."
kubectl apply -f "$TEMP_DIR/openim-msgtransfer-service.yml"
kubectl apply -f "$TEMP_DIR/openim-msgtransfer-deployment.yml"

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
    echo "📁 可用的 im-cms 文件:"
    ls -la "$TEMP_DIR" | grep im-cms || echo "无 im-cms 相关文件"
fi

# 8. 部署公网访问
echo "🌐 部署公网访问..."

# 部署 Ingress
kubectl apply -f "$TEMP_DIR/ingress.yml"

# 9. 等待部署完成
echo "⏳ 等待部署完成..."
kubectl wait --for=condition=available --timeout=300s deployment/openim-api -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/chat-api-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/admin-api-server -n "$NS" || true

# 等待 RPC 服务启动
echo "⏳ 等待 RPC 服务启动..."
kubectl wait --for=condition=available --timeout=300s deployment/user-rpc-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/msg-rpc-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/friend-rpc-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/group-rpc-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/conversation-rpc-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/third-rpc-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/push-rpc-server -n "$NS" || true
kubectl wait --for=condition=available --timeout=300s deployment/auth-rpc-server -n "$NS" || true

# 10. 显示部署状态
echo "📊 部署状态:"
kubectl get pods -n "$NS"
kubectl get svc -n "$NS"
kubectl get ingress -n "$NS"

# 11. 验证服务健康状态
echo "🔍 验证服务健康状态..."
echo "检查 RPC 服务日志..."
kubectl logs -l app=user-rpc-server --tail=10 | grep -E "(service not found|ERROR|WARN)" || echo "✅ user-rpc 服务正常"
kubectl logs -l app=admin-api-server --tail=10 | grep -E "(ERROR|WARN)" || echo "✅ admin-api 服务正常"
kubectl logs -l app=chat-api-server --tail=10 | grep -E "(ERROR|WARN)" || echo "✅ chat-api 服务正常"

# 12. 获取真实访问地址
echo "🌐 获取真实访问地址..."

# 获取 LoadBalancer 外部 IP
IM_CMS_IP=$(kubectl get svc im-cms-loadbalancer -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
OPENIM_API_IP=$(kubectl get svc openim-api-public -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
CHAT_API_IP=$(kubectl get svc chat-api-public -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
ADMIN_API_IP=$(kubectl get svc admin-api-public -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
MESSAGEGATEWAY_IP=$(kubectl get svc messagegateway-public -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

# 如果 LoadBalancer IP 为空，尝试获取 NodePort
if [ -z "$IM_CMS_IP" ]; then
    IM_CMS_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "your-server-ip")
fi

if [ -z "$OPENIM_API_IP" ]; then
    OPENIM_API_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "your-server-ip")
fi

if [ -z "$CHAT_API_IP" ]; then
    CHAT_API_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "your-server-ip")
fi

if [ -z "$ADMIN_API_IP" ]; then
    ADMIN_API_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "your-server-ip")
fi

if [ -z "$MESSAGEGATEWAY_IP" ]; then
    MESSAGEGATEWAY_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "your-server-ip")
fi

# 13. 清理临时文件
rm -rf "$TEMP_DIR"

echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo "🌐 真实访问地址:"
echo "  - im-cms 前端: http://$IM_CMS_IP"
echo "  - OpenIM API: http://$OPENIM_API_IP:10002"
echo "  - Chat API: http://$CHAT_API_IP:10008"
echo "  - Admin API: http://$ADMIN_API_IP:10009"
echo "  - MessageGateway WebSocket: ws://$MESSAGEGATEWAY_IP:10001"
echo "=========================================="
echo "📋 服务状态检查:"
echo "  - 检查 Pod 状态: kubectl get pods"
echo "  - 检查服务状态: kubectl get svc"
echo "  - 检查日志: kubectl logs -l app=user-rpc-server"
echo "=========================================="
