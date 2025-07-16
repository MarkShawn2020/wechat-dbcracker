// 数据库页面布局相关的工具函数

export const PANEL_STORAGE_KEY = 'database-page-layout';

export const DEFAULT_PANEL_SIZES = {
  database: 30,  // 数据库列表列
  tables: 25,    // 表格列表列
  content: 45    // 内容列
};

export const PANEL_LIMITS = {
  database: { min: 20, max: 50 },
  tables: { min: 15, max: 40 },
  content: { min: 30, max: 65 }
};

/**
 * 重置面板布局到默认大小
 */
export const resetPanelLayout = (): void => {
  // 清除localStorage中的面板布局数据
  localStorage.removeItem(PANEL_STORAGE_KEY);
  
  // 触发页面刷新以应用默认布局
  // 注意：这会导致整个页面刷新，在生产环境中可能需要更优雅的方案
  window.location.reload();
};

/**
 * 获取当前面板布局配置
 */
export const getCurrentPanelLayout = (): { database: number; tables: number; content: number } | null => {
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        database: parsed[0] || DEFAULT_PANEL_SIZES.database,
        tables: parsed[1] || DEFAULT_PANEL_SIZES.tables,
        content: parsed[2] || DEFAULT_PANEL_SIZES.content
      };
    }
  } catch (error) {
    console.warn('Failed to parse panel layout from localStorage:', error);
  }
  return null;
};

/**
 * 检查是否使用了自定义布局
 */
export const hasCustomLayout = (): boolean => {
  return getCurrentPanelLayout() !== null;
};