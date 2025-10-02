# 多项目构建脚本仓库

## 📁 **目录结构**

```
build-scripts/
├── README.md                    # 说明文档
├── config/
│   ├── projects.json           # 项目配置
│   └── env.example             # 环境变量示例
├── scripts/
│   ├── build-all.sh            # 构建所有项目
│   ├── build-single.sh         # 构建单个项目
│   ├── update-ack.sh           # 更新ACK部署
│   └── utils.sh                # 工具函数
├── projects/
│   ├── openim-cms/             # OpenIM CMS项目
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── ack-deployment.yaml
│   └── other-project/          # 其他项目
└── logs/                       # 构建日志
```

## 🚀 **使用方法**

### **1. 克隆仓库**
```bash
git clone https://github.com/your-username/build-scripts.git
cd build-scripts
```

### **2. 配置环境**
```bash
cp config/env.example .env
# 编辑 .env 文件，设置必要的环境变量
```

### **3. 构建项目**
```bash
# 构建所有项目
./scripts/build-all.sh

# 构建单个项目
./scripts/build-single.sh openim-cms v1.0.0
```

## 🔧 **配置说明**

### **项目配置 (config/projects.json)**
```json
{
  "projects": {
    "openim-cms": {
      "name": "OpenIM CMS",
      "description": "企业级聊天管理系统",
      "git_url": "https://github.com/your-username/my-im-cicd.git",
      "git_branch": "main",
      "dockerfile_path": "im-cms/deployment/Dockerfile",
      "build_context": "im-cms",
      "dockerhub_repo": "your-username/openim-cms",
      "backend_server": "chat-service.default.svc.cluster.local:8080",
      "ack_namespace": "default",
      "ack_deployment": "openim-cms"
    }
  }
}
```

### **环境变量 (.env)**
```bash
# Docker Hub配置
DOCKERHUB_USERNAME=your-username
DOCKERHUB_PASSWORD=your-password

# GitHub配置
GITHUB_TOKEN=your-github-token

# ACK配置
ACK_CLUSTER_ID=your-cluster-id
ACK_REGION=cn-hangzhou

# 通用配置
LOG_LEVEL=info
BUILD_LOG_DIR=./logs
```

## 📋 **支持的项目类型**

- **前端项目**: React, Vue, Angular等
- **后端项目**: Node.js, Python, Java等
- **全栈项目**: 前后端一体化项目
- **微服务项目**: 多个服务组合

## 🔄 **工作流程**

1. **代码更新** → GitHub仓库
2. **触发构建** → ECS执行构建脚本
3. **构建镜像** → 推送到Docker Hub
4. **部署更新** → ACK拉取新镜像
5. **健康检查** → 验证部署结果

## 📊 **监控和日志**

- **构建日志**: `logs/build-{project}-{timestamp}.log`
- **部署日志**: `logs/deploy-{project}-{timestamp}.log`
- **错误日志**: `logs/error-{project}-{timestamp}.log`

## 🛠️ **维护操作**

### **添加新项目**
1. 在 `config/projects.json` 中添加项目配置
2. 在 `projects/` 目录下创建项目文件夹
3. 添加项目的Dockerfile和部署配置

### **更新项目配置**
1. 修改 `config/projects.json`
2. 重新运行构建脚本

### **查看构建状态**
```bash
# 查看所有项目状态
./scripts/status.sh

# 查看特定项目日志
tail -f logs/build-openim-cms-$(date +%Y%m%d).log
```

## 🎯 **优势**

1. **统一管理**: 所有项目的构建脚本集中管理
2. **标准化**: 统一的构建和部署流程
3. **可扩展**: 轻松添加新项目
4. **易维护**: 配置和脚本分离
5. **自动化**: 支持定时构建和自动部署
