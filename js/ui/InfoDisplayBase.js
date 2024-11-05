export default class InfoDisplayBase {
    constructor() {
        this.infoElement = document.getElementById('info');
        this.embedContainer = document.getElementById('embed-container');
        
        this.fadeInClass = 'active';
        this.embedVisibleClass = 'visible';
        this.expandedClass = 'expanded';
        
        this.currentlyPlayingAlbum = null;
        this.hoveredAlbum = null;

        // Initialize UI elements
        this.elements = {
            title: this.infoElement?.querySelector('.album-title'),
            artist: this.infoElement?.querySelector('.artist'),
            details: this.infoElement?.querySelector('.album-details'),
            embedContent: this.embedContainer?.querySelector('.embed-content')
        };

        // Single bound instance of handlers
        this._boundHandleClick = this.handleClick.bind(this);
        this._boundHandleEscape = this.handleEscapeKey.bind(this);
        
        this.setupExpandButton();
        this.addEventListeners();
    }

    setupExpandButton() {
        if (!this.infoElement) return;

        // Remove any existing button
        const existingButton = this.infoElement.querySelector('.expand-button');
        if (existingButton) {
            existingButton.remove();
        }

        const expandButton = document.createElement('button');
        expandButton.className = 'expand-button';
        expandButton.setAttribute('aria-label', 'Expand panel');
        expandButton.style.display = 'none';

        const arrow = document.createElement('span');
        arrow.className = 'expand-arrow';
        expandButton.appendChild(arrow);

        this.elements.expandButton = expandButton;
        this.infoElement.appendChild(expandButton);
    }

    handleClick(e) {
        const expandButton = e.target.closest('.expand-button');
        const albumInfo = e.target.closest('.album-info');
        const defaultInfo = e.target.closest('.default-info');

        // Ignore clicks on default info
        if (defaultInfo) return;

        // Only handle clicks on expand button or album info
        if (expandButton || albumInfo) {
            if (this.currentlyPlayingAlbum || this.infoElement.classList.contains(this.expandedClass)) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleExpand(e);
            }
        }
    }

    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            if (this.embedContainer?.classList.contains(this.embedVisibleClass)) {
                this.hideEmbed();
            } else if (this.infoElement?.classList.contains(this.expandedClass)) {
                this.toggleExpand();
            }
        }
    }

    addEventListeners() {
        document.addEventListener('keydown', this._boundHandleEscape);
        
        if (this.infoElement) {
            this.infoElement.addEventListener('click', this._boundHandleClick);
            
            // Add click handler specifically for expand button
            const expandButton = this.infoElement.querySelector('.expand-button');
            if (expandButton) {
                expandButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleExpand(e);
                });
            }
        }
    }

    calculateAlbumLength(tracks) {
        if (!tracks || !tracks.length) return '0:00';

        try {
            let totalSeconds = 0;
            tracks.forEach(track => {
                if (track.duration) {
                    const [minutes, seconds] = track.duration.split(':').map(Number);
                    totalSeconds += (minutes * 60) + (seconds || 0);
                }
            });

            return this.formatTime(totalSeconds);
        } catch (error) {
            console.error('Error calculating album length:', error);
            return '0:00';
        }
    }

    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    // These are implemented by child class
    toggleExpand() {
        // Implemented by child class
    }

    hideEmbed() {
        // Implemented by child class
    }

    showEmbed() {
        // Implemented by child class
    }

    showAlbumInfo() {
        // Implemented by child class
    }

    dispose() {
        document.removeEventListener('keydown', this._boundHandleEscape);
        
        if (this.infoElement) {
            this.infoElement.removeEventListener('click', this._boundHandleClick);
        }

        if (this.elements.expandButton) {
            this.elements.expandButton.remove();
        }

        this.elements = {};
        this.infoElement = null;
        this.embedContainer = null;
        this.currentlyPlayingAlbum = null;
        this.hoveredAlbum = null;
    }
}