// handlers/EventHandler.js
export default class EventHandler {
    constructor(gallery) {
        if (!gallery) {
            console.error('Gallery instance not provided to EventHandler');
            return;
        }
        
        // Store gallery reference
        this._gallery = gallery;
        this._sceneManager = gallery.getSceneManager();
        this._navigation = gallery.getNavigation();
        
        // Touch handling state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.touchCooldown = 500; // Increased cooldown for Safari
        this.lastTouchTime = 0;
        this.touchMoved = false;
        this.touchInProgress = false;

        // Wheel handling state
        this.wheelCooldown = 250;
        this.lastWheelTime = 0;
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // Track last hovered album
        this.lastHoveredAlbumIndex = null;

        // Bind methods to preserve context
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleResize = this.handleResize.bind(this);

        this.setupEventListeners();
    }

    get gallery() {
        if (!this._gallery) {
            console.error('Gallery reference lost');
        }
        return this._gallery;
    }

    get sceneManager() {
        return this._sceneManager;
    }

    get navigation() {
        return this._navigation;
    }

    setupEventListeners() {
        window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
        window.addEventListener('click', this.handleClick);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        window.addEventListener('wheel', this.handleWheel, { passive: false });
        window.addEventListener('resize', this.handleResize);
    }

    handleMouseMove(event) {
        if (!this.sceneManager || !this.gallery?.albums || this.touchInProgress) return;
        
        this.sceneManager.updateMousePosition(event);
        
        const intersects = this.sceneManager.raycast(
            this.gallery.albums
                .filter(album => album.getGroup().visible)
                .map(album => album.getGroup())
        );
        
        if (intersects.length > 0) {
            const hoveredMesh = intersects[0].object;
            const group = hoveredMesh.parent;
            
            if (group && group.userData && group.userData.album) {
                const hoveredAlbumIndex = this.gallery.albums.findIndex(
                    album => album.getData().title === group.userData.album.title
                );
                
                if (this.lastHoveredAlbumIndex !== hoveredAlbumIndex && hoveredAlbumIndex !== -1) {
                    this.lastHoveredAlbumIndex = hoveredAlbumIndex;
                    const album = this.gallery.albums[hoveredAlbumIndex];
                    if (album) {
                        this.gallery.getInfoDisplay()?.showAlbumInfo(album.getData(), album.isVinylOut());
                    }
                }
            }
        } else {
            this.lastHoveredAlbumIndex = null;
        }
    }

    handleClick(event) {
        if (this.touchInProgress) return;
        this.handleInteraction(event.clientX, event.clientY);
    }

    handleInteraction(clientX, clientY) {
        if (!this.gallery?.albums) {
            console.error('Gallery or albums not available');
            return;
        }

        const renderer = this.sceneManager?.getRenderer();
        if (!renderer) {
            console.error('Renderer not available');
            return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        this.sceneManager.updateMousePosition({ clientX, clientY });
        
        const visibleAlbums = this.gallery.albums
            .filter(album => album.getGroup().visible)
            .map(album => album.getGroup());
            
        const intersects = this.sceneManager.raycast(visibleAlbums);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const group = clickedMesh.parent;
            if (!group || !group.userData || !group.userData.album) return;

            const clickedAlbum = this.gallery.albums.find(
                album => album.getData().title === group.userData.album.title
            );
            
            if (!clickedAlbum) return;

            const clickedIndex = this.gallery.albums.indexOf(clickedAlbum);
            
            if (clickedIndex !== this.gallery.currentIndex) {
                this.navigation?.navigateToIndex(clickedIndex);
            } else {
                if (!clickedAlbum.isVinylOut()) {
                    const infoDisplay = this.gallery.getInfoDisplay();
                    const vinylManager = this.gallery.getVinylManager();
                    
                    if (infoDisplay) {
                        infoDisplay.showEmbed(clickedAlbum.getData());
                    }
                    if (vinylManager) {
                        vinylManager.slideVinylOut(clickedAlbum);
                    }
                }
            }
        }
    }

    handleKeyDown(event) {
        if (!this.navigation) return;

        switch (event.key) {
            case 'ArrowRight':
                event.preventDefault();
                this.navigation.navigate(1);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.navigation.navigate(-1);
                break;
            case 'Escape':
                event.preventDefault();
                this.handleCloseEmbed();
                break;
        }
    }

    handleTouchStart(event) {
        if (!event.target.closest('#info')) {
            event.preventDefault();
        }
        
        this.touchInProgress = true;
        this.touchMoved = false;
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
        this.touchStartTime = Date.now();
    }

    handleTouchMove(event) {
        if (!this.touchInProgress) return;
        
        const infoPanel = event.target.closest('#info');
        if (!infoPanel || !infoPanel.classList.contains('expanded')) {
            event.preventDefault();
        }

        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;
        const deltaX = Math.abs(touchX - this.touchStartX);
        const deltaY = Math.abs(touchY - this.touchStartY);

        if (deltaX > 10 || deltaY > 10) {
            this.touchMoved = true;
        }
    }

    handleTouchEnd(event) {
        if (!event.target.closest('#info')) {
            event.preventDefault();
        }

        if (!this.touchInProgress) return;

        const now = Date.now();
        const touchDuration = now - this.touchStartTime;

        if (!event.target.closest('#info')) {
            if (!this.touchMoved && touchDuration < 300) {
                this.handleInteraction(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
            }
            else if (this.touchMoved && this.navigation && touchDuration < 500) {
                const touchEndX = event.changedTouches[0].clientX;
                const touchDistance = touchEndX - this.touchStartX;

                if (Math.abs(touchDistance) > 50) {
                    this.navigation.navigate(touchDistance < 0 ? 1 : -1);
                    this.lastTouchTime = now;
                }
            }
        }

        this.touchInProgress = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    handleWheel(event) {
        if (!this.navigation || this.touchInProgress) return;
        
        const now = Date.now();
        if (now - this.lastWheelTime < this.wheelCooldown) {
            event.preventDefault();
            return;
        }
        
        // Normalize the delta values for Safari
        const deltaX = this.isSafari ? event.deltaX / 3 : event.deltaX;
        const deltaY = this.isSafari ? event.deltaY / 3 : event.deltaY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            event.preventDefault();
            
            // Threshold to prevent accidental scrolls
            if (Math.abs(deltaX) > 10) {
                this.lastWheelTime = now;
                this.navigation.navigate(deltaX > 0 ? 1 : -1);
            }
        }
    }

    handleResize() {
        if (this.sceneManager) {
            this.sceneManager.onWindowResize();
        }
    }

    handleCloseEmbed() {
        const infoDisplay = this.gallery?.getInfoDisplay();
        if (infoDisplay) {
            infoDisplay.hideEmbed();
            // Stop vinyl animation but don't affect other playback
            const currentAlbum = this.gallery.getCurrentAlbum();
            if (currentAlbum) {
                this.gallery.getVinylManager()?.slideVinylIn(currentAlbum);
            }
        }
    }

    dispose() {
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('click', this.handleClick);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('resize', this.handleResize);
        
        this.lastHoveredAlbumIndex = null;
        this._gallery = null;
        this._sceneManager = null;
        this._navigation = null;
    }
}