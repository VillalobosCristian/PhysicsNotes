document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('dark-mode-toggle');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersDark) {
        document.body.classList.add('dark-mode');
    }

    toggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        // Save preference to localStorage
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        toggleButton.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Ensure workflow section adapts to dark mode
    const workflowSection = document.getElementById('workflow');
    if (workflowSection) {
        // Example: Change text color in dark mode
        const observer = new MutationObserver(() => {
            if (document.body.classList.contains('dark-mode')) {
                workflowSection.style.color = 'var(--text-color)';
            } else {
                workflowSection.style.color = 'var(--text-color)';
            }
        });

        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
});
