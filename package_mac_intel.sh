#!/bin/bash

# LogAna macOS Intel 芯片打包脚本 (x86_64)

APP_NAME="LogAna"
APP_PATH="build/bin/${APP_NAME}.app"
DMG_PATH="build/bin/${APP_NAME}_Intel.dmg"
TEMP_DIR="build/bin/dmg_temp_intel"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===> 1. 开始构建 Intel 架构二进制文件 (darwin/amd64)...${NC}"

# 使用 wails 构建 Intel 架构的软件包
wails build -platform darwin/amd64

if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败，请检查 Wails 环境配置。${NC}"
    exit 1
fi

echo -e "${BLUE}===> 2. 构建成功，开始生成 DMG 镜像...${NC}"

# 检查 .app 是否存在
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}错误: 找不到 ${APP_PATH}。${NC}"
    exit 1
fi

# 清理旧文件
rm -rf "$TEMP_DIR"
rm -f "$DMG_PATH"

# 准备临时目录
mkdir -p "$TEMP_DIR"
cp -R "$APP_PATH" "$TEMP_DIR/"
ln -s /Applications "$TEMP_DIR/Applications"

# 使用 hdiutil 创建 DMG
echo -e "${BLUE}正在生成 DMG (Intel 专用)...${NC}"
hdiutil create -volname "${APP_NAME}_Intel" -srcfolder "$TEMP_DIR" -ov -format UDZO "$DMG_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}===> 打包成功!${NC}"
    echo -e "${GREEN}Intel 版安装包位置: ${DMG_PATH}${NC}"
else
    echo -e "${RED}===> 打包失败!${NC}"
    exit 1
fi

# 清理
rm -rf "$TEMP_DIR"
