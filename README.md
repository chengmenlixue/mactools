# LogAna - 高性能日志查询工具

这是一个使用 Go (Wails) 和 React 开发的 macOS 桌面软件，专门优化用于查询 10GB 以上的超大日志文件。

## 核心特性
- **高性能并行扫描**: 利用 Go 协程对大文件进行分块并行处理，充分利用多核 CPU。
- **正则与 Grep 逻辑**: 支持正则表达式查询，支持忽略大小写 (-i) 和反向匹配 (-v)。
- **流式结果展示**: 搜索结果实时推送至前端，避免大文件扫描时的界面卡顿。
- **优美简洁的 UI**: 适配 macOS 风格的深色模式界面。

## 性能设计
- **内存映射与分块读取**: 避免将整个文件加载到内存，10GB+ 文件扫描时内存占用极低。
- **前端虚拟滚动建议**: 推荐在生产环境中使用 `react-window` 展示海量结果。

## 快速开始

### 前置条件
1. 安装 [Go](https://golang.org/doc/install) (1.21+)
2. 安装 [Node.js](https://nodejs.org/) (用于前端开发)
3. 安装 [Wails CLI](https://wails.io/docs/gettingstarted/installation):
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

### 运行应用
在项目根目录下运行：
```bash
wails dev
```

### 编译打包 (macOS)
```bash
wails build
```

## 项目结构
- `internal/scanner`: Go 核心扫描算法实现。
- `app.go`: Wails 应用绑定与事件流处理。
- `frontend/`: 基于 React + Tailwind CSS 的前端代码。


## 打包成 macOS 安装包 (.dmg)

由于 macOS 的安全权限限制，使用 `create-dmg` 经常会遇到 `Finder 错误 (-10006)`。为了解决这个问题，我提供了一个**原生打包脚本**，它不需要第三方依赖，且不会触发权限报错。

### 推荐方案：使用原生打包脚本
该脚本使用 macOS 自带的 `hdiutil` 工具，稳定且快速。

```bash
# 1. 确保已生成 .app 文件
wails build

# 2. 运行打包脚本
./package_mac.sh
```

生成的安装包位于：`build/bin/LogAna.dmg`

### 备选方案：手动执行 (hdiutil)
如果不想运行脚本，也可以手动输入以下命令：

```bash
# 准备目录
mkdir -p build/bin/dmg_temp
cp -R build/bin/LogAna.app build/bin/dmg_temp/
ln -s /Applications build/bin/dmg_temp/Applications

# 生成 DMG
hdiutil create -volname "LogAna" -srcfolder build/bin/dmg_temp -ov -format UDZO build/bin/LogAna.dmg

# 清理
rm -rf build/bin/dmg_temp
```