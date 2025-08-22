# GitHub Pages 部署指南

## 自动部署（推荐）

您的网站已经推送到GitHub，现在需要启用GitHub Pages：

### 1. 启用GitHub Pages
1. 访问您的GitHub仓库：https://github.com/KewenGu/YangzhuWebsite
2. 点击 "Settings" 标签
3. 在左侧菜单中找到 "Pages"
4. 在 "Source" 部分选择 "Deploy from a branch"
5. 选择 "main" 分支
6. 选择 "/(root)" 文件夹
7. 点击 "Save"

### 2. 等待部署
- GitHub会自动构建和部署您的网站
- 部署完成后，您会看到一个绿色的勾号
- 网站将在几分钟内可用

### 3. 访问网站
部署完成后，您的网站将可以通过以下URL访问：
```
https://kewengu.github.io/YangzhuWebsite/
```

## 手动部署（如果需要）

如果您需要手动部署：

```bash
# 确保所有更改已提交
git add .
git commit -m "Update website content"
git push origin main

# 创建gh-pages分支（可选）
git checkout -b gh-pages
git push origin gh-pages
```

## 自定义域名（可选）

如果您有自己的域名：

1. 在GitHub Pages设置中添加自定义域名
2. 在域名提供商处添加CNAME记录
3. 在仓库根目录创建 `CNAME` 文件，内容为您的域名

## 故障排除

### 常见问题：
1. **网站不显示**：检查GitHub Pages是否已启用
2. **样式丢失**：确保所有文件路径正确
3. **图片不显示**：检查图片文件是否已提交

### 检查部署状态：
- 在仓库的 "Actions" 标签中查看部署日志
- 在 "Settings" > "Pages" 中查看部署状态

## 更新网站

每次推送代码到main分支时，GitHub Pages会自动重新部署：

```bash
git add .
git commit -m "Update website"
git push origin main
```

## 性能优化建议

1. **图片优化**：使用WebP格式，压缩图片大小
2. **CSS/JS压缩**：在生产环境中压缩文件
3. **CDN加速**：考虑使用Cloudflare等CDN服务

---

您的阳翥道教协会官方网站将在几分钟内上线！
