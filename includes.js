// 页面组件包含系统
console.log('includes.js loaded');
window.includesLoaded = true;

// 立即执行测试
console.log('includes.js 开始执行');

// 立即执行函数，不等待DOMContentLoaded
(function() {
    console.log('includes.js 立即执行函数开始');
    
    // 如果DOM还没准备好，等待一下
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadIncludes);
    } else {
        loadIncludes();
    }
    
    function loadIncludes() {
        console.log('includes.js loadIncludes 函数执行');
    
    // 导航栏HTML
    const navigationHTML = `
    <nav class="navbar">
        <div class="nav-container">
            <a href="index.html" class="nav-logo">
                <img src="images/logo.png" alt="阳翥道教协会" class="logo-img">
                <span class="logo-text" data-zh="阳翥道教协会" data-en="Yangzhu Taoist Association"></span>
            </a>
            <div class="nav-menu">
                <a href="index.html" class="nav-link" data-zh="首页" data-en="Home">首页</a>
                <a href="about.html" class="nav-link" data-zh="协会介绍" data-en="About">协会介绍</a>
                <a href="members.html" class="nav-link" data-zh="主要成员" data-en="Members">主要成员</a>
                <a href="activities.html" class="nav-link" data-zh="协会活动" data-en="Activities">协会活动</a>
                <a href="ceremonies.html" class="nav-link" data-zh="协会法会" data-en="Ceremonies">协会法会</a>
                <a href="relations.html" class="nav-link" data-zh="国际联谊" data-en="Relations">国际联谊</a>
                <a href="#contact" class="nav-link" data-zh="联系我们" data-en="Contact">联系我们</a>
            </div>
            <div class="nav-language">
                <button class="lang-btn active" data-lang="zh">中</button>
                <button class="lang-btn" data-lang="en">EN</button>
            </div>
            <div class="nav-toggle">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>`;

    // 联系我们部分HTML
    const contactHTML = `
    <section id="contact" class="contact-section">
        <div class="container">
            <h2 class="section-title" data-zh="联系我们" data-en="Contact Us">联系我们</h2>
            <div class="contact-content">
                <div class="contact-info">
                    <div class="contact-item">
                        <div class="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                        </div>
                        <div>
                            <h4 data-zh="地址" data-en="Address">地址</h4>
                            <p data-zh="纽约市曼哈顿区" data-en="Manhattan, New York City">纽约市曼哈顿区</p>
                        </div>
                    </div>
                    <div class="contact-item">
                        <div class="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                            </svg>
                        </div>
                        <div>
                            <h4 data-zh="邮箱" data-en="Email">邮箱</h4>
                            <a href="mailto:office@yangzhu.org">office@yangzhu.org</a>
                        </div>
                    </div>
                    <div class="contact-item" style="display: none;">
                        <div class="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                                <line x1="12" y1="18" x2="12.01" y2="18"/>
                                <polyline points="9,6 12,3 15,6"/>
                            </svg>
                        </div>
                        <div>
                            <h4 data-zh="电话" data-en="Phone">电话</h4>
                            <p>+1 (212) XXX-XXXX</p>
                        </div>
                    </div>
                </div>
                <div class="contact-form">
                    <h3 data-zh="留言咨询" data-en="Send Message">留言咨询</h3>
                    <form>
                        <input type="text" name="name" data-zh="姓名" data-en="Name" placeholder="姓名" required>
                        <input type="email" name="email" data-zh="邮箱" data-en="Email" placeholder="邮箱" required>
                        <textarea name="message" data-zh="留言内容" data-en="Message" placeholder="留言内容" rows="5" required></textarea>
                        <button type="submit" data-zh="发送留言" data-en="Send Message">发送留言</button>
                    </form>
                </div>
            </div>
        </div>
    </section>`;

    // 页脚HTML
    const footerHTML = `
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-logo">
                    <img src="images/logo.png" alt="阳翥道教协会" class="footer-logo-img">
                    <p data-zh="美国阳翥道教协会" data-en="Yangzhu Taoist Association of America">美国阳翥道教协会</p>
                </div>
                <div class="footer-links">
                    <a href="about.html" data-zh="关于我们" data-en="About Us">关于我们</a>
                    <a href="activities.html" data-zh="活动安排" data-en="Activities">活动安排</a>
                    <a href="#contact" data-zh="联系方式" data-en="Contact">联系方式</a>
                </div>
                <div class="footer-newsletter">
                    <h4 data-zh="邮件订阅" data-en="Newsletter Subscription">邮件订阅</h4>
                    <p data-zh="订阅我们的邮件，获取最新活动和法会信息" data-en="Subscribe to our newsletter for latest activities and ceremony updates">订阅我们的邮件，获取最新活动和法会信息</p>
                    <form class="newsletter-form" id="newsletter-form">
                        <div class="newsletter-input-group">
                            <input type="email" id="newsletter-email" data-zh="输入您的邮箱" data-en="Enter your email" placeholder="输入您的邮箱" required>
                            <button type="submit" class="newsletter-btn">
                                <span data-zh="订阅" data-en="Subscribe">订阅</span>
                            </button>
                        </div>
                        <div class="newsletter-message" id="newsletter-message"></div>
                    </form>
                </div>
                <div class="footer-social">
                    <a href="https://www.instagram.com/yangzhusect/" target="_blank" rel="noopener noreferrer" class="social-link" title="Instagram">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                    </a>
                    <a href="https://www.facebook.com/p/Yangzhu-Taoist-Association-of-America-%E7%BE%8E%E5%9B%BD%E9%98%B3%E7%BF%A5%E9%81%93%E6%95%99%E5%8D%8F%E4%BC%9A-61562619520276/" target="_blank" rel="noopener noreferrer" class="social-link" title="Facebook">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                        </svg>
                    </a>
                    <a href="#" class="social-link" title="YouTube">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.94C18.88 4 12 4 12 4s-6.88 0-8.6.48a2.78 2.78 0 0 0-1.94 1.94A29 29 0 0 0 1 11.75a29 29 0 0 0 .48 5.33A2.78 2.78 0 0 0 3.4 19c1.72.48 8.6.48 8.6.48s6.88 0 8.6-.48a2.78 2.78 0 0 0 1.94-1.94 29 29 0 0 0 .48-5.33 29 29 0 0 0-.48-5.33z"/>
                            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                        </svg>
                    </a>
                </div>
            </div>
            <div class="footer-bottom">
                <p data-zh="© 2025 美国阳翥道教协会. 保留所有权利." data-en="© 2025 Yangzhu Taoist Association of America. All rights reserved.">© 2025 美国阳翥道教协会. 保留所有权利.</p>
            </div>
        </div>
    </footer>`;

    // 替换导航栏
    const navElements = document.querySelectorAll('[data-include="navigation"]');
    navElements.forEach(element => {
        element.outerHTML = navigationHTML;
    });

    // 替换联系我们部分
    const contactElements = document.querySelectorAll('[data-include="contact"]');
    contactElements.forEach(element => {
        element.outerHTML = contactHTML;
    });

    // 替换页脚
    const footerElements = document.querySelectorAll('[data-include="footer"]');
    console.log('Found footer elements:', footerElements.length);
    footerElements.forEach(element => {
        element.outerHTML = footerHTML;
        console.log('Footer replaced successfully');
    });

    // 设置当前页面的导航高亮
    setTimeout(() => {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === 'index.html' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }, 100);

    // 确保现有的脚本功能正常工作
    setTimeout(() => {
        // 重新初始化任何需要的事件监听器
        if (typeof window.initializeLanguageSwitcher === 'function') {
            window.initializeLanguageSwitcher();
        }
        if (typeof window.initializeMobileMenu === 'function') {
            window.initializeMobileMenu();
        }
        
        // 通知 LanguageManager 更新语言（包括新加载的元素）
        if (window.languageManager) {
            console.log('includes.js: 触发语言更新');
            window.languageManager.updateLanguage();
        }
    }, 200);
    
    console.log('includes.js execution completed');
    }
})();