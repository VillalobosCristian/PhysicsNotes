/**
 * NotesManager class handles the loading, processing, and display of hierarchical physics notes
 * with support for wiki-style linking and LaTeX equations.
 */
class NotesManager {
    constructor() {
        // Initialize core data structures
        this.notes = new Map();
        this.currentNote = null;

        // Cache DOM elements for better performance
        this.contentElement = document.getElementById('note-content');
        this.breadcrumbsElement = document.querySelector('.breadcrumbs');
        this.backlinksElement = document.querySelector('.backlinks-content');

        this.initialize();
    }

    async initialize() {
        try {
            await this.loadNotes();
            this.setupEventListeners();
            this.loadFromHash();
        } catch (error) {
            console.error('Failed to initialize NotesManager:', error);
            this.showError(error);
        }
    }

    async loadNotes() {
        try {
            const response = await fetch('notes/index.json');
            if (!response.ok) {
                throw new Error('Failed to load notes index');
            }

            const data = await response.json();
            console.log('Loaded notes data:', data);  // Debug log

            // Process and store notes in the Map
            data.notes.forEach(note => {
                this.notes.set(note.id, {
                    ...note,
                    backlinks: new Set()
                });
            });

            // Process backlinks after all notes are loaded
            await this.processBacklinks();
            this.renderNoteList();
        } catch (error) {
            console.error('Error loading notes:', error);
            throw error;
        }
    }

    async processBacklinks() {
        const wikiLinkRegex = /\[\[([\w-]+)(?:#[\w-]+)?\|?(?:[^\]]+)?\]\]/g;

        for (const [id, note] of this.notes.entries()) {
            try {
                const content = await this.loadNoteContent(note.path);
                const matches = Array.from(content.matchAll(wikiLinkRegex));

                for (const match of matches) {
                    const linkedNoteId = match[1];
                    const linkedNote = this.notes.get(linkedNoteId);
                    if (linkedNote) {
                        linkedNote.backlinks.add(id);
                    }
                }
            } catch (error) {
                console.error(`Failed to process backlinks for note ${id}:`, error);
            }
        }
    }

    setupEventListeners() {
        // Handle URL hash changes for navigation
        window.addEventListener('hashchange', () => this.loadFromHash());

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // Setup search functionality with debouncing
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let debounceTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
            });
        }
    }

    async loadNoteContent(path) {
        try {
            const response = await fetch(`notes/${path}`);
            if (!response.ok) {
                throw new Error(`Failed to load note: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Failed to load note content: ${path}`, error);
            throw error;
        }
    }

    /**
     * Processes and renders mathematical content within notes.
     * @param {string} content - The raw markdown content of the note.
     * @returns {string} - The processed HTML content with LaTeX rendered.
     */
    processContent(content) {
        return content.replace(
            /\[\[([\w-]+)(?:#([\w-]+))?\|?(.*?)\]\]/g,
            (match, id, section, label) => {
                const note = this.notes.get(id);

                if (!note) {
                    return `<span class="wiki-link unresolved">${label || id}</span>`;
                }

                const displayText = label || note.title;
                const href = section ? `#${id}#${section}` : `#${id}`;

                return `<a href="${href}"
                          class="wiki-link"
                          data-note-id="${id}"
                          data-section="${section || ''}"
                          data-note-type="${note.type}"
                          data-parent-topic="${note.parentTopic || ''}">${displayText}</a>`;
            }
        ).replace(/\[(.*?)\]/g, (match, equation) => {
            return `<div class="math-equation">$$${equation}$$</div>`;
        });
    }

    async renderNote(noteId) {
        try {
            const note = this.notes.get(noteId);
            if (!note) {
                throw new Error('Note not found');
            }

            this.currentNote = note;
            this.updateActiveLink(noteId);
            this.showLoading();

            const content = await this.loadNoteContent(note.path);
            const processedContent = this.processContent(content);
            const html = marked.parse(processedContent);

            this.contentElement.innerHTML = html;
            this.updateBreadcrumbs(note);
            this.renderBacklinks();
            this.generateTOC(); // Add this line to generate TOC

            await MathJax.typesetPromise();

            document.title = `${note.title} - Physics Notes`;
            this.showToast('Note loaded successfully!', 'success');
        } catch (error) {
            this.showError(error);
            this.showToast('Failed to load note.', 'error');
            console.error('Error rendering note:', error);
        }
    }

    renderNoteList() {
        const noteList = document.querySelector('.note-list');
        if (!noteList) return;

        // Group notes by type and parent topic
        const groupedNotes = new Map();

        this.notes.forEach(note => {
            if (note.type === 'main-topic') {
                if (!groupedNotes.has('main')) {
                    groupedNotes.set('main', []);
                }
                groupedNotes.get('main').push(note);
            } else {
                const parentId = note.parentTopic || 'orphaned';
                if (!groupedNotes.has(parentId)) {
                    groupedNotes.set(parentId, []);
                }
                groupedNotes.get(parentId).push(note);
            }
        });

        // Render the hierarchical note list
        let html = '';

        const mainTopics = groupedNotes.get('main') || [];
        mainTopics.forEach(topic => {
            html += `
                <div class="note-group">
                    <div class="note-group-title">${topic.title}</div>
                    <div class="note-group-content">
            `;

            const subtopics = groupedNotes.get(topic.id) || [];
            subtopics.forEach(subtopic => {
                html += `<a href="#${subtopic.id}" class="note-link">${subtopic.title}</a>`;

                const concepts = groupedNotes.get(subtopic.id) || [];
                if (concepts.length > 0) {
                    html += '<div class="note-subgroup">';
                    concepts.forEach(concept => {
                        html += `<a href="#${concept.id}" class="note-link">${concept.title}</a>`;
                    });
                    html += '</div>';
                }
            });

            html += '</div></div>';
        });

        noteList.innerHTML = html;
    }

    updateBreadcrumbs(note) {
        if (!this.breadcrumbsElement) return;

        const breadcrumbs = [];
        let currentNote = note;

        while (currentNote) {
            breadcrumbs.unshift({
                id: currentNote.id,
                title: currentNote.title,
                type: currentNote.type
            });
            currentNote = currentNote.parentTopic ?
                this.notes.get(currentNote.parentTopic) : null;
        }

        const breadcrumbsHtml = breadcrumbs
            .map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return isLast ?
                    `<span class="breadcrumb-current">${crumb.title}</span>` :
                    `<a href="#${crumb.id}" class="breadcrumb-link">${crumb.title}</a>`;
            })
            .join(' <span class="breadcrumb-separator">›</span> ');

        this.breadcrumbsElement.innerHTML = breadcrumbsHtml;
    }

    renderBacklinks() {
        if (!this.backlinksElement || !this.currentNote) return;

        const backlinks = Array.from(this.currentNote.backlinks)
            .map(id => this.notes.get(id))
            .filter(Boolean);

        if (backlinks.length === 0) {
            this.backlinksElement.innerHTML = '<p class="text-muted">No linked references</p>';
            return;
        }

        const html = backlinks.map(note => `
            <div class="backlink-item">
                <div class="backlink-title">
                    <a href="#${note.id}">${note.title}</a>
                </div>
                <div class="backlink-context">
                    <span class="backlink-type">${note.type}</span>
                    ${note.parentTopic ? `in <a href="#${note.parentTopic}">${this.notes.get(note.parentTopic)?.title || ''}</a>` : ''}
                </div>
            </div>
        `).join('');

        this.backlinksElement.innerHTML = html;
    }

    handleSearch(query) {
        query = query.toLowerCase();
        const noteLinks = document.querySelectorAll('.note-link');

        noteLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            const parent = link.closest('.note-group');

            if (text.includes(query)) {
                link.style.display = 'block';
                if (parent) parent.style.display = 'block';
                this.highlightSearchMatch(link, query);
            } else {
                link.style.display = 'none';
                if (parent && !parent.querySelector('.note-link[style="display: block"]')) {
                    parent.style.display = 'none';
                }
            }
        });
    }

    highlightSearchMatch(element, query) {
        const text = element.textContent;
        const highlighted = text.replace(
            new RegExp(query, 'gi'),
            match => `<mark>${match}</mark>`
        );
        element.innerHTML = highlighted;
    }

    /**
     * Updates the active link in the navigation based on the current note.
     * @param {string} noteId - The ID of the current note.
     */
    updateActiveLink(noteId) {
        document.querySelectorAll('.note-link').forEach(link => {
            const isActive = link.getAttribute('href') === `#${noteId}`;
            link.classList.toggle('active', isActive);
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    /**
     * Enhances user experience with smooth transitions and better loading indicators.
     */
    showLoading() {
        this.contentElement.innerHTML = `
            <div class="loading" role="status" aria-live="polite">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading note...</div>
            </div>
        `;
    }

    showError(error) {
        this.contentElement.innerHTML = `
            <div class="error" role="alert">
                <h3>Error Loading Note</h3>
                <p>${error.message}</p>
                <div class="error-recovery">
                    <p>Try one of these options:</p>
                    <ul>
                        <li><a href="#" onclick="window.location.reload()">Refresh the page</a></li>
                        <li><a href="index.html">Return to home</a></li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Shows a toast notification for user feedback.
     * @param {string} message - The message to display.
     * @param {string} type - Type of message: 'success', 'error', etc.
     */
    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    loadFromHash() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const [noteId] = hash.split('#');
            this.renderNote(noteId);
        } else {
            // Load default note (first main topic)
            const defaultNote = Array.from(this.notes.values())
                .find(note => note.type === 'main-topic');
            if (defaultNote) {
                window.location.hash = defaultNote.id;
            }
        }
    }

    generateTOC() {
        const tocList = document.getElementById('toc-list');
        const headers = this.contentElement.querySelectorAll('h2, h3');

        tocList.innerHTML = ''; // Clear existing TOC

        headers.forEach(header => {
            const id = header.textContent.trim().toLowerCase().replace(/\s+/g, '-');
            header.id = id;

            const li = document.createElement('li');
            li.classList.add(`toc-${header.tagName.toLowerCase()}`);

            const a = document.createElement('a');
            a.href = `#${id}`;
            a.textContent = header.textContent;

            li.appendChild(a);
            tocList.appendChild(li);
        });
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notesManager = new NotesManager();
});
