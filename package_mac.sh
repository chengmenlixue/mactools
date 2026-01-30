#!/bin/bash

# LogAna macOS 包装脚本 (使用 hdiutil 避开 Finder 权限问题)

APP_NAME="LogAna"
APP_PATH="build/bin/${APP_NAME}.app"
DMG_PATH="build/bin/${APP_NAME}.dmg"
TEMP_DIR="build/bin/dmg_temp"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===> 开始打包 ${APP_NAME}...${NC}"

# 1. 检查 .app 是否存在
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}错误: 找不到 ${APP_PATH}。请先运行 'wails build'。${NC}"
    exit 1
fi

# 2. 清理旧文件
echo -e "${BLUE}清理旧文件...${NC}"
rm -rf "$TEMP_DIR"
rm -f "$DMG_PATH"

# 3. 准备临时目录
echo -e "${BLUE}准备打包内容...${NC}"
mkdir -p "$TEMP_DIR"
cp -R "$APP_PATH" "$TEMP_DIR/"
ln -s /Applications "$TEMP_DIR/Applications"

# 4. 使用 hdiutil 创建 DMG
echo -e "${BLUE}正在生成 DMG 镜像 (原生模式)...${NC}"
hdiutil create -volname "${APP_NAME}" -srcfolder "$TEMP_DIR" -ov -format UDZO "$DMG_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}===> 打包成功!${NC}"
    echo -e "${GREEN}安装包位置: ${DMG_PATH}${NC}"
else
    echo -e "${RED}===> 打包失败!${NC}"
    exit 1
fi

# 5. 清理临时目录
rm -rf "$TEMP_DIR"
