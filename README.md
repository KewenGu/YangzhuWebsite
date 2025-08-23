# 美国阳翥道教协会官方网站

## 项目简介

这是为纽约新成立的阳翥道教协会设计的官方网站，采用庄严肃穆的设计风格，体现道教文化的深厚底蕴。

## 功能特性

### 🌐 多语言支持
- 中文（简体/繁体）
- 英文
- 实时语言切换

### 📱 响应式设计
- 桌面端、平板、手机全适配
- 现代化移动端体验

### 🎨 庄严肃穆的设计风格
- 深色主题配色
- 金色装饰元素
- 道教文化符号
- 优雅的动画效果

### 📋 网站内容
- **首页**: 协会简介和核心理念
- **协会介绍**: 使命愿景和成立背景
- **主要成员**: 会长、副会长、秘书长介绍
- **协会活动**: 经典诵读、文化讲座、养生修炼、文化活动
- **协会法会**: 上元节、中元节、下元节法会安排
- **国际联谊**: 全球道教交流与合作
- **联系我们**: 联系方式和留言咨询

## 技术架构

### 前端技术
- **HTML5**: 语义化标签结构
- **CSS3**: 现代CSS特性，包括Grid、Flexbox、动画
- **JavaScript ES6+**: 模块化编程，面向对象设计
- **响应式设计**: 移动优先的设计理念

### 核心功能模块
- `LanguageManager`: 语言切换管理
- `NavigationManager`: 导航和滚动管理
- `ScrollAnimations`: 滚动动画效果
- `FormManager`: 表单处理和验证

## 文件结构

```
YangzhuWebsite/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 交互脚本
├── images/             # 图片资源目录
│   └── logo.png        # 协会标志（需要添加）
└── README.md           # 项目说明
```

## 使用方法

### 本地运行
1. 克隆或下载项目文件
2. 在浏览器中打开 `index.html`
3. 或使用本地服务器运行（推荐）

### 使用本地服务器
```bash
# 使用Python
python -m http.server 8000

# 使用Node.js
npx serve .

# 使用PHP
php -S localhost:8000
```

### 部署到服务器
1. 上传所有文件到Web服务器
2. 确保服务器支持静态文件服务
3. 配置域名和SSL证书（推荐）

## 自定义配置

### 修改颜色主题
在 `styles.css` 中修改CSS变量：
```css
:root {
    --primary-color: #8B4513;      /* 主色调 */
    --secondary-color: #DAA520;    /* 次要色调 */
    --accent-color: #CD853F;       /* 强调色 */
    --text-primary: #F5F5DC;       /* 主要文字 */
    --text-secondary: #DEB887;     /* 次要文字 */
    --bg-primary: #1a1a1a;         /* 主背景 */
    --bg-secondary: #2d2d2d;       /* 次要背景 */
}
```

### 添加新语言
1. 在HTML元素中添加新的 `data-*` 属性
2. 在 `LanguageManager` 类中添加语言切换逻辑

### 修改内容
- 编辑 `index.html` 中的文本内容
- 更新 `data-zh` 和 `data-en` 属性值
- 修改图片和图标

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 性能优化

- 图片懒加载
- CSS和JavaScript压缩
- 字体优化加载
- 响应式图片

## 维护说明

### 定期更新
- 检查并更新协会信息
- 更新活动安排和法会日期
- 维护联系信息准确性

### 内容管理
- 使用语义化HTML标签
- 保持多语言内容同步
- 定期检查链接有效性

## 联系信息

如需技术支持或有任何问题，请联系：
- 邮箱: office@yangzhu.org
- 电话: 已隐藏

## 许可证

本项目仅供阳翥道教协会使用，保留所有权利。

---

**承法旌阳，道翥西土**  
*Inheriting the Dharma of Jingyang, and letting the Dao soar across the Western land*
