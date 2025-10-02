#!/bin/bash

echo "🚀 开始部署OpenIM基础设施组件到K8s集群..."

# 创建命名空间
echo "📦 创建命名空间..."
kubectl apply -f mongodb.yaml

# 等待命名空间创建完成
kubectl wait --for=condition=Active namespace/openim-infrastructure --timeout=60s

# 部署MongoDB
echo "🍃 部署MongoDB..."
kubectl apply -f mongodb.yaml
kubectl wait --for=condition=ready pod -l app=mongodb -n openim-infrastructure --timeout=300s

# 部署Redis
echo "🔴 部署Redis..."
kubectl apply -f redis.yaml
kubectl wait --for=condition=ready pod -l app=redis -n openim-infrastructure --timeout=300s

# 部署etcd
echo "🔧 部署etcd..."
kubectl apply -f etcd.yaml
kubectl wait --for=condition=ready pod -l app=etcd -n openim-infrastructure --timeout=300s

# 部署Kafka
echo "📨 部署Kafka..."
kubectl apply -f kafka.yaml
kubectl wait --for=condition=ready pod -l app=kafka -n openim-infrastructure --timeout=300s

# 部署MinIO
echo "📦 部署MinIO..."
kubectl apply -f minio.yaml
kubectl wait --for=condition=ready pod -l app=minio -n openim-infrastructure --timeout=300s

echo "✅ 所有基础设施组件部署完成！"
echo ""
echo "📋 服务状态："
kubectl get pods -n openim-infrastructure
echo ""
echo "🌐 服务地址："
kubectl get svc -n openim-infrastructure
echo ""
echo "🔗 服务连接信息："
echo "MongoDB: mongodb.openim-infrastructure.svc.cluster.local:27017"
echo "Redis: redis.openim-infrastructure.svc.cluster.local:6379"
echo "etcd: etcd.openim-infrastructure.svc.cluster.local:2379"
echo "Kafka: kafka.openim-infrastructure.svc.cluster.local:9094"
echo "MinIO: minio.openim-infrastructure.svc.cluster.local:9000"
