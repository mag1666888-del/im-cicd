#!/bin/bash

# ACK应用更新脚本
# 使用方法: ./update-ack.sh <project-name> <new-tag>

set -e

# 加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 参数检查
PROJECT_NAME=$1
NEW_TAG=$2

if [ -z "$PROJECT_NAME" ] || [ -z "$NEW_TAG" ]; then
    print_error "请指定项目名称和新标签"
    echo "使用方法: $0 <project-name> <new-tag>"
    echo "示例: $0 openim-cms v1.0.1"
    exit 1
fi

# 加载环境变量
load_env

# 验证项目配置
if ! validate_project_config "$PROJECT_NAME"; then
    exit 1
fi

# 获取项目配置
ACK_DEPLOYMENT=$(get_project_config "$PROJECT_NAME" "ack_deployment")
ACK_NAMESPACE=$(get_project_config "$PROJECT_NAME" "ack_namespace")
DOCKERHUB_REPO=$(get_project_config "$PROJECT_NAME" "dockerhub_repo")

print_info "更新ACK应用: $PROJECT_NAME"
print_info "新标签: $NEW_TAG"
print_info "部署名称: $ACK_DEPLOYMENT"
print_info "命名空间: $ACK_NAMESPACE"

# 检查kubectl连接
if ! check_kubectl_connection; then
    exit 1
fi

# 检查镜像是否存在
print_info "检查镜像是否存在..."
if ! check_build_status "$PROJECT_NAME" "$NEW_TAG"; then
    print_error "镜像不存在: $DOCKERHUB_REPO:$NEW_TAG"
    print_info "请先构建镜像: ./build-single.sh $PROJECT_NAME $NEW_TAG"
    exit 1
fi

# 更新镜像
print_info "更新部署镜像..."
kubectl set image deployment/$ACK_DEPLOYMENT $ACK_DEPLOYMENT=$DOCKERHUB_REPO:$NEW_TAG -n $ACK_NAMESPACE

# 等待更新完成
print_info "等待更新完成..."
if wait_for_deployment "$ACK_DEPLOYMENT" "$ACK_NAMESPACE" "${DEPLOY_TIMEOUT:-300}"; then
    print_success "🎉 应用更新成功！"
    
    # 显示更新后的状态
    print_info "更新后的状态:"
    kubectl get pods -l app=$ACK_DEPLOYMENT -n $ACK_NAMESPACE
    kubectl get services -l app=$ACK_DEPLOYMENT -n $ACK_NAMESPACE
    
    # 发送通知
    send_notification "应用更新成功" "项目 $PROJECT_NAME 已更新到版本 $NEW_TAG" "success"
    
    exit 0
else
    print_error "❌ 应用更新失败"
    
    # 显示错误信息
    print_info "查看Pod状态:"
    kubectl get pods -l app=$ACK_DEPLOYMENT -n $ACK_NAMESPACE
    kubectl describe pods -l app=$ACK_DEPLOYMENT -n $ACK_NAMESPACE
    
    # 发送通知
    send_notification "应用更新失败" "项目 $PROJECT_NAME 更新到版本 $NEW_TAG 失败" "error"
    
    exit 1
fi
