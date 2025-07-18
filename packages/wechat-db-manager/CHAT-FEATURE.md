# 聊天功能实现说明

## 功能概述

在 WeChat DB Manager 中实现了仿微信的聊天页面功能，提供双列布局查看微信聊天记录：
- 左侧：联系人列表，支持搜索
- 右侧：选中联系人的聊天记录

## 实现组件

### ChatView 组件
- 路径：`src/components/ChatView.tsx`
- 主要功能：
  - 自动检测联系人数据库 (Contact 类型)
  - 自动检测消息数据库 (Message 类型)
  - 解析联系人信息
  - 解析并聚合多个消息数据库的聊天记录
  - 实时搜索联系人
  - 消息时间格式化显示

## 集成方式

### 1. 主应用集成
在 `App.tsx` 中添加了：
- 聊天按钮（消息图标）
- 聊天视图状态管理
- 视图切换逻辑

### 2. 按钮位置
聊天按钮位于应用顶部工具栏，在 Overview 按钮左侧。

### 3. 视图管理
- 聊天视图与 Overview 和表格视图互斥
- 聊天模式下隐藏右侧属性面板，节省空间

## 技术特性

### 数据库支持
- **Contact 数据库**: 自动识别联系人表 (wccontact_new2, Contact 等)
- **Message 数据库**: 支持多个消息数据库文件聚合 (msg_0.db ~ msg_9.db)

### 智能解析
- 自动识别表列结构
- 智能匹配姓名、用户名、消息内容等字段
- 容错处理，跳过无效数据

### 用户体验
- 联系人搜索功能
- 消息按时间排序
- 自动滚动到最新消息
- 消息统计信息显示
- 响应式设计

## 使用方法

1. **启动应用**：
   ```bash
   cd packages/wechat-db-manager
   pnpm dev
   ```

2. **加载数据库**：
   - 使用设置面板加载 keys.toml 文件
   - 确保包含 Contact 和 Message 类型的数据库

3. **查看聊天记录**：
   - 点击顶部工具栏的聊天按钮（💬）
   - 在左侧联系人列表中搜索或选择联系人
   - 右侧将显示该联系人的聊天记录

## UI 设计

### 联系人列表
- 头像显示（首字母圆形背景）
- 联系人姓名和用户名
- 搜索框支持实时过滤
- 选中状态高亮显示

### 聊天记录
- 消息气泡设计
- 时间智能格式化（今天显示时间，昨天显示"昨天"等）
- 消息统计信息
- 空状态友好提示

### 响应式特性
- 左右面板比例优化 (1:2)
- 消息列表自动滚动
- 加载状态指示器

## 错误处理

- 数据库连接失败提示
- 表结构不匹配容错
- 数据解析异常处理
- 友好的错误信息显示

## 数据安全

- 只读访问数据库
- 不修改原始数据
- 遵循 Tauri 安全模型

## 扩展计划

未来可以考虑添加：
- 群聊支持
- 消息类型识别（图片、文件等）
- 消息导出功能
- 高级搜索功能
- 消息时间范围筛选

## 依赖要求

- Tauri 2.0
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (图标)
- Jotai (状态管理)

## 注意事项

1. 需要正确配置的 keys.toml 文件
2. 确保数据库文件可访问
3. 聊天功能依赖现有的数据库连接 API
4. 消息解析基于常见的微信数据库表结构，可能需要根据不同版本调整