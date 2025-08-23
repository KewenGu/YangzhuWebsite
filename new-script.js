// 全新的JavaScript文件 - 修复导航问题

// 语言切换功能
class LanguageManager {
    constructor() {
        this.currentLang = 'zh';
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateLanguage();
    }

    bindEvents() {
        const langBtns = document.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                this.switchLanguage(lang);
            });
        });
    }

    switchLanguage(lang) {
        this.currentLang = lang;
        
        // 更新按钮状态
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // 更新页面语言
        this.updateLanguage();
        
        // 更新HTML lang属性
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    }

    updateLanguage() {
        // 处理data-zh/data-en属性的元素
        const elements = document.querySelectorAll('[data-zh][data-en]');
        elements.forEach(element => {
            const text = this.currentLang === 'zh' ? element.dataset.zh : element.dataset.en;
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });

        // 处理content-zh/content-en类的元素
        const zhElements = document.querySelectorAll('.content-zh');
        const enElements = document.querySelectorAll('.content-en');
        
        zhElements.forEach(element => {
            element.style.display = this.currentLang === 'zh' ? 'block' : 'none';
        });
        
        enElements.forEach(element => {
            element.style.display = this.currentLang === 'en' ? 'block' : 'none';
        });
    }
}

// 简化的导航管理器 - 只处理必要功能
class SimpleNavigationManager {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.navToggle = document.querySelector('.nav-toggle');
        this.navMenu = document.querySelector('.nav-menu');
        this.init();
    }

    init() {
        this.bindEvents();
        this.handleScroll();
    }

    bindEvents() {
        // 移动端菜单切换
        if (this.navToggle && this.navMenu) {
            this.navToggle.addEventListener('click', () => {
                this.navMenu.classList.toggle('active');
                this.navToggle.classList.toggle('active');
            });
        }

        // 只处理哈希链接的平滑滚动，完全不干扰HTML页面链接
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 80; // 考虑导航栏高度
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
                // 关闭移动端菜单
                if (this.navMenu && this.navToggle) {
                    this.navMenu.classList.remove('active');
                    this.navToggle.classList.remove('active');
                }
            });
        });

        // 滚动事件
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    handleScroll() {
        if (this.navbar) {
            if (window.scrollY > 100) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }
        }
    }
}

// 表单处理
class FormManager {
    constructor() {
        this.contactForm = document.querySelector('.contact-form form');
        // EmailJS配置 - 请参考 EMAILJS_CONFIG.md 文件进行配置
        this.emailjsConfig = {
            serviceId: 'YOUR_SERVICE_ID', // 替换为您的 EmailJS Service ID
            templateId: 'YOUR_TEMPLATE_ID', // 替换为您的 EmailJS Template ID
            publicKey: 'YOUR_PUBLIC_KEY' // 替换为您的 EmailJS Public Key
        };
        
        // 邮件设置
        this.emailSettings = {
            recipientName: '美国阳翥道教协会', // 可自定义收件人名称
            replyToEmail: '', // 自动使用表单提交者的邮箱作为回复地址
            subjectPrefix: '网站联系表单' // 邮件主题前缀
        };
        this.init();
    }

    init() {
        if (this.contactForm) {
            this.bindEvents();
        }
    }

    bindEvents() {
        this.contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    async handleSubmit() {
        const formData = new FormData(this.contactForm);
        const data = {
            name: formData.get('name') || this.contactForm.querySelector('input[type="text"]').value,
            email: formData.get('email') || this.contactForm.querySelector('input[type="email"]').value,
            message: formData.get('message') || this.contactForm.querySelector('textarea').value
        };

        // 验证表单
        if (!this.validateForm(data)) {
            return;
        }

        // 显示提交状态
        this.showSubmitState(true);

        try {
            // 提交表单数据（使用EmailJS）
            const result = await this.submitWithEmailJS(data);
            
            // 显示成功消息
            const languageManager = window.languageManager || { currentLang: 'zh' };
            const isZh = languageManager.currentLang === 'zh';
            const successMessage = isZh ? '消息发送成功！我们会尽快回复您。' : 'Message sent successfully! We will reply to you soon.';
            
            this.showMessage('success', successMessage);
            this.contactForm.reset();
            
            // 记录提交到本地存储
            this.saveToLocalStorage(data);
            
        } catch (error) {
            // 显示错误消息
            const languageManager = window.languageManager || { currentLang: 'zh' };
            const isZh = languageManager.currentLang === 'zh';
            const errorMessage = isZh ? '发送失败，请稍后重试。' : 'Failed to send. Please try again later.';
            
            this.showMessage('error', errorMessage);
            console.error('表单提交错误:', error);
        } finally {
            this.showSubmitState(false);
        }
    }

    validateForm(data) {
        const languageManager = window.languageManager || { currentLang: 'zh' };
        const isZh = languageManager.currentLang === 'zh';
        
        if (!data.name.trim()) {
            const message = isZh ? '请输入姓名' : 'Please enter your name';
            this.showMessage('error', message);
            return false;
        }
        if (data.name.trim().length < 2) {
            const message = isZh ? '姓名至少需要2个字符' : 'Name must be at least 2 characters';
            this.showMessage('error', message);
            return false;
        }
        if (!data.email.trim() || !this.isValidEmail(data.email)) {
            const message = isZh ? '请输入有效的邮箱地址' : 'Please enter a valid email address';
            this.showMessage('error', message);
            return false;
        }
        if (!data.message.trim()) {
            const message = isZh ? '请输入留言内容' : 'Please enter your message';
            this.showMessage('error', message);
            return false;
        }
        if (data.message.trim().length < 10) {
            const message = isZh ? '留言内容至少需要10个字符' : 'Message must be at least 10 characters';
            this.showMessage('error', message);
            return false;
        }
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async submitWithEmailJS(data) {
        try {
            console.log('使用EmailJS发送邮件:', data);
            
            // 检查EmailJS是否可用
            if (typeof emailjs === 'undefined') {
                throw new Error('EmailJS library not loaded');
            }
            
            // 检查配置是否已设置
            if (this.emailjsConfig.serviceId === 'YOUR_SERVICE_ID') {
                console.warn('EmailJS配置未设置，使用模拟模式');
                return this.simulateSubmit(data);
            }
            
            // 准备邮件模板参数
            const templateParams = {
                from_name: data.name,
                from_email: data.email,
                message: data.message,
                to_name: this.emailSettings.recipientName,
                reply_to: this.emailSettings.replyToEmail || data.email,
                subject: `${this.emailSettings.subjectPrefix} - ${data.name}`,
                timestamp: new Date().toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            
            // 使用EmailJS发送邮件
            const response = await emailjs.send(
                this.emailjsConfig.serviceId,
                this.emailjsConfig.templateId,
                templateParams,
                this.emailjsConfig.publicKey
            );
            
            console.log('EmailJS发送成功:', response);
            return {
                success: true,
                message: '邮件发送成功',
                response: response
            };
            
        } catch (error) {
            console.error('EmailJS发送失败:', error);
            throw {
                success: false,
                message: error.message || '邮件发送失败'
            };
        }
    }

    async simulateSubmit(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log('表单数据提交（模拟模式）:', data);
                
                // 模拟网络延迟和成功率
                const success = Math.random() > 0.1; // 90% 成功率
                
                if (success) {
                    console.log('表单提交成功（模拟模式）');
                    resolve({
                        success: true,
                        message: '消息已成功发送（模拟模式）'
                    });
                } else {
                    console.log('表单提交失败（模拟模式）');
                    reject({
                        success: false,
                        message: '网络错误，请稍后重试（模拟模式）'
                    });
                }
            }, 1500 + Math.random() * 1000); // 1.5-2.5秒延迟
        });
    }

    showSubmitState(isSubmitting) {
        const submitBtn = this.contactForm.querySelector('button[type="submit"]');
        const languageManager = window.languageManager || { currentLang: 'zh' };
        const isZh = languageManager.currentLang === 'zh';
        
        if (isSubmitting) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.textContent = isZh ? '发送中...' : 'Sending...';
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.textContent = isZh ? '发送留言' : 'Send Message';
        }
    }

    saveToLocalStorage(data) {
        try {
            const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
            submissions.push({
                ...data,
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            });
            
            // 只保留最近10条记录
            if (submissions.length > 10) {
                submissions.splice(0, submissions.length - 10);
            }
            
            localStorage.setItem('contactSubmissions', JSON.stringify(submissions));
        } catch (error) {
            console.error('保存到本地存储失败:', error);
        }
    }

    showMessage(type, message) {
        // 移除现有消息
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 创建新消息
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message ${type}`;
        messageDiv.textContent = message;
        
        // 插入到表单前面
        this.contactForm.parentNode.insertBefore(messageDiv, this.contactForm);

        // 自动移除消息
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('新JavaScript文件已加载');
    
    // 初始化EmailJS（如果可用）
    if (typeof emailjs !== 'undefined') {
        // 注意：需要替换为您的实际Public Key
        emailjs.init('YOUR_PUBLIC_KEY');
        console.log('EmailJS已初始化');
    } else {
        console.warn('EmailJS未加载，将使用模拟模式');
    }
    
    // 初始化语言管理器
    window.languageManager = new LanguageManager();
    
    // 初始化简化的导航管理器
    const navigationManager = new SimpleNavigationManager();
    
    // 初始化表单管理器
    const formManager = new FormManager();

    // 添加页面加载动画
    document.body.classList.add('loaded');
    
    // 页面内容加载完成后立即滚动到顶部
    window.scrollTo({
        top: 0,
        behavior: 'instant'
    });
});

// 页面完全加载完成后也滚动到顶部
window.addEventListener('load', () => {
    window.scrollTo({
        top: 0,
        behavior: 'instant'
    });
});

// 添加CSS样式
const style = document.createElement('style');
style.textContent = `
    .form-message {
        padding: 1rem 1.5rem;
        margin-bottom: 1.5rem;
        border-radius: 12px;
        font-weight: 500;
        font-size: 0.95rem;
        line-height: 1.4;
        position: relative;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease-out;
        transition: all 0.3s ease;
    }
    
    .form-message:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    
    .form-message.success {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
        border: 2px solid #22c55e;
        color: #16a34a;
    }
    
    .form-message.success::before {
        content: "✓";
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #22c55e;
        font-weight: bold;
        font-size: 1.1rem;
    }
    
    .form-message.success {
        padding-left: 3rem;
    }
    
    .form-message.error {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
        border: 2px solid #ef4444;
        color: #dc2626;
    }
    
    .form-message.error::before {
        content: "⚠";
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #ef4444;
        font-weight: bold;
        font-size: 1.1rem;
    }
    
    .form-message.error {
        padding-left: 3rem;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .navbar.scrolled {
        background: rgba(26, 26, 26, 0.98);
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
    }
    
    @media (max-width: 1100px) {
        .nav-menu {
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            width: 100% !important;
            background: var(--bg-secondary) !important;
            flex-direction: column !important;
            padding: 1rem 0 !important;
            transform: translateY(-100%) !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transition: all 0.3s ease !important;
            border-top: 1px solid var(--border-color) !important;
            display: flex !important;
            z-index: 999 !important;
        }
        
        .nav-menu.active {
            transform: translateY(0) !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: flex !important;
        }
        
        .nav-menu .nav-link {
            padding: 0.8rem 1.5rem !important;
            text-align: center !important;
            border-bottom: 1px solid rgba(139, 69, 19, 0.2) !important;
            transition: background-color 0.3s ease !important;
        }
        
        .nav-menu .nav-link:hover {
            background-color: rgba(139, 69, 19, 0.1) !important;
        }
        
        .nav-menu .nav-link.active {
            background-color: rgba(139, 69, 19, 0.2) !important;
            color: var(--secondary-color) !important;
        }
        
        .nav-toggle.active span:nth-child(1) {
            transform: rotate(-45deg) translate(-5px, 6px);
        }
        
        .nav-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .nav-toggle.active span:nth-child(3) {
            transform: rotate(45deg) translate(-5px, -6px);
        }
    }
`;
document.head.appendChild(style);

console.log('新JavaScript文件初始化完成，导航链接应该可以正常工作了');