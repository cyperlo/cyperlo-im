#!/bin/bash
repos_addr='registry.cn-hangzhou.aliyuncs.com/hailong-bot/user-rpc-test'
tag='latest'

container_name="cyperlo-im-user-rpc-test"

docker stop ${container_name}
docker rm ${container_name}
docker rmi ${container_name}
docker pull ${repos_addr}:${tag}

docker run -p 10000:8080 --name=${container_name} -d ${repos_addr}:${tag}