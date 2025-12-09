module.exports = {
  // Minimal PostCSS config to avoid loading project-level Tailwind
  // Keeps PostCSS enabled but with no plugins so Vite won't attempt
  // to load missing modules like 'tailwindcss'.
  plugins: []
};
