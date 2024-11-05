import { TextureLoader } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.module.js';
import { shuffleArray, prepareAlbumsForShuffle } from './Shuffle.js';

export default class Loader {
    constructor() {
        console.log('Initializing Loader...');
        this.textureLoader = new TextureLoader();
        this.loadingElement = document.getElementById('gallery-loading');
        this.progressBar = this.loadingElement?.querySelector('.progress');
        
        this.totalAssets = 0;
        this.loadedCount = 0;
        this.textureCache = new Map();
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.visibility = 'visible';
            this.loadingElement.classList.add('visible');
            if (this.progressBar) {
                this.progressBar.style.width = '0%';
            }
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('visible');
            setTimeout(() => {
                this.loadingElement.style.visibility = 'hidden';
            }, 300);
        }
    }

    async loadAlbums() {
        try {
            console.log('Starting album load process...');
            const response = await fetch('./data/releases.json');
            const rawAlbums = await response.json();
            console.log('Raw albums loaded:', rawAlbums.length, rawAlbums);
            
            // First prepare albums with originalIndex
            console.log('Preparing albums for shuffle...');
            const preparedAlbums = prepareAlbumsForShuffle(rawAlbums);
            console.log('Albums prepared with originalIndex:', preparedAlbums.length, preparedAlbums);
            
            // Then shuffle them
            console.log('Shuffling albums...');
            const shuffledAlbums = shuffleArray(preparedAlbums);
            console.log('Albums after shuffle:', shuffledAlbums.length, shuffledAlbums);
            
            // Verify each album has originalIndex
            shuffledAlbums.forEach((album, i) => {
                console.log(`Album ${i}: ${album.title} (Original: ${album.originalIndex})`);
                if (typeof album.originalIndex !== 'number') {
                    console.warn(`Album missing originalIndex:`, album);
                }
            });
            
            this.totalAssets = shuffledAlbums.length + 1;
            console.log(`Need to load ${this.totalAssets} assets`);
            
            return shuffledAlbums;
        } catch (error) {
            console.error('Error in loadAlbums:', error);
            throw error;
        }
    }

    updateProgress() {
        this.loadedCount++;
        const percent = (this.loadedCount / this.totalAssets) * 100;
        
        if (this.progressBar) {
            requestAnimationFrame(() => {
                this.progressBar.style.width = `${percent}%`;
            });
        }

        if (this.loadedCount >= this.totalAssets) {
            this.hideLoading();
        }
    }

    async loadTexture(path) {
        // Check cache first
        if (this.textureCache.has(path)) {
            return this.textureCache.get(path);
        }

        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                texture => {
                    this.textureCache.set(path, texture);
                    this.updateProgress();
                    resolve(texture);
                },
                undefined,
                error => {
                    console.error(`Failed to load texture: ${path}`, error);
                    this.updateProgress();
                    reject(error);
                }
            );
        });
    }

    async loadAllTextures(albums) {
        const loadedTextures = new Map();
        const batchSize = 4;
        
        try {
            console.log('Starting texture loading...');
            // Load vinyl texture first
            await this.loadTexture('./assets/images/vinyl.png')
                .then(texture => loadedTextures.set('vinyl', texture))
                .catch(error => {
                    console.error('Error loading vinyl texture:', error);
                });

            // Load album artworks in batches
            for (let i = 0; i < albums.length; i += batchSize) {
                const batch = albums.slice(i, i + batchSize);
                console.log(`Loading texture batch ${i/batchSize + 1}...`);
                const batchPromises = batch.map(album => {
                    const path = `./assets/artwork/${album.artist.replace(/[^a-zA-Z0-9]/g, '_')}_${album.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
                    return this.loadTexture(path)
                        .then(texture => loadedTextures.set(path, texture))
                        .catch(error => {
                            console.error(`Error loading artwork for ${album.title}:`, error);
                        });
                });

                await Promise.all(batchPromises);
            }

            console.log('All textures loaded successfully');
            return loadedTextures;
        } catch (error) {
            console.error('Error loading textures:', error);
            throw error;
        }
    }

    dispose() {
        console.log('Disposing loader...');
        this.hideLoading();
        this.textureCache.clear();
    }
}