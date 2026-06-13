// Applies saved light/dark theme and font on all pages that include this script
(function () {
    const THEME_KEY = 'taskTracker_theme';
    const FONT_KEY = 'openTrackr_font';

    const FONT_MAP = {
        system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        arial: 'Arial, Helvetica, sans-serif',
        verdana: 'Verdana, Geneva, sans-serif',
        georgia: 'Georgia, "Times New Roman", serif',
        permanent: '"Permanent Marker", cursive',
        comic: '"Comic Sans MS", "Comic Sans", cursive, sans-serif'
    };

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
        const themeChoice = document.getElementById('themeChoice');
        if (themeChoice) themeChoice.value = theme;
    }

    function applyFont(fontKey) {
        const key = fontKey || localStorage.getItem(FONT_KEY) || 'system';
        document.body.style.fontFamily = FONT_MAP[key] || FONT_MAP.system;
        const fontChoice = document.getElementById('fontChoice');
        if (fontChoice) fontChoice.value = key;
    }

    document.addEventListener('DOMContentLoaded', function () {
        let theme = getSavedTheme();
        applyTheme(theme);
        applyFont();

        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', function () {
                theme = theme === 'light' ? 'dark' : 'light';
                localStorage.setItem(THEME_KEY, theme);
                applyTheme(theme);
            });
        }
    });
})();
