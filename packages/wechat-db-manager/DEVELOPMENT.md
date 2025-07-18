# Development Guide

## 新功能说明

### 1. 文件选择器
- 用户可以通过点击"Select Keys File"按钮选择 `.keys` 文件
- 选择的文件路径会自动保存到 localStorage 中
- 支持重新加载和更换文件

### 2. 状态管理
- 使用 Jotai 进行状态管理
- 持久化存储选择的文件路径
- 全局状态包括：
  - `keysFilePathAtom`: 当前选择的文件路径
  - `databasesAtom`: 数据库列表
  - `loadingAtom`: 加载状态
  - `errorAtom`: 错误状态
  - `selectedDatabaseAtom`: 选中的数据库

### 3. 用户界面改进
- 新增文件选择器组件
- 数据库信息面板显示详细信息
- 状态栏显示当前状态和文件信息
- 更宽的侧边栏（384px）以容纳更多信息

### 4. 错误处理
- 友好的错误提示
- 重试机制
- 自动状态恢复

## 开发步骤

1. **安装依赖**
```bash
pnpm install
```

2. **启动开发服务器**
```bash
pnpm tauri dev
```

3. **构建生产版本**
```bash
pnpm tauri build
```

## 使用说明

1. **选择文件**
   - 点击"Select Keys File"按钮
   - 选择你的 `.keys` 文件
   - 应用会自动解析并显示数据库列表

2. **浏览数据库**
   - 在左侧列表中点击数据库
   - 查看数据库详细信息
   - 浏览表结构和数据

3. **数据操作**
   - 执行自定义SQL查询
   - 导出数据为CSV格式
   - 分页浏览表数据

## 故障排除

### 常见问题

1. **文件选择器无法打开**
   - 确保已安装 `tauri-plugin-dialog`
   - 检查权限设置

2. **数据库连接失败**
   - 确认数据库文件路径正确
   - 检查文件权限
   - 验证密钥格式

3. **状态不持久化**
   - 检查 localStorage 是否可用
   - 确认浏览器设置允许本地存储

### 调试技巧

1. **查看状态**
   - 状态栏显示当前状态
   - 控制台输出详细错误信息

2. **重置状态**
   - 清除浏览器 localStorage
   - 重新选择文件

3. **性能优化**
   - 大数据库使用分页查询
   - 限制并发连接数