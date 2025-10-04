#!/bin/bash

# 构建所有项目脚本
# 使用方法: ./build-all.sh [options]

set -e

# 加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 参数解析
CLEAN_BUILD=false
PARALLEL_BUILD=false
TAG_PREFIX=""
DRY_RUN=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --parallel)
            PARALLEL_BUILD=true
            shift
            ;;
        --tag-prefix)
            TAG_PREFIX="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
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

# 加载环境变量
load_env

# 检查环境
print_info "检查环境..."
check_command docker || exit 1
check_command git || exit 1
check_command jq || exit 1

# 登录Docker Hub
if ! login_dockerhub; then
    exit 1
fi

# 获取所有项目
print_info "获取项目列表..."
PROJECTS=($(get_all_projects))

if [ ${#PROJECTS[@]} -eq 0 ]; then
    print_error "没有找到任何项目"
    exit 1
fi

print_info "找到 ${#PROJECTS[@]} 个项目: ${PROJECTS[*]}"

# 生成构建标签
BUILD_TAG="${TAG_PREFIX}$(date +%Y%m%d-%H%M%S)"
print_info "构建标签: $BUILD_TAG"

# 创建日志目录
LOG_DIR="./logs"
create_dir "$LOG_DIR"
MAIN_LOG_FILE="$LOG_DIR/build-all-$(date +%Y%m%d-%H%M%S).log"

# 记录开始时间
START_TIME=$(date +%s)
log_to_file "$MAIN_LOG_FILE" "开始构建所有项目，标签: $BUILD_TAG"

# 构建结果统计
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_PROJECTS=()

# 构建函数
build_project() {
    local project_name=$1
    local tag=$2
    local clean_build=$3
    
    local project_log_file="$LOG_DIR/build-$project_name-$(date +%Y%m%d-%H%M%S).log"
    
    print_info "开始构建项目: $project_name"
    log_to_file "$project_log_file" "开始构建项目: $project_name"
    
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY RUN] 将构建项目: $project_name"
        log_to_file "$project_log_file" "[DRY RUN] 将构建项目: $project_name"
        return 0
    fi
    
    # 执行构建
    if "$SCRIPT_DIR/build-single.sh" "$project_name" "$tag" "$clean_build" >> "$project_log_file" 2>&1; then
        print_success "项目构建成功: $project_name"
        log_to_file "$project_log_file" "项目构建成功: $project_name"
        log_to_file "$MAIN_LOG_FILE" "项目构建成功: $project_name"
        return 0
    else
        print_error "项目构建失败: $project_name"
        log_to_file "$project_log_file" "项目构建失败: $project_name"
        log_to_file "$MAIN_LOG_FILE" "项目构建失败: $project_name"
        return 1
    fi
}

# 并行构建函数
build_parallel() {
    local max_concurrent=${MAX_CONCURRENT_BUILDS:-2}
    local pids=()
    local project_index=0
    
    print_info "开始并行构建，最大并发数: $max_concurrent"
    
    for project in "${PROJECTS[@]}"; do
        # 等待有空闲的构建槽
        while [ ${#pids[@]} -ge $max_concurrent ]; do
            for i in "${!pids[@]}"; do
                if ! kill -0 "${pids[$i]}" 2>/dev/null; then
                    wait "${pids[$i]}"
                    unset pids[$i]
                fi
            done
            sleep 1
        done
        
        # 启动新的构建任务
        build_project "$project" "$BUILD_TAG" "$CLEAN_BUILD" &
        pids+=($!)
        
        print_info "启动构建任务: $project (PID: $!)"
        ((project_index++))
    done
    
    # 等待所有构建任务完成
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
}

# 串行构建函数
build_sequential() {
    print_info "开始串行构建"
    
    for project in "${PROJECTS[@]}"; do
        if build_project "$project" "$BUILD_TAG" "$CLEAN_BUILD"; then
            ((SUCCESS_COUNT++))
        else
            ((FAILED_COUNT++))
            FAILED_PROJECTS+=("$project")
        fi
    done
}

# 执行构建
if [ "$PARALLEL_BUILD" = "true" ]; then
    build_parallel
else
    build_sequential
fi

# 计算构建时间
END_TIME=$(date +%s)
TOTAL_BUILD_TIME=$((END_TIME - START_TIME))

# 显示构建结果
print_info "==================== 构建结果 ===================="
print_info "总项目数: ${#PROJECTS[@]}"
print_info "成功: $SUCCESS_COUNT"
print_info "失败: $FAILED_COUNT"
print_info "总耗时: ${TOTAL_BUILD_TIME}秒"

if [ ${#FAILED_PROJECTS[@]} -gt 0 ]; then
    print_error "失败的项目: ${FAILED_PROJECTS[*]}"
fi

# 记录构建结果
log_to_file "$MAIN_LOG_FILE" "构建完成，成功: $SUCCESS_COUNT, 失败: $FAILED_COUNT, 耗时: ${TOTAL_BUILD_TIME}秒"

# 发送通知
if [ $FAILED_COUNT -eq 0 ]; then
    send_notification "所有项目构建成功" "成功构建 $SUCCESS_COUNT 个项目，耗时 ${TOTAL_BUILD_TIME}秒" "success"
else
    send_notification "部分项目构建失败" "成功: $SUCCESS_COUNT, 失败: $FAILED_COUNT, 失败项目: ${FAILED_PROJECTS[*]}" "error"
fi

# 清理资源
if [ "$CLEANUP_AFTER_BUILD" = "true" ]; then
    print_info "清理资源..."
    cleanup_docker
    cleanup_temp "./temp"
fi

# 显示帮助信息
show_help() {
    echo "构建所有项目脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --clean              清理构建"
    echo "  --parallel           并行构建"
    echo "  --tag-prefix PREFIX  标签前缀"
    echo "  --dry-run            试运行模式"
    echo "  -h, --help           显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                    # 串行构建所有项目"
    echo "  $0 --parallel         # 并行构建所有项目"
    echo "  $0 --clean --parallel # 清理并并行构建"
    echo "  $0 --tag-prefix v1.0  # 使用标签前缀"
    echo "  $0 --dry-run          # 试运行模式"
    echo ""
    echo "环境变量:"
    echo "  MAX_CONCURRENT_BUILDS  最大并发构建数 (默认: 2)"
    echo "  CLEANUP_AFTER_BUILD    构建后清理 (默认: true)"
}

# 根据构建结果设置退出码
if [ $FAILED_COUNT -eq 0 ]; then
    print_success "🎉 所有项目构建完成！"
    exit 0
else
    print_error "❌ 部分项目构建失败"
    exit 1
fi