# 空白页面调试指南

## 问题排查步骤

### 1. 检查控制台错误

**打开浏览器开发者工具**:
- Chrome/Edge: `F12` 或 `Ctrl+Shift+I`
- Safari: `Cmd+Option+I`
- Firefox: `F12`

**查看 Console 标签页**:
- 是否有红色错误信息？
- 是否有 JavaScript 运行时错误？
- 记录所有错误信息

### 2. 检查编译错误

**查看终端输出**:
```bash
cd packages/wechat-db-manager
pnpm dev
```

- 是否有 TypeScript 编译错误？
- 是否有 Vite 构建错误？
- 是否有模块导入错误？

### 3. 逐步排查

我已经准备了三个版本的 App.tsx，请按顺序测试：

#### 步骤 1: 测试基础版本
```bash
# 复制基础版本
cp src/App.tsx src/App-current-backup.tsx
cp src/App-simple.tsx src/App.tsx
```

如果基础版本能正常显示，说明问题在复杂组件中。

#### 步骤 2: 测试导航版本
```bash
# 如果基础版本正常，测试导航版本
cp src/App-with-nav.tsx src/App.tsx
```

如果导航版本正常，说明问题在具体页面组件中。

#### 步骤 3: 恢复完整版本
```bash
# 测试完整版本
cp src/App-complex-backup.tsx src/App.tsx
```

### 4. 常见问题及解决方案

#### A. 导入路径错误
**症状**: 模块未找到错误
**解决**: 检查所有 import 路径是否正确

#### B. TypeScript 类型错误
**症状**: 编译时类型错误
**解决**: 
- 检查 props 接口定义
- 确保所有类型正确导入
- 修复类型不匹配

#### C. CSS 类名问题
**症状**: 样式不生效或动态类名错误
**解决**: 
- 避免动态拼接 Tailwind 类名
- 使用固定的类名或条件渲染

#### D. 组件渲染错误
**症状**: 组件内部 JavaScript 错误
**解决**: 
- 检查组件内的条件渲染逻辑
- 确保所有必需的 props 已传递
- 检查 hooks 使用是否正确

### 5. 获取详细错误信息

**在浏览器控制台运行**:
```javascript
// 检查 React 错误边界
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

// 检查未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
```

### 6. 快速修复

如果遇到问题，可以快速使用工作版本：

```bash
# 使用简化但可工作的版本
cp src/App-simple.tsx src/App.tsx
```

然后重新启动开发服务器：
```bash
pnpm dev
```

### 7. 联系支持

如果问题仍然存在，请提供：
1. 控制台错误截图
2. 终端错误信息
3. 当前使用的 App.tsx 版本
4. 系统环境信息 (Node.js 版本、pnpm 版本等)

## 预防性措施

1. **逐步开发**: 一次只添加一个功能
2. **频繁测试**: 每次更改后立即测试
3. **代码备份**: 保留工作版本的备份
4. **错误监控**: 始终关注控制台输出

## 常用调试命令

```bash
# 清理缓存并重新安装
pnpm clean-install

# 类型检查
pnpm tsc --noEmit

# 强制重新构建
rm -rf node_modules/.vite
pnpm dev
```