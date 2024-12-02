// NotesManager Class to handle loading and displaying notes
class NotesManager {
    constructor() {
        this.notesList = [];
        this.loadNotes();
        this.setupEventListeners();
    }

    loadNotes() {
        fetch('notes/index.json')
            .then(response => response.json())
            .then(data => {
                this.notesList = this.flattenNotes(data.notes);
                this.renderNoteList(this.notesList);
            })
            .catch(error => console.error('Error loading notes:', error));
    }

    // Flatten the nested notes structure for easier access
    flattenNotes(notes, parentPath = '') {
        let flatList = [];
        notes.forEach(note => {
            flatList.push({
                title: note.title,
                path: note.path
            });
            if (note.children) {
                flatList = flatList.concat(this.flattenNotes(note.children, note.path));
            }
        });
        return flatList;
    }

    renderNoteList(notes) {
        const noteListContainer = document.querySelector('.note-list');
        noteListContainer.innerHTML = notes.map(note => `
            <a href="#" class="note-link" data-path="${note.path}">${note.title}</a>
        `).join('');
    }

    setupEventListeners() {
        // Handle note link clicks
        document.querySelector('.note-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('note-link')) {
                e.preventDefault();
                const path = e.target.getAttribute('data-path');
                this.loadNoteContent(path);
            }
        });

        // Handle search input
        document.getElementById('search-input').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filteredNotes = this.notesList.filter(note => note.title.toLowerCase().includes(query));
            this.renderNoteList(filteredNotes);
        });
    }

    loadNoteContent(path) {
        fetch(path)
            .then(response => response.text())
            .then(markdown => {
                const contentContainer = document.getElementById('note-content');
                contentContainer.innerHTML = marked.parse(markdown);
                MathJax.typeset();
                this.updateBreadcrumbs(path);
                this.updateBacklinks(path);
            })
            .catch(error => console.error('Error loading note content:', error));
    }

    updateBreadcrumbs(path) {
        const breadcrumbsContainer = document.getElementById('breadcrumbs');
        const parts = path.split('/').filter(part => part !== 'notes' && part !== 'index.json');
        let breadcrumbPath = '';
        const breadcrumbs = parts.map((part, index) => {
            breadcrumbPath += part + '/';
            const title = part.replace(/_/g, ' ').replace('.md', '').replace(/\b\w/g, c => c.toUpperCase());
            if (index === parts.length - 1) {
                return `<span>${title}</span>`;
            } else {
                return `<a href="#" class="breadcrumb-link" data-path="${breadcrumbPath}">${title}</a>`;
            }
        });
        breadcrumbsContainer.innerHTML = breadcrumbs.join(' / ');
    }

    updateBacklinks(currentPath) {
        const backlinksContainer = document.getElementById('backlinks');
        backlinksContainer.innerHTML = '';

        // Find all notes that link to the current note
        const backlinks = this.notesList.filter(note => note.contentLinks && note.contentLinks.includes(currentPath));

        if (backlinks.length === 0) {
            backlinksContainer.innerHTML = '<p>No linked references.</p>';
            return;
        }

        backlinks.forEach(link => {
            const linkElement = document.createElement('a');
            linkElement.href = '#';
            linkElement.textContent = link.title;
            linkElement.classList.add('wiki-link');
            linkElement.setAttribute('data-path', link.path);
            backlinksContainer.appendChild(linkElement);
        });
    }
}

// Export the NotesManager class
window.NotesManager = NotesManager;
