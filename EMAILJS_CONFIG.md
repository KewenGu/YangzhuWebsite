# EmailJS 配置说明

本网站使用 EmailJS 服务来发送联系表单邮件。请按照以下步骤配置：

## 1. 创建 EmailJS 账户

1. 访问 [EmailJS 官网](https://www.emailjs.com/)
2. 注册一个免费账户
3. 验证您的邮箱

## 2. 设置邮件服务

1. 登录 EmailJS 控制台
2. 点击 "Add New Service"
3. 选择您的邮件提供商（如 Gmail, Outlook, Yahoo 等）
4. 按照指引连接您的邮箱
5. 记录生成的 **Service ID**

## 3. 创建邮件模板

1. 在 EmailJS 控制台点击 "Email Templates"
2. 点击 "Create New Template"
3. 设置模板内容，使用以下变量：

**邮件主题设置:**
```
{{subject}}
```

**邮件内容模板:**
```
您收到来自{{to_name}}网站的新联系：

发件人: {{from_name}}
邮箱地址: {{from_email}}
提交时间: {{timestamp}}

消息内容:
{{message}}

---
此邮件通过网站联系表单自动发送
如需回复，请直接回复此邮件
```

4. 在 "Settings" 标签页设置：
   - **To Email**: 您的邮箱地址
   - **Reply To**: {{reply_to}}
5. 记录生成的 **Template ID**

## 4. 获取 Public Key

1. 在 EmailJS 控制台点击 "Account"
2. 在 "API Keys" 部分找到 **Public Key**
3. 复制此密钥

## 5. 更新网站配置

编辑 `new-script.js` 文件，找到以下部分并替换：

```javascript
// EmailJS配置 - 需要替换为实际的服务配置
this.emailjsConfig = {
    serviceId: 'YOUR_SERVICE_ID',     // 替换为步骤2中的Service ID
    templateId: 'YOUR_TEMPLATE_ID',   // 替换为步骤3中的Template ID
    publicKey: 'YOUR_PUBLIC_KEY'      // 替换为步骤4中的Public Key
};
```

同时找到初始化部分并替换：

```javascript
// 初始化EmailJS（如果可用）
if (typeof emailjs !== 'undefined') {
    emailjs.init('YOUR_PUBLIC_KEY');  // 替换为您的Public Key
    console.log('EmailJS已初始化');
}
```

## 6. 测试邮件功能

1. 保存文件并重新加载网站
2. 在联系表单中填写测试信息
3. 提交表单
4. 检查您的邮箱是否收到邮件

## 故障排除

### 表单显示"模拟模式"
- 检查是否已正确替换配置中的 `YOUR_SERVICE_ID` 等占位符
- 确保所有配置项都已填写

### 邮件发送失败
- 检查 EmailJS 服务是否正确配置
- 确认邮件模板中的变量名称正确
- 检查浏览器控制台的错误信息

### 没有收到邮件
- 检查垃圾邮件文件夹
- 确认 EmailJS 模板中的 "To Email" 设置正确
- 检查 EmailJS 控制台的发送日志

## 免费限额

EmailJS 免费账户每月可发送 200 封邮件。如需更多，可升级到付费计划。

## 安全注意事项

- Public Key 可以公开，但不要暴露 Private Key
- 建议定期检查 EmailJS 的使用统计
- 可以在 EmailJS 控制台设置域名限制以提高安全性