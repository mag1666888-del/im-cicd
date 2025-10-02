# OpenIM CMS 生产环境部署完整指南

本指南包含OpenIM CMS系统在生产环境中的完整部署方案，支持NGINX直接部署和Docker部署两种方式。

**重要说明**：本部署方案为纯前端静态文件部署，无需Node.js服务运行，所有API请求通过NGINX代理到后端服务。

## 📋 目录

- [快速开始](#快速开始)
- [系统架构](#系统架构)
- [文件说明](#文件说明)
- [NGINX直接部署](#nginx直接部署)
- [Docker部署](#docker部署)
- [环境配置](#环境配置)
- [配置验证](#配置验证)
- [监控与维护](#监控与维护)
- [故障排除](#故障排除)
- [配置总结](#配置总结)

---

## 🚀 快速开始

### 0. 检查配置（推荐）

```bash
# 进入deployment目录
cd deployment

# 运行配置检查
./check-config.sh
```

### 方法一：使用部署脚本（推荐）

```bash
# 进入deployment目录
cd deployment

# 给脚本执行权限
chmod +x deploy.sh

# 查看帮助
./deploy.sh --help

# NGINX部署
./deploy.sh nginx -s 你的服务器IP

# Docker部署
./deploy.sh docker -s 你的服务器IP -d example.com
```

### 方法二：手动部署

#### NGINX直接部署

```bash
# 1. 构建前端项目（在项目根目录）
npm install
npm run build

# 2. 配置NGINX
cd deployment
sudo cp nginx-template.conf /etc/nginx/sites-available/openim-cms
sudo sed -i 's/{{SERVER_IP}}/你的服务器IP/g' /etc/nginx/sites-available/openim-cms
sudo ln -sf /etc/nginx/sites-available/openim-cms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. 部署静态文件
sudo mkdir -p /var/www/openim-cms
sudo cp -r ../dist/* /var/www/openim-cms/
sudo chown -R www-data:www-data /var/www/openim-cms
```

#### Docker部署

```bash
# 1. 配置环境变量
cp env.example .env
# 编辑 .env 文件，设置 BACKEND_SERVER

# 2. 构建并启动
docker build -t openim-cms:production -f Dockerfile ..
docker-compose up -d
```

---

## 🏗️ 系统架构

```
用户浏览器
    ↓
NGINX (端口80/443)
    ↓
后端服务集群
├── 管理后台服务 (端口10009)
├── 用户服务 (端口10008)
└── IM系统服务 (端口10002)
```

### 服务端口分配

| 服务类型 | 端口 | 接口路径 | 说明 |
|---------|------|----------|------|
| 管理后台 | 10009 | `/api/account`, `/api/user/password`, `/api/user/import`, `/api/block`, `/api/default` | 账户管理、用户管理、封禁管理等 |
| 用户服务 | 10008 | `/api/user` | 用户相关操作 |
| IM系统 | 10002 | `/api/user/get_users`, `/api/msg`, `/api/group`, `/api/auth`, `/api/friend`, `/api/third`, `/api/object` | IM功能、消息、群组、文件上传等 |

### 路径映射

- `/api/account/*` → `管理后台服务`
- `/api/user/*` → `用户服务`（除特殊路径外）
- `/api/msg/*`, `/api/group/*`, `/api/auth/*`, `/api/friend/*`, `/api/third/*`, `/api/object/*` → `IM系统服务`

---

## 📁 文件说明

| 文件名 | 说明 |
|--------|------|
| `nginx-template.conf` | NGINX配置模板 |
| `nginx.conf` | 完整NGINX配置文件 |
| `Dockerfile` | Docker镜像构建文件 |
| `docker-compose.yml` | Docker编排文件 |
| `env.example` | 环境变量示例 |
| `deploy.sh` | 自动化部署脚本 |
| `check-config.sh` | 配置检查脚本 |

---

## 🚀 NGINX直接部署

### 系统要求

- Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- NGINX 1.18+
- Node.js 16+ (仅用于构建，部署后不需要)

### 步骤1：安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装NGINX
sudo apt install nginx -y

# 安装Node.js (仅用于构建)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# 安装构建工具
sudo apt install build-essential -y
```

### 步骤2：构建前端项目

```bash
# 进入项目根目录
cd /path/to/openim-cms

# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
```

### 步骤3：配置NGINX

```bash
# 进入deployment目录
cd deployment

# 复制NGINX配置
sudo cp nginx-template.conf /etc/nginx/sites-available/openim-cms

# 替换服务器IP
sudo sed -i 's/{{SERVER_IP}}/你的服务器IP/g' /etc/nginx/sites-available/openim-cms

# 启用站点
sudo ln -sf /etc/nginx/sites-available/openim-cms /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 启动NGINX
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 步骤4：部署静态文件

```bash
# 创建网站目录
sudo mkdir -p /var/www/openim-cms

# 复制构建产物
sudo cp -r ../dist/* /var/www/openim-cms/

# 设置权限
sudo chown -R www-data:www-data /var/www/openim-cms
sudo chmod -R 755 /var/www/openim-cms
```

### 步骤5：使用部署脚本（推荐）

```bash
# 进入deployment目录
cd deployment

# 给脚本执行权限
chmod +x deploy.sh

# NGINX部署
./deploy.sh nginx -s 你的服务器IP

# 指定域名
./deploy.sh nginx -s 你的服务器IP -d example.com
```

---

## 🐳 Docker部署

### 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少1GB内存

### 步骤1：准备文件

确保以下文件在deployment目录中：
- `Dockerfile`
- `docker-compose.yml`
- `nginx-template.conf`
- `env.example`

### 步骤2：配置环境变量

```bash
# 复制环境变量文件
cp env.example .env

# 编辑配置文件
nano .env
```

### 步骤3：使用部署脚本（推荐）

```bash
# 进入deployment目录
cd deployment

# 给脚本执行权限
chmod +x deploy.sh

# Docker部署
./deploy.sh docker -s 你的服务器IP

# 指定域名
./deploy.sh docker -s 你的服务器IP -d example.com
```

### 步骤4：手动Docker部署

```bash
# 构建镜像
docker build -t openim-cms:production -f Dockerfile ..

# 设置环境变量
export BACKEND_SERVER=你的服务器IP

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

---

## ⚙️ 环境配置

### 生产环境变量

创建 `deployment/.env` 文件：

```bash
# 应用配置
NODE_ENV=production

# 后端服务配置
BACKEND_SERVER=你的服务器IP

# 管理后台服务
ADMIN_SERVER_URL=http://你的服务器IP:10009

# 用户服务
USER_SERVER_URL=http://你的服务器IP:10008

# IM系统服务
IM_SERVER_URL=http://你的服务器IP:10002

# SSL配置
SSL_ENABLED=false
SSL_CERT_PATH=/etc/nginx/ssl/cert.crt
SSL_KEY_PATH=/etc/nginx/ssl/cert.key
```

### SSL证书配置

```bash
# 使用Let's Encrypt获取免费SSL证书
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔍 配置验证

### 自动检查

```bash
cd deployment
./check-config.sh
```

**检查项目**：
- ✅ 文件完整性
- ✅ NGINX语法正确性
- ✅ Docker配置正确性
- ✅ API路径完整性
- ✅ 端口配置一致性
- ✅ 脚本语法正确性

### 手动验证

**前端访问**：
```bash
curl http://localhost/
```

**API接口**：
```bash
# 管理后台接口
curl http://localhost/api/admin/account/info

# 用户服务接口
curl http://localhost/api/user/search/full

# IM系统接口
curl http://localhost/api/im/user/get_users
```

**后端服务**：
```bash
curl http://你的服务器IP:10009/health
curl http://你的服务器IP:10008/health
curl http://你的服务器IP:10002/health
```

---

## 📊 监控与维护

### 系统监控

```bash
# 安装监控工具
sudo apt install htop iotop nethogs -y

# 监控系统资源
htop
iotop
nethogs

# 监控NGINX状态
sudo nginx -t
sudo systemctl status nginx
```

### 日志管理

```bash
# 配置日志轮转
sudo cat > /etc/logrotate.d/nginx << EOF
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 nginx adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 \$(cat /var/run/nginx.pid)
        fi
    endscript
}
EOF
```

### 备份策略

```bash
# 创建备份脚本
cat > backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/openim-cms"
DATE=\$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p \$BACKUP_DIR

# 备份配置文件
tar -czf \$BACKUP_DIR/nginx-config-\$DATE.tar.gz /etc/nginx/sites-available/openim-cms

# 备份静态文件
tar -czf \$BACKUP_DIR/static-files-\$DATE.tar.gz /var/www/openim-cms

# 清理30天前的备份
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# 添加到定时任务
echo "0 2 * * * /path/to/backup.sh" | sudo crontab -
```

---

## 🔧 故障排除

### 常见问题

#### 1. NGINX启动失败

```bash
# 检查配置文件语法
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 检查端口占用
sudo netstat -tlnp | grep :80
```

#### 2. 静态文件404

```bash
# 检查文件权限
ls -la /var/www/openim-cms/

# 修复权限
sudo chown -R www-data:www-data /var/www/openim-cms
sudo chmod -R 755 /var/www/openim-cms
```

#### 3. API接口连接失败

```bash
# 检查后端服务状态
curl http://你的服务器IP:10009/health
curl http://你的服务器IP:10008/health
curl http://你的服务器IP:10002/health

# 检查防火墙
sudo ufw status
sudo ufw allow 10009
sudo ufw allow 10008
sudo ufw allow 10002
```

#### 4. Docker容器问题

```bash
# 查看容器日志
docker-compose logs frontend

# 重启服务
docker-compose restart

# 重新构建
docker-compose up --build -d
```

### 性能优化

#### NGINX优化

```nginx
# 在nginx配置中添加
worker_processes auto;
worker_connections 1024;

# 启用gzip压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# 启用缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### Docker优化

```yaml
# 在docker-compose.yml中添加资源限制
services:
  frontend:
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
```

---

## 📋 配置总结

### 核心配置

**NGINX代理配置**：

**管理后台服务 (端口10009)**：
- `/api/admin/*` → 所有管理后台相关接口
  - `/api/admin/account/*` → 账户管理
  - `/api/admin/user/*` → 用户管理
  - `/api/admin/block/*` → 封禁管理
  - `/api/admin/default/*` → 默认好友/群组

**用户服务 (端口10008)**：
- `/api/user/*` → 所有用户服务相关接口
  - `/api/user/search/*` → 用户搜索
  - `/api/user/update` → 用户更新

**IM系统服务 (端口10002)**：
- `/api/im/*` → 所有IM系统相关接口
  - `/api/im/user/*` → IM用户管理
  - `/api/im/msg/*` → 消息管理
  - `/api/im/group/*` → 群组管理
  - `/api/im/auth/*` → 认证管理
  - `/api/im/friend/*` → 好友管理
  - `/api/im/third/*` → 第三方服务
  - `/api/im/object/*` → 对象存储

### 环境变量

**必需配置**：
```bash
BACKEND_SERVER=chat-service.default.svc.cluster.local:8080  # 后端服务器IP
NODE_ENV=production           # 环境标识
```

**可选配置**：
```bash
SSL_ENABLED=false            # SSL启用状态
SSL_CERT_PATH=/etc/nginx/ssl/cert.crt
SSL_KEY_PATH=/etc/nginx/ssl/cert.key
```

### 部署检查清单

#### 部署前检查

- [ ] 服务器资源充足（CPU、内存、磁盘）
- [ ] 网络连接正常
- [ ] 防火墙配置正确
- [ ] SSL证书准备就绪（如需要）
- [ ] 域名解析配置正确（如需要）

#### 部署后检查

- [ ] 前端页面正常访问
- [ ] API接口响应正常
- [ ] 静态资源加载正常
- [ ] SSL证书工作正常（如配置）
- [ ] 日志记录正常

#### 安全检查

- [ ] 防火墙规则配置
- [ ] SSL/TLS配置（如需要）
- [ ] 文件权限设置
- [ ] 定期安全更新

### 维护说明

#### 更新部署

**NGINX部署**：
1. 重新构建前端：`npm run build`
2. 更新静态文件：`sudo cp -r dist/* /var/www/openim-cms/`
3. 重载NGINX：`sudo systemctl reload nginx`

**Docker部署**：
1. 重新构建镜像：`docker build -t openim-cms:production`
2. 重启服务：`docker-compose up -d --build`

#### 配置修改

**修改后端服务器IP**：
1. 编辑`nginx-template.conf`或`nginx.conf`
2. 替换`{{SERVER_IP}}`或具体IP地址
3. 重新部署

**添加新的API路径**：
1. 根据服务类型确定API前缀：
   - 管理后台服务 → `/api/admin/*`
   - 用户服务 → `/api/user/*`
   - IM系统服务 → `/api/im/*`
2. 在NGINX配置中添加新的location块（如需要）
3. 重新部署

#### 日志查看

**NGINX日志**：
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**Docker日志**：
```bash
docker-compose logs frontend
```

### 调试命令

```bash
# 检查NGINX配置
sudo nginx -t

# 检查Docker配置
docker-compose config

# 检查端口占用
sudo netstat -tlnp | grep :80

# 检查服务状态
sudo systemctl status nginx
docker-compose ps
```

---

## ⚠️ 注意事项

1. **纯静态部署**：无需Node.js运行时环境
2. **API代理**：所有API请求通过NGINX代理
3. **路径重写**：`/api/*`路径会被重写为`/*`
4. **健康检查**：Docker部署包含健康检查机制
5. **SSL支持**：可配置HTTPS，需要提供证书文件

---

## 🎉 总结

本部署方案具有以下特点：

- **简单高效**：纯静态文件部署，无需运行时环境
- **灵活配置**：支持NGINX和Docker两种部署方式
- **自动化**：提供完整的部署和检查脚本
- **可维护**：清晰的配置结构和文档说明
- **可扩展**：易于添加新的API路径和服务

通过本指南，您可以快速、稳定地部署OpenIM CMS系统到生产环境。

---

## 📞 技术支持

如遇到问题，请检查：

1. **日志文件**：`/var/log/nginx/error.log`
2. **系统资源**：`htop`、`df -h`、`free -h`
3. **网络连接**：`ping`、`telnet`、`curl`
4. **服务状态**：`systemctl status nginx`

如有其他问题，请参考本指南的故障排除部分。
