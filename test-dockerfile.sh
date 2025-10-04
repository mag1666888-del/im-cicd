#!/bin/bash

# 测试Dockerfile路径的脚本

echo "=== 测试Dockerfile路径 ==="

# 模拟构建脚本的工作流程
TEMP_DIR="./test-temp"
PROJECT_NAME="openim-cms"
GIT_URL="git@github.com:mag1666888-del/im-cicd.git"
GIT_BRANCH="main"
DOCKERFILE_PATH="im-cms/deployment/Dockerfile"

# 创建临时目录
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

echo "当前目录: $(pwd)"

# 克隆代码
echo "克隆代码..."
git clone -b "$GIT_BRANCH" "$GIT_URL" "$PROJECT_NAME"
cd "$PROJECT_NAME"

echo "克隆后目录: $(pwd)"
echo "目录内容:"
ls -la

echo "检查Dockerfile路径: $DOCKERFILE_PATH"
if [ -f "$DOCKERFILE_PATH" ]; then
    echo "✅ Dockerfile存在: $DOCKERFILE_PATH"
    echo "Dockerfile内容预览:"
    head -5 "$DOCKERFILE_PATH"
else
    echo "❌ Dockerfile不存在: $DOCKERFILE_PATH"
    echo "尝试查找Dockerfile:"
    find . -name "Dockerfile" -type f
fi

# 清理
cd ../..
rm -rf "$TEMP_DIR"
