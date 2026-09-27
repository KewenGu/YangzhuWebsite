const EMAIL_CONFIG = {"serviceId": "service_rof5hxf", "templateId": "template_b3ehhvq", "publicKey": "Gz67fXq0iOr1tz24f"};
// Shared language and form behavior. No private service credentials belong here.
class LanguageManager {
    constructor() {
        try { this.currentLang = localStorage.getItem('selectedLanguage') === 'en' ? 'en' : 'zh'; }
        catch { this.currentLang = 'zh'; }
        this.updateLanguage();
    }
    switchLanguage(lang) {
        this.currentLang = lang === 'en' ? 'en' : 'zh';
        try { localStorage.setItem('selectedLanguage', this.currentLang); } catch { /* Session-only language is still usable. */ }
        this.updateLanguage();
    }
    updateLanguage() {
        document.documentElement.lang = this.currentLang === 'en' ? 'en' : 'zh-CN';
        document.querySelectorAll('[data-zh][data-en]').forEach(element => {
            const text = element.dataset[this.currentLang];
            if (element.matches('input,textarea')) element.placeholder = text;
            else element.textContent = text;
        });
        document.querySelectorAll('.content-zh,.content-en').forEach(element => {
            const visible = element.classList.contains('content-' + this.currentLang);
            element.hidden = !visible;
            element.style.display = visible ? '' : 'none';
        });
        document.dispatchEvent(new Event('languagechange'));
    }
}

class FormManager {
    constructor(config) {
        this.config = config;
        this.form = document.getElementById('contact-form');
        this.status = document.getElementById('contact-status');
        this.pending = false;
        this.state = '';
        this.copy = {
            sending:['正在发送，请稍候…','Sending your message…'],
            sent:['留言已发送，我们会尽快回复。','Your message has been sent. We will respond as soon as possible.'],
            invalid:['请填写姓名、有效邮箱和至少10个字符的留言。','Please enter your name, a valid email, and a message of at least 10 characters.'],
            failed:['暂时无法发送。内容已保留，请稍后重试，或直接邮件联系 office@yangzhu.org。','Unable to send. Your message is preserved. Please retry later or email office@yangzhu.org.'],
            uncertain:['尚未收到发送确认。为避免重复发送，请稍后确认邮箱或直接联系 office@yangzhu.org。','Delivery has not been confirmed. To avoid a duplicate, check your email later or contact office@yangzhu.org.']
        };
        this.form?.addEventListener('submit', event => { event.preventDefault(); this.submit(); });
        document.addEventListener('languagechange', () => this.render());
    }
    render() {
        if (!this.form) return;
        const english = window.languageManager.currentLang === 'en';
        const button = this.form.querySelector('button[type=submit]');
        button.disabled = this.pending;
        button.textContent = this.pending ? (english ? 'Sending…' : '发送中…') : (english ? 'Send Message' : '发送留言');
        this.form.setAttribute('aria-busy', String(this.pending));
        this.status.textContent = this.state ? this.copy[this.state][english ? 1 : 0] : '';
        this.status.className = 'form-status ' + this.state;
    }
    async submit() {
        if (this.pending || !this.form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(this.form));
        if (!data.name.trim() || !data.email.trim() || data.message.trim().length < 10) {
            this.state = 'invalid'; this.render(); return;
        }
        this.pending = true; this.state = 'sending'; this.render();
        let timer;
        try {
            if (!window.emailjs?.send) throw new Error('unavailable');
            const send = window.emailjs.send(this.config.serviceId, this.config.templateId, {
                from_name: data.name.trim(), from_email: data.email.trim(), message: data.message.trim(),
                to_name: '美国阳翥道教协会', reply_to: data.email.trim(),
                subject: '网站联系表单 - ' + data.name.trim(), timestamp: new Date().toISOString()
            }, this.config.publicKey);
            const response = await Promise.race([send, new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('timeout')), 20000);
            })]);
            if (response.status !== 200) throw new Error('rejected');
            this.state = 'sent'; this.form.reset();
        } catch (error) {
            this.state = error.message === 'timeout' ? 'uncertain' : 'failed';
        } finally {
            clearTimeout(timer); this.pending = false; this.render();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.languageManager = new LanguageManager();
    window.contactFormManager = new FormManager(EMAIL_CONFIG);
    // A native POST displays the provider's real validation/confirmation page.
    const newsletter = document.getElementById('newsletter-form');
    newsletter?.addEventListener('submit', () => {
        const status = document.getElementById('newsletter-message');
        status.dataset.zh = '请在新打开的页面完成确认；如未打开，请允许此站点打开新窗口后重试。';
        status.dataset.en = 'Complete confirmation in the new window. If it did not open, allow a new window for this site and retry.';
        status.textContent = status.dataset[window.languageManager.currentLang];
    });
});
