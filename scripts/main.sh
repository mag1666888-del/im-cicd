#!/bin/bash

# 主脚本 - 统一入口
# 使用方法: ./main.sh <command> [options]

set -e

# 加载工具函数
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

# 显示帮助信息
show_help() {
    echo "OpenIM 构建部署脚本 - 统一入口"
    echo ""
    echo "使用方法:"
    echo "  $0 <command> [options]"
    echo ""
    echo "命令:"
    echo "  onekey-build           一键构建并部署（二开镜像）"
    echo "  onekey-install         一键安装（ACK全新集群）"
    echo "  onekey-official        一键安装（官方部署方式）"
    echo "  update <project> <tag> 更新项目到指定版本"
    echo "  help                   显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 onekey-build                    # 一键构建并部署"
    echo "  $0 onekey-install                  # 一键安装到ACK"
    echo "  $0 onekey-official                 # 官方部署方式"
    echo "  $0 update openim-cms v1.0.1       # 更新到v1.0.1"
    echo ""
    echo "环境变量:"
    echo "  DOCKER_USER             Docker Hub用户名（默认: mag1666888）"
    echo "  TAG                     镜像标签（默认: dev）"
    echo "  NAMESPACE               K8s命名空间（默认: default）"
    echo "  OIS_DIR                 open-im-server目录（默认: /home/im/open-im-server）"
    echo "  CHAT_DIR                chat目录（默认: /home/im/chat）"
}

# 主函数
main() {
    local command=$1
    shift
    
    case $command in
        onekey-build)
            print_info "执行一键构建并部署..."
            "$SCRIPT_DIR/onekey-build-and-deploy.sh" "$@"
            ;;
        onekey-install)
            print_info "执行一键安装到ACK..."
            "$SCRIPT_DIR/ack-onekey-external.sh" "$@"
            ;;
        onekey-official)
            print_info "执行官方部署方式..."
            "$SCRIPT_DIR/ack-onekey-official.sh" "$@"
            ;;
        update)
            print_info "更新项目到指定版本..."
            "$SCRIPT_DIR/update-ack.sh" "$@"
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
