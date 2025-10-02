#!/bin/bash

# 查看所有项目状态脚本
# 使用方法: ./status.sh [project-name]

set -e

# 加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 参数
PROJECT_NAME=$1

# 加载环境变量
load_env

# 检查kubectl连接
if ! check_kubectl_connection; then
    print_error "无法连接到Kubernetes集群"
    exit 1
fi

# 显示所有项目状态
show_all_status() {
    print_info "==================== 项目状态 ===================="
    
    # 获取所有项目
    PROJECTS=($(get_all_projects))
    
    for project in "${PROJECTS[@]}"; do
        show_project_status "$project"
        echo ""
    done
}

# 显示单个项目状态
show_project_status() {
    local project_name=$1
    
    # 获取项目配置
    local ack_deployment=$(get_project_config "$project_name" "ack_deployment")
    local ack_namespace=$(get_project_config "$project_name" "ack_namespace")
    local dockerhub_repo=$(get_project_config "$project_name" "dockerhub_repo")
    
    print_info "项目: $project_name"
    print_info "部署: $ack_deployment"
    print_info "命名空间: $ack_namespace"
    
    # 检查部署状态
    if kubectl get deployment "$ack_deployment" -n "$ack_namespace" > /dev/null 2>&1; then
        local ready_replicas=$(kubectl get deployment "$ack_deployment" -n "$ack_namespace" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired_replicas=$(kubectl get deployment "$ack_deployment" -n "$ack_namespace" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        local current_image=$(kubectl get deployment "$ack_deployment" -n "$ack_namespace" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "N/A")
        
        if [ "$ready_replicas" = "$desired_replicas" ] && [ "$ready_replicas" != "0" ]; then
            print_success "状态: 运行中 ($ready_replicas/$desired_replicas)"
        else
            print_warning "状态: 异常 ($ready_replicas/$desired_replicas)"
        fi
        
        print_info "镜像: $current_image"
        
        # 显示Pod状态
        print_info "Pod状态:"
        kubectl get pods -l app="$ack_deployment" -n "$ack_namespace" --no-headers | while read line; do
            local pod_name=$(echo "$line" | awk '{print $1}')
            local status=$(echo "$line" | awk '{print $3}')
            local ready=$(echo "$line" | awk '{print $2}')
            
            if [ "$status" = "Running" ] && [[ "$ready" == *"/"* ]]; then
                print_success "  $pod_name: $status ($ready)"
            else
                print_warning "  $pod_name: $status ($ready)"
            fi
        done
        
        # 显示服务状态
        print_info "服务状态:"
        kubectl get services -l app="$ack_deployment" -n "$ack_namespace" --no-headers | while read line; do
            local service_name=$(echo "$line" | awk '{print $1}')
            local service_type=$(echo "$line" | awk '{print $2}')
            local cluster_ip=$(echo "$line" | awk '{print $3}')
            local external_ip=$(echo "$line" | awk '{print $4}')
            
            print_info "  $service_name: $service_type ($cluster_ip)"
            if [ -n "$external_ip" ] && [ "$external_ip" != "<none>" ]; then
                print_info "    外部访问: $external_ip"
            fi
        done
        
    else
        print_error "状态: 未部署"
    fi
}

# 显示Docker Hub镜像状态
show_dockerhub_status() {
    local project_name=$1
    local dockerhub_repo=$(get_project_config "$project_name" "dockerhub_repo")
    
    print_info "Docker Hub镜像:"
    
    # 检查latest镜像
    if docker manifest inspect "$dockerhub_repo:latest" > /dev/null 2>&1; then
        print_success "  latest: 存在"
    else
        print_warning "  latest: 不存在"
    fi
    
    # 检查最近5个标签
    print_info "最近标签:"
    local tags=$(curl -s "https://hub.docker.com/v2/repositories/$dockerhub_repo/tags/?page_size=5" | jq -r '.results[].name' 2>/dev/null || echo "")
    
    if [ -n "$tags" ]; then
        echo "$tags" | while read tag; do
            if [ -n "$tag" ]; then
                print_info "  $tag"
            fi
        done
    else
        print_warning "  无法获取标签信息"
    fi
}

# 显示系统资源状态
show_system_status() {
    print_info "==================== 系统状态 ===================="
    
    # 显示节点状态
    print_info "节点状态:"
    kubectl get nodes --no-headers | while read line; do
        local node_name=$(echo "$line" | awk '{print $1}')
        local status=$(echo "$line" | awk '{print $2}')
        local roles=$(echo "$line" | awk '{print $3}')
        
        if [ "$status" = "Ready" ]; then
            print_success "  $node_name: $status ($roles)"
        else
            print_warning "  $node_name: $status ($roles)"
        fi
    done
    
    # 显示命名空间状态
    print_info "命名空间状态:"
    kubectl get namespaces --no-headers | while read line; do
        local ns_name=$(echo "$line" | awk '{print $1}')
        local status=$(echo "$line" | awk '{print $2}')
        
        if [ "$status" = "Active" ]; then
            print_success "  $ns_name: $status"
        else
            print_warning "  $ns_name: $status"
        fi
    done
}

# 主函数
main() {
    if [ -n "$PROJECT_NAME" ]; then
        # 显示单个项目状态
        if validate_project_config "$PROJECT_NAME"; then
            show_project_status "$PROJECT_NAME"
            show_dockerhub_status "$PROJECT_NAME"
        else
            print_error "项目 $PROJECT_NAME 不存在"
            exit 1
        fi
    else
        # 显示所有项目状态
        show_all_status
        show_system_status
    fi
}

# 执行主函数
main
