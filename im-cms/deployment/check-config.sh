#!/bin/bash

# OpenIM CMS 配置检查脚本
# 检查所有配置文件的一致性和正确性

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

# 检查计数器
ERRORS=0
WARNINGS=0

# 检查函数
check_file_exists() {
    local file=$1
    if [ -f "$file" ]; then
        print_success "文件存在: $file"
        return 0
    else
        print_error "文件不存在: $file"
        ((ERRORS++))
        return 1
    fi
}

check_nginx_syntax() {
    local file=$1
    if command -v nginx &> /dev/null; then
        if nginx -t -c "$file" 2>/dev/null; then
            print_success "NGINX语法正确: $file"
            return 0
        else
            print_error "NGINX语法错误: $file"
            ((ERRORS++))
            return 1
        fi
    else
        print_warning "NGINX未安装，跳过语法检查: $file"
        ((WARNINGS++))
        return 0
    fi
}

check_docker_syntax() {
    local file=$1
    if command -v docker-compose &> /dev/null; then
        if docker-compose -f "$file" config >/dev/null 2>&1; then
            print_success "Docker Compose语法正确: $file"
            return 0
        else
            print_error "Docker Compose语法错误: $file"
            ((ERRORS++))
            return 1
        fi
    else
        print_warning "Docker Compose未安装，跳过语法检查: $file"
        ((WARNINGS++))
        return 0
    fi
}

check_script_syntax() {
    local file=$1
    if bash -n "$file" 2>/dev/null; then
        print_success "Shell脚本语法正确: $file"
        return 0
    else
        print_error "Shell脚本语法错误: $file"
        ((ERRORS++))
        return 1
    fi
}

check_api_paths() {
    local file=$1
    local expected_paths=(
        "/api/account"
        "/api/user/password"
        "/api/user/import"
        "/api/block"
        "/api/default"
        "/api/user"
        "/api/user/get_users"
        "/api/msg"
        "/api/group"
        "/api/auth"
        "/api/friend"
        "/api/third"
        "/api/object"
    )
    
    local missing_paths=()
    for path in "${expected_paths[@]}"; do
        if ! grep -q "location $path" "$file"; then
            missing_paths+=("$path")
        fi
    done
    
    if [ ${#missing_paths[@]} -eq 0 ]; then
        print_success "所有API路径都存在: $file"
        return 0
    else
        print_error "缺少API路径: $file"
        for path in "${missing_paths[@]}"; do
            print_error "  - $path"
        done
        ((ERRORS++))
        return 1
    fi
}

check_upstream_servers() {
    local file=$1
    local expected_servers=(
        "admin_backend"
        "user_backend"
        "im_backend"
    )
    
    local missing_servers=()
    for server in "${expected_servers[@]}"; do
        if ! grep -q "upstream $server" "$file"; then
            missing_servers+=("$server")
        fi
    done
    
    if [ ${#missing_servers[@]} -eq 0 ]; then
        print_success "所有upstream服务器都存在: $file"
        return 0
    else
        print_error "缺少upstream服务器: $file"
        for server in "${missing_servers[@]}"; do
            print_error "  - $server"
        done
        ((ERRORS++))
        return 1
    fi
}

# 主检查函数
main() {
    print_info "开始检查 OpenIM CMS 配置文件..."
    echo ""
    
    # 检查必要文件
    print_info "检查必要文件..."
    check_file_exists "nginx-template.conf"
    check_file_exists "nginx.conf"
    check_file_exists "Dockerfile"
    check_file_exists "docker-compose.yml"
    check_file_exists "env.example"
    check_file_exists "deploy.sh"
    check_file_exists "DEPLOYMENT-GUIDE.md"
    echo ""
    
    # 检查NGINX配置
    print_info "检查NGINX配置..."
    if [ -f "nginx-template.conf" ]; then
        check_nginx_syntax "nginx-template.conf"
        check_api_paths "nginx-template.conf"
        check_upstream_servers "nginx-template.conf"
    fi
    
    if [ -f "nginx.conf" ]; then
        check_nginx_syntax "nginx.conf"
        check_api_paths "nginx.conf"
        check_upstream_servers "nginx.conf"
    fi
    echo ""
    
    # 检查Docker配置
    print_info "检查Docker配置..."
    if [ -f "docker-compose.yml" ]; then
        check_docker_syntax "docker-compose.yml"
    fi
    
    if [ -f "Dockerfile" ]; then
        # 检查Dockerfile中的关键指令
        if grep -q "FROM node:18-alpine" "Dockerfile"; then
            print_success "Dockerfile使用正确的Node.js版本"
        else
            print_error "Dockerfile中Node.js版本可能有问题"
            ((ERRORS++))
        fi
        
        if grep -q "FROM nginx:alpine" "Dockerfile"; then
            print_success "Dockerfile使用正确的NGINX版本"
        else
            print_error "Dockerfile中NGINX版本可能有问题"
            ((ERRORS++))
        fi
    fi
    echo ""
    
    # 检查脚本
    print_info "检查脚本..."
    if [ -f "deploy.sh" ]; then
        check_script_syntax "deploy.sh"
        
        # 检查脚本中的关键功能
        if grep -q "deploy_nginx" "deploy.sh"; then
            print_success "部署脚本包含NGINX部署功能"
        else
            print_error "部署脚本缺少NGINX部署功能"
            ((ERRORS++))
        fi
        
        if grep -q "deploy_docker" "deploy.sh"; then
            print_success "部署脚本包含Docker部署功能"
        else
            print_error "部署脚本缺少Docker部署功能"
            ((ERRORS++))
        fi
    fi
    echo ""
    
    # 检查环境变量文件
    print_info "检查环境变量配置..."
    if [ -f "env.example" ]; then
        if grep -q "BACKEND_SERVER" "env.example"; then
            print_success "环境变量文件包含BACKEND_SERVER配置"
        else
            print_error "环境变量文件缺少BACKEND_SERVER配置"
            ((ERRORS++))
        fi
        
        if grep -q "NODE_ENV" "env.example"; then
            print_success "环境变量文件包含NODE_ENV配置"
        else
            print_error "环境变量文件缺少NODE_ENV配置"
            ((ERRORS++))
        fi
    fi
    echo ""
    
    # 检查端口配置一致性
    print_info "检查端口配置一致性..."
    local expected_ports=("10009" "10008" "10002")
    for port in "${expected_ports[@]}"; do
        if grep -q ":$port" "nginx-template.conf" && grep -q ":$port" "nginx.conf"; then
            print_success "端口 $port 配置一致"
        else
            print_error "端口 $port 配置不一致"
            ((ERRORS++))
        fi
    done
    echo ""
    
    # 总结
    print_info "检查完成！"
    echo ""
    print_info "错误数量: $ERRORS"
    print_info "警告数量: $WARNINGS"
    echo ""
    
    if [ $ERRORS -eq 0 ]; then
        print_success "🎉 所有配置检查通过！"
        exit 0
    else
        print_error "❌ 发现 $ERRORS 个错误，请修复后重新检查"
        exit 1
    fi
}

# 执行主函数
main "$@"
