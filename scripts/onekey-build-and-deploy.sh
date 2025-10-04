#!/usr/bin/env bash
set -euo pipefail

# 一键构建并切换镜像（方案B：二开自有镜像）
# 可用环境变量：
#   DOCKER_USER   Docker Hub 用户名（默认: mag1666888）
#   TAG           镜像标签（默认: dev）
#   NAMESPACE     K8s 命名空间（默认: default）
#   OIS_DIR       open-im-server 仓目录（默认: /home/im/open-im-server）
#   CHAT_DIR      chat 仓目录（默认: /home/im/chat）

DOCKER_USER=${DOCKER_USER:-mag1666888}
TAG=${TAG:-dev}
NAMESPACE=${NAMESPACE:-default}
OIS_DIR=${OIS_DIR:-/home/im/open-im-server}
CHAT_DIR=${CHAT_DIR:-/home/im/chat}

echo "[INFO] DOCKER_USER=$DOCKER_USER TAG=$TAG NAMESPACE=$NAMESPACE"
echo "[INFO] OIS_DIR=$OIS_DIR CHAT_DIR=$CHAT_DIR"

require_dir() {
  if [[ ! -d "$1" ]]; then
    echo "[ERROR] 目录不存在: $1" >&2
    exit 1
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] 未找到命令: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd kubectl
require_dir "$OIS_DIR"
require_dir "$CHAT_DIR"

# 登录 Docker Hub（可选）
if [[ -n "${DOCKER_PASS:-}" ]]; then
  echo "[INFO] Docker 登录..."
  echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
fi

build_push_ois() {
  local IMG="$1"; local TARGET="$2"; local BIN="$3"
  echo "[BUILD] $IMG ← $TARGET ($BIN)"
  docker build --pull --no-cache \
    --build-arg TARGET="$TARGET" \
    --build-arg BIN_NAME="$BIN" \
    -t "$DOCKER_USER/$IMG:$TAG" -f "$OIS_DIR/Dockerfile" "$OIS_DIR"
  docker push "$DOCKER_USER/$IMG:$TAG"
}

build_push_chat() {
  local IMG="$1"; local TARGET="$2"; local BIN="$3"
  echo "[BUILD] CHAT $IMG ← $TARGET ($BIN)"
  docker build --pull --no-cache \
    --build-arg TARGET="$TARGET" \
    --build-arg BIN_NAME="$BIN" \
    -t "$DOCKER_USER/$IMG:$TAG" -f "$CHAT_DIR/Dockerfile" "$CHAT_DIR"
  docker push "$DOCKER_USER/$IMG:$TAG"
}

echo "[STEP] 应用/修复 RBAC (pods/services/endpoints 只读)"
kubectl create clusterrole service-reader \
  --verb=get,list,watch --resource=services,endpoints,pods \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl create clusterrolebinding default-service-reader-binding \
  --clusterrole=service-reader --serviceaccount=$NAMESPACE:default \
  --dry-run=client -o yaml | kubectl apply -f -

echo "[STEP] 构建并推送 open-im-server 组件镜像"
build_push_ois openim-api          ./cmd/openim-api                 openim-api
build_push_ois openim-msggateway   ./cmd/openim-msggateway          openim-msggateway
build_push_ois openim-msgtransfer  ./cmd/openim-msgtransfer         openim-msgtransfer
build_push_ois openim-push         ./cmd/openim-push                openim-push
build_push_ois openim-crontask     ./cmd/openim-crontask            openim-crontask

build_push_ois openim-rpc-auth         ./cmd/openim-rpc/openim-rpc-auth         openim-rpc-auth
build_push_ois openim-rpc-user         ./cmd/openim-rpc/openim-rpc-user         openim-rpc-user
build_push_ois openim-rpc-friend       ./cmd/openim-rpc/openim-rpc-friend       openim-rpc-friend
build_push_ois openim-rpc-group        ./cmd/openim-rpc/openim-rpc-group        openim-rpc-group
build_push_ois openim-rpc-conversation ./cmd/openim-rpc/openim-rpc-conversation openim-rpc-conversation
build_push_ois openim-rpc-third        ./cmd/openim-rpc/openim-rpc-third        openim-rpc-third
build_push_ois openim-rpc-msg          ./cmd/openim-rpc/openim-rpc-msg          openim-rpc-msg

echo "[STEP] 构建并推送 chat 组件镜像（chat-api）"
build_push_chat chat ./cmd/api/chat-api chat-api

echo "[STEP] 切换 K8s Deployment 镜像 (open-im-server)"
kubectl set image deploy/my-open-im-api                 my-open-im-api-container=$DOCKER_USER/openim-api:$TAG -n $NAMESPACE
kubectl set image deploy/messagegateway-rpc-server      my-open-im-msggateway-container=$DOCKER_USER/openim-msggateway:$TAG -n $NAMESPACE
kubectl set image deploy/my-open-im-msgtransfer-server  my-open-im-msgtransfer-server-container=$DOCKER_USER/openim-msgtransfer:$TAG -n $NAMESPACE
kubectl set image deploy/push-rpc-server                push-rpc-server-container=$DOCKER_USER/openim-push:$TAG -n $NAMESPACE
kubectl set image deploy/openim-crontask                crontask-container=$DOCKER_USER/openim-crontask:$TAG -n $NAMESPACE || true

kubectl set image deploy/auth-rpc-server         auth-rpc-server-container=$DOCKER_USER/openim-rpc-auth:$TAG -n $NAMESPACE
kubectl set image deploy/user-rpc-server         user-rpc-server-container=$DOCKER_USER/openim-rpc-user:$TAG -n $NAMESPACE
kubectl set image deploy/friend-rpc-server       friend-rpc-server-container=$DOCKER_USER/openim-rpc-friend:$TAG -n $NAMESPACE
kubectl set image deploy/group-rpc-server        group-rpc-server-container=$DOCKER_USER/openim-rpc-group:$TAG -n $NAMESPACE
kubectl set image deploy/conversation-rpc-server conversation-rpc-server-container=$DOCKER_USER/openim-rpc-conversation:$TAG -n $NAMESPACE
kubectl set image deploy/third-rpc-server        third-rpc-server-container=$DOCKER_USER/openim-rpc-third:$TAG -n $NAMESPACE
kubectl set image deploy/msg-rpc-server          msg-rpc-server-container=$DOCKER_USER/openim-rpc-msg:$TAG -n $NAMESPACE

echo "[STEP] 切换 K8s Deployment 镜像 (chat)"
kubectl set image deploy/my-chat-api-server my-chat-api-container=$DOCKER_USER/chat:$TAG -n $NAMESPACE || true

echo "[STEP] 等待关键组件滚动完成"
kubectl rollout status deploy/my-open-im-api -n $NAMESPACE || true
kubectl rollout status deploy/user-rpc-server -n $NAMESPACE || true
kubectl rollout status deploy/my-chat-api-server -n $NAMESPACE || true

echo "[DONE] 列出关键 Pods/Service"
kubectl get pods -o wide -n $NAMESPACE | egrep "open-im|my-open-im|chat|rpc|gateway|transfer|push" || true
kubectl get svc -n $NAMESPACE | egrep "openim|messagegateway|my-chat|rpc|push|transfer" || true

echo "[HINT] 如需仅重置镜像标签，可直接修改 TAG 环境变量后重复执行本脚本。"

