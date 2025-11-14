// Search Component
class SearchHandler {
    constructor(mode) {
        this.mode = mode;
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        this.resultsIcon = document.getElementById('results-icon');
        this.resultsText = document.getElementById('results-text');
        this.searchSpinner = document.getElementById('search-spinner');
        this.searchIcon = document.getElementById('search-icon');
        this.tableBody = document.querySelector('tbody');
        this.debounceTimeout = null;
        this.searchTerm = '';
        this.init();
    }

    init() {
        if (!this.searchInput) return;
        
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimeout);
            
            // Show loading state immediately
            if (e.target.value) {
                this.showLoadingState();
            } else {
                this.hideLoadingState();
                this.hideResults();
            }
            
            this.debounceTimeout = setTimeout(() => {
                this.searchTerm = e.target.value.toLowerCase();
                this.handleSearch();
            }, 300);
        });
    }

    handleSearch() {
        if (!this.searchTerm) {
            this.showAllRows();
            this.hideResults();
            return;
        }

        try {
            let matchCount = 0;
            const rows = this.tableBody.getElementsByTagName('tr');

            Array.from(rows).forEach(row => {
                const searchableText = Array.from(row.getElementsByTagName('td'))
                    .map(cell => {
                        // Get text content and any data attributes
                        const textContent = cell.textContent || '';
                        const dataSearch = cell.querySelector('[data-search]')?.getAttribute('data-search') || '';
                        return (textContent + ' ' + dataSearch).toLowerCase();
                    })
                    .join(' ');

                const isMatch = searchableText.includes(this.searchTerm);
                row.style.display = isMatch ? '' : 'none';
                if (isMatch) matchCount++;
            });

            this.updateSearchResults(matchCount);
        } catch (error) {
            console.error('Search error:', error);
            this.showError();
        }

        this.hideLoadingState();
    }

    showAllRows() {
        const rows = this.tableBody.getElementsByTagName('tr');
        Array.from(rows).forEach(row => row.style.display = '');
    }

    showLoadingState() {
        this.searchSpinner.classList.remove('hidden');
        this.searchIcon.classList.add('hidden');
    }

    hideLoadingState() {
        this.searchSpinner.classList.add('hidden');
        this.searchIcon.classList.remove('hidden');
    }

    updateSearchResults(count) {
        // Hide first to trigger animation
        this.searchResults.classList.add('hidden');
        
        // Force repaint to trigger animation
        void this.searchResults.offsetWidth;
        
        // Show results counter with animation
        this.searchResults.classList.remove('hidden');
        
        if (count === 0) {
            this.resultsIcon.innerHTML = `
                <svg class="w-5 h-5 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`;
            this.resultsText.innerHTML = `No matches found for "<span class="text-red-400 font-medium drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]">${this.searchTerm}</span>"`;
            this.resultsText.className = 'text-red-400 animate-text-glow';
        } else {
            this.resultsIcon.innerHTML = `
                <svg class="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`;
            this.resultsText.innerHTML = `Found <span class="text-emerald-400 font-semibold drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">${count}</span> ${count === 1 ? 'match' : 'matches'} for "<span class="text-sky-400 font-medium drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">${this.searchTerm}</span>"`;
            this.resultsText.className = 'text-sky-400 animate-text-glow';
        }
    }

    hideResults() {
        this.searchResults.classList.add('hidden');
    }

    showError() {
        this.searchResults.classList.remove('hidden');
        this.resultsIcon.innerHTML = `
            <svg class="w-5 h-5 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>`;
        this.resultsText.innerHTML = 'Search error';
        this.resultsText.className = 'text-red-400 animate-text-glow';
    }
}

// Initialize search functionality when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const pageMode = document.body.dataset.mode;
    if (pageMode) {
        new SearchHandler(pageMode);
    }
});
