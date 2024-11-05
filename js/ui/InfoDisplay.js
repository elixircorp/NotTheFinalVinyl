import InfoDisplayBase from './InfoDisplayBase.js';
import { artistLinks } from '/data/extlinks.js';

export default class InfoDisplay extends InfoDisplayBase {
    constructor(gallery) {
        super();
        
        this.gallery = gallery;
        this.elements.defaultInfo = this.infoElement?.querySelector('.default-info');
        this.elements.albumInfoContainer = this.infoElement?.querySelector('.album-info');
        
        this.currentlyPlayingAlbum = null;
        this.hoveredAlbum = null;
        
        if (this.elements.defaultInfo && this.elements.albumInfoContainer) {
            this.elements.defaultInfo.style.display = 'block';
            this.elements.albumInfoContainer.style.display = 'none';
        }

        // Bind handlers
        this.handleBuyNowClick = this.handleBuyNowClick.bind(this);
        
        if (this.infoElement) {
            this.infoElement.addEventListener('click', this.handleBuyNowClick, true);
            this.infoElement.addEventListener('touchend', this.handleBuyNowClick, true);

            this.infoElement.addEventListener('wheel', (e) => {
                if (this.infoElement.classList.contains(this.expandedClass)) {
                    const wrapper = this.infoElement.querySelector('.expanded-content-wrapper');
                    if (wrapper) {
                        e.stopPropagation();
                        wrapper.scrollTop += e.deltaY;
                    }
                }
            }, { passive: true });
        }
    }

    updateExpandedContent(albumData) {
        if (!this.infoElement || !albumData) return;

        const existingWrapper = this.infoElement.querySelector('.expanded-content-wrapper');
        if (existingWrapper) {
            existingWrapper.remove();
        }

        if (this.infoElement.classList.contains(this.expandedClass)) {
            const expandedContentWrapper = document.createElement('div');
            expandedContentWrapper.className = 'expanded-content-wrapper';
            
            const expandedContent = document.createElement('div');
            expandedContent.className = 'expanded-content';
            expandedContent.innerHTML = this.generateExpandedContent(albumData);

            expandedContentWrapper.appendChild(expandedContent);
            this.infoElement.appendChild(expandedContentWrapper);

            expandedContentWrapper.scrollTop = 0;
        }
    }

    generateExpandedContent(albumData) {
        if (!albumData) return '';
        
        let content = '';

        if (albumData.description) {
            content += `
                <div class="description">${albumData.description}</div>
            `;
        }

        if (albumData.tracks && albumData.tracks.length > 0) {
            content += '<div class="track-list">';
            albumData.tracks.forEach((track, index) => {
                content += `
                    <div class="track-item">
                        <span>${(index + 1).toString().padStart(2, '0')}. ${track.title}</span>
                        <span class="track-duration">${track.duration || ''}</span>
                    </div>
                `;
            });
            content += '</div>';
        }

        content += `
            <div class="release-info">
                <div>Released: ${albumData.release_date || 'Unknown'}</div>
                ${albumData.pricing ? `<div>Price: £${albumData.pricing.amount.toFixed(2)}</div>` : ''}
            </div>
        `;

        if (albumData.tags && albumData.tags.length > 0) {
            content += '<div class="tags">';
            albumData.tags.forEach(tag => {
                content += `<span class="tag">${tag}</span>`;
            });
            content += '</div>';
        }

        content += `<div class="buy-now-container">`;

        if (artistLinks[albumData.artist]) {
            content += `
                <a href="${artistLinks[albumData.artist]}" 
                   class="artist-link"
                   target="_blank"
                   rel="noopener noreferrer"
                   role="button">
                    Visit Artist
                </a>
            `;
        }

        if (albumData.url) {
            const safeUrl = encodeURI(albumData.url);
            content += `
                <a href="${safeUrl}" 
                   class="buy-now-link"
                   target="_blank"
                   rel="noopener noreferrer"
                   role="button"
                   data-album-url="${safeUrl}">
                    Buy Now
                </a>
            `;
        }

        content += `</div>`;

        return content;
    }

    showAlbumInfo(albumData, isPlaying = false) {
        if (!albumData || !this.infoElement) return;

        if (this.infoElement.classList.contains(this.expandedClass)) {
            if (!isPlaying) return;
        }

        if (this.elements.defaultInfo && this.elements.albumInfoContainer) {
            this.elements.defaultInfo.style.display = 'none';
            this.elements.albumInfoContainer.style.display = 'block';
        }

        if (isPlaying) {
            this.currentlyPlayingAlbum = albumData;
            if (this.elements.expandButton) {
                this.elements.expandButton.style.display = 'block';
            }
        }
        this.hoveredAlbum = albumData;

        const displayData = this.infoElement.classList.contains(this.expandedClass) 
            ? this.currentlyPlayingAlbum 
            : albumData;

        if (this.elements.title) {
            this.elements.title.textContent = displayData.title || '';
        }
        if (this.elements.artist) {
            this.elements.artist.textContent = displayData.artist || '';
        }
        if (this.elements.details) {
            const duration = this.calculateAlbumLength(displayData.tracks);
            const trackCount = displayData.tracks?.length || 0;
            this.elements.details.textContent = `${trackCount} track${trackCount !== 1 ? 's' : ''} · ${duration}`;
        }

        if (this.infoElement.classList.contains(this.expandedClass)) {
            this.updateExpandedContent(displayData);
        }

        this.infoElement.classList.add(this.fadeInClass);
    }

    showEmbed(albumData) {
        if (!this.embedContainer || !window.albumEmbeds || !albumData) {
            return;
        }

        try {
            const embedData = window.albumEmbeds[albumData.title];
            if (!embedData) return;

            if (this.currentlyPlayingAlbum && 
                this.currentlyPlayingAlbum.title !== albumData.title && 
                this.gallery?.albums) {
                
                const previousAlbum = this.gallery.albums.find(
                    album => album.getData().title === this.currentlyPlayingAlbum.title
                );
                
                if (previousAlbum?.isVinylOut() && this.gallery.getVinylManager()) {
                    this.gallery.getVinylManager().slideVinylIn(previousAlbum);
                }
            }

            const content = this.elements.embedContent;
            if (!content) return;

            content.innerHTML = '';
            const iframe = document.createElement('iframe');
            
            // Setup iframe
            iframe.style.cssText = `
                border: 0;
                width: 100%;
                height: 120px;
                background: #000000;
            `;
            
            iframe.setAttribute('allow', 'autoplay');
            iframe.setAttribute('seamless', '');
            iframe.setAttribute('loading', 'lazy');
            
            // Add play detection class
            iframe.classList.add('bandcamp-player');
            
            // Modify the Bandcamp URL to pass a message when play starts
            const modifiedUrl = embedData.url
                .replace('bgcol=ffffff', 'bgcol=000000')
                .replace('linkcol=0687f5', 'linkcol=ffffff') + 
                '&played=true';

            iframe.src = modifiedUrl;

            content.appendChild(iframe);
            
            // Add playing class when iframe loads
            iframe.addEventListener('load', () => {
                content.classList.add('has-player');
            });

            requestAnimationFrame(() => {
                this.embedContainer.classList.add(this.embedVisibleClass);
                document.body.classList.add('embed-visible');
            });

            this.currentlyPlayingAlbum = albumData;
            if (this.elements.expandButton) {
                this.elements.expandButton.style.display = 'block';
            }
            this.showAlbumInfo(albumData, true);

        } catch (error) {
            console.error('Error showing embed:', error);
        }
    }

    hideEmbed() {
        if (!this.embedContainer) return;
        
        this.embedContainer.classList.remove(this.embedVisibleClass);
        document.body.classList.remove('embed-visible');
        
        setTimeout(() => {
            if (this.elements.embedContent) {
                // Remove all classes first
                this.elements.embedContent.classList.remove('has-player');
                this.elements.embedContent.innerHTML = '';
            }
            
            if (this.currentlyPlayingAlbum && this.gallery?.albums) {
                const playingAlbum = this.gallery.albums.find(
                    album => album.getData().title === this.currentlyPlayingAlbum.title
                );
                if (playingAlbum && playingAlbum.isVinylOut()) {
                    this.gallery.getVinylManager()?.slideVinylIn(playingAlbum);
                }
            }
            
            this.currentlyPlayingAlbum = null;
            
            if (this.elements.expandButton) {
                this.elements.expandButton.style.display = 'none';
            }
            
            if (this.infoElement.classList.contains(this.expandedClass)) {
                this.toggleExpand();
            }
            
            if (this.hoveredAlbum) {
                this.showAlbumInfo(this.hoveredAlbum, false);
            } else {
                if (this.elements.defaultInfo && this.elements.albumInfoContainer) {
                    this.elements.defaultInfo.style.display = 'block';
                    this.elements.albumInfoContainer.style.display = 'none';
                }
            }
        }, 300);
    }

    toggleExpand(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!this.infoElement) return;
        
        if (!this.currentlyPlayingAlbum && !this.infoElement.classList.contains(this.expandedClass)) {
            return;
        }

        const isCurrentlyExpanded = this.infoElement.classList.contains(this.expandedClass);
        
        if (isCurrentlyExpanded) {
            this.infoElement.classList.remove(this.expandedClass);
            this.infoElement.classList.add(this.fadeInClass);
            
            setTimeout(() => {
                const wrapper = this.infoElement.querySelector('.expanded-content-wrapper');
                if (wrapper) {
                    wrapper.remove();
                }
                
                if (this.hoveredAlbum) {
                    this.showAlbumInfo(this.hoveredAlbum, false);
                }
            }, 300);
        } else {
            this.infoElement.classList.add(this.expandedClass);
            this.infoElement.classList.add(this.fadeInClass);
            this.showAlbumInfo(this.currentlyPlayingAlbum, true);
            
            const wrapper = this.infoElement.querySelector('.expanded-content-wrapper');
            if (wrapper) {
                wrapper.scrollTop = 0;
            }
        }
    }

    handleBuyNowClick(event) {
        const buyLink = event.target.closest('.buy-now-link, .artist-link');
        if (buyLink) {
            event.preventDefault();
            event.stopPropagation();
            
            const url = buyLink.getAttribute('href');
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    }

    dispose() {
        if (this.infoElement) {
            this.infoElement.removeEventListener('click', this.handleBuyNowClick, true);
            this.infoElement.removeEventListener('touchend', this.handleBuyNowClick, true);
        }
        super.dispose();
    }
}