document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('dark-mode-toggle');
    const body = document.body;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const darkMode = JSON.parse(localStorage.getItem('darkMode'));
    if (darkMode !== null) {
        body.classList.toggle('dark-mode', darkMode);
        toggleButton.textContent = darkMode ? '☀️' : '🌙';
    } else if (prefersDark) {
        body.classList.add('dark-mode');
        toggleButton.textContent = '☀️';
    }

    toggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        toggleButton.textContent = isDarkMode ? '☀️' : '🌙';
        localStorage.setItem('darkMode', isDarkMode);
    });

    /* ...existing code... */
});
