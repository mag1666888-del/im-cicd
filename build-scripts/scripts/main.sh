#!/bin/bash

# 主脚本 - 统一入口
# 使用方法: ./main.sh <command> [options]

set -e

# 加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 显示帮助信息
show_help() {
    echo "多项目构建脚本 - 统一入口"
    echo ""
    echo "使用方法:"
    echo "  $0 <command> [options]"
    echo ""
    echo "命令:"
    echo "  build-all              构建所有项目"
    echo "  build-single <project> 构建单个项目"
    echo "  deploy <project>       部署项目到ACK"
    echo "  update <project> <tag> 更新项目到指定版本"
    echo "  status [project]       查看项目状态"
    echo "  logs <project>         查看项目日志"
    echo "  cleanup                清理资源"
    echo "  help                   显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 build-all                    # 构建所有项目"
    echo "  $0 build-single openim-cms      # 构建openim-cms项目"
    echo "  $0 build-single openim-cms v1.0.0  # 构建指定版本"
    echo "  $0 update openim-cms v1.0.1     # 更新到v1.0.1"
    echo "  $0 status                       # 查看所有项目状态"
    echo "  $0 status openim-cms            # 查看单个项目状态"
    echo "  $0 cleanup                      # 清理资源"
    echo ""
    echo "环境变量:"
    echo "  DOCKERHUB_USERNAME             Docker Hub用户名"
    echo "  DOCKERHUB_PASSWORD             Docker Hub密码"
    echo "  GITHUB_TOKEN                   GitHub Token"
    echo "  ACK_CLUSTER_ID                 ACK集群ID"
    echo "  ACK_REGION                     ACK区域"
}

# 主函数
main() {
    local command=$1
    shift
    
    case $command in
        build-all)
            "$SCRIPT_DIR/build-all.sh" "$@"
            ;;
        build-single)
            "$SCRIPT_DIR/build-single.sh" "$@"
            ;;
        deploy)
            print_info "部署功能暂未实现，请使用kubectl手动部署"
            print_info "部署文件位置: projects/*/ack-deployment.yaml"
            ;;
        update)
            "$SCRIPT_DIR/update-ack.sh" "$@"
            ;;
        status)
            "$SCRIPT_DIR/status.sh" "$@"
            ;;
        logs)
            local project_name=$1
            if [ -z "$project_name" ]; then
                print_error "请指定项目名称"
                exit 1
            fi
            print_info "查看项目日志: $project_name"
            find ./logs -name "build-$project_name-*.log" -type f | sort -r | head -1 | xargs tail -f
            ;;
        cleanup)
            "$SCRIPT_DIR/cleanup.sh" "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
