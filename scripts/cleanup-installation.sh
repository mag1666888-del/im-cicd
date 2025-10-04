#!/usr/bin/env bash
set -euo pipefail

# OpenIM 安装清理脚本
# 清理已经安装的 OpenIM 组件

# 配置参数
NS=${NS:-default}
FORCE=${FORCE:-false}

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENIM_DEPLOY_DIR="$PROJECT_ROOT/open-im-server/deployments/deploy"
CHAT_DEPLOY_DIR="$PROJECT_ROOT/chat/deployments/deploy"

echo "=========================================="
echo "OpenIM 安装清理脚本"
echo "=========================================="
echo "命名空间: $NS"
echo "强制清理: $FORCE"
echo "项目根目录: $PROJECT_ROOT"
echo "=========================================="

# 确认清理操作
if [ "$FORCE" != "true" ]; then
    echo "⚠️  警告: 此操作将删除命名空间 '$NS' 中的所有 OpenIM 相关资源！"
    echo "包括:"
    echo "  - 所有 Deployments"
    echo "  - 所有 Services"
    echo "  - 所有 ConfigMaps"
    echo "  - 所有 Secrets"
    echo "  - 所有 Ingress"
    echo "  - 所有 RBAC 资源"
    echo ""
    read -p "确认继续清理吗？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消清理操作"
        exit 0
    fi
fi

# 检查命名空间是否存在
if ! kubectl get ns "$NS" >/dev/null 2>&1; then
    echo "ℹ️  命名空间 '$NS' 不存在，无需清理"
    exit 0
fi

echo "🧹 开始清理 OpenIM 安装..."

# 1. 清理 Ingress
echo "🌐 清理 Ingress..."
kubectl delete ingress --all -n "$NS" --ignore-not-found=true || true

# 2. 清理 Services
echo "🔌 清理 Services..."
kubectl delete svc --all -n "$NS" --ignore-not-found=true || true

# 3. 清理 Deployments
echo "🚀 清理 Deployments..."
kubectl delete deployment --all -n "$NS" --ignore-not-found=true || true

# 4. 清理 StatefulSets
echo "📦 清理 StatefulSets..."
kubectl delete statefulset --all -n "$NS" --ignore-not-found=true || true

# 5. 清理 ConfigMaps
echo "⚙️ 清理 ConfigMaps..."
kubectl delete configmap --all -n "$NS" --ignore-not-found=true || true

# 6. 清理 Secrets（使用官方命名）
echo "🔑 清理 Secrets..."
kubectl delete secret openim-redis-secret -n "$NS" --ignore-not-found=true || true
kubectl delete secret openim-mongo-secret -n "$NS" --ignore-not-found=true || true
kubectl delete secret openim-minio-secret -n "$NS" --ignore-not-found=true || true
kubectl delete secret openim-kafka-secret -n "$NS" --ignore-not-found=true || true
kubectl delete secret --all -n "$NS" --ignore-not-found=true || true

# 7. 清理 Pods (确保所有 Pod 都被清理)
echo "🔄 清理剩余 Pods..."
kubectl delete pods --all -n "$NS" --ignore-not-found=true || true

# 8. 等待 Pods 完全终止
echo "⏳ 等待 Pods 完全终止..."
kubectl wait --for=delete pods --all -n "$NS" --timeout=60s || true

# 9. 清理 RBAC 资源
echo "🔐 清理 RBAC 资源..."

# 清理 ClusterRoleBinding
kubectl delete clusterrolebinding default-service-reader-binding --ignore-not-found=true || true

# 清理 ClusterRole
kubectl delete clusterrole service-reader --ignore-not-found=true || true

# 10. 清理命名空间（可选）
if [ "$FORCE" = "true" ]; then
    echo "🗑️ 删除命名空间 '$NS'..."
    kubectl delete ns "$NS" --ignore-not-found=true || true
    echo "✅ 命名空间 '$NS' 已删除"
else
    echo "ℹ️  保留命名空间 '$NS'，如需删除请使用: kubectl delete ns $NS"
fi

# 11. 显示清理结果
echo "📊 清理结果:"
echo "命名空间 '$NS' 中的资源:"
kubectl get all -n "$NS" 2>/dev/null || echo "命名空间为空或不存在"

echo "=========================================="
echo "✅ 清理完成！"
echo "=========================================="
echo "已清理的资源:"
echo "  ✅ Ingress"
echo "  ✅ Services"
echo "  ✅ Deployments"
echo "  ✅ StatefulSets"
echo "  ✅ ConfigMaps"
echo "  ✅ Secrets"
echo "  ✅ Pods"
echo "  ✅ RBAC 资源"
echo ""
echo "如需完全清理，请运行:"
echo "  kubectl delete ns $NS"
echo "=========================================="
