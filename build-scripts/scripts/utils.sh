#!/bin/bash

# 工具函数库
# 提供通用的工具函数

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志级别
LOG_LEVEL=${LOG_LEVEL:-info}

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

print_debug() {
    if [ "$LOG_LEVEL" = "debug" ]; then
        echo -e "${PURPLE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
    fi
}

# 检查命令是否存在
check_command() {
    local cmd=$1
    if ! command -v "$cmd" &> /dev/null; then
        print_error "命令 $cmd 未安装，请先安装"
        return 1
    fi
    return 0
}

# 检查文件是否存在
check_file() {
    local file=$1
    if [ ! -f "$file" ]; then
        print_error "文件不存在: $file"
        return 1
    fi
    return 0
}

# 检查目录是否存在
check_dir() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        print_error "目录不存在: $dir"
        return 1
    fi
    return 0
}

# 创建目录
create_dir() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_info "创建目录: $dir"
    fi
}

# 加载环境变量
load_env() {
    local env_file=${1:-.env}
    if [ -f "$env_file" ]; then
        print_debug "加载环境变量: $env_file"
        set -a
        source "$env_file"
        set +a
    else
        print_warning "环境变量文件不存在: $env_file"
    fi
}

# 加载项目配置
load_project_config() {
    local config_file="config/projects.json"
    if [ ! -f "$config_file" ]; then
        print_error "项目配置文件不存在: $config_file"
        return 1
    fi
    
    # 检查jq是否安装
    if ! check_command jq; then
        print_error "jq 未安装，请先安装: sudo apt install jq"
        return 1
    fi
    
    return 0
}

# 获取项目配置
get_project_config() {
    local project_name=$1
    local config_key=$2
    
    if ! load_project_config; then
        return 1
    fi
    
    local config_file="config/projects.json"
    local value=$(jq -r ".projects.\"$project_name\".$config_key" "$config_file" 2>/dev/null)
    
    if [ "$value" = "null" ] || [ -z "$value" ]; then
        print_error "项目 $project_name 的配置 $config_key 不存在"
        return 1
    fi
    
    echo "$value"
}

# 获取所有项目名称
get_all_projects() {
    if ! load_project_config; then
        return 1
    fi
    
    local config_file="config/projects.json"
    jq -r '.projects | keys[]' "$config_file" 2>/dev/null
}

# 验证项目配置
validate_project_config() {
    local project_name=$1
    
    print_debug "验证项目配置: $project_name"
    
    local required_fields=("name" "git_url" "dockerhub_repo" "dockerfile_path")
    
    for field in "${required_fields[@]}"; do
        local value=$(get_project_config "$project_name" "$field")
        if [ $? -ne 0 ]; then
            print_error "项目 $project_name 缺少必需字段: $field"
            return 1
        fi
    done
    
    print_success "项目配置验证通过: $project_name"
    return 0
}

# 生成唯一标签
generate_tag() {
    local project_name=$1
    local custom_tag=$2
    
    if [ -n "$custom_tag" ]; then
        echo "$custom_tag"
    else
        echo "$(date +%Y%m%d-%H%M%S)"
    fi
}

# 清理临时文件
cleanup_temp() {
    local temp_dir=${1:-./temp}
    if [ -d "$temp_dir" ]; then
        print_debug "清理临时目录: $temp_dir"
        rm -rf "$temp_dir"
    fi
}

# 清理Docker资源
cleanup_docker() {
    print_debug "清理Docker资源"
    
    # 清理悬空镜像
    docker image prune -f > /dev/null 2>&1
    
    # 清理未使用的容器
    docker container prune -f > /dev/null 2>&1
    
    # 清理未使用的网络
    docker network prune -f > /dev/null 2>&1
}

# 检查Docker Hub登录状态
check_dockerhub_login() {
    if ! docker info | grep -q "Username"; then
        print_error "未登录Docker Hub，请先登录"
        return 1
    fi
    return 0
}

# 登录Docker Hub
login_dockerhub() {
    local username=${DOCKERHUB_USERNAME}
    local password=${DOCKERHUB_PASSWORD}
    
    if [ -z "$username" ] || [ -z "$password" ]; then
        print_error "Docker Hub凭据未设置，请检查环境变量"
        return 1
    fi
    
    print_info "登录Docker Hub..."
    echo "$password" | docker login --username="$username" --password-stdin > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Docker Hub登录成功"
        return 0
    else
        print_error "Docker Hub登录失败"
        return 1
    fi
}

# 检查kubectl连接
check_kubectl_connection() {
    if ! check_command kubectl; then
        print_error "kubectl 未安装"
        return 1
    fi
    
    if ! kubectl cluster-info > /dev/null 2>&1; then
        print_error "kubectl 无法连接到集群"
        return 1
    fi
    
    print_success "kubectl 连接正常"
    return 0
}

# 发送通知
send_notification() {
    local title=$1
    local message=$2
    local status=$3
    
    # 邮件通知
    if [ -n "$SMTP_SERVER" ] && [ -n "$NOTIFICATION_EMAIL" ]; then
        send_email_notification "$title" "$message" "$status"
    fi
    
    # 钉钉通知
    if [ -n "$DINGTALK_WEBHOOK" ]; then
        send_dingtalk_notification "$title" "$message" "$status"
    fi
    
    # 企业微信通知
    if [ -n "$WECHAT_WEBHOOK" ]; then
        send_wechat_notification "$title" "$message" "$status"
    fi
}

# 发送邮件通知
send_email_notification() {
    local title=$1
    local message=$2
    local status=$3
    
    # 这里可以集成邮件发送功能
    print_debug "发送邮件通知: $title"
}

# 发送钉钉通知
send_dingtalk_notification() {
    local title=$1
    local message=$2
    local status=$3
    
    local color="green"
    if [ "$status" = "error" ]; then
        color="red"
    elif [ "$status" = "warning" ]; then
        color="orange"
    fi
    
    local payload=$(cat << EOF
{
    "msgtype": "markdown",
    "markdown": {
        "title": "$title",
        "text": "## $title\n\n$message\n\n**状态**: $status\n**时间**: $(date '+%Y-%m-%d %H:%M:%S')"
    }
}
EOF
)
    
    curl -s -X POST "$DINGTALK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "$payload" > /dev/null 2>&1
    
    print_debug "发送钉钉通知: $title"
}

# 发送企业微信通知
send_wechat_notification() {
    local title=$1
    local message=$2
    local status=$3
    
    local payload=$(cat << EOF
{
    "msgtype": "text",
    "text": {
        "content": "$title\n$message\n状态: $status\n时间: $(date '+%Y-%m-%d %H:%M:%S')"
    }
}
EOF
)
    
    curl -s -X POST "$WECHAT_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "$payload" > /dev/null 2>&1
    
    print_debug "发送企业微信通知: $title"
}

# 记录日志
log_to_file() {
    local log_file=$1
    local message=$2
    
    create_dir "$(dirname "$log_file")"
    echo "$(date '+%Y-%m-%d %H:%M:%S') $message" >> "$log_file"
}

# 检查构建状态
check_build_status() {
    local project_name=$1
    local tag=$2
    
    local image_name=$(get_project_config "$project_name" "dockerhub_repo")
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # 检查镜像是否存在
    if docker manifest inspect "$image_name:$tag" > /dev/null 2>&1; then
        print_success "镜像存在: $image_name:$tag"
        return 0
    else
        print_error "镜像不存在: $image_name:$tag"
        return 1
    fi
}

# 等待部署完成
wait_for_deployment() {
    local deployment_name=$1
    local namespace=${2:-default}
    local timeout=${3:-300}
    
    print_info "等待部署完成: $deployment_name"
    
    local start_time=$(date +%s)
    while [ $(($(date +%s) - start_time)) -lt $timeout ]; do
        if kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.status.readyReplicas}' | grep -q "$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.spec.replicas}')"; then
            print_success "部署完成: $deployment_name"
            return 0
        fi
        
        print_debug "等待部署完成..."
        sleep 10
    done
    
    print_error "部署超时: $deployment_name"
    return 1
}

# 显示帮助信息
show_help() {
    echo "多项目构建脚本工具"
    echo ""
    echo "使用方法:"
    echo "  $0 <command> [options]"
    echo ""
    echo "命令:"
    echo "  build-all              构建所有项目"
    echo "  build-single <project> 构建单个项目"
    echo "  deploy <project>       部署项目到ACK"
    echo "  status                 查看所有项目状态"
    echo "  logs <project>         查看项目日志"
    echo "  cleanup                清理资源"
    echo "  help                   显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 build-all"
    echo "  $0 build-single openim-cms v1.0.0"
    echo "  $0 deploy openim-cms"
    echo "  $0 status"
}
