# 美国阳翥道教协会官方网站

> 承法旌阳，道翥西土  
> *Inheriting the Dharma of Jingyang, and letting the Dao soar across the Western land*

---

## 🌟 项目简介

美国阳翥道教协会官方网站，采用庄严肃穆的设计风格，体现道教文化的深厚底蕴。网站致力于弘扬道教文化、促进国际道教交流、服务社区大众。

**网站地址**: [yangzhu.org](https://yangzhu.org)

---

## ✨ 功能特性

### 🌐 多语言支持
- 中文（简体）和英文双语切换
- 实时语言切换，所有内容自动适配
- 语言选择自动保存

### 📱 响应式设计
- 完美适配桌面端、平板、手机
- 移动端优化的导航菜单
- 现代化的用户体验

### 🎨 设计风格
- 深色主题配色，庄严肃穆
- 金色装饰元素，突显道教特色
- 道教文化符号点缀
- 优雅的滚动动画和交互效果

### 📧 互动功能
- **邮件订阅**（Mailchimp）- 页脚订阅表单，自动同步到邮件列表
- **留言咨询**（EmailJS）- 联系表单，留言直接发送到邮箱
- 表单验证和友好的用户反馈
- 支持中英文双语提示

---

## 📋 网站内容

| 页面 | 描述 |
|------|------|
| **首页** | 协会简介、核心理念、主要成员预览 |
| **协会介绍** | 使命愿景、成立背景、发展历程 |
| **主要成员** | 会长、副会长、理事、顾问详细介绍 |
| **协会活动** | 经典诵读、文化讲座、博物馆参访、公益活动 |
| **协会法会** | 传统道教仪式和法会安排 |
| **国际联谊** | 全球道教组织交流与合作 |
| **联系我们** | 联系方式、留言表单、邮件订阅 |

---

## 🏗️ 技术架构

### 前端技术栈
- **HTML5** - 语义化标签结构
- **CSS3** - 现代特性（Grid、Flexbox、动画）
- **JavaScript ES6+** - 模块化、面向对象设计
- **响应式设计** - 移动优先理念

### 第三方服务
- **Mailchimp** - 邮件订阅和营销
- **EmailJS** - 表单邮件发送
- **Google Fonts** - Noto Serif 字体

### 核心模块
```javascript
LanguageManager      // 语言切换管理
NavigationManager    // 导航和滚动管理
FormManager         // 留言表单处理（EmailJS）
NewsletterManager   // 订阅表单处理（Mailchimp）
```

---

## 📁 文件结构

```
YangzhuWebsite/
├── index.html              # 首页
├── about.html              # 协会介绍
├── members.html            # 主要成员
├── activities.html         # 协会活动
├── ceremonies.html         # 协会法会
├── relations.html          # 国际联谊
│
├── styles.css              # 全局样式
├── script.js               # 旧版脚本（保留）
├── new-script.js           # 新版主脚本
├── includes.js             # 页面组件（导航、页脚）
│
├── images/                 # 网站图片
│   ├── logo.png
│   ├── logo.svg
│   └── Rotating_earth_animated_transparent.gif
│
├── assets/                 # 内容资源
│   ├── about/              # 协会介绍内容
│   ├── members/            # 成员信息和照片
│   │   ├── president/      # 会长
│   │   ├── vice_president/ # 副会长
│   │   ├── director1/      # 理事1
│   │   ├── director2/      # 理事2
│   │   └── advisor/        # 顾问
│   ├── activities/         # 活动资料
│   ├── ceremonies/         # 法会照片
│   └── relations/          # 国际联谊资料
│
└── README.md               # 项目说明
```

---

## 🚀 快速开始

### 本地运行

```bash
# 使用 Python
python -m http.server 8000
# 或
python3 -m http.server 8000

# 使用 Node.js
npx serve .

# 使用 PHP
php -S localhost:8000
```

然后访问：`http://localhost:8000/index.html`

### 部署到 GitHub Pages

1. 推送代码到 GitHub 仓库
2. 进入仓库设置 → Pages
3. 选择分支（通常是 main）
4. 保存，等待部署完成
5. 访问生成的网址

---

## ⚙️ 配置说明

### Mailchimp 邮件订阅

**配置位置**: `new-script.js` (第 620-630 行)

已配置的信息：
- 数据中心：us20
- API Key：已配置
- List ID：已配置
- User ID：已配置

**功能**：访客在页脚输入邮箱订阅，自动同步到 Mailchimp 列表。

### EmailJS 留言功能

**配置位置**: `new-script.js` (第 206-210 行)

已配置的信息：
- Service ID：service_rof5hxf
- Template ID：template_b3ehhvq
- Public Key：已配置

**功能**：访客填写联系表单，留言直接发送到您的邮箱。

---

## 🎨 自定义配置

### 修改颜色主题

编辑 `styles.css` 中的 CSS 变量：

```css
:root {
    --primary-color: #8B4513;      /* 主色调：棕色 */
    --secondary-color: #DAA520;    /* 次要色调：金色 */
    --accent-color: #CD853F;       /* 强调色：浅棕 */
    --text-primary: #F5F5DC;       /* 主要文字：米色 */
    --text-secondary: #DEB887;     /* 次要文字：小麦色 */
    --bg-primary: #1a1a1a;         /* 主背景：深黑 */
    --bg-secondary: #2d2d2d;       /* 次要背景：灰黑 */
}
```

### 添加或修改内容

1. 编辑对应的 HTML 文件
2. 使用 `data-zh` 和 `data-en` 属性添加双语内容
3. 图片和资源文件放在 `assets/` 目录

### 添加新成员

1. 在 `assets/members/` 创建新目录
2. 添加所需文件：
   - `title_zh.txt` / `title_en.txt` - 职位
   - `body_zh.txt` / `body_en.txt` - 介绍
   - `照片.jpg` / `照片_no_bg.png` - 照片
3. 更新 `index.html`（首页卡片）
4. 更新 `members.html`（详细页面）

---

## 🌍 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 12+ |
| Edge | 79+ |
| 移动端浏览器 | ✅ 完全支持 |

---

## 📊 性能优化

- ✅ 图片优化和懒加载
- ✅ CSS 和 JavaScript 模块化
- ✅ 字体优化加载（Google Fonts）
- ✅ 响应式图片处理
- ✅ 缓存控制（版本号参数）

---

## 🔧 维护指南

### 定期更新
- 更新活动和法会信息
- 维护联系信息
- 检查外部链接有效性

### 内容管理
- 保持中英文内容同步
- 使用统一的命名规范
- 定期备份照片和资源文件

### 技术维护
- 检查表单功能正常
- 验证 Mailchimp 和 EmailJS 配置
- 更新第三方库版本

---

## 🐛 故障排查

### 表单无法输入？
**原因**：浏览器缓存  
**解决**：清除缓存或使用无痕窗口

### 语言切换不生效？
**原因**：浏览器缓存  
**解决**：强制刷新（Ctrl+Shift+R）或清除缓存

### 订阅/留言提交失败？
**检查**：
1. 浏览器控制台错误信息
2. Mailchimp/EmailJS 配置是否正确
3. 网络连接是否正常

---

## 📞 联系方式

**美国阳翥道教协会**
- 邮箱：office@yangzhu.org
- 地址：纽约市曼哈顿区
- 网站：yangzhu.org

---

## 📄 许可证

本项目为美国阳翥道教协会专用，保留所有权利。

---

## 🙏 致谢

感谢所有为道教文化传播做出贡献的成员和支持者。

---

**美国阳翥道教协会** © 2025  
*Yangzhu Taoist Association of America*
