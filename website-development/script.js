// Registration, login, and local account storage (this browser only)
document.addEventListener('DOMContentLoaded', function () {
    const ACCOUNT_KEY = 'openTrackr_account';
    const SESSION_KEY = 'openTrackr_loggedIn';
    const LEGACY_USER_KEY = 'openTrackr_user';

    const registerForm = document.getElementById('registrationForm');
    const loginForm = document.getElementById('loginForm');
    const messageEl = document.getElementById('formMessage');
    const accountPanel = document.getElementById('accountPanel');
    const authSection = document.getElementById('authSection');
    const loginSection = document.getElementById('loginSection');
    const registrationSection = document.getElementById('registrationSection');
    const logoutBtn = document.getElementById('logoutBtn');
    const showLoginTab = document.getElementById('showLoginTab');
    const showRegisterTab = document.getElementById('showRegisterTab');

    if (!registerForm || !loginForm || !messageEl) return;

    migrateLegacyUser();

    if (isLoggedIn() && loadAccount()) {
        showAccountPanel(loadAccount());
    } else {
        showAuthSection('login');
    }

    registerForm.addEventListener('submit', function (event) {
        event.preventDefault();
        clearMessage();

        if (!registerForm.checkValidity()) {
            registerForm.reportValidity();
            return;
        }

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const mobile = document.getElementById('mobile').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const calendarProvider = document.getElementById('calendarProvider').value;

        if (password !== confirmPassword) {
            showMessage('Password and confirm password do not match. Please try again.', 'error');
            return;
        }

        const existing = loadAccount();
        const account = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            mobile: mobile,
            password: password,
            calendarProvider: calendarProvider,
            registeredAt: existing && existing.email === email && existing.registeredAt
                ? existing.registeredAt
                : new Date().toISOString()
        };

        saveAccount(account);
        setLoggedIn(true);

        const isUpdate = existing && existing.email === email;
        showMessage(
            (isUpdate ? 'Account updated! Welcome back, ' : 'Registration successful! Welcome, ') +
            firstName + ' ' + lastName + '. Your account is saved on this device. ' +
            'Use Export tasks to calendar below to connect ' +
            OpenTrackrCalendar.getProviderLabel(calendarProvider) + '.',
            'success'
        );

        registerForm.reset();
        showAccountPanel(account);
    });

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        clearMessage();

        if (!loginForm.checkValidity()) {
            loginForm.reportValidity();
            return;
        }

        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const account = loadAccount();

        if (!account) {
            showMessage('No account found on this device. Please register first.', 'error');
            showAuthSection('register');
            return;
        }

        if (account.email !== email || account.password !== password) {
            if (account.email === email && !account.password) {
                showMessage('Please use Register to set a password for your account.', 'error');
                showAuthSection('register');
                document.getElementById('email').value = email;
                return;
            }
            showMessage('Email or password is incorrect. Please try again.', 'error');
            return;
        }

        setLoggedIn(true);
        showMessage('Welcome back, ' + account.firstName + '!', 'success');
        loginForm.reset();
        showAccountPanel(account);
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            setLoggedIn(false);
            showMessage('You have been logged out. Log in below with your email and password.', '');
            showAuthSection('login');
            loginForm.reset();
            registerForm.reset();
        });
    }

    if (showLoginTab) {
        showLoginTab.addEventListener('click', function () {
            showAuthSection('login');
            clearMessage();
        });
    }

    if (showRegisterTab) {
        showRegisterTab.addEventListener('click', function () {
            showAuthSection('register');
            clearMessage();
        });
    }

    var exportCalendarBtn = document.getElementById('exportCalendarBtn');
    if (exportCalendarBtn) {
        exportCalendarBtn.addEventListener('click', handleCalendarExport);
    }

    function handleCalendarExport() {
        var exportMessage = document.getElementById('calendarExportMessage');
        var result = OpenTrackrCalendar.exportTasks();

        if (exportMessage) {
            exportMessage.textContent = result.message;
            exportMessage.className = result.ok ? 'success' : 'error';
        } else if (!result.ok) {
            alert(result.message);
        }
    }

    function migrateLegacyUser() {
        try {
            const legacyRaw = localStorage.getItem(LEGACY_USER_KEY);
            if (!legacyRaw || loadAccount()) return;

            const legacy = JSON.parse(legacyRaw);
            if (!legacy.email) return;

            saveAccount({
                firstName: legacy.firstName,
                lastName: legacy.lastName,
                email: legacy.email.toLowerCase(),
                mobile: legacy.mobile,
                password: '',
                calendarProvider: 'other',
                registeredAt: legacy.registeredAt || new Date().toISOString()
            });
            setLoggedIn(true);
            localStorage.removeItem(LEGACY_USER_KEY);
        } catch {
            /* ignore invalid legacy data */
        }
    }

    function loadAccount() {
        try {
            const raw = localStorage.getItem(ACCOUNT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveAccount(account) {
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    }

    function isLoggedIn() {
        return localStorage.getItem(SESSION_KEY) === 'true';
    }

    function setLoggedIn(value) {
        if (value) {
            localStorage.setItem(SESSION_KEY, 'true');
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }

    function showAccountPanel(account) {
        if (!accountPanel || !authSection) return;

        document.getElementById('accountName').textContent = account.firstName + ' ' + account.lastName;
        document.getElementById('accountEmail').textContent = account.email;
        document.getElementById('accountMobile').textContent = maskMobile(account.mobile);
        document.getElementById('accountRegistered').textContent = formatDate(account.registeredAt);

        var provider = account.calendarProvider || 'other';
        var calendarLabel = OpenTrackrCalendar.getProviderLabel(provider);
        var accountCalendar = document.getElementById('accountCalendar');
        if (accountCalendar) accountCalendar.textContent = calendarLabel;

        var providerLabel = document.getElementById('calendarProviderLabel');
        if (providerLabel) providerLabel.textContent = calendarLabel;

        var importHelp = document.getElementById('calendarImportHelp');
        if (importHelp) importHelp.textContent = OpenTrackrCalendar.getImportHelp(provider);

        var calendarSelect = document.getElementById('calendarProvider');
        if (calendarSelect) calendarSelect.value = provider;

        var exportMessage = document.getElementById('calendarExportMessage');
        if (exportMessage) {
            exportMessage.textContent = '';
            exportMessage.className = '';
        }

        accountPanel.classList.remove('hidden');
        authSection.classList.add('hidden');
    }

    function showAuthSection(mode) {
        if (!authSection || !accountPanel) return;

        accountPanel.classList.add('hidden');
        authSection.classList.remove('hidden');

        const isLogin = mode === 'login';
        loginSection.classList.toggle('hidden', !isLogin);
        registrationSection.classList.toggle('hidden', isLogin);

        showLoginTab.classList.toggle('active', isLogin);
        showRegisterTab.classList.toggle('active', !isLogin);
        showLoginTab.setAttribute('aria-selected', isLogin ? 'true' : 'false');
        showRegisterTab.setAttribute('aria-selected', !isLogin ? 'true' : 'false');
    }

    function showMessage(text, type) {
        messageEl.textContent = text;
        messageEl.className = type || '';
    }

    function clearMessage() {
        messageEl.textContent = '';
        messageEl.className = '';
    }

    function maskMobile(mobile) {
        if (!mobile || mobile.length < 4) return mobile;
        return mobile.slice(0, 3) + '****' + mobile.slice(-3);
    }

    function formatDate(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
});
