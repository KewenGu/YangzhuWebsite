# 快速设置指南 - 启用邮件发送功能

## 当前状态
✅ EmailJS已集成到网站  
❌ 需要配置您的EmailJS账户信息

## 快速设置步骤（5分钟完成）

### 第一步：获取EmailJS配置
1. 访问 https://www.emailjs.com/ 并注册
2. 连接您的邮箱服务（Gmail推荐）
3. 创建邮件模板（复制下面的模板）
4. 获取3个重要信息：Service ID, Template ID, Public Key

### 第二步：邮件模板（复制粘贴）
**主题：**
```
{{subject}}
```

**内容：**
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

### 第三步：更新网站配置
编辑 `new-script.js` 文件第132-136行：

**查找：**
```javascript
this.emailjsConfig = {
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID', 
    publicKey: 'YOUR_PUBLIC_KEY'
};
```

**替换为：**
```javascript
this.emailjsConfig = {
    serviceId: '您的Service ID',
    templateId: '您的Template ID', 
    publicKey: '您的Public Key'
};
```

同时更新第374行：
**查找：** `emailjs.init('YOUR_PUBLIC_KEY');`  
**替换为：** `emailjs.init('您的Public Key');`

### 第四步：测试
1. 保存文件
2. 刷新网站
3. 填写联系表单测试

## 如果遇到问题
- 查看详细说明：`EMAILJS_CONFIG.md`
- 检查浏览器控制台错误信息
- 确认EmailJS控制台中的服务状态

## 自定义设置
如需修改收件人名称等，编辑 `new-script.js` 第139-143行：
```javascript
this.emailSettings = {
    recipientName: '您的组织名称',
    replyToEmail: '', // 留空使用表单发送者邮箱
    subjectPrefix: '网站联系表单'
};
```