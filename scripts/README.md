# OpenIM 构建部署脚本

## 📁 脚本说明

### 核心脚本

- **`main.sh`** - 统一入口脚本，提供简化的命令接口
- **`onekey-build-and-deploy.sh`** - 一键构建并部署（二开镜像）
- **`ack-onekey-external.sh`** - 一键安装到ACK（全新集群）
- **`update-ack.sh`** - 更新ACK应用版本
- **`utils.sh`** - 工具函数库

## 🚀 使用方法

### 1. 统一入口（推荐）

```bash
# 查看帮助
./main.sh help

# 一键构建并部署
./main.sh onekey-build

# 一键安装到ACK
./main.sh onekey-install

# 更新应用版本
./main.sh update openim-cms v1.0.1
```

### 2. 直接调用脚本

```bash
# 一键构建并部署
./onekey-build-and-deploy.sh

# 一键安装到ACK
./ack-onekey-external.sh

# 更新应用版本
./update-ack.sh openim-cms v1.0.1
```

## ⚙️ 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DOCKER_USER` | `mag1666888` | Docker Hub用户名 |
| `TAG` | `dev` | 镜像标签 |
| `NAMESPACE` | `default` | K8s命名空间 |
| `OIS_DIR` | `/home/im/open-im-server` | open-im-server目录 |
| `CHAT_DIR` | `/home/im/chat` | chat目录 |

## 📋 功能说明

### 一键构建并部署 (`onekey-build-and-deploy.sh`)
- 构建并推送 OpenIM Server 各组件镜像
- 构建并推送 Chat API 镜像
- 一键切换 K8s Deployment 的镜像
- 自动应用/修复 RBAC

### 一键安装到ACK (`ack-onekey-external.sh`)
- 使用外部 Redis/Mongo/MinIO/Kafka
- 服务发现使用 Kubernetes（ACK自带）
- 自动配置所有必要的 K8s 资源

### 更新应用版本 (`update-ack.sh`)
- 更新指定项目到新版本
- 支持滚动更新
- 自动验证更新结果

## 🔧 依赖要求

- Docker
- kubectl
- 阿里云 ACK 集群
- 外部基础设施（Redis、MongoDB、MinIO、Kafka）

## 📝 注意事项

1. 确保已正确配置 kubectl 连接到 ACK 集群
2. 确保 Docker Hub 凭据已配置
3. 确保外部基础设施服务可访问
4. 建议在测试环境先验证脚本功能
