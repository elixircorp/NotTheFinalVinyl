import SceneManager from './SceneManager.js';
import Album from '../components/Albums.js';
import VinylManager from '../components/VinylManager.js';
import EventHandler from '../handlers/EventHandler.js';
import NavigationHandler from '../handlers/NavigationHandler.js';
import InfoDisplay from '../ui/InfoDisplay.js';
import Loader from '../utils/Loader.js';

export default class AlbumGallery {
    constructor() {
        try {
            // Core settings
            this.settings = {
                albumSize: 200,
                padding: 40,
                visibleAlbums: 5,
                normalScale: 1.0,
                focusedScale: 1.5
            };

            // State
            this.albums = [];
            this.currentIndex = 0;
            this.isAnimating = false;
            this.isInitialized = false;
            this.initializationStarted = false;
            
            // Initialize core components
            this.initializeComponents();
            
            // Start initialization
            this.init().catch(error => {
                console.error('Failed to initialize gallery:', error);
                this.handleInitError(error);
            });
        } catch (error) {
            console.error('Error in gallery constructor:', error);
            this.handleInitError(error);
        }
    }

    initializeComponents() {
        try {
            console.log('Initializing components...');
            
            // Initialize managers in specific order
            this.sceneManager = new SceneManager();
            if (!this.sceneManager) throw new Error('Failed to initialize SceneManager');

            this.vinylManager = new VinylManager(this.settings.albumSize);
            if (!this.vinylManager) throw new Error('Failed to initialize VinylManager');

            this.navigation = new NavigationHandler(this);
            if (!this.navigation) throw new Error('Failed to initialize NavigationHandler');

            this.eventHandler = new EventHandler(this);
            if (!this.eventHandler) throw new Error('Failed to initialize EventHandler');

            this.infoDisplay = new InfoDisplay(this);
            if (!this.infoDisplay) throw new Error('Failed to initialize InfoDisplay');

            this.loader = new Loader();
            
            console.log('All components initialized successfully');
        } catch (error) {
            console.error('Error initializing components:', error);
            throw error;
        }
    }
    
    async init() {
        if (this.initializationStarted) {
            console.log('Initialization already started');
            return;
        }
        
        console.log('Starting gallery initialization');
        this.initializationStarted = true;

        try {
            // Get references once
            const splash = document.getElementById('splash');
            const splashImg = splash?.querySelector('img');

            // Start loading immediately but don't await yet
            const loadingPromise = this.startLoading().catch(error => {
                console.error('Loading failed:', error);
                throw error;
            });

            // Handle splash screen
            if (splash && splashImg) {
                splash.style.display = 'flex';
                splash.style.background = '#000';
                splash.style.opacity = '1';
                
                splashImg.style.animation = 'none';
                splashImg.style.opacity = '0';
                splashImg.style.transform = 'scale(0.95) rotate(-2deg)';
                
                void splashImg.offsetWidth;
                
                requestAnimationFrame(() => {
                    splashImg.style.animation = 'logoSequence 4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                });
            }

            await new Promise(resolve => setTimeout(resolve, 4000));
            
            this.hideSplash();
            this.loader.showLoading();
            
            try {
                await loadingPromise;
                this.loader.hideLoading();
                setTimeout(() => this.showInstructions(), 300);
            } catch (error) {
                console.error('Error during loading:', error);
                throw error;
            }
            
        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            this.handleInitError(error);
            throw error;
        }
    }

    async startLoading() {
        try {
            console.log('Starting album loading process...');
            const albumsData = await this.loader.loadAlbums();
            console.log('Albums data received:', albumsData);
            
            if (!albumsData || !Array.isArray(albumsData)) {
                console.error('Invalid albums data:', albumsData);
                throw new Error('Invalid album data received');
            }

            // Create Album instances
            console.log(`Creating ${albumsData.length} albums...`);
            const albumCreationPromises = albumsData.map((albumData, index) => {
                try {
                    return new Album(
                        albumData,
                        index,
                        this.settings,
                        this.sceneManager.getScene()
                    );
                } catch (error) {
                    console.error(`Error creating album ${index}:`, error);
                    return null;
                }
            });

            this.albums = (await Promise.all(albumCreationPromises)).filter(album => album !== null);
            console.log(`Successfully created ${this.albums.length} albums`);

            if (this.albums.length === 0) {
                throw new Error('No albums were successfully created');
            }

            await this.loader.loadAllTextures(albumsData);
            console.log('All textures loaded');

            this.navigation.updatePositions(true);
            
            this.isInitialized = true;
            this.animate();

            return true;
        } catch (error) {
            console.error('Failed to load gallery:', error);
            throw error;
        }
    }

    animate() {
        if (!this.isInitialized) return;

        try {
            requestAnimationFrame(() => this.animate());
            
            if (this.navigation) {
                this.navigation.updatePositions();
            }

            if (this.albums && Array.isArray(this.albums)) {
                this.albums.forEach(album => {
                    if (album) {
                        album.update();
                        if (album.isVinylAnimating() || album.isVinylSpinning()) {
                            if (this.vinylManager) {
                                this.vinylManager.update(album);
                            }
                        }
                    }
                });
            }
            
            if (this.sceneManager) {
                this.sceneManager.render();
            }
        } catch (error) {
            console.error('Error in animation loop:', error);
        }
    }

    hideSplash() {
        try {
            const splash = document.getElementById('splash');
            if (splash) {
                splash.style.pointerEvents = 'none';
                setTimeout(() => {
                    splash.remove();
                }, 1000);
            }
        } catch (error) {
            console.error('Error hiding splash screen:', error);
        }
    }

    showInstructions() {
        const instructions = document.querySelector('.instructions');
        if (instructions) {
            instructions.classList.add('visible');
        }
    }

    handleInitError(error) {
        console.error('Gallery initialization error:', error);
        const splash = document.getElementById('splash');
        if (splash) {
            splash.innerHTML = `
                <div class="error" style="color: white; text-align: center; padding: 20px;">
                    Failed to load gallery. Please try refreshing the page.
                    <br><br>
                    Error: ${error.message}
                </div>
            `;
        }
        
        this.dispose();
    }

    getAlbum(index) {
        if (index < 0 || index >= this.albums.length) {
            console.error('Invalid album index:', index);
            return null;
        }
        return this.albums[index];
    }

    getCurrentAlbum() {
        return this.getAlbum(this.currentIndex);
    }

    setCurrentIndex(index) {
        if (index < 0 || index >= this.albums.length) {
            console.error('Invalid current index:', index);
            return;
        }
        this.currentIndex = index;
    }

    getSettings() {
        return { ...this.settings };
    }

    getSceneManager() {
        return this.sceneManager;
    }

    getVinylManager() {
        return this.vinylManager;
    }

    getInfoDisplay() {
        return this.infoDisplay;
    }

    getNavigation() {
        return this.navigation;
    }

    isAnimating() {
        return this.isAnimating;
    }

    setAnimating(state) {
        this.isAnimating = Boolean(state);
    }

    dispose() {
        try {
            console.log('Disposing gallery...');
            
            if (this.eventHandler) {
                this.eventHandler.dispose();
            }
            if (this.sceneManager) {
                this.sceneManager.dispose();
            }
            if (this.infoDisplay) {
                this.infoDisplay.dispose();
            }
            if (this.loader) {
                this.loader.dispose();
            }
            
            if (this.albums) {
                this.albums.forEach(album => {
                    if (album && album.dispose) {
                        album.dispose();
                    }
                });
            }
            
            // Clear all references
            this.albums = [];
            this.sceneManager = null;
            this.vinylManager = null;
            this.navigation = null;
            this.eventHandler = null;
            this.infoDisplay = null;
            this.loader = null;
            this.isInitialized = false;
            this.initializationStarted = false;
            
            console.log('Gallery disposed successfully');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}