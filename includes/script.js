// =====================================================
// SHARED APP STATE
// =====================================================

const AUTH_STORAGE_KEY = 'authSession';
const FACEBOOK_APP_ID_PLACEHOLDER = 'YOUR_FACEBOOK_APP_ID';
const LOGIN_PAGE = 'index.html';
const ADMIN_HOME_PAGE = 'admin-index.html';
const PROTECTED_PAGES = new Set(['admin-index.html', 'admin-order.html', 'all-order.html']);

class AuthSession {
    static getCurrentPage() {
        const path = window.location.pathname.split('/').pop();
        return path || LOGIN_PAGE;
    }

    static getFacebookAppId() {
        const metaTag = document.querySelector('meta[name="facebook-app-id"]');
        const configuredValue = metaTag?.getAttribute('content')?.trim();
        const runtimeValue = window.FACEBOOK_APP_ID || localStorage.getItem('facebookAppId');
        const appId = runtimeValue || configuredValue || '';

        if (!appId || appId === FACEBOOK_APP_ID_PLACEHOLDER) {
            return '';
        }

        return appId;
    }

    static ensureFacebookAppId() {
        const existingAppId = this.getFacebookAppId();
        if (existingAppId) {
            return existingAppId;
        }

        const enteredAppId = window.prompt('Enter your Facebook App ID to enable Facebook login:');
        const sanitizedAppId = enteredAppId?.trim() || '';

        if (!sanitizedAppId) {
            return '';
        }

        localStorage.setItem('facebookAppId', sanitizedAppId);
        return sanitizedAppId;
    }

    static get() {
        try {
            const raw = localStorage.getItem(AUTH_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Unable to read auth session', error);
            return null;
        }
    }

    static set(session) {
        const payload = {
            ...session,
            loginAt: new Date().toISOString()
        };

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));

        if (payload.email) {
            localStorage.setItem('savedEmail', payload.email);
        }
    }

    static clear() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('rememberMe');
    }

    static isAuthenticated() {
        const session = this.get();
        return Boolean(session?.provider && session?.name);
    }

    static redirectToAdmin() {
        window.location.href = ADMIN_HOME_PAGE;
    }

    static redirectToLogin() {
        window.location.href = LOGIN_PAGE;
    }

    static requireAuth() {
        const currentPage = this.getCurrentPage();

        if (PROTECTED_PAGES.has(currentPage) && !this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }

        if (currentPage === LOGIN_PAGE && this.isAuthenticated()) {
            this.redirectToAdmin();
            return false;
        }

        return true;
    }
}

// =====================================================
// MODERN LOGIN PAGE - JAVASCRIPT
// =====================================================

class LoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.rememberCheckbox = document.getElementById('remember');
        this.emailError = document.getElementById('emailError');
        this.passwordError = document.getElementById('passwordError');

        if (!this.form) {
            return;
        }

        this.init();
    }

    init() {
        this.attachEventListeners();
        this.loadSavedCredentials();
    }

    attachEventListeners() {
        this.form.addEventListener('submit', event => this.handleSubmit(event));
        this.togglePasswordBtn?.addEventListener('click', event => this.togglePasswordVisibility(event));
        this.emailInput?.addEventListener('blur', () => this.validateEmail());
        this.passwordInput?.addEventListener('blur', () => this.validatePassword());
        this.emailInput?.addEventListener('focus', () => this.clearError(this.emailError));
        this.passwordInput?.addEventListener('focus', () => this.clearError(this.passwordError));
        this.rememberCheckbox?.addEventListener('change', () => this.handleRememberMe());
        this.emailInput?.addEventListener('input', () => this.validateEmailRealtime());
        this.passwordInput?.addEventListener('input', () => this.validatePasswordRealtime());
    }

    validateEmailRealtime() {
        const email = this.emailInput.value.trim();

        if (!email) {
            this.clearError(this.emailError);
            return true;
        }

        if (!this.isValidEmail(email)) {
            this.showError(this.emailError, 'Please enter a valid email address');
            return false;
        }

        this.clearError(this.emailError);
        return true;
    }

    validateEmail() {
        const email = this.emailInput.value.trim();

        if (!email) {
            this.showError(this.emailError, 'Email is required');
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showError(this.emailError, 'Please enter a valid email address');
            return false;
        }

        this.clearError(this.emailError);
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePasswordRealtime() {
        const password = this.passwordInput.value;

        if (!password) {
            this.clearError(this.passwordError);
            return true;
        }

        if (password.length < 6) {
            this.showError(this.passwordError, 'Password must be at least 6 characters');
            return false;
        }

        this.clearError(this.passwordError);
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;

        if (!password) {
            this.showError(this.passwordError, 'Password is required');
            return false;
        }

        if (password.length < 6) {
            this.showError(this.passwordError, 'Password must be at least 6 characters');
            return false;
        }

        this.clearError(this.passwordError);
        return true;
    }

    showError(errorElement, message) {
        if (!errorElement) {
            return;
        }

        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    clearError(errorElement) {
        if (!errorElement) {
            return;
        }

        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    togglePasswordVisibility(event) {
        event.preventDefault();
        const isPasswordVisible = this.passwordInput.type === 'text';

        if (isPasswordVisible) {
            this.passwordInput.type = 'password';
            this.togglePasswordBtn.classList.remove('active');
        } else {
            this.passwordInput.type = 'text';
            this.togglePasswordBtn.classList.add('active');
        }
    }

    handleRememberMe() {
        if (this.rememberCheckbox.checked) {
            this.saveCredentials();
        } else {
            this.clearSavedCredentials();
        }
    }

    saveCredentials() {
        const email = this.emailInput.value.trim();
        if (this.isValidEmail(email)) {
            localStorage.setItem('savedEmail', email);
            localStorage.setItem('rememberMe', 'true');
        }
    }

    clearSavedCredentials() {
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('rememberMe');
    }

    loadSavedCredentials() {
        const savedEmail = localStorage.getItem('savedEmail');
        const rememberMe = localStorage.getItem('rememberMe');

        if (savedEmail && rememberMe === 'true' && this.emailInput && this.rememberCheckbox) {
            this.emailInput.value = savedEmail;
            this.rememberCheckbox.checked = true;
        }
    }

    handleSubmit(event) {
        event.preventDefault();

        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();

        if (!isEmailValid || !isPasswordValid) {
            this.shakeForm();
            return;
        }

        this.submitForm();
    }

    submitForm() {
        const email = this.emailInput.value.trim();
        const rememberMe = this.rememberCheckbox.checked;
        const submitBtn = this.form.querySelector('.submit-button');
        const originalText = submitBtn.querySelector('.button-text').textContent;

        submitBtn.disabled = true;
        submitBtn.querySelector('.button-text').textContent = 'Signing in...';

        setTimeout(() => {
            const displayName = this.getDisplayName(email);

            AuthSession.set({
                provider: 'password',
                name: displayName,
                email
            });

            if (rememberMe) {
                this.saveCredentials();
            }

            this.showSuccessMessage('Login successful! Redirecting...');
            submitBtn.disabled = false;
            submitBtn.querySelector('.button-text').textContent = originalText;

            setTimeout(() => AuthSession.redirectToAdmin(), 1000);
        }, 900);
    }

    getDisplayName(email) {
        const [userPart = 'User'] = email.split('@');
        return userPart.charAt(0).toUpperCase() + userPart.slice(1);
    }

    shakeForm() {
        const wrapper = document.querySelector('.login-wrapper');
        if (!wrapper) {
            return;
        }

        wrapper.style.animation = 'none';

        setTimeout(() => {
            wrapper.style.animation = 'shake 0.4s ease-in-out';
        }, 10);
    }

    showSuccessMessage(message) {
        showToast(message, 'success');
    }
}

// =====================================================
// SOCIAL LOGIN HANDLERS
// =====================================================

class SocialLogin {
    constructor() {
        this.socialButtons = document.querySelectorAll('.social-button');
        this.facebookSdkPromise = null;

        if (!this.socialButtons.length) {
            return;
        }

        this.init();
    }

    init() {
        this.socialButtons.forEach(button => {
            button.addEventListener('click', event => this.handleSocialLogin(event));
        });
    }

    async handleSocialLogin(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const provider = button.dataset.provider || 'social';
        this.animateButton(button);

        if (provider !== 'facebook') {
            showToast(`${this.getProviderLabel(provider)} login is not configured on this page.`, 'error');
            return;
        }

        const appId = AuthSession.ensureFacebookAppId();
        if (!appId) {
            showToast('Facebook App ID is required before using Facebook login.', 'error');
            return;
        }

        button.disabled = true;

        try {
            await this.loadFacebookSdk(appId);
            await this.loginWithFacebook();
        } catch (error) {
            console.error('Facebook login failed', error);
            showToast(error.message || 'Facebook login failed. Check your app configuration.', 'error');
        } finally {
            button.disabled = false;
        }
    }

    animateButton(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    getProviderLabel(provider) {
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }

    loadFacebookSdk(appId) {
        if (window.FB) {
            window.FB.init({
                appId,
                cookie: true,
                xfbml: false,
                version: 'v19.0'
            });
            return Promise.resolve();
        }

        if (this.facebookSdkPromise) {
            return this.facebookSdkPromise;
        }

        this.facebookSdkPromise = new Promise((resolve, reject) => {
            window.fbAsyncInit = () => {
                window.FB.init({
                    appId,
                    cookie: true,
                    xfbml: false,
                    version: 'v19.0'
                });
                resolve();
            };

            const existingScript = document.getElementById('facebook-jssdk');
            if (existingScript) {
                return;
            }

            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.async = true;
            script.defer = true;
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.onerror = () => reject(new Error('Unable to load the Facebook SDK.'));
            document.head.appendChild(script);
        });

        return this.facebookSdkPromise;
    }

    loginWithFacebook() {
        return new Promise((resolve, reject) => {
            window.FB.login(response => {
                if (!response?.authResponse) {
                    reject(new Error('Facebook login was cancelled or not authorized.'));
                    return;
                }

                window.FB.api('/me', { fields: 'id,name,email,picture.width(160).height(160)' }, profile => {
                    if (!profile || profile.error) {
                        reject(new Error(profile?.error?.message || 'Unable to load Facebook profile.'));
                        return;
                    }

                    AuthSession.set({
                        provider: 'facebook',
                        id: profile.id,
                        name: profile.name || 'Facebook User',
                        email: profile.email || '',
                        avatar: profile.picture?.data?.url || ''
                    });

                    showToast('Facebook login successful! Redirecting...', 'success');
                    setTimeout(() => AuthSession.redirectToAdmin(), 700);
                    resolve(profile);
                });
            }, { scope: 'public_profile' });
        });
    }
}

// =====================================================
// FORGOT PASSWORD HANDLER
// =====================================================

class ForgotPassword {
    constructor() {
        this.forgotLink = document.querySelector('.forgot-link');

        if (!this.forgotLink) {
            return;
        }

        this.init();
    }

    init() {
        this.forgotLink.addEventListener('click', event => this.handleForgotPassword(event));
    }

    handleForgotPassword(event) {
        event.preventDefault();
        showToast('Forgot password flow is not connected yet.', 'error');
    }
}

// =====================================================
// SIGNUP HANDLER
// =====================================================

class SignUp {
    constructor() {
        this.signupLink = document.querySelector('.signup-link a');

        if (!this.signupLink) {
            return;
        }

        this.init();
    }

    init() {
        this.signupLink.addEventListener('click', event => this.handleSignUp(event));
    }

    handleSignUp(event) {
        event.preventDefault();
        const facebookButton = document.querySelector('.social-button[data-provider="facebook"]');

        if (facebookButton) {
            facebookButton.click();
        }
    }
}

function showToast(message, type = 'success') {
    const background = type === 'error'
        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

    const shadow = type === 'error'
        ? '0 8px 24px rgba(239, 68, 68, 0.3)'
        : '0 8px 24px rgba(16, 185, 129, 0.3)';

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${background};
        color: white;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: ${shadow};
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 2800);
}

// =====================================================
// DASHBOARD FUNCTIONALITY
// =====================================================

class Dashboard {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.menuToggle = document.getElementById('menuToggle');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.profileDropdown = document.getElementById('profileDropdown');
        this.userName = document.getElementById('userName');
        this.userAvatar = document.querySelector('.user-avatar');

        if (this.sidebar && this.menuToggle) {
            this.init();
        }
    }

    init() {
        this.attachEventListeners();
        this.loadUserData();
        this.initializeCharts();
        this.bindLogoutLinks();
    }

    attachEventListeners() {
        this.menuToggle.addEventListener('click', () => this.toggleSidebar());

        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        }

        if (this.profileDropdown) {
            this.profileDropdown.addEventListener('click', () => this.toggleProfileDropdown());
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeSidebar();
                }
            });
        });

        window.addEventListener('resize', () => this.handleResize());
    }

    bindLogoutLinks() {
        document.querySelectorAll('a[href="index.html"]').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                AuthSession.clear();
                window.location.href = link.getAttribute('href');
            });
        });
    }

    toggleSidebar() {
        const isActive = this.sidebar.classList.contains('active');
        if (isActive) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        this.sidebar.classList.add('active');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden';
    }

    closeSidebar() {
        this.sidebar.classList.remove('active');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.remove('active');
        }
        document.body.style.overflow = 'auto';
    }

    handleResize() {
        if (window.innerWidth > 768) {
            this.closeSidebar();
        }
    }

    toggleProfileDropdown() {
        console.log('Profile dropdown clicked');
    }

    loadUserData() {
        const session = AuthSession.get();
        const fallbackEmail = localStorage.getItem('savedEmail') || 'user@example.com';
        const displayName = session?.name || this.getNameFromEmail(fallbackEmail);

        if (this.userName) {
            this.userName.textContent = displayName;
        }

        if (this.userAvatar && session?.avatar) {
            this.userAvatar.src = session.avatar;
            this.userAvatar.alt = `${displayName} avatar`;
        }

        this.updateStats();
    }

    getNameFromEmail(email) {
        const [userPart = 'User'] = email.split('@');
        return userPart.charAt(0).toUpperCase() + userPart.slice(1);
    }

    updateStats() {
        const orders = this.getOrders();
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const start30 = now - 30 * dayMs;
        const start60 = now - 60 * dayMs;

        const totalOrders = orders.length;
        const last30Orders = orders.filter(order => this.getOrderTime(order) >= start30).length;

        const statLabels = document.querySelectorAll('.welcome-stats .stat-label');
        if (statLabels.length >= 2) {
            statLabels[0].textContent = 'Total Orders';
            statLabels[1].textContent = 'Last 30 Days';
        }

        const totalEl = document.getElementById('totalFollowers');
        const monthEl = document.getElementById('monthlyGrowth');
        if (totalEl) totalEl.textContent = this.formatNumber(totalOrders);
        if (monthEl) monthEl.textContent = this.formatNumber(last30Orders);

        const totalsAllTime = this.sumQuantitiesByCategory(orders);
        document.querySelectorAll('.stat-card').forEach(card => {
            const title = (card.querySelector('.stat-card-title')?.textContent || '').trim().toLowerCase();
            const valueEl = card.querySelector('.stat-card-value');
            if (!valueEl) return;

            if (title.includes('followers')) valueEl.textContent = this.formatNumber(totalsAllTime.follows);
            if (title.includes('likes')) valueEl.textContent = this.formatNumber(totalsAllTime.likes);
            if (title.includes('reactions')) valueEl.textContent = this.formatNumber(totalsAllTime.reactions);
            if (title.includes('views')) valueEl.textContent = this.formatNumber(totalsAllTime.views);
        });

        const rangeLast30 = orders.filter(order => this.getOrderTime(order) >= start30);
        const rangePrev30 = orders.filter(order => {
            const timestamp = this.getOrderTime(order);
            return timestamp >= start60 && timestamp < start30;
        });

        const sumsLast30 = this.sumQuantitiesByCategory(rangeLast30);
        const sumsPrev30 = this.sumQuantitiesByCategory(rangePrev30);

        document.querySelectorAll('.chart-card').forEach(card => {
            const title = (card.querySelector('.chart-title')?.textContent || '').trim().toLowerCase();
            const badge = card.querySelector('.chart-badge');
            const footerValues = card.querySelectorAll('.footer-value');
            if (footerValues.length < 2) return;

            const { current, previous } = this.getChartSeries(title, sumsLast30, sumsPrev30);
            footerValues[0].textContent = this.formatNumber(current);
            footerValues[1].textContent = this.formatNumber(previous);

            if (badge) {
                const pct = this.percentChange(current, previous);
                const sign = pct > 0 ? '+' : '';
                badge.textContent = `${sign}${pct.toFixed(1)}%`;
            }
        });
    }

    getOrders() {
        try {
            const raw = localStorage.getItem('orders') || '[]';
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    getOrderTime(order) {
        const timestamp = new Date(order?.createdAt || 0).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    sumQuantitiesByCategory(orders) {
        const totals = { follows: 0, likes: 0, comments: 0, reactions: 0, views: 0 };

        orders.forEach(order => {
            const category = String(order?.category || '').toLowerCase();
            const quantity = Number(order?.quantity || 0);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                return;
            }

            if (category in totals) {
                totals[category] += quantity;
            }
        });

        return totals;
    }

    getChartSeries(title, last30, prev30) {
        if (title.includes('follows')) return { current: last30.follows, previous: prev30.follows };
        if (title.includes('likes')) return { current: last30.likes, previous: prev30.likes };
        if (title.includes('reactions')) return { current: last30.reactions, previous: prev30.reactions };
        if (title.includes('views')) return { current: last30.views, previous: prev30.views };
        return { current: 0, previous: 0 };
    }

    percentChange(current, previous) {
        if (previous <= 0) {
            return current > 0 ? 100 : 0;
        }
        return ((current - previous) / previous) * 100;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    initializeCharts() {
        const chartCards = document.querySelectorAll('.chart-card');

        chartCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.animateChart(card);
            });
        });
    }

    animateChart(chartCard) {
        const svg = chartCard.querySelector('.chart-svg');
        if (svg) {
            svg.style.animation = 'none';
            setTimeout(() => {
                svg.style.animation = 'pulse 0.5s ease-in-out';
            }, 10);
        }
    }
}

// =====================================================
// ORDER PAGE FUNCTIONALITY
// =====================================================

class OrderPage {
    constructor() {
        this.form = document.getElementById('orderForm');
        this.result = document.getElementById('orderResult');

        if (this.form && this.result) {
            this.init();
        }
    }

    init() {
        this.form.addEventListener('submit', event => this.handleSubmit(event));
    }

    getOrderData() {
        return {
            category: document.getElementById('category')?.value || '',
            targetLink: document.getElementById('targetLink')?.value.trim() || '',
            quantity: Number(document.getElementById('quantity')?.value || 0),
            transactionId: document.getElementById('transactionId')?.value.trim() || ''
        };
    }

    validateOrder(data) {
        if (!data.targetLink) {
            return 'Enter a target link before continuing.';
        }

        if (!data.transactionId) {
            return 'Enter a transaction ID before continuing.';
        }

        if (!this.form.checkValidity()) {
            return 'Check the target link, quantity, and transaction ID fields.';
        }

        if (!Number.isFinite(data.quantity) || data.quantity < 1) {
            return 'Quantity must be at least 1.';
        }

        return '';
    }

    showMessage(type, title, message, data = null) {
        const details = data
            ? `<dl class="order-summary">
                <div><dt>Category</dt><dd>${this.formatLabel(data.category)}</dd></div>
                <div><dt>Quantity</dt><dd>${data.quantity.toLocaleString()}</dd></div>
                <div><dt>Transaction ID</dt><dd>${this.escapeHtml(data.transactionId)}</dd></div>
                <div><dt>Target</dt><dd>${this.escapeHtml(data.targetLink)}</dd></div>
            </dl>`
            : '';

        this.result.className = `order-result ${type}`;
        this.result.innerHTML = `<strong>${title}</strong><p>${message}</p>${details}`;
        this.result.style.display = 'block';
    }

    handleSubmit(event) {
        event.preventDefault();

        const data = this.getOrderData();
        const error = this.validateOrder(data);

        if (error) {
            this.showMessage('error', 'Order not placed', error);
            this.form.reportValidity();
            return;
        }

        const orderId = `ORD-${Date.now().toString().slice(-6)}`;
        const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        savedOrders.unshift({
            id: orderId,
            ...data,
            status: 'Pending',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('orders', JSON.stringify(savedOrders));

        this.showMessage('success', 'Order placed', `Your order ${orderId} has been saved locally.`, data);
        this.form.reset();
        document.getElementById('quantity').value = '5000';

        if (!window.__orderPlacedReloadScheduled) {
            window.__orderPlacedReloadScheduled = true;
            setTimeout(() => location.reload(), 1200);
        }
    }

    formatLabel(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }
}

// =====================================================
// ALL ORDERS PAGE FUNCTIONALITY
// =====================================================

class AllOrdersPage {
    constructor() {
        this.tableBody = document.getElementById('ordersTableBody');
        this.emptyState = document.getElementById('ordersEmptyState');
        this.noResults = document.getElementById('ordersNoResults');
        this.searchInput = document.getElementById('ordersSearch');
        this.orders = [];

        if (this.tableBody && this.emptyState && this.noResults) {
            this.init();
        }
    }

    init() {
        this.searchInput?.addEventListener('input', () => this.render());
        this.tableBody.addEventListener('change', event => this.handleStatusChange(event));
        this.tableBody.addEventListener('click', event => this.handleDeleteClick(event));
        this.render();
    }

    getOrders() {
        return JSON.parse(localStorage.getItem('orders') || '[]');
    }

    saveOrders(orders) {
        localStorage.setItem('orders', JSON.stringify(orders));
    }

    render() {
        this.orders = this.getOrders();
        const query = this.searchInput?.value.trim().toLowerCase() || '';
        const visibleOrders = query
            ? this.orders.filter(order => this.matchesSearch(order, query))
            : this.orders;

        if (!this.orders.length) {
            this.tableBody.innerHTML = '';
            this.emptyState.hidden = false;
            this.noResults.hidden = true;
            return;
        }

        if (!visibleOrders.length) {
            this.tableBody.innerHTML = '';
            this.emptyState.hidden = true;
            this.noResults.hidden = false;
            return;
        }

        this.emptyState.hidden = true;
        this.noResults.hidden = true;
        this.tableBody.innerHTML = visibleOrders.map(order => this.renderOrderRow(order)).join('');
    }

    matchesSearch(order, query) {
        return [
            order.transactionId,
            order.targetLink,
            order.status
        ].some(value => String(value || '').toLowerCase().includes(query));
    }

    handleStatusChange(event) {
        if (!event.target.matches('.status-select')) {
            return;
        }

        const orderId = event.target.dataset.orderId;
        const status = event.target.value;
        const orders = this.getOrders().map(order => {
            if (order.id !== orderId) {
                return order;
            }

            return {
                ...order,
                status
            };
        });

        this.saveOrders(orders);
        this.render();
    }

    handleDeleteClick(event) {
        const button = event.target.closest('.order-delete-button');

        if (!button) {
            return;
        }

        const orderId = button.dataset.orderId;
        const orders = this.getOrders().filter(order => order.id !== orderId);
        this.saveOrders(orders);
        this.render();
    }

    renderOrderRow(order) {
        const status = order.status || 'Pending';

        return `<tr>
            <td class="order-id" data-label="Order ID">${this.escapeHtml(order.id || '-')}</td>
            <td class="transaction-id" data-label="Transaction ID">${this.escapeHtml(order.transactionId || '-')}</td>
            <td data-label="Category">${this.formatLabel(order.category || '-')}</td>
            <td data-label="Quantity">${Number(order.quantity || 0).toLocaleString()}</td>
            <td data-label="Status">${this.renderStatusSelect(order.id, status)}</td>
            <td data-label="Date">${this.formatDate(order.createdAt)}</td>
            <td data-label="Action"><button type="button" class="order-delete-button" data-order-id="${this.escapeAttribute(order.id || '')}">Delete</button></td>
        </tr>`;
    }

    renderStatusSelect(orderId, status) {
        const statuses = ['Pending', 'In Progress', 'Completed', 'Canceled'];

        return `<select class="status-select status-${this.slugStatus(status)}" data-order-id="${this.escapeAttribute(orderId || '')}" aria-label="Order status">
            ${statuses.map(option => `<option value="${this.escapeAttribute(option)}"${option === status ? ' selected' : ''}>${this.escapeHtml(option)}</option>`).join('')}
        </select>`;
    }

    slugStatus(status) {
        return String(status || '').toLowerCase().replace(/\s+/g, '-');
    }

    formatLabel(value) {
        if (!value || value === '-') {
            return '-';
        }

        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    formatDate(value) {
        if (!value) {
            return '-';
        }

        return new Date(value).toLocaleDateString('en-GB');
    }

    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    escapeAttribute(value) {
        return this.escapeHtml(value).replace(/"/g, '&quot;');
    }
}

// =====================================================
// INITIALIZE ALL PAGES
// =====================================================

async function loadHtmlIncludes() {
    const includeTargets = document.querySelectorAll('[data-include]');

    await Promise.all(Array.from(includeTargets).map(async target => {
        const file = target.getAttribute('data-include');

        if (!file) {
            return;
        }

        const separator = file.includes('?') ? '&' : '?';
        const response = await fetch(`${file}${separator}v=${Date.now()}`, {
            cache: 'no-store'
        });
        if (!response.ok) {
            throw new Error(`Unable to load ${file}`);
        }

        target.outerHTML = await response.text();
    }));
}

async function initializeApp() {
    if (!AuthSession.requireAuth()) {
        return;
    }

    try {
        await loadHtmlIncludes();
    } catch (error) {
        console.warn(error);
    }

    new LoginForm();
    new SocialLogin();
    new ForgotPassword();
    new SignUp();
    new Dashboard();
    new OrderPage();
    new AllOrdersPage();

    document.addEventListener('keydown', event => {
        const passwordInput = document.getElementById('password');
        const loginForm = document.getElementById('loginForm');

        if (event.key === 'Enter' && passwordInput && loginForm && document.activeElement === passwordInput) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
}

initializeApp();

// =====================================================
// UTILITY ANIMATIONS
// =====================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }

    @keyframes chartPulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.8;
        }
    }

    .chart-svg {
        animation: chartPulse 0.5s ease-in-out;
    }

    .stat-card {
        animation: slideUpFade 0.6s ease-out forwards;
    }

    @keyframes slideUpFade {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .stat-card:nth-child(1) { animation-delay: 0s; }
    .stat-card:nth-child(2) { animation-delay: 0.1s; }
    .stat-card:nth-child(3) { animation-delay: 0.2s; }
    .stat-card:nth-child(4) { animation-delay: 0.3s; }

    .chart-card {
        animation: slideUpFade 0.6s ease-out forwards;
    }

    .chart-card:nth-child(1) { animation-delay: 0.2s; }
    .chart-card:nth-child(2) { animation-delay: 0.3s; }
    .chart-card:nth-child(3) { animation-delay: 0.4s; }
    .chart-card:nth-child(4) { animation-delay: 0.5s; }
`;
document.head.appendChild(style);
