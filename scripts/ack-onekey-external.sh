#!/usr/bin/env bash
set -euo pipefail

# 一键安装（ACK全新集群）- 外部Redis/Mongo/MinIO/Kafka，服务发现用Kubernetes（ACK自带）
# 使用前可调整以下变量，或以环境变量覆盖。

NS=${NS:-default}

# 外部基础设施地址与凭据（按你提供的）
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
MINIO_API_PORT=${MINIO_API_PORT:-9000}   # S3 API 端口
MINIO_CONSOLE_PORT=${MINIO_CONSOLE_PORT:-9001}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minio_pC5wMB}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-rI57PJsJhnz_qlRkfnTa0RPT}

KAFKA_HOST=${KAFKA_HOST:-47.237.103.4}
KAFKA_PORT=${KAFKA_PORT:-9092}
KAFKA_USERNAME=${KAFKA_USERNAME:-myopenim}
KAFKA_PASSWORD=${KAFKA_PASSWORD:-rI57PJsJhnz_qlRkfnTa0RPT}

# 镜像仓库配置（你二开的镜像）
DOCKER_USER=${DOCKER_USER:-mag1666888}
TAG=${TAG:-dev}

echo "[INFO] namespace=$NS"

kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

echo "[STEP] RBAC: 允许 default SA 读取 services/endpoints/pods"
kubectl create clusterrole service-reader \
  --verb=get,list,watch --resource=services,endpoints,pods \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl create clusterrolebinding default-service-reader-binding \
  --clusterrole=service-reader --serviceaccount=$NS:default \
  --dry-run=client -o yaml | kubectl apply -f -

echo "[STEP] 创建 Secrets（使用官方命名规则）"
kubectl create secret generic openim-redis-secret -n "$NS" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic openim-mongo-secret -n "$NS" \
  --from-literal=mongo_openim_username="$MONGO_USERNAME" \
  --from-literal=mongo_openim_password="$MONGO_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic openim-minio-secret -n "$NS" \
  --from-literal=minio-root-user="$MINIO_ACCESS_KEY" \
  --from-literal=minio-root-password="$MINIO_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic openim-kafka-secret -n "$NS" \
  --from-literal=kafka-password="$KAFKA_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# Chat 侧使用的 secret 名称（兼容你已有清单）
kubectl create secret generic redis-secret -n "$NS" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic openim-mongo-secret -n "$NS" \
  --from-literal=mongo_openim_username="$MONGO_USERNAME" \
  --from-literal=mongo_openim_password="$MONGO_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "[STEP] 生成 ConfigMap: my-open-im-config（K8s服务发现 + 外部基础设施地址）"
kubectl apply -n "$NS" -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-open-im-config
data:
  discovery.yml: |
    enable: "kubernetes"
    kubernetes:
      namespace: $NS
    etcd:
      rootDirectory: openim
      address: [ "" ]
      username: ''
      password: ''
    rpcService:
      user: user-rpc-service
      friend: friend-rpc-service
      msg: msg-rpc-service
      push: push-rpc-service
      messageGateway: messagegateway-rpc-service
      group: group-rpc-service
      auth: auth-rpc-service
      conversation: conversation-rpc-service
      third: third-rpc-service

  mongodb.yml: |
    uri: ''
    address: [ $MONGO_HOST:$MONGO_PORT ]
    database: $MONGO_DATABASE
    username: "$MONGO_USERNAME"
    password: "$MONGO_PASSWORD"
    authSource: $MONGO_AUTHSOURCE
    maxPoolSize: 100
    maxRetry: 10

  redis.yml: |
    address: [ "$REDIS_HOST:$REDIS_PORT" ]
    username:
    password: "$REDIS_PASSWORD"
    clusterMode: false
    db: 0
    maxRetry: 10
    poolSize: 100

  kafka.yml: |
    username: "$KAFKA_USERNAME"
    password: "$KAFKA_PASSWORD"
    address: [ "$KAFKA_HOST:$KAFKA_PORT" ]
    toRedisTopic: toRedis
    toMongoTopic: toMongo
    toPushTopic: toPush
    toOfflinePushTopic: toOfflinePush
    toRedisGroupID: redis
    toMongoGroupID: mongo
    toPushGroupID: push
    toOfflinePushGroupID: offlinePush

  minio.yml: |
    bucket: openim
    accessKeyID: $MINIO_ACCESS_KEY
    secretAccessKey: $MINIO_SECRET_KEY
    sessionToken:
    internalAddress: $MINIO_HOST:$MINIO_API_PORT
    externalAddress: http://$MINIO_HOST:$MINIO_API_PORT
    publicRead: "false"

  share.yml: |
    openIM:
      apiURL: http://my-open-im-api-service:10002
      secret: openIM123
      adminUserID: imAdmin
      tokenRefreshInterval: 120

  openim-api.yml: |
    api:
      listenIP: 0.0.0.0
      ports: [ 10002 ]
      compressionLevel: 0
    prometheus:
      enable: true
      ports: [ 12002 ]

  openim-rpc-auth.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10200 ]
    prometheus:
      enable: true
      ports: [ 12200 ]

  openim-rpc-user.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10320 ]
    prometheus:
      enable: true
      ports: [ 12320 ]

  openim-rpc-friend.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10240 ]
    prometheus:
      enable: true
      ports: [ 12240 ]

  openim-rpc-group.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10260 ]
    prometheus:
      enable: true
      ports: [ 12260 ]

  openim-rpc-msg.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10280 ]
    prometheus:
      enable: true
      ports: [ 12280 ]

  openim-rpc-conversation.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10220 ]
    prometheus:
      enable: true
      ports: [ 12220 ]

  openim-rpc-third.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10300 ]
    prometheus:
      enable: true
      ports: [ 12300 ]

  openim-msggateway.yml: |
    listenIP: 0.0.0.0
    longConnSvr:
      ports: [ 10001 ]
      websocketMaxConnNum: 100000
      websocketMaxMsgLen: 4096
      websocketTimeout: 10
    rpc:
      autoSetPorts: false
      ports: [ 10140 ]
    prometheus:
      enable: true
      ports: [ 12140 ]

  openim-msgtransfer.yml: |
    prometheus:
      enable: true
      ports: [ 12020 ]

  openim-push.yml: |
    rpc:
      listenIP: 0.0.0.0
      autoSetPorts: false
      ports: [ 10170 ]
    prometheus:
      enable: true
      ports: [ 12170 ]
  
  notification.yml: |
    groupCreated:
      isSendMsg: true
    reliabilityLevel: 1
    isSendMsg: true
    isOfflinePush: true
    isOnlinePush: true
    isHistory: true
    isUnreadCount: true
    offlinePush:
      title: "you have a new message"
      desc: "desc"
      ex: "ex"
      iOSPushSound: "default"
      iOSBadgeCount: true
    onlinePush:
      title: "title"
      desc: "desc"
      ex: "ex"
      iOSPushSound: "default"
      iOSBadgeCount: true

  webhooks.yml: |
    url: ""
    beforeSendSingleMsg:
      enable: false
    beforeSendGroupMsg:
      enable: false
EOF

echo "[STEP] 应用 OpenIM Server 与 Chat 的 Service/Deployment（使用仓库自带清单）"
# 以脚本所在位置为基准定位仓库根目录（…/build-scripts/scripts → 仓库根）
BASE=${BASE:-$(cd "$(dirname "$0")/../.." && pwd)}
# 服务器默认目录（可通过环境变量覆盖）
OIS_MANIFEST_DIR=${OIS_MANIFEST_DIR:-"/home/im/open-im-server/deployments/deploy"}
CHAT_MANIFEST_DIR=${CHAT_MANIFEST_DIR:-"/home/im/chat/deployments/deploy"}
# 若上述目录不存在，则回退到仓库内相对路径
if [ ! -d "$OIS_MANIFEST_DIR" ]; then OIS_MANIFEST_DIR="$BASE/open-im-server/deployments/deploy"; fi
if [ ! -d "$CHAT_MANIFEST_DIR" ]; then CHAT_MANIFEST_DIR="$BASE/chat/deployments/deploy"; fi

kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-api-service.yml"
kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-api-deployment.yml"
kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-msggateway-service.yml"
kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-msggateway-deployment.yml"
kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-msgtransfer-service.yml"
kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-msgtransfer-deployment.yml"
kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-push-service.yml"
kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-push-deployment.yml"

for n in auth user friend group conversation third msg; do
  kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-rpc-$n-service.yml"
  kubectl apply -n "$NS" -f "$OIS_MANIFEST_DIR/openim-rpc-$n-deployment.yml"
done

kubectl apply -n "$NS" -f "$CHAT_MANIFEST_DIR/openim-chat-api-service.yml"
kubectl apply -n "$NS" -f "$CHAT_MANIFEST_DIR/openim-chat-api-deployment.yml"

echo "[STEP] 将 Chat 的 ConfigMap 绑定到统一的 my-open-im-config（若其清单使用了 openim-my-chat-config）"
kubectl patch deploy my-chat-api-server -n "$NS" -p '{"spec":{"template":{"spec":{"volumes":[{"name":"openim-my-chat-config","configMap":{"name":"my-open-im-config"}}]}}}}' || true

echo "[STEP] 统一镜像：自动获取容器名并切换为你二开的镜像标签"
upd(){ dep="$1"; img="$2"; name=$(kubectl get deploy "$dep" -n "$NS" -o jsonpath='{.spec.template.spec.containers[0].name}'); echo "[SET] $dep ($name) -> $img"; kubectl set image deploy/"$dep" "$name=$img" -n "$NS"; }
upd my-open-im-api                $DOCKER_USER/openim-api:$TAG
upd messagegateway-rpc-server     $DOCKER_USER/openim-msggateway:$TAG
upd my-open-im-msgtransfer-server $DOCKER_USER/openim-msgtransfer:$TAG
upd push-rpc-server               $DOCKER_USER/openim-push:$TAG
upd auth-rpc-server               $DOCKER_USER/openim-rpc-auth:$TAG
upd user-rpc-server               $DOCKER_USER/openim-rpc-user:$TAG
upd friend-rpc-server             $DOCKER_USER/openim-rpc-friend:$TAG
upd group-rpc-server              $DOCKER_USER/openim-rpc-group:$TAG
upd conversation-rpc-server       $DOCKER_USER/openim-rpc-conversation:$TAG
upd third-rpc-server              $DOCKER_USER/openim-rpc-third:$TAG
upd msg-rpc-server                $DOCKER_USER/openim-rpc-msg:$TAG
upd my-chat-api-server            $DOCKER_USER/chat:$TAG

echo "[STEP] 等待关键组件滚动完成"
kubectl rollout status deploy/my-open-im-api -n "$NS" || true
kubectl rollout status deploy/my-chat-api-server -n "$NS" || true

echo "[DONE] 列出关键 Pods/Service"
kubectl get pods -o wide -n "$NS" | egrep "open-im|my-open-im|chat|rpc|gateway|transfer|push" || true
kubectl get svc -n "$NS" | egrep "openim|messagegateway|my-open-im|chat|rpc|push|transfer" || true

echo "[HINT] 如需变更镜像仓库/标签或外部地址，修改脚本顶部变量后重跑即可。"

