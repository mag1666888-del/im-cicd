#!/bin/bash

# 构建单个项目脚本
# 使用方法: ./build-single.sh <project-name> [tag] [options]

set -e

# 加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 生成ACK部署配置函数
generate_ack_deployment() {
    local project_name=$1
    local tag=$2
    
    local ack_deployment_file="projects/$project_name/ack-deployment.yaml"
    create_dir "projects/$project_name"
    
    # 获取项目配置
    local dockerhub_repo=$(get_project_config "$project_name" "dockerhub_repo")
    local ack_namespace=$(get_project_config "$project_name" "ack_namespace")
    local ack_deployment=$(get_project_config "$project_name" "ack_deployment")
    local backend_server=$(get_project_config "$project_name" "backend_server")
    local container_port=$(get_project_config "$project_name" "ports.container")
    local host_port=$(get_project_config "$project_name" "ports.host")
    
    # 获取资源限制
    local memory_request=$(get_project_config "$project_name" "resources.requests.memory")
    local cpu_request=$(get_project_config "$project_name" "resources.requests.cpu")
    local memory_limit=$(get_project_config "$project_name" "resources.limits.memory")
    local cpu_limit=$(get_project_config "$project_name" "resources.limits.cpu")
    
    # 根据项目类型生成探针配置
    local LIVENESS_PROBE
    local READINESS_PROBE
    if [ "$project_name" = "im-cms" ]; then
      LIVENESS_PROBE="livenessProbe:
          httpGet:
            path: /
            port: $container_port
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3"
      READINESS_PROBE="readinessProbe:
          httpGet:
            path: /
            port: $container_port
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3"
    else
      LIVENESS_PROBE="livenessProbe:
          tcpSocket:
            port: $container_port
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3"
      READINESS_PROBE="readinessProbe:
          tcpSocket:
            port: $container_port
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3"
    fi

    # 为open-im-server和chat创建ConfigMap
    if [[ "$project_name" == "open-im-server" || "$project_name" == "chat" ]]; then
        cat > "$ack_deployment_file" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-open-im-config
  namespace: $ack_namespace
data:
  discovery.yml: |
    enable: "kubernetes"
    kubernetes:
      namespace: $ack_namespace
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

  log.yml: |
    storageLocation: ./logs/
    rotationTime: 24
    remainRotationCount: 2
    remainLogLevel: 6
    isStdout: true
    isJson: false
    isSimplify: true

  mongodb.yml: |
    uri: ''
    address: [ mongodb.openim-infrastructure.svc.cluster.local:27017 ]
    database: openim_v3
    username: 'openIM'
    password: 'openIM123'
    authSource: openim_v3
    maxPoolSize: 100
    maxRetry: 10

  redis.yml: |
    address: [ redis.openim-infrastructure.svc.cluster.local:6379 ]
    password: 'openIM123'
    db: 0
    poolSize: 30
    minIdleConns: 10

  local-cache.yml: |
    user:
      topic: DELETE_CACHE_USER
      slotNum: 100
      slotSize: 2000
      successExpire: 300
      failedExpire: 5
    group:
      topic: DELETE_CACHE_GROUP
      slotNum: 100
      slotSize: 2000
      successExpire: 300
      failedExpire: 5
    friend:
      topic: DELETE_CACHE_FRIEND
      slotNum: 100
      slotSize: 2000
      successExpire: 300
      failedExpire: 5
    conversation:
      topic: DELETE_CACHE_CONVERSATION
      slotNum: 100
      slotSize: 2000
      successExpire: 300
      failedExpire: 5

  kafka.yml: |
    username: ''
    password: ''
    latestMsgToRedis:
      topic: 'latestMsgToRedis'
    offlineMsgToMongo:
      topic: 'offlineMsgToMongo'
    msgToPush:
      topic: 'msgToPush'
    msgToModify:
      topic: 'msgToModify'
    consumerGroupID:
      latestMsgToRedis: 'latestMsgToRedis'
      offlineMsgToMongo: 'offlineMsgToMongo'
      msgToPush: 'msgToPush'
      msgToModify: 'msgToModify'
    addr: [ kafka.openim-infrastructure.svc.cluster.local:9094 ]

  minio.yml: |
    endpoint: 'minio.openim-infrastructure.svc.cluster.local:9000'
    accessKeyID: 'root'
    secretAccessKey: 'openIM123'
    useSSL: false
    signEndpoint: 'minio.openim-infrastructure.svc.cluster.local:9000'
    bucket: 'openim'

  share.yml: |
    openIM:
      apiURL: http://open-im-server-service.default.svc.cluster.local:10001
      secret: openIM123
      adminUserID: imAdmin
      tokenRefreshInterval: 120
    chatAdmin:
      - "chatAdmin"

  chat-api-chat.yml: |
    api:
      listenIP: 0.0.0.0
      ports: [ 8080 ]

  openim-api.yml: |
    api:
      listenIP: 0.0.0.0
      ports: [ 10001 ]
      compressionLevel: 0
    prometheus:
      enable: true
      autoSetPorts: true
      ports:
      grafanaURL:

  openim-rpc-auth.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:
    tokenPolicy:
      expire: 90

  openim-rpc-user.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-rpc-friend.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-rpc-group.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-rpc-msg.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-rpc-conversation.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-rpc-third.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-msggateway.yml: |
    longConnSvr:
      listenIP: 0.0.0.0
      wsPort: [ 10001 ]
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-msgtransfer.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-push.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

  openim-crontask.yml: |
    rpc:
      registerIP: 
      listenIP: 0.0.0.0
      autoSetPorts: true
      ports:
    prometheus:
      enable: true
      ports:

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $ack_deployment
  namespace: $ack_namespace
  labels:
    app: $ack_deployment
    version: $tag
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $ack_deployment
  template:
    metadata:
      labels:
        app: $ack_deployment
        version: $tag
    spec:
      containers:
      - name: $ack_deployment
        image: $dockerhub_repo:$tag
        ports:
        - containerPort: $container_port
        env:
        - name: BACKEND_SERVER
          value: "$backend_server"
        - name: NODE_ENV
          value: "production"
        - name: VERSION
          value: "$tag"
        - name: CONFIG_PATH
          value: "/config"
        volumeMounts:
        - name: config-volume
          mountPath: "/config"
          readOnly: true
        resources:
          requests:
            memory: "$memory_request"
            cpu: "$cpu_request"
          limits:
            memory: "$memory_limit"
            cpu: "$cpu_limit"
        $LIVENESS_PROBE
        $READINESS_PROBE
        imagePullPolicy: Always
      volumes:
      - name: config-volume
        configMap:
          name: my-open-im-config
EOF
    else
        # 其他项目使用原来的配置
        cat > "$ack_deployment_file" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $ack_deployment
  namespace: $ack_namespace
  labels:
    app: $ack_deployment
    version: $tag
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $ack_deployment
  template:
    metadata:
      labels:
        app: $ack_deployment
        version: $tag
    spec:
      containers:
      - name: $ack_deployment
        image: $dockerhub_repo:$tag
        ports:
        - containerPort: $container_port
        env:
        - name: BACKEND_SERVER
          value: "$backend_server"
        - name: NODE_ENV
          value: "production"
        - name: VERSION
          value: "$tag"
        - name: CONFIG_PATH
          value: "/app/config"
        resources:
          requests:
            memory: "$memory_request"
            cpu: "$cpu_request"
          limits:
            memory: "$memory_limit"
            cpu: "$cpu_limit"
        $LIVENESS_PROBE
        $READINESS_PROBE
        imagePullPolicy: Always
EOF
    fi

    # 继续添加Service和Ingress配置
    cat >> "$ack_deployment_file" << EOF
---
apiVersion: v1
kind: Service
metadata:
  name: $ack_deployment-service
  namespace: $ack_namespace
  labels:
    app: $ack_deployment
spec:
  selector:
    app: $ack_deployment
  ports:
  - protocol: TCP
    port: $host_port
    targetPort: $container_port
  type: LoadBalancer
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $ack_deployment-ingress
  namespace: $ack_namespace
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: $ack_deployment-service
            port:
              number: $host_port
EOF

    print_success "ACK部署配置已生成: $ack_deployment_file"
    print_info "使用方法: kubectl apply -f $ack_deployment_file"
}

# 项目名称
PROJECT_NAME=$1
TAG=${2:-$(date +%Y%m%d-%H%M%S)}
CLEAN_BUILD=${3:-false}

# 检查参数
if [ -z "$PROJECT_NAME" ]; then
    print_error "请指定项目名称"
    echo "使用方法: $0 <project-name> [tag] [clean-build]"
    echo "示例: $0 openim-cms v1.0.0 true"
    exit 1
fi

# 加载环境变量
load_env

# 验证项目配置
if ! validate_project_config "$PROJECT_NAME"; then
    exit 1
fi

# 获取项目配置
PROJECT_NAME_FULL=$(get_project_config "$PROJECT_NAME" "name")
GIT_URL=$(get_project_config "$PROJECT_NAME" "git_url")
GIT_BRANCH=$(get_project_config "$PROJECT_NAME" "git_branch")
DOCKERFILE_PATH=$(get_project_config "$PROJECT_NAME" "dockerfile_path")
BUILD_CONTEXT=$(get_project_config "$PROJECT_NAME" "build_context")
DOCKERHUB_REPO=$(get_project_config "$PROJECT_NAME" "dockerhub_repo")
BACKEND_SERVER=$(get_project_config "$PROJECT_NAME" "backend_server")

print_info "开始构建项目: $PROJECT_NAME_FULL"
print_info "项目: $PROJECT_NAME"
print_info "标签: $TAG"
print_info "Git地址: $GIT_URL"
print_info "分支: $GIT_BRANCH"
print_info "Docker Hub: $DOCKERHUB_REPO"

# 创建日志目录
LOG_DIR="./logs"
create_dir "$LOG_DIR"
LOG_FILE="$LOG_DIR/build-$PROJECT_NAME-$(date +%Y%m%d-%H%M%S).log"

# 记录开始时间
START_TIME=$(date +%s)
log_to_file "$LOG_FILE" "开始构建项目: $PROJECT_NAME"

# 检查必需的命令
print_info "检查环境..."
check_command docker || exit 1
check_command git || exit 1
check_command jq || exit 1

# 登录Docker Hub
if ! login_dockerhub; then
    exit 1
fi

# 创建临时目录
TEMP_DIR="./temp/$PROJECT_NAME-$(date +%Y%m%d-%H%M%S)"
create_dir "$TEMP_DIR"
cd "$TEMP_DIR"

print_info "克隆代码仓库..."
if [ "$CLEAN_BUILD" = "true" ]; then
    # 清理构建
    rm -rf "$PROJECT_NAME"
fi

if [ -d "$PROJECT_NAME" ]; then
    print_info "更新现有代码..."
    cd "$PROJECT_NAME"
    git fetch origin
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
else
    print_info "克隆新代码..."
    git clone -b "$GIT_BRANCH" "$GIT_URL" "$PROJECT_NAME"
    cd "$PROJECT_NAME"
fi

# 检查Dockerfile
DOCKERFILE_FULL_PATH="$DOCKERFILE_PATH"
if [ ! -f "$DOCKERFILE_FULL_PATH" ]; then
    print_error "Dockerfile不存在: $DOCKERFILE_FULL_PATH"
    exit 1
fi

# 构建Docker镜像
print_info "构建Docker镜像..."
print_info "构建上下文: $BUILD_CONTEXT"
print_info "Dockerfile: $DOCKERFILE_FULL_PATH"

# 构建镜像
docker build \
    --build-arg BACKEND_SERVER="$BACKEND_SERVER" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VERSION="$TAG" \
    --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
    -t "$DOCKERHUB_REPO:$TAG" \
    -f "$DOCKERFILE_FULL_PATH" \
    "$BUILD_CONTEXT"

# 同时打latest标签
if [ "$TAG" != "latest" ]; then
    docker tag "$DOCKERHUB_REPO:$TAG" "$DOCKERHUB_REPO:latest"
fi

print_success "镜像构建完成: $DOCKERHUB_REPO:$TAG"

# 推送镜像到Docker Hub
print_info "推送镜像到Docker Hub..."
docker push "$DOCKERHUB_REPO:$TAG"

if [ "$TAG" != "latest" ]; then
    docker push "$DOCKERHUB_REPO:latest"
fi

print_success "镜像推送完成"

# 生成ACK部署配置
print_info "生成ACK部署配置..."
cd "$SCRIPT_DIR/.."
generate_ack_deployment "$PROJECT_NAME" "$TAG"

# 清理临时文件
if [ "$CLEANUP_AFTER_BUILD" = "true" ]; then
    cleanup_temp "$TEMP_DIR"
fi

# 清理Docker资源
cleanup_docker

# 计算构建时间
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

print_success "🎉 项目构建完成！"
print_info "项目: $PROJECT_NAME_FULL"
print_info "标签: $TAG"
print_info "镜像: $DOCKERHUB_REPO:$TAG"
print_info "构建时间: ${BUILD_TIME}秒"
print_info "日志文件: $LOG_FILE"

# 记录构建结果
log_to_file "$LOG_FILE" "构建完成: $PROJECT_NAME, 标签: $TAG, 时间: ${BUILD_TIME}秒"

# 发送通知
send_notification "构建完成" "项目 $PROJECT_NAME_FULL 构建完成，标签: $TAG" "success"

