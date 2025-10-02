#!/bin/bash

# OpenIM CMS 生产环境部署脚本
# 支持 NGINX直接部署 和 Docker部署
# 纯前端静态文件部署，无需Node.js服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "OpenIM CMS 生产环境部署脚本"
    echo "纯前端静态文件部署，无需Node.js服务"
    echo ""
    echo "使用方法:"
    echo "  $0 <部署方式> [选项]"
    echo ""
    echo "部署方式:"
    echo "  nginx      NGINX直接部署"
    echo "  docker     Docker部署"
    echo ""
    echo "选项:"
    echo "  -s, --server IP     后端服务器IP地址 (默认: chat-service.default.svc.cluster.local:8080)"
    echo "  -e, --env ENV       环境名称 (默认: production)"
    echo "  -d, --domain DOMAIN 域名 (可选)"
    echo "  -h, --help          显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 nginx -s 192.168.1.100 -e production"
    echo "  $0 docker -s 192.168.1.100 -d example.com"
}

# 检查依赖
check_dependencies() {
    local deploy_type=$1
    
    print_info "检查系统依赖..."
    
    if [ "$deploy_type" = "nginx" ]; then
        # 检查NGINX相关依赖
        if ! command -v nginx &> /dev/null; then
            print_error "NGINX 未安装，请先安装 NGINX"
            exit 1
        fi
        
        if ! command -v node &> /dev/null; then
            print_error "Node.js 未安装，请先安装 Node.js"
            exit 1
        fi
        
        if ! command -v npm &> /dev/null; then
            print_error "npm 未安装，请先安装 npm"
            exit 1
        fi
        
    elif [ "$deploy_type" = "docker" ]; then
        # 检查Docker相关依赖
        if ! command -v docker &> /dev/null; then
            print_error "Docker 未安装，请先安装 Docker"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            print_error "Docker Compose 未安装，请先安装 Docker Compose"
            exit 1
        fi
    fi
    
    print_success "依赖检查通过"
}

# NGINX部署
deploy_nginx() {
    local server_ip=$1
    local environment=$2
    local domain=$3
    
    print_info "开始 NGINX 直接部署..."
    
    # 检查必要文件
    if [ ! -f "nginx-template.conf" ]; then
        print_error "nginx-template.conf 文件不存在"
        exit 1
    fi
    
    # 检查项目根目录
    local project_root=".."
    if [ ! -f "$project_root/package.json" ]; then
        print_error "package.json 文件不存在，请确保在deployment目录执行"
        exit 1
    fi
    
    # 构建前端项目
    print_info "构建前端项目..."
    cd "$project_root"
    
    if [ ! -d "node_modules" ]; then
        print_info "安装依赖..."
        npm install
    fi
    
    print_info "执行构建..."
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "构建失败，dist 目录不存在"
        exit 1
    fi
    
    print_success "前端项目构建完成"
    
    # 回到deployment目录
    cd deployment
    
    # 配置NGINX
    print_info "配置 NGINX..."
    
    # 创建NGINX配置
    local nginx_config="/etc/nginx/sites-available/openim-cms"
    sudo cp nginx-template.conf "$nginx_config"
    
    # 替换服务器IP
    sudo sed -i "s/{{SERVER_IP}}/$server_ip/g" "$nginx_config"
    
    # 如果提供了域名，替换localhost
    if [ -n "$domain" ]; then
        sudo sed -i "s/localhost/$domain/g" "$nginx_config"
    fi
    
    # 启用站点
    sudo ln -sf "$nginx_config" /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    print_info "测试 NGINX 配置..."
    if ! sudo nginx -t; then
        print_error "NGINX 配置测试失败"
        exit 1
    fi
    
    # 部署静态文件
    print_info "部署静态文件..."
    sudo mkdir -p /var/www/openim-cms
    sudo cp -r ../dist/* /var/www/openim-cms/
    sudo chown -R www-data:www-data /var/www/openim-cms
    sudo chmod -R 755 /var/www/openim-cms
    
    # 启动NGINX
    print_info "启动 NGINX..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    print_success "NGINX 部署完成"
    print_info "前端访问地址: http://${domain:-localhost}"
    print_info "API接口地址: http://${domain:-localhost}/api"
}

# Docker部署
deploy_docker() {
    local server_ip=$1
    local environment=$2
    local domain=$3
    
    print_info "开始 Docker 部署..."
    
    # 检查必要文件
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile 文件不存在"
        exit 1
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml 文件不存在"
        exit 1
    fi
    
    # 创建环境变量文件
    print_info "创建环境变量文件..."
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            print_info "已创建 .env 文件，请根据需要修改配置"
        else
            print_warning "env.example 文件不存在，将使用默认配置"
        fi
    fi
    
    # 设置环境变量
    export BACKEND_SERVER="$server_ip"
    export NODE_ENV="$environment"
    
    if [ -n "$domain" ]; then
        export DOMAIN="$domain"
    fi
    
    # 构建Docker镜像
    print_info "构建 Docker 镜像..."
    docker build -t "openim-cms:$environment" -f Dockerfile ..
    
    # 停止现有容器
    print_info "停止现有容器..."
    docker-compose down 2>/dev/null || true
    
    # 启动服务
    print_info "启动 Docker 服务..."
    docker-compose up -d
    
    # 等待服务启动
    print_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    print_info "检查服务状态..."
    docker-compose ps
    
    # 检查健康状态
    print_info "检查服务健康状态..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "Up (healthy)"; then
            print_success "服务健康检查通过"
            break
        elif [ $attempt -eq $max_attempts ]; then
            print_warning "服务健康检查超时，请手动检查服务状态"
            break
        fi
        
        print_info "等待服务启动... ($attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    print_success "Docker 部署完成"
    print_info "前端访问地址: http://${domain:-localhost}"
    print_info "API接口地址: http://${domain:-localhost}/api"
}

# 主函数
main() {
    local deploy_type=""
    local server_ip="chat-service.default.svc.cluster.local:8080"
    local environment="production"
    local domain=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            nginx|docker)
                deploy_type="$1"
                shift
                ;;
            -s|--server)
                server_ip="$2"
                shift 2
                ;;
            -e|--env)
                environment="$2"
                shift 2
                ;;
            -d|--domain)
                domain="$2"
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
    
    # 检查部署方式
    if [ -z "$deploy_type" ]; then
        print_error "请指定部署方式 (nginx 或 docker)"
        show_help
        exit 1
    fi
    
    # 显示配置信息
    print_info "部署配置:"
    print_info "  部署方式: $deploy_type"
    print_info "  服务器IP: $server_ip"
    print_info "  环境: $environment"
    if [ -n "$domain" ]; then
        print_info "  域名: $domain"
    fi
    echo ""
    
    # 确认部署
    read -p "确认开始部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "部署已取消"
        exit 0
    fi
    
    # 检查依赖
    check_dependencies "$deploy_type"
    
    # 执行部署
    if [ "$deploy_type" = "nginx" ]; then
        deploy_nginx "$server_ip" "$environment" "$domain"
    elif [ "$deploy_type" = "docker" ]; then
        deploy_docker "$server_ip" "$environment" "$domain"
    fi
    
    print_success "🎉 部署完成！"
}

# 执行主函数
main "$@"