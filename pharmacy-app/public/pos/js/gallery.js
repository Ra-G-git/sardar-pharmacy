(function () {
  'use strict';

  const Gallery = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <style>
          .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .gallery-item {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
          }
          .gallery-item:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }
          .gallery-img-container {
            width: 100%;
            height: 180px;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-bottom: 1px solid var(--border);
            position: relative;
          }
          .gallery-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .gallery-info {
            padding: 12px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 10px;
          }
          .gallery-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--text);
            margin: 0;
            line-height: 1.4;
          }
          .gallery-meta {
            font-size: 11px;
            color: var(--text-secondary);
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .btn-delete-img {
            background: #fee2e2;
            color: #b91c1c;
            border: none;
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
          .btn-delete-img:hover {
            background: #fecaca;
          }
        </style>

        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🖼️ Product Image Gallery</h2>
            <p class="page-subtitle">View all uploaded product images and remove them from items if they are no longer needed.</p>
          </div>
        </div>

        <div class="card fade-in" style="margin-top:20px;">
          <div class="card-body">
            <div id="gallery-loading" style="padding: 40px; text-align: center; color: var(--text-secondary);">
              <div class="spinner" style="margin: 0 auto 10px;"></div>
              Loading image gallery...
            </div>
            <div id="gallery-container" class="gallery-grid" style="display: none;"></div>
            <div id="gallery-empty" style="display: none; padding: 60px 20px; text-align: center; color: var(--text-light);">
              <span style="font-size: 48px; display: block; margin-bottom: 12px;">🖼️</span>
              <h3>No images found in catalog</h3>
              <p style="margin-top: 4px;">Upload images in the Products Catalog to see them listed here.</p>
            </div>
          </div>
        </div>
      `;

      await this.loadGallery(S, H);
    },

    async loadGallery(Store, Helpers) {
      const loadingEl = document.getElementById('gallery-loading');
      const containerEl = document.getElementById('gallery-container');
      const emptyEl = document.getElementById('gallery-empty');

      try {
        const products = await Store.getAll('products');
        const itemsWithImages = products.filter(p => p.image && p.image.trim() !== '');

        loadingEl.style.display = 'none';

        if (itemsWithImages.length === 0) {
          containerEl.style.display = 'none';
          emptyEl.style.display = 'block';
          return;
        }

        emptyEl.style.display = 'none';
        containerEl.innerHTML = '';
        containerEl.style.display = 'grid';

        itemsWithImages.forEach(p => {
          containerEl.innerHTML += `
            <div class="gallery-item fade-in">
              <div class="gallery-img-container">
                <img class="gallery-img" src="${p.image}" alt="${Helpers.esc(p.name)}">
              </div>
              <div class="gallery-info">
                <div>
                  <h4 class="gallery-title">${Helpers.esc(p.name)}</h4>
                  <div class="gallery-meta" style="margin-top: 4px;">
                    <span>Brand: ${Helpers.esc(p.brand || '—')}</span>
                    <span>Generic: ${Helpers.esc(p.generic || '—')}</span>
                    <span>SKU: ${Helpers.esc(p.sku)}</span>
                  </div>
                </div>
                <button class="btn-delete-img" data-id="${p.id}" data-name="${Helpers.esc(p.name)}">
                  🗑️ Clear Image
                </button>
              </div>
            </div>
          `;
        });

        containerEl.querySelectorAll('.btn-delete-img').forEach(btn => {
          btn.onclick = async () => {
            const pid = btn.dataset.id;
            const pName = btn.dataset.name;
            if (await Helpers.confirm(`Are you sure you want to clear the image for "${pName}"?`)) {
              const product = products.find(prod => prod.id === pid);
              if (product) {
                const updated = { ...product };
                updated.image = '';
                const ok = await Store.update('products', pid, updated);
                if (ok) {
                  Helpers.showToast(`Image cleared for "${pName}".`);
                  await this.loadGallery(Store, Helpers);
                } else {
                  Helpers.showToast('Could not clear image', 'error');
                }
              }
            }
          };
        });

      } catch (err) {
        console.error('Error loading gallery:', err);
        loadingEl.style.display = 'none';
        Helpers.showToast('Error loading image gallery: ' + err.message, 'error');
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.Gallery = Gallery;
})();
