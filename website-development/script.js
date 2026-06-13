/**
 * Registration form validation for OpenTrackr (BIT503 Assessment 3)
 * Saves account details to localStorage (password is never stored).
 */
document.addEventListener('DOMContentLoaded', function () {
    const USER_KEY = 'openTrackr_user';
    const form = document.getElementById('registrationForm');
    const messageEl = document.getElementById('formMessage');
    const accountPanel = document.getElementById('accountPanel');
    const formSection = document.getElementById('registrationSection');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!form || !messageEl) return;

    if (loadUser()) {
        showAccountPanel(loadUser());
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        messageEl.textContent = '';
        messageEl.className = '';

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const mobile = document.getElementById('mobile').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            messageEl.textContent = 'Password and confirm password do not match. Please try again.';
            messageEl.className = 'error';
            return;
        }

        const user = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            mobile: mobile,
            registeredAt: new Date().toISOString()
        };

        saveUser(user);

        messageEl.textContent =
            'Registration successful! Welcome, ' + firstName + ' ' + lastName +
            '. Email: ' + email + '. Mobile: ' + mobile +
            '. Your account is saved on this device.';
        messageEl.className = 'success';

        showAccountPanel(user);
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem(USER_KEY);
            messageEl.textContent = 'You have been logged out. You can register again below.';
            messageEl.className = '';
            showRegistrationForm();
            form.reset();
        });
    }

    function loadUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function showAccountPanel(user) {
        if (!accountPanel || !formSection) return;

        document.getElementById('accountName').textContent = user.firstName + ' ' + user.lastName;
        document.getElementById('accountEmail').textContent = user.email;
        document.getElementById('accountMobile').textContent = maskMobile(user.mobile);
        document.getElementById('accountRegistered').textContent = formatDate(user.registeredAt);

        accountPanel.classList.remove('hidden');
        formSection.classList.add('hidden');
    }

    function showRegistrationForm() {
        if (!accountPanel || !formSection) return;
        accountPanel.classList.add('hidden');
        formSection.classList.remove('hidden');
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
