/**
 * Registration form validation for OpenTrackr (BIT503 Assessment 3)
 * Linked only on register.html
 */
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registrationForm');
    const messageEl = document.getElementById('formMessage');

    if (!form || !messageEl) return;

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

        messageEl.textContent =
            'Registration successful! Welcome, ' + firstName + ' ' + lastName +
            '. Email: ' + email + '. Mobile: ' + mobile + '.';
        messageEl.className = 'success';
    });
});
