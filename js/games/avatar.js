/**
 * ASDF Avatar - 7-Layer Avatar Renderer
 *
 * LAYERS (bottom to top):
 * 0: background - Canvas/environment
 * 1: aura       - Glow effects behind character
 * 2: skin       - Base character model
 * 3: outfit     - Clothing on character
 * 4: eyes       - Eye modifications/effects
 * 5: head       - Hats, hair, headwear
 * 6: held       - Items in hand/carried
 *
 * RENDERING:
 * - Uses Canvas 2D for compositing
 * - Lazy loads images for performance
 * - Caches rendered avatars
 * - Supports different sizes for different contexts
 */

'use strict';

// Asset paths
const AVATAR_ASSET_PATH = 'assets/shop/';

// Image cache
const AvatarImageCache = new Map();

// Render cache (composite avatars)
const AvatarRenderCache = new Map();

// Default sizes
const AvatarSizes = {
    thumbnail: 64,
    small: 128,
    medium: 256,
    large: 512,
    full: 1024
};

// ============================================
// IMAGE LOADING
// ============================================

/**
 * Load an image with caching
 * @param {string} src - Image source path
 * @returns {Promise<HTMLImageElement>} Loaded image
 */
function loadImage(src) {
    if (AvatarImageCache.has(src)) {
        return Promise.resolve(AvatarImageCache.get(src));
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            AvatarImageCache.set(src, img);
            resolve(img);
        };

        img.onerror = () => {
            console.warn(`[Avatar] Failed to load: ${src}`);
            reject(new Error(`Failed to load image: ${src}`));
        };

        img.src = src;
    });
}

/**
 * Preload all assets for equipped items
 * @param {Object} equipped - Equipped items per layer
 * @returns {Promise<void>}
 */
async function preloadEquippedAssets(equipped) {
    const promises = [];

    for (const layer of ASDF.avatarLayers) {
        const item = equipped[layer.id];
        if (item && item.asset) {
            const path = `${AVATAR_ASSET_PATH}${layer.id}/${item.asset}`;
            promises.push(loadImage(path).catch(() => null));
        }
    }

    await Promise.all(promises);
}

// ============================================
// RENDERING
// ============================================

/**
 * Generate cache key for avatar configuration
 * @param {Object} equipped - Equipped items
 * @param {number} size - Render size
 * @returns {string} Cache key
 */
function generateCacheKey(equipped, size) {
    const items = ASDF.avatarLayers.map(l => equipped[l.id]?.id || 'none').join('|');
    return `${items}@${size}`;
}

/**
 * Render avatar to canvas
 * @param {Object} equipped - Equipped items per layer (from getEquipped())
 * @param {number} size - Output size in pixels
 * @param {boolean} useCache - Use render cache
 * @returns {Promise<HTMLCanvasElement>} Rendered canvas
 */
async function renderAvatar(equipped, size = AvatarSizes.medium, useCache = true) {
    const cacheKey = generateCacheKey(equipped, size);

    // Check cache
    if (useCache && AvatarRenderCache.has(cacheKey)) {
        return AvatarRenderCache.get(cacheKey);
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Render each layer in order
    for (const layer of ASDF.avatarLayers) {
        const item = equipped[layer.id];
        if (!item || !item.asset) continue;

        try {
            const path = `${AVATAR_ASSET_PATH}${layer.id}/${item.asset}`;
            const img = await loadImage(path);

            // Draw image scaled to fit
            ctx.drawImage(img, 0, 0, size, size);
        } catch (e) {
            // Layer failed to load, continue with others
            console.warn(`[Avatar] Layer ${layer.id} failed:`, e);
        }
    }

    // Cache result
    if (useCache) {
        AvatarRenderCache.set(cacheKey, canvas);

        // Limit cache size
        if (AvatarRenderCache.size > 50) {
            const firstKey = AvatarRenderCache.keys().next().value;
            AvatarRenderCache.delete(firstKey);
        }
    }

    return canvas;
}

/**
 * Render avatar to data URL
 * @param {Object} equipped - Equipped items
 * @param {number} size - Output size
 * @returns {Promise<string>} Data URL
 */
async function renderAvatarToDataURL(equipped, size = AvatarSizes.medium) {
    const canvas = await renderAvatar(equipped, size);
    return canvas.toDataURL('image/png');
}

/**
 * Render avatar to blob
 * @param {Object} equipped - Equipped items
 * @param {number} size - Output size
 * @returns {Promise<Blob>} Image blob
 */
async function renderAvatarToBlob(equipped, size = AvatarSizes.medium) {
    const canvas = await renderAvatar(equipped, size);
    return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
    });
}

// ============================================
// UI COMPONENTS
// ============================================

/**
 * Create avatar display element
 * @param {Object} equipped - Equipped items
 * @param {string} sizeKey - Size key (thumbnail, small, medium, large, full)
 * @param {string} className - Additional CSS class
 * @returns {Promise<HTMLElement>} Avatar container element
 */
async function createAvatarElement(equipped, sizeKey = 'medium', className = '') {
    const size = AvatarSizes[sizeKey] || AvatarSizes.medium;

    const container = document.createElement('div');
    container.className = `avatar-display ${className}`.trim();
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    container.style.position = 'relative';

    try {
        const canvas = await renderAvatar(equipped, size);
        canvas.className = 'avatar-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);
    } catch (e) {
        // Show placeholder on error
        container.innerHTML = '<div class="avatar-placeholder">?</div>';
    }

    return container;
}

/**
 * Update an existing avatar display
 * @param {HTMLElement} container - Avatar container element
 * @param {Object} equipped - New equipped items
 * @param {string} sizeKey - Size key
 */
async function updateAvatarElement(container, equipped, sizeKey = 'medium') {
    const size = AvatarSizes[sizeKey] || AvatarSizes.medium;

    try {
        const canvas = await renderAvatar(equipped, size, false); // Don't use cache for updates

        // Replace existing canvas
        const existingCanvas = container.querySelector('.avatar-canvas');
        if (existingCanvas) {
            existingCanvas.replaceWith(canvas);
        } else {
            container.innerHTML = '';
            container.appendChild(canvas);
        }
        canvas.className = 'avatar-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    } catch (e) {
        console.warn('[Avatar] Update failed:', e);
    }
}

/**
 * Create layer preview element (single item)
 * @param {Object} item - Shop item
 * @param {number} size - Preview size
 * @returns {Promise<HTMLElement>} Preview element
 */
async function createLayerPreview(item, size = 64) {
    const container = document.createElement('div');
    container.className = 'layer-preview';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;

    if (!item || !item.asset) {
        container.innerHTML = '<div class="layer-empty">-</div>';
        return container;
    }

    try {
        const path = `${AVATAR_ASSET_PATH}${item.layer}/${item.asset}`;
        const img = await loadImage(path);

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);

        container.appendChild(canvas);
    } catch (e) {
        container.innerHTML = '<div class="layer-error">!</div>';
    }

    return container;
}

// ============================================
// AVATAR EDITOR
// ============================================

/**
 * Create avatar editor interface
 * @param {HTMLElement} target - Target container element
 * @param {Object} options - Editor options
 */
function createAvatarEditor(target, options = {}) {
    const {
        onEquip = () => {},
        onUnequip = () => {},
        engageTier = 0
    } = options;

    const editor = document.createElement('div');
    editor.className = 'avatar-editor';

    // Preview area
    const previewArea = document.createElement('div');
    previewArea.className = 'avatar-editor-preview';
    editor.appendChild(previewArea);

    // Layer tabs
    const tabs = document.createElement('div');
    tabs.className = 'avatar-editor-tabs';

    for (const layer of ASDF.avatarLayers) {
        const tab = document.createElement('button');
        tab.className = 'avatar-tab';
        tab.dataset.layer = layer.id;
        tab.textContent = layer.id.charAt(0).toUpperCase() + layer.id.slice(1);
        tab.addEventListener('click', () => selectLayer(layer.id));
        tabs.appendChild(tab);
    }
    editor.appendChild(tabs);

    // Items grid
    const grid = document.createElement('div');
    grid.className = 'avatar-editor-grid';
    editor.appendChild(grid);

    // State
    let currentLayer = 'skin';
    let equipped = getEquipped();

    // Render preview
    async function updatePreview() {
        equipped = getEquipped();
        previewArea.innerHTML = '';
        const avatarEl = await createAvatarElement(equipped, 'large');
        previewArea.appendChild(avatarEl);
    }

    // Select layer
    function selectLayer(layerId) {
        currentLayer = layerId;

        // Update tabs
        tabs.querySelectorAll('.avatar-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.layer === layerId);
        });

        // Render items for layer
        renderLayerItems(layerId);
    }

    // Render items for a layer
    async function renderLayerItems(layerId) {
        grid.innerHTML = '';

        const inventory = getInventoryByLayer(layerId);
        const catalog = ShopCatalog.getByLayer(layerId);

        // Add unequip option for optional layers
        const layerInfo = ASDF.avatarLayers.find(l => l.id === layerId);
        if (layerInfo && !layerInfo.required) {
            const unequipBtn = document.createElement('button');
            unequipBtn.className = 'avatar-item avatar-item-unequip';
            unequipBtn.textContent = 'None';
            unequipBtn.addEventListener('click', async () => {
                const result = unequipLayer(layerId);
                if (result.success) {
                    onUnequip(layerId);
                    await updatePreview();
                    renderLayerItems(layerId);
                }
            });
            grid.appendChild(unequipBtn);
        }

        // Render owned items
        for (const item of inventory) {
            const itemEl = document.createElement('button');
            itemEl.className = 'avatar-item';
            if (equipped[layerId]?.id === item.id) {
                itemEl.classList.add('equipped');
            }

            const preview = await createLayerPreview(item, 64);
            itemEl.appendChild(preview);

            const name = document.createElement('div');
            name.className = 'avatar-item-name';
            name.textContent = item.name;
            name.style.color = ASDF.getTierColor(item.tier, 'shop');
            itemEl.appendChild(name);

            itemEl.addEventListener('click', async () => {
                const result = equipItem(item.id);
                if (result.success) {
                    onEquip(item);
                    await updatePreview();
                    renderLayerItems(layerId);
                }
            });

            grid.appendChild(itemEl);
        }

        // Render locked items (not owned)
        const ownedIds = inventory.map(i => i.id);
        const locked = catalog.filter(i => !ownedIds.includes(i.id) && !i.default);

        for (const item of locked) {
            const itemEl = document.createElement('button');
            itemEl.className = 'avatar-item avatar-item-locked';

            const preview = await createLayerPreview(item, 64);
            preview.style.opacity = '0.5';
            preview.style.filter = 'grayscale(1)';
            itemEl.appendChild(preview);

            const name = document.createElement('div');
            name.className = 'avatar-item-name';
            name.textContent = item.name;
            itemEl.appendChild(name);

            const price = document.createElement('div');
            price.className = 'avatar-item-price';
            price.textContent = ASDF.formatNumber(getDiscountedPrice(item, engageTier));
            itemEl.appendChild(price);

            // Click to buy (would open shop)
            itemEl.addEventListener('click', () => {
                // Emit event or callback to open shop with this item
                const event = new CustomEvent('avatar:buy', { detail: item });
                document.dispatchEvent(event);
            });

            grid.appendChild(itemEl);
        }
    }

    // Initial render
    updatePreview();
    selectLayer('skin');

    target.appendChild(editor);

    // Return controller
    return {
        refresh: updatePreview,
        selectLayer: selectLayer,
        destroy: () => editor.remove()
    };
}

// ============================================
// UTILITY
// ============================================

/**
 * Clear all caches
 */
function clearAvatarCaches() {
    AvatarImageCache.clear();
    AvatarRenderCache.clear();
}

/**
 * Get total owned items count
 * @returns {Object} Counts per layer
 */
function getAvatarStats() {
    const inventory = getInventory();
    const stats = { total: inventory.length };

    for (const layer of ASDF.avatarLayers) {
        stats[layer.id] = inventory.filter(i => i.layer === layer.id).length;
    }

    return stats;
}

// ============================================
// EXPORTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AvatarSizes,
        loadImage,
        preloadEquippedAssets,
        renderAvatar,
        renderAvatarToDataURL,
        renderAvatarToBlob,
        createAvatarElement,
        updateAvatarElement,
        createLayerPreview,
        createAvatarEditor,
        clearAvatarCaches,
        getAvatarStats
    };
}
