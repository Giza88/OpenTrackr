// Applies saved light/dark theme on home and register pages (same key as tracker)
(function () {
    const THEME_KEY = 'taskTracker_theme';

    function getSavedTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        return saved === 'dark' ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        let theme = getSavedTheme();
        applyTheme(theme);

        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;

        toggle.addEventListener('click', function () {
            theme = theme === 'light' ? 'dark' : 'light';
            localStorage.setItem(THEME_KEY, theme);
            applyTheme(theme);
        });
    });
})();
