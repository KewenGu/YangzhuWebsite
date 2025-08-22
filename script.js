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
        const elements = document.querySelectorAll('[data-zh][data-en]');
        elements.forEach(element => {
            const text = this.currentLang === 'zh' ? element.dataset.zh : element.dataset.en;
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });
    }
}

// 导航栏功能
class NavigationManager {
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
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // 导航链接点击
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                this.smoothScrollTo(targetId);
                this.closeMobileMenu();
            });
        });

        // 滚动事件
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    toggleMobileMenu() {
        this.navMenu.classList.toggle('active');
        this.navToggle.classList.toggle('active');
    }

    closeMobileMenu() {
        this.navMenu.classList.remove('active');
        this.navToggle.classList.remove('active');
    }

    handleScroll() {
        if (window.scrollY > 100) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }
    }

    smoothScrollTo(targetId) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80; // 考虑固定导航栏高度
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }
}

// 滚动动画
class ScrollAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.observeElements();
        this.bindEvents();
    }

    observeElements() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // 观察需要动画的元素
        const animatedElements = document.querySelectorAll('.member-card, .activity-card, .ceremony-item');
        animatedElements.forEach(el => {
            observer.observe(el);
        });
    }

    bindEvents() {
        // 滚动指示器点击
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', () => {
                const aboutSection = document.querySelector('#about');
                if (aboutSection) {
                    aboutSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
}

// 表单处理
class FormManager {
    constructor() {
        this.contactForm = document.querySelector('.contact-form form');
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
            // 这里可以添加实际的表单提交逻辑
            // 例如发送到服务器或邮件服务
            await this.simulateSubmit(data);
            
            // 显示成功消息
            this.showMessage('success', '消息发送成功！我们会尽快回复您。');
            this.contactForm.reset();
        } catch (error) {
            // 显示错误消息
            this.showMessage('error', '发送失败，请稍后重试。');
        } finally {
            this.showSubmitState(false);
        }
    }

    validateForm(data) {
        if (!data.name.trim()) {
            this.showMessage('error', '请输入姓名');
            return false;
        }
        if (!data.email.trim() || !this.isValidEmail(data.email)) {
            this.showMessage('error', '请输入有效的邮箱地址');
            return false;
        }
        if (!data.message.trim()) {
            this.showMessage('error', '请输入留言内容');
            return false;
        }
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async simulateSubmit(data) {
        // 模拟网络请求延迟
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('表单数据:', data);
                resolve();
            }, 1000);
        });
    }

    showSubmitState(isSubmitting) {
        const submitBtn = this.contactForm.querySelector('button[type="submit"]');
        if (isSubmitting) {
            submitBtn.disabled = true;
            submitBtn.textContent = '发送中...';
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = '发送留言';
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
    // 初始化语言管理器
    const languageManager = new LanguageManager();
    
    // 初始化导航管理器
    const navigationManager = new NavigationManager();
    
    // 初始化滚动动画
    const scrollAnimations = new ScrollAnimations();
    
    // 初始化表单管理器
    const formManager = new FormManager();

    // 添加页面加载动画
    document.body.classList.add('loaded');

    // 添加CSS动画样式
    const style = document.createElement('style');
    style.textContent = `
        .form-message {
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            font-weight: 500;
        }
        
        .form-message.success {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid #22c55e;
            color: #22c55e;
        }
        
        .form-message.error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #ef4444;
        }
        
        .member-card,
        .activity-card,
        .ceremony-item {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .member-card.animate-in,
        .activity-card.animate-in,
        .ceremony-item.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .navbar.scrolled {
            background: rgba(26, 26, 26, 0.98);
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
        }
        
        body.loaded .hero-title {
            animation: fadeInUp 1s ease-out;
        }
        
        body.loaded .hero-subtitle {
            animation: fadeInUp 1s ease-out 0.2s both;
        }
        
        body.loaded .hero-description {
            animation: fadeInUp 1s ease-out 0.4s both;
        }
        
        body.loaded .taoist-symbol {
            animation: fadeInScale 1s ease-out 0.6s both;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.8);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        @media (max-width: 768px) {
            .nav-menu {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background: var(--bg-secondary);
                flex-direction: column;
                padding: 1rem 0;
                transform: translateY(-100%);
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                border-top: 1px solid var(--border-color);
            }
            
            .nav-menu.active {
                transform: translateY(0);
                opacity: 1;
                visibility: visible;
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
});

// 添加一些额外的交互效果
window.addEventListener('load', () => {
    // 视差滚动效果
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.taoist-symbol, .about-symbol, .world-map');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });

    // 鼠标移动效果
    document.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        const heroElements = document.querySelectorAll('.hero-title, .hero-subtitle, .hero-description');
        heroElements.forEach((element, index) => {
            const moveX = (mouseX - 0.5) * (index + 1) * 10;
            const moveY = (mouseY - 0.5) * (index + 1) * 10;
            element.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
});
