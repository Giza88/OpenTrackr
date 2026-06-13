document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.site-nav a.nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
            link.classList.remove('nav-wiggle');
            void link.offsetWidth;
            link.classList.add('nav-wiggle');
        });

        link.addEventListener('animationend', function () {
            link.classList.remove('nav-wiggle');
        });
    });
});
