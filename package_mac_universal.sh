#!/bin/bash

# LogAna macOS 通用版 (Universal) 打包脚本 - 同时支持 Intel 和 Apple Silicon

APP_NAME="LogAna"
APP_PATH="build/bin/${APP_NAME}.app"
DMG_PATH="build/bin/${APP_NAME}_Universal.dmg"
TEMP_DIR="build/bin/dmg_temp_universal"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===> 1. 开始构建通用版二进制文件 (darwin/universal)...${NC}"
echo -e "${BLUE}注意: 通用版构建时间较长，因为它会同时编译 arm64 和 amd64 架构。${NC}"

# 使用 wails 构建通用架构
wails build -platform darwin/universal

if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败，请确保您已安装相关的交叉编译工具链。${NC}"
    exit 1
fi

echo -e "${BLUE}===> 2. 构建成功，开始生成 DMG 镜像...${NC}"

# 清理旧文件
rm -rf "$TEMP_DIR"
rm -f "$DMG_PATH"

# 准备临时目录
mkdir -p "$TEMP_DIR"
cp -R "$APP_PATH" "$TEMP_DIR/"
ln -s /Applications "$TEMP_DIR/Applications"

# 使用 hdiutil 创建 DMG
echo -e "${BLUE}正在生成 DMG (通用版)...${NC}"
hdiutil create -volname "${APP_NAME}_Universal" -srcfolder "$TEMP_DIR" -ov -format UDZO "$DMG_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}===> 打包成功!${NC}"
    echo -e "${GREEN}通用版安装包位置: ${DMG_PATH}${NC}"
else
    echo -e "${RED}===> 打包失败!${NC}"
    exit 1
fi

# 清理
rm -rf "$TEMP_DIR"
