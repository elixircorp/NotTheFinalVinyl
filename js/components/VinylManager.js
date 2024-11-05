export default class VinylManager {
    constructor(albumSize) {
        this.albumSize = albumSize;
        this.slideOutDuration = 800;
        this.slideInDuration = 600;
        this.slideDistance = this.albumSize * 0.25;
        
        this.currentlyAnimatingAlbums = new Set();
        this.lastPlayingAlbum = null;
        this.currentPlayingData = null;
    }

    update(album) {
        if (!album) return;
        
        // Update vinyl rotation for spinning albums
        if (album.isVinylSpinning()) {
            const spinSpeed = album.getSpinSpeed ? album.getSpinSpeed() : 0.02;
            if (album.vinylMesh) {
                album.vinylMesh.rotation.z += spinSpeed;
            }
        }

        // Update vinyl position for animating albums
        if (album.isVinylAnimating()) {
            const currentPosition = album.getVinylPosition();
            if (album.vinylMesh) {
                album.vinylMesh.position.x = currentPosition;
                album.vinylMesh.position.z = currentPosition > 0 ? -0.1 : -0.1;
            }
        }
    }

    async slideVinylOut(album) {
        if (!album || this.currentlyAnimatingAlbums.has(album)) {
            return;
        }

        this.currentPlayingData = album.getData();

        if (this.lastPlayingAlbum && 
            this.lastPlayingAlbum !== album && 
            this.currentPlayingData.title !== this.lastPlayingAlbum.getData().title) {
            await this.slideVinylIn(this.lastPlayingAlbum);
        }

        if (album.vinylMesh) {
            album.vinylMesh.visible = true;
            requestAnimationFrame(() => {
                album.setVinylPosition(0);
            });
        }

        this.currentlyAnimatingAlbums.add(album);
        this.lastPlayingAlbum = album;

        return new Promise((resolve) => {
            let startTime = null;
            
            album.setVinylState({
                isVinylAnimating: true,
                isVinylSpinning: false,
                spinSpeed: 0,
                isVinylOut: false
            });

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = (timestamp - startTime) / this.slideOutDuration;
                
                if (elapsed < 1) {
                    const t = elapsed;
                    const progress = t < 0.5
                        ? 4 * t * t * t
                        : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    
                    const currentPosition = this.slideDistance * progress;
                    album.setVinylPosition(currentPosition);
                    
                    requestAnimationFrame(animate);
                } else {
                    album.setVinylPosition(this.slideDistance);
                    this.currentlyAnimatingAlbums.delete(album);
                    
                    setTimeout(() => {
                        album.setVinylState({
                            isVinylAnimating: false,
                            isVinylOut: true,
                            isVinylSpinning: true,
                            spinSpeed: 0.02
                        });
                        resolve();
                    }, 50);
                }
            };

            requestAnimationFrame(animate);
        });
    }

    async slideVinylIn(album) {
        if (this.currentPlayingData && 
            album.getData().title === this.currentPlayingData.title) {
            return;
        }

        if (!album || this.currentlyAnimatingAlbums.has(album) || !album.isVinylOut()) {
            return;
        }

        this.currentlyAnimatingAlbums.add(album);
        if (this.lastPlayingAlbum === album) {
            this.lastPlayingAlbum = null;
            this.currentPlayingData = null;
        }

        return new Promise((resolve) => {
            let startTime = null;
            const startPosition = album.getVinylPosition();

            album.setVinylState({
                isVinylAnimating: true,
                isVinylSpinning: false
            });

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = (timestamp - startTime) / this.slideInDuration;
                
                if (elapsed < 1) {
                    const progress = 1 - Math.pow(1 - elapsed, 4);
                    const currentPosition = startPosition * (1 - progress);
                    album.setVinylPosition(currentPosition);
                    
                    requestAnimationFrame(animate);
                } else {
                    album.setVinylPosition(0);
                    this.currentlyAnimatingAlbums.delete(album);
                    
                    album.setVinylState({
                        isVinylAnimating: false,
                        isVinylOut: false,
                        isVinylSpinning: false,
                        spinSpeed: 0
                    });
                    
                    if (album.vinylMesh) {
                        album.vinylMesh.visible = false;
                    }
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    isCurrentlyPlaying(album) {
        return this.currentPlayingData && 
               album.getData().title === this.currentPlayingData.title;
    }

    resetVinyl(album) {
        if (this.isCurrentlyPlaying(album)) {
            return;
        }
        
        if (album && album.isVinylOut()) {
            return this.slideVinylIn(album);
        }
    }

    async resetAllVinyls(albums) {
        if (!albums) return;
        
        for (const album of albums) {
            if (album && album.isVinylOut() && !this.isCurrentlyPlaying(album)) {
                await this.slideVinylIn(album);
            }
        }
    }

    stopAllSpinning(albums) {
        if (!albums) return;
        albums.forEach(album => {
            if (album && album.isVinylSpinning() && !this.isCurrentlyPlaying(album)) {
                album.setVinylState({
                    isVinylSpinning: false,
                    spinSpeed: 0
                });
            }
        });
    }
}