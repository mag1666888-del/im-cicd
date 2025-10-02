# 服务端环境配置指南

## 🎯 **服务端架构**

```
ECS服务器 (构建) → Docker Hub (存储) → ACK集群 (运行)
```

## 🚀 **ECS服务器环境要求**

### **最低配置**
- **CPU**: 2核
- **内存**: 4GB
- **存储**: 40GB SSD
- **操作系统**: Ubuntu 20.04 LTS
- **带宽**: 5Mbps

### **推荐配置**
- **CPU**: 4核
- **内存**: 8GB
- **存储**: 100GB SSD
- **操作系统**: Ubuntu 20.04 LTS
- **带宽**: 10Mbps

## 📦 **必需软件安装**

### **1. 基础工具**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git unzip jq
```

### **2. Docker (必需)**
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 添加用户到docker组
sudo usermod -aG docker $USER

# 重新登录使权限生效
newgrp docker
```

### **3. Docker Compose (必需)**
```bash
# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### **4. Node.js (必需 - 用于构建前端项目)**
```bash
# 安装Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### **5. kubectl (可选 - 用于ACK管理)**
```bash
# 安装kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 验证安装
kubectl version --client
```

## 🔧 **环境配置**

### **1. 克隆构建脚本仓库**
```bash
# 克隆仓库
git clone git@github.com:mag1666888-del/im-cicd.git
cd im-cicd/build-scripts

# 配置环境变量
cp config/env.example .env
nano .env
```

### **2. 配置环境变量**
```bash
# 编辑环境变量文件
nano .env

# 必需配置
DOCKERHUB_USERNAME=mag1666888
DOCKERHUB_PASSWORD=your-dockerhub-password
GITHUB_TOKEN=your-github-token
GITHUB_USERNAME=mag1666888-del

# ACK配置 (可选)
ACK_CLUSTER_ID=your-cluster-id
ACK_REGION=cn-hangzhou
```

### **3. 配置SSH密钥**
```bash
# 生成SSH密钥 (如果没有)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 添加GitHub公钥
cat ~/.ssh/id_rsa.pub
# 将输出内容添加到GitHub SSH Keys

# 测试SSH连接
ssh -T git@github.com
```

## 🚀 **快速开始**

### **1. 构建单个项目**
```bash
# 构建openim-cms项目
./scripts/main.sh build-single openim-cms v1.0.0

# 或者直接使用脚本
./scripts/build-single.sh openim-cms v1.0.0
```

### **2. 构建所有项目**
```bash
# 构建所有项目
./scripts/main.sh build-all

# 并行构建
./scripts/main.sh build-all --parallel
```

### **3. 查看项目状态**
```bash
# 查看所有项目状态
./scripts/main.sh status

# 查看单个项目状态
./scripts/main.sh status openim-cms
```

### **4. 更新ACK部署**
```bash
# 更新项目到新版本
./scripts/main.sh update openim-cms v1.0.1
```

## 🔍 **项目类型支持**

### **前端项目 (如OpenIM CMS)**
- **技术栈**: React, Vue, Angular等
- **构建工具**: npm, yarn, pnpm
- **输出**: 静态文件 + Nginx

### **后端项目**
- **技术栈**: Node.js, Python, Java, Go等
- **构建工具**: 项目特定
- **输出**: 可执行文件或JAR包

### **全栈项目**
- **技术栈**: 前后端一体化
- **构建工具**: 组合使用
- **输出**: 完整应用

## 📋 **Docker Hub配置**

### **1. 注册Docker Hub账号**
- 访问 https://hub.docker.com
- 注册账号: `mag1666888`
- 创建仓库: `openim-cms`

### **2. 配置访问权限**
```bash
# 登录Docker Hub
docker login

# 输入用户名和密码
Username: mag1666888
Password: your-password
```

## 🎯 **ACK集群配置**

### **1. 创建ACK集群**
- 进入阿里云容器服务ACK
- 创建托管版集群
- 节点规格: 2核4G
- 节点数量: 2个

### **2. 配置kubectl**
```bash
# 在ACK控制台获取kubeconfig
# 保存到 ~/.kube/config

# 测试连接
kubectl get nodes
```

## 🔄 **自动化配置**

### **1. 定时构建**
```bash
# 编辑crontab
crontab -e

# 每天凌晨2点构建
0 2 * * * cd /path/to/build-scripts && ./scripts/main.sh build-all
```

### **2. 监控脚本**
```bash
# 创建监控脚本
cat > monitor.sh << 'EOF'
#!/bin/bash
cd /path/to/build-scripts
./scripts/main.sh status
EOF

chmod +x monitor.sh
```

## 🚨 **故障排除**

### **常见问题**

1. **Docker权限问题**
   ```bash
   # 添加用户到docker组
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **GitHub SSH连接问题**
   ```bash
   # 测试SSH连接
   ssh -T git@github.com
   
   # 如果失败，检查SSH密钥
   ssh-add -l
   ```

3. **Docker Hub推送失败**
   ```bash
   # 重新登录
   docker logout
   docker login
   ```

4. **kubectl连接问题**
   ```bash
   # 检查kubeconfig
   kubectl config view
   
   # 测试连接
   kubectl cluster-info
   ```

### **日志查看**
```bash
# 查看构建日志
tail -f logs/build-openim-cms-*.log

# 查看系统日志
journalctl -u docker
```

## 📊 **性能优化**

### **1. Docker优化**
```bash
# 配置Docker守护进程
sudo nano /etc/docker/daemon.json

# 添加以下配置
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

### **2. 系统优化**
```bash
# 增加文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 优化内核参数
echo "vm.max_map_count=262144" >> /etc/sysctl.conf
sysctl -p
```

## 🎉 **总结**

**必需软件**:
- ✅ Docker + Docker Compose
- ✅ Node.js 20
- ✅ Git + SSH
- ✅ jq (JSON处理)

**可选软件**:
- 🔧 kubectl (ACK管理)
- 🔧 1Panel (Web管理界面)

**配置要点**:
- 🔑 Docker Hub凭据
- 🔑 GitHub SSH密钥
- 🔑 ACK集群连接

这样配置后，您的ECS服务器就可以完美支持多项目构建和部署了！
