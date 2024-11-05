// utils/Shuffle.js

export function shuffleArray(array) {
    if (!Array.isArray(array)) {
        console.error('shuffleArray received non-array:', array);
        return array;
    }
    
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function prepareAlbumsForShuffle(albums) {
    if (!Array.isArray(albums)) {
        console.error('prepareAlbumsForShuffle received non-array:', albums);
        return albums;
    }
    
    return albums.map((album, index) => {
        if (!album) {
            console.error('Invalid album data at index', index);
            return null;
        }
        return {
            ...album,
            originalIndex: index
        };
    }).filter(album => album !== null);
}