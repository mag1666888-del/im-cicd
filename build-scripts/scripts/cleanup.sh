#!/bin/bash

# 清理资源脚本
# 使用方法: ./cleanup.sh [options]

set -e

# 加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 参数解析
CLEAN_DOCKER=false
CLEAN_TEMP=false
CLEAN_LOGS=false
CLEAN_ALL=false
KEEP_LOGS_DAYS=30

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            CLEAN_DOCKER=true
            shift
            ;;
        --temp)
            CLEAN_TEMP=true
            shift
            ;;
        --logs)
            CLEAN_LOGS=true
            shift
            ;;
        --all)
            CLEAN_ALL=true
            shift
            ;;
        --keep-logs-days)
            KEEP_LOGS_DAYS="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 如果没有指定任何参数，默认清理所有
if [ "$CLEAN_DOCKER" = false ] && [ "$CLEAN_TEMP" = false ] && [ "$CLEAN_LOGS" = false ] && [ "$CLEAN_ALL" = false ]; then
    CLEAN_ALL=true
fi

# 加载环境变量
load_env

print_info "开始清理资源..."

# 清理Docker资源
cleanup_docker_resources() {
    if [ "$CLEAN_DOCKER" = true ] || [ "$CLEAN_ALL" = true ]; then
        print_info "清理Docker资源..."
        
        # 清理悬空镜像
        local dangling_images=$(docker images -f "dangling=true" -q)
        if [ -n "$dangling_images" ]; then
            print_info "清理悬空镜像..."
            docker rmi $dangling_images 2>/dev/null || true
        fi
        
        # 清理未使用的镜像
        print_info "清理未使用的镜像..."
        docker image prune -f
        
        # 清理未使用的容器
        print_info "清理未使用的容器..."
        docker container prune -f
        
        # 清理未使用的网络
        print_info "清理未使用的网络..."
        docker network prune -f
        
        # 清理未使用的卷
        print_info "清理未使用的卷..."
        docker volume prune -f
        
        # 清理构建缓存
        print_info "清理构建缓存..."
        docker builder prune -f
        
        print_success "Docker资源清理完成"
    fi
}

# 清理临时文件
cleanup_temp_files() {
    if [ "$CLEAN_TEMP" = true ] || [ "$CLEAN_ALL" = true ]; then
        print_info "清理临时文件..."
        
        local temp_dir="./temp"
        if [ -d "$temp_dir" ]; then
            print_info "清理临时目录: $temp_dir"
            rm -rf "$temp_dir"
        fi
        
        # 清理其他临时文件
        find . -name "*.tmp" -type f -delete 2>/dev/null || true
        find . -name "*.log.tmp" -type f -delete 2>/dev/null || true
        
        print_success "临时文件清理完成"
    fi
}

# 清理日志文件
cleanup_log_files() {
    if [ "$CLEAN_LOGS" = true ] || [ "$CLEAN_ALL" = true ]; then
        print_info "清理日志文件..."
        
        local log_dir="./logs"
        if [ -d "$log_dir" ]; then
            print_info "清理超过 $KEEP_LOGS_DAYS 天的日志文件..."
            
            # 查找并删除超过指定天数的日志文件
            find "$log_dir" -name "*.log" -type f -mtime +$KEEP_LOGS_DAYS -delete 2>/dev/null || true
            
            # 压缩7天前的日志文件
            find "$log_dir" -name "*.log" -type f -mtime +7 -exec gzip {} \; 2>/dev/null || true
            
            print_success "日志文件清理完成"
        fi
    fi
}

# 清理Kubernetes资源
cleanup_k8s_resources() {
    if [ "$CLEAN_ALL" = true ]; then
        print_info "清理Kubernetes资源..."
        
        # 检查kubectl连接
        if check_kubectl_connection; then
            # 清理失败的Pod
            print_info "清理失败的Pod..."
            kubectl delete pods --field-selector=status.phase=Failed --all-namespaces 2>/dev/null || true
            
            # 清理已完成的Job
            print_info "清理已完成的Job..."
            kubectl delete jobs --field-selector=status.successful=1 --all-namespaces 2>/dev/null || true
            
            print_success "Kubernetes资源清理完成"
        else
            print_warning "无法连接到Kubernetes集群，跳过K8s资源清理"
        fi
    fi
}

# 显示清理统计
show_cleanup_stats() {
    print_info "==================== 清理统计 ===================="
    
    # Docker统计
    if [ "$CLEAN_DOCKER" = true ] || [ "$CLEAN_ALL" = true ]; then
        local docker_images=$(docker images -q | wc -l)
        local docker_containers=$(docker ps -aq | wc -l)
        print_info "Docker镜像数量: $docker_images"
        print_info "Docker容器数量: $docker_containers"
    fi
    
    # 磁盘使用统计
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}')
    print_info "磁盘使用率: $disk_usage"
    
    # 日志文件统计
    local log_count=$(find ./logs -name "*.log" -type f 2>/dev/null | wc -l)
    print_info "日志文件数量: $log_count"
}

# 显示帮助信息
show_help() {
    echo "清理资源脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --docker              清理Docker资源"
    echo "  --temp               清理临时文件"
    echo "  --logs               清理日志文件"
    echo "  --all                清理所有资源"
    echo "  --keep-logs-days N   保留N天的日志文件 (默认: 30)"
    echo "  -h, --help           显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                    # 清理所有资源"
    echo "  $0 --docker           # 只清理Docker资源"
    echo "  $0 --logs --keep-logs-days 7  # 清理7天前的日志"
    echo ""
    echo "环境变量:"
    echo "  KEEP_LOGS_DAYS        保留日志天数 (默认: 30)"
}

# 主函数
main() {
    print_info "开始清理资源..."
    
    # 执行清理
    cleanup_docker_resources
    cleanup_temp_files
    cleanup_log_files
    cleanup_k8s_resources
    
    # 显示统计信息
    show_cleanup_stats
    
    print_success "🎉 资源清理完成！"
}

# 执行主函数
main
