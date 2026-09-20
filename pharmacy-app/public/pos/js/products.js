(function () {
  'use strict';

  const Products = {
    currentTab: 'all',
    perPage: 10,
    currentPage: 1,
    searchQuery: '',
    categoryFilter: 'all',
    selectedProductIds: [],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      const allProducts = await S.getAll('products?tracked=true');
      const generics = Array.from(new Set(allProducts.map(p => p.generic).filter(p => p && p.trim() !== ''))).sort();

      mc.innerHTML = `
        <style>
          /* Redesigned Product Catalog styling */
          .tab-container { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px; }
          .tab-btn { background: none; border: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: #718096; cursor: pointer; display: flex; align-items: center; gap: 6px; border-radius: 20px; transition: all 0.2s; }
          .tab-btn.active { background: #eff6ff; color: #2563eb; }
          .tab-count { font-size: 11px; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 10px; font-weight: 700; }
          .tab-btn.active .tab-count { background: #3b82f6; color: #fff; }
          
          .catalog-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-top: 10px; }
          .catalog-table th { font-size: 11px; font-weight: 700; color: #4a5568; text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; letter-spacing: 0.5px; }
          .catalog-table tr.table-row { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04); border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; }
          .catalog-table tr.table-row:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); }
          .catalog-table td { padding: 16px; font-size: 13px; vertical-align: middle; color: #2d3748; border-top: 1px solid #f7fafc; border-bottom: 1px solid #edf2f7; }
          .catalog-table td:first-child { border-left: 1px solid #edf2f7; border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
          .catalog-table td:last-child { border-right: 1px solid #edf2f7; border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
          
          .prod-meta-wrap { display: flex; flex-direction: column; gap: 4px; }
          .prod-meta-name { font-weight: 700; font-size: 14px; color: #1a202c; text-decoration: none; display: block; }
          .prod-meta-name:hover { color: #2563eb; }
          .badge-status { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; width: fit-content; text-transform: uppercase; }
          .badge-status.publish { background: #d1fae5; color: #065f46; }
          .badge-status.draft { background: #f3f4f6; color: #374151; }
          .badge-priority { font-size: 10px; color: #718096; display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; font-weight: 500; }
          
          .stock-box, .price-box { display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 180px; }
          .variant-item { display: flex; justify-content: space-between; gap: 12px; background: #f8fafc; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; font-size: 11px; }
          .variant-item-lbl { color: #475569; font-weight: 500; }
          .variant-item-val { font-weight: 700; color: #0f172a; }
          .stock-green { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
          .stock-green .variant-item-val { color: #047857; }
          
          .btn-more-variants { background: none; border: none; color: #2563eb; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 2px 4px; margin-top: 2px; }
          
          .actions-cell-wrap { position: relative; display: flex; justify-content: center; }
          .action-btn-trigger { background: none; border: none; padding: 8px; border-radius: 50%; color: #718096; cursor: pointer; transition: background 0.2s; }
          .action-btn-trigger:hover { background: #edf2f7; color: #2d3748; }
          
          .action-popup { position: absolute; right: 0; top: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 100; min-width: 150px; display: none; flex-direction: column; padding: 4px 0; }
          .action-popup.open { display: flex; }
          .action-popup-item { background: none; border: none; padding: 8px 16px; font-size: 12px; text-align: left; color: #4a5568; cursor: pointer; width: 100%; transition: background 0.2s; display: flex; align-items: center; gap: 8px; }
          .action-popup-item:hover { background: #f7fafc; color: #2d3748; }
          .action-popup-item.danger:hover { background: #fff5f5; color: #c53030; }

          .scanner-guide-btn { display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; height: 38px; }
          .scanner-guide-btn:hover { background: #dbeafe; }
          
          .pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 12px 16px; background: #fff; border-radius: 8px; border: 1px solid #edf2f7; }
        </style>

        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📦 Medicine</h2>
            <p class="page-subtitle">Add units (box, strip, tablet), track individual costs, barcode identifiers, and adjust inventory.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-export-csv">📥 Export CSV</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; height:34px; padding:0 12px; font-weight:600; font-size:12px; border-radius:var(--radius-sm);">
              📤 Import CSV / Excel
              <input type="file" id="file-import-csv" accept=".csv,.xlsx,.xls" style="display:none;">
            </label>
            ${(S.getCurrentUser().role === 'admin' || S.getCurrentUser().role === 'manager') ? `
              <button class="btn btn-secondary btn-sm" id="btn-bulk-scan-stock" style="background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; font-weight: 700;">⚡ Bulk Scan Stock</button>
            ` : ''}
            <button class="btn btn-primary btn-sm" id="btn-add-product">+ Add Product</button>
          </div>
        </div>

        <div class="tab-container fade-in">
          <button class="tab-btn active" id="tab-all" data-tab="all">
            All Data <span class="tab-count" id="count-all">0</span>
          </button>
          <button class="tab-btn" id="tab-publish" data-tab="Publish">
            Publish <span class="tab-count" id="count-publish">0</span>
          </button>
          <button class="tab-btn" id="tab-draft" data-tab="Draft">
            Draft <span class="tab-count" id="count-draft">0</span>
          </button>
          <button class="tab-btn" id="tab-trash" data-tab="Trash" style="color: #ef4444;">
            🗑️ Trash <span class="tab-count" id="count-trash" style="background:#fee2e2; color:#b91c1c;">0</span>
          </button>
        </div>

        <div class="filter-bar fade-in" style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
          <div class="search-box" style="flex:2;">
            <input type="text" id="prod-search" placeholder="Search by name, SKU, or barcode...">
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:180px;">
            <select class="form-select" id="prod-generic-filter">
              <option value="all">All Generics</option>
              ${generics.map(g => `<option value="${g}">${H.esc(g)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="form-select" id="prod-per-page" style="width:120px; height:38px; font-size:12px; margin-bottom:0;">
              <option value="10">10 Per Page</option>
              <option value="20">20 Per Page</option>
              <option value="50">50 Per Page</option>
              <option value="100">100 Per Page</option>
            </select>
            <select class="form-select" id="prod-bulk-actions" style="width:140px; height:38px; font-size:12px; margin-bottom:0;">
              <option value="">Bulk Actions</option>
              <option value="publish">Publish Selected</option>
              <option value="draft">Draft Selected</option>
              <option value="delete">Trash Selected</option>
              <option value="restore">Restore Selected</option>
              <option value="delete_perm">Delete Permanently</option>
            </select>
          </div>
        </div>

        <div class="table-container fade-in" style="overflow-x:auto;">
          <table class="catalog-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;"><input type="checkbox" id="chk-select-all"></th>
                <th style="width:60px;">SL</th>
                <th style="width:85px;">Image</th>
                <th>Name</th>
                <th>Brand</th>
                <th>Generic Name</th>
                <th style="width:150px;">Piece per Unit</th>
                <th style="width:180px;">Selling Price by Unit</th>
                <th style="width:120px;">Stock (Pcs)</th>
                <th style="width:100px; text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody id="products-table-body">
              <!-- Rendered via updateList -->
            </tbody>
          </table>
        </div>
        </div>

        <div class="pagination-bar fade-in" id="catalog-pagination">
          <!-- Rendered via updateList -->
        </div>

        <div class="modal-overlay" id="prod-modal-overlay"></div>
      `;

      // Event handlers
      document.getElementById('btn-add-product').onclick = () => this.showAddEditModal(null);
      const btnBulkScan = document.getElementById('btn-bulk-scan-stock');
      if (btnBulkScan) {
        btnBulkScan.onclick = () => this.showBulkScanStockModal();
      }

      document.getElementById('btn-export-csv').onclick = async () => {
        const res = await fetch(`${window.POS.API_BASE}/api/products?includeTrashed=true`, {
          headers: S.getHeaders()
        });
        const list = await res.json();
        
        let listToExport = list;
        if (this.selectedProductIds && this.selectedProductIds.length > 0) {
          listToExport = list.filter(p => this.selectedProductIds.includes(p.id));
        }

        const csvData = [];

        listToExport.forEach(p => {
          const brandName = p.brand || '';
          const genericName = p.generic || '';

          if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              csvData.push({
                'name': p.name,
                'brand': brandName,
                'generic': genericName,
                'barcode': p.barcode || '',
                'sku': p.sku,
                'costPrice': p.costPrice,
                'sellingPrice': p.sellingPrice,
                'quantity': p.stock,
                'unit_name': v.name,
                'pcs_per_unit': v.qty_per_unit || v.qtyPerUnit || 1
              });
            });
          } else {
            csvData.push({
              'name': p.name,
              'brand': brandName,
              'generic': genericName,
              'barcode': p.barcode || '',
              'sku': p.sku,
              'costPrice': p.costPrice,
              'sellingPrice': p.sellingPrice,
              'quantity': p.stock,
              'unit_name': '',
              'pcs_per_unit': ''
            });
          }
        });

        H.exportCSV(csvData, 'products_export');
      };

      document.getElementById('file-import-csv').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const reader = new FileReader();

        reader.onload = async (ev) => {
          try {
            let rows = [];
            if (isExcel) {
              const data = new Uint8Array(ev.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            } else {
              const csvText = ev.target.result;
              rows = H.parseCSV(csvText);
            }

            if (rows.length === 0) {
              H.showToast('Import file is empty or invalid', 'error');
              return;
            }

            const productsMap = {};

            rows.forEach(r => {
              const skuRaw = (r['sku'] || r['SKU'] || '').toString().trim();
              if (!skuRaw) return;

              const name = (r['name'] || r['Product Name'] || r['Product'] || '').toString().trim();
              const brand = (r['brand'] || r['Brand'] || '').toString().trim();
              const generic = (r['generic'] || r['Generic'] || r['Generic Name'] || r['category'] || r['Category Name'] || '').toString().trim();
              const tags = (r['tags'] || r['Tags'] || r['tag'] || r['Tag'] || '').toString().trim();
              
              const salePrice = parseFloat(r['sellingPrice'] || r['Selling Price'] || r['salePrice'] || r['sale_price'] || r['price'] || 0);
              const costPrice = parseFloat(r['costPrice'] || r['Cost Price'] || r['cost_price'] || r['cost'] || 0);
              const quantity = parseInt(r['quantity'] || r['Quantity'] || r['stock'] || r['Stock'] || 0);
              const barcode = (r['barcode'] || r['Barcode'] || '').toString().trim();

              if (!productsMap[skuRaw]) {
                productsMap[skuRaw] = {
                  name: name || `Product ${skuRaw}`,
                  sku: skuRaw,
                  barcode: barcode || null,
                  brand: brand || null,
                  generic: generic || null,
                  tag: tags || null,
                  costPrice: costPrice,
                  sellingPrice: salePrice,
                  stock: quantity,
                  alertQty: 5,
                  variations: []
                };
              }

              const uName = (r['unit_name'] || r['Unit Name'] || r['variation_name'] || r['variationName'] || '').toString().trim();
              
              if (uName) {
                const uQtyPerUnit = parseInt(r['pcs_per_unit'] || r['Pcs per unit'] || r['Pcs Per Unit'] || r['pcsPerUnit'] || 1) || 1;
                const uSku = `${skuRaw}-${uName.toLowerCase().replace(/\s+/g, '_')}`;

                productsMap[skuRaw].variations.push({
                  name: uName,
                  sku: uSku,
                  barcode: null,
                  qty_per_unit: uQtyPerUnit,
                  price: salePrice * uQtyPerUnit,
                  costPrice: costPrice * uQtyPerUnit,
                  stock: 0
                });
              }
            });

            const productsToImport = Object.values(productsMap);

            if (productsToImport.length === 0) {
              H.showToast('No valid product rows with SKU found', 'error');
              return;
            }

            const res = await fetch(`${window.POS.API_BASE}/api/products/bulk`, {
              method: 'POST',
              headers: S.getHeaders(),
              body: JSON.stringify(productsToImport)
            });

            if (res.ok) {
              H.showToast(`Imported/Updated ${productsToImport.length} products successfully!`);
              await this.render();
            } else {
              const err = await res.json();
              H.showToast(err.error || 'Import failed', 'error');
            }
          } catch (err) {
            console.error('Import Error:', err);
            H.showToast('Invalid file format or sheet structure', 'error');
          }
        };

        if (isExcel) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      };

      document.getElementById('prod-search').oninput = H.debounce(async (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        await this.updateList();
      }, 200);

      document.getElementById('prod-generic-filter').onchange = async (e) => {
        this.genericFilter = e.target.value;
        this.currentPage = 1;
        await this.updateList();
      };

      document.getElementById('prod-per-page').onchange = async (e) => {
        this.perPage = parseInt(e.target.value) || 10;
        this.currentPage = 1;
        await this.updateList();
      };

      // Tab handlers
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = async () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentTab = btn.dataset.tab;
          this.currentPage = 1;
          this.selectedProductIds = [];
          document.getElementById('chk-select-all').checked = false;
          await this.updateList();
        };
      });



      // Bulk Actions handler
      document.getElementById('prod-bulk-actions').onchange = async (e) => {
        const action = e.target.value;
        if (!action) return;

        if (this.selectedProductIds.length === 0) {
          H.showToast('No products selected!', 'error');
          e.target.value = '';
          return;
        }

        let confirmMsg = `Are you sure you want to run this bulk action on ${this.selectedProductIds.length} items?`;
        if (action === 'delete_perm') {
          confirmMsg = `⚠️ WARNING: This will permanently delete ${this.selectedProductIds.length} items. This cannot be undone!`;
        }

        if (await H.confirm(confirmMsg)) {
          H.showToast('Processing bulk action...');
          for (const pid of this.selectedProductIds) {
            try {
              if (action === 'publish' || action === 'draft') {
                const pRes = await fetch(`${window.POS.API_BASE}/api/products?includeTrashed=true`, { headers: S.getHeaders() });
                const list = await pRes.json();
                const product = list.find(prod => prod.id === pid);
                if (product) {
                  product.status = action === 'publish' ? 'Publish' : 'Draft';
                  await fetch(`${window.POS.API_BASE}/api/products/${pid}`, {
                    method: 'PUT',
                    headers: S.getHeaders(),
                    body: JSON.stringify(product)
                  });
                }
              } else if (action === 'delete') {
                await fetch(`${window.POS.API_BASE}/api/products/${pid}`, { method: 'DELETE', headers: S.getHeaders() });
              } else if (action === 'delete_perm') {
                await fetch(`${window.POS.API_BASE}/api/products/${pid}?permanent=true`, { method: 'DELETE', headers: S.getHeaders() });
              } else if (action === 'restore') {
                await fetch(`${window.POS.API_BASE}/api/products/${pid}/restore`, { method: 'POST', headers: S.getHeaders() });
              }
            } catch (err) {
              console.error('Bulk error:', err);
            }
          }
          H.showToast('Bulk action completed.');
          this.selectedProductIds = [];
          document.getElementById('chk-select-all').checked = false;
          await this.render();
        }
        e.target.value = '';
      };

      // Select All checkbox
      document.getElementById('chk-select-all').onclick = (e) => {
        const checkboxes = document.querySelectorAll('.chk-prod-item');
        this.selectedProductIds = [];
        checkboxes.forEach(chk => {
          chk.checked = e.target.checked;
          if (chk.checked) {
            this.selectedProductIds.push(chk.dataset.id);
          }
        });
      };

      // Close popups when clicking anywhere else
      document.addEventListener('click', (ev) => {
        if (!ev.target.closest('.actions-cell-wrap')) {
          document.querySelectorAll('.action-popup').forEach(pop => pop.classList.remove('open'));
        }
      });

      // Initial load
      await this.updateList();
    },

    showBulkScanStockModal() {
      const S = POS.Store;
      const H = POS.Helpers;

      let modalOverlay = document.getElementById('bulk-scan-modal-overlay');
      if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'bulk-scan-modal-overlay';
        modalOverlay.className = 'modal-overlay';
        document.body.appendChild(modalOverlay);
      }

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width:850px; width:90%; height:85vh; display:flex; flex-direction:column; padding:0;">
          <div class="modal-header" style="padding:16px 20px; border-bottom:1px solid var(--border-light);">
            <h3>⚡ Bulk Scan Stock Update</h3>
            <button class="modal-close" id="modal-close-bulk-scan">&times;</button>
          </div>
          <div class="modal-body" style="flex:1; display:flex; flex-direction:column; padding:20px; gap:16px; overflow:hidden;">
            
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:var(--radius-sm); padding:12px; font-size:12px; color:#1e40af; line-height:1.4; display:flex; gap:10px; align-items:center;">
              <span style="font-size:20px;">💡</span>
              <div>
                <strong>Instructions:</strong> Scan a product's barcode or type the SKU/Barcode manually in the input below and press Enter. 
                Each scan increments the addition count by 1. You can also adjust counts manually in the list below. 
                Click <strong>Confirm & Add to Stock</strong> when finished.
              </div>
            </div>

            <div style="display:flex; gap:12px; align-items:flex-end;">
              <div style="flex:1;">
                <label class="form-label" style="font-weight:700;">Scan Barcode / Enter SKU</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" class="form-input" id="bulk-scan-input" placeholder="Scan barcode or type SKU / Barcode and press Enter..." autocomplete="off" style="font-size:14px; padding:10px 14px;">
                  <button class="btn btn-primary" id="btn-bulk-scan-trigger" style="white-space:nowrap; padding:0 20px;">🔍 Search</button>
                </div>
              </div>
            </div>

            <!-- Scanned List Table -->
            <div style="flex:1; border:1px solid #edf2f7; border-radius:var(--radius-sm); overflow-y:auto; background:#fff;">
              <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                <thead>
                  <tr style="background:#f8fafc; border-bottom:1px solid #edf2f7;">
                    <th style="padding:12px; font-weight:700; color:#475569; width:50%;">Product / Variation</th>
                    <th style="padding:12px; font-weight:700; color:#475569; width:20%;">SKU / Barcode</th>
                    <th style="padding:12px; font-weight:700; color:#475569; width:15%; text-align:center;">Current Stock</th>
                    <th style="padding:12px; font-weight:700; color:#475569; width:15%; text-align:center;">Scanned Qty (To Add)</th>
                    <th style="padding:12px; font-weight:700; color:#475569; width:80px; text-align:center;">Action</th>
                  </tr>
                </thead>
                <tbody id="bulk-scan-tbody">
                  <tr>
                    <td colspan="5" style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">
                      No items scanned yet. Start scanning to add stock!
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
          <div class="modal-footer" style="padding:16px 20px; border-top:1px solid var(--border-light); background:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
            <div id="bulk-scan-summary" style="font-weight:700; color:#475569;">Total Scanned Items: 0</div>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-secondary" id="btn-bulk-scan-cancel">Cancel</button>
              <button class="btn btn-primary" id="btn-bulk-scan-confirm" style="background:#16a34a; border-color:#16a34a;" disabled>Confirm & Add to Stock</button>
            </div>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const scannedItems = [];

      const input = modalOverlay.querySelector('#bulk-scan-input');
      const tbody = modalOverlay.querySelector('#bulk-scan-tbody');
      const confirmBtn = modalOverlay.querySelector('#btn-bulk-scan-confirm');
      const summaryText = modalOverlay.querySelector('#bulk-scan-summary');
      const searchBtn = modalOverlay.querySelector('#btn-bulk-scan-trigger');

      setTimeout(() => input.focus(), 100);

      modalOverlay.querySelector('.modal-body').onclick = () => {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'BUTTON') {
          input.focus();
        }
      };

      const renderScannedList = () => {
        if (scannedItems.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">
                No items scanned yet. Start scanning to add stock!
              </td>
            </tr>
          `;
          confirmBtn.disabled = true;
          summaryText.textContent = `Total Scanned Items: 0`;
          return;
        }

        tbody.innerHTML = scannedItems.map((item, idx) => {
          return `
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 12px; font-weight: 600; color: #1e293b;">${H.esc(item.name)}</td>
              <td style="padding: 12px; font-family: monospace; color: #475569;">${H.esc(item.sku || item.barcode || 'N/A')}</td>
              <td style="padding: 12px; text-align: center; color: #64748b;">${item.currentStock}</td>
              <td style="padding: 12px; text-align: center;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <button class="btn-qty-minus" data-idx="${idx}" style="width:24px; height:24px; border-radius:50%; border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:700; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">-</button>
                  <span style="font-weight:700; font-size:14px; width:30px; text-align:center;">${item.qty}</span>
                  <button class="btn-qty-plus" data-idx="${idx}" style="width:24px; height:24px; border-radius:50%; border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-weight:700; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;">+</button>
                </div>
              </td>
              <td style="padding: 12px; text-align: center;">
                <button class="btn-remove-scan" data-idx="${idx}" style="background:none; border:none; color:#ef4444; font-size:16px; cursor:pointer; padding:4px;">🗑️</button>
              </td>
            </tr>
          `;
        }).join('');

        confirmBtn.disabled = false;
        const totalItems = scannedItems.reduce((sum, i) => sum + i.qty, 0);
        summaryText.textContent = `Total Scanned Items: ${totalItems} (${scannedItems.length} unique)`;

        tbody.querySelectorAll('.btn-qty-minus').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            if (scannedItems[idx].qty > 1) {
              scannedItems[idx].qty--;
              renderScannedList();
            }
          };
        });

        tbody.querySelectorAll('.btn-qty-plus').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            scannedItems[idx].qty++;
            renderScannedList();
          };
        });

        tbody.querySelectorAll('.btn-remove-scan').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            scannedItems.splice(idx, 1);
            renderScannedList();
            input.focus();
          };
        });
      };

      const handleScanQuery = async () => {
        const query = input.value.trim();
        if (!query) return;

        input.value = '';
        input.disabled = true;

        try {
          const res = await fetch(`${window.POS.API_BASE}/api/products/resolve-scan?query=${encodeURIComponent(query)}`, {
            headers: S.getHeaders()
          });
          if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            const item = data.item;
            const existing = scannedItems.find(i => i.id === item.id && i.type === item.type);
            if (existing) {
              existing.qty++;
            } else {
              scannedItems.push({
                type: item.type,
                id: item.id,
                name: item.name,
                sku: item.sku,
                barcode: item.barcode,
                currentStock: item.currentStock,
                qty: 1
              });
            }
            renderScannedList();
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
              gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.08);
            } catch (e) {}
          } else {
            H.showToast(`Not Found: "${query}" matches no products or SKU codes`, 'error');
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = 'sawtooth';
              oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
              gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.25);
            } catch (e) {}
          }
        } catch (err) {
          console.error(err);
          H.showToast(`Network error: ${err.message}`, 'error');
        } finally {
          input.disabled = false;
          input.focus();
        }
      };

      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleScanQuery();
        }
      };

      searchBtn.onclick = handleScanQuery;

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-bulk-scan').onclick = close;
      modalOverlay.querySelector('#btn-bulk-scan-cancel').onclick = close;

      modalOverlay.querySelector('#btn-bulk-scan-confirm').onclick = async () => {
        if (scannedItems.length === 0) return;

        const confirmBtn = modalOverlay.querySelector('#btn-bulk-scan-confirm');
        confirmBtn.disabled = true;
        confirmBtn.innerText = 'Updating Stock...';

        try {
          const updates = scannedItems.map(i => ({
            type: i.type,
            id: i.id,
            qty: i.qty
          }));

          const res = await fetch(`${window.POS.API_BASE}/api/products/bulk-stock-update`, {
            method: 'POST',
            headers: S.getHeaders(),
            body: JSON.stringify(updates)
          });

          const data = await res.json();
          if (data.success) {
            H.showToast(`Successfully added stock for ${scannedItems.length} items!`);
            close();
            await this.updateList();
          } else {
            H.showToast(data.error || 'Failed to update stock', 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerText = 'Confirm & Add to Stock';
          }
        } catch (err) {
          console.error(err);
          H.showToast('Network error updating stock', 'error');
          confirmBtn.disabled = false;
          confirmBtn.innerText = 'Confirm & Add to Stock';
        }
      };
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;

      const res = await fetch(`${window.POS.API_BASE}/api/products?includeTrashed=true`, {
        headers: S.getHeaders()
      });
      const allProducts = await res.json();
      const categories = await S.getAll('categories');

      // Calculate count metrics for tabs
      const totalAll = allProducts.filter(p => !p.deletedAt || p.deletedAt === '0000-00-00 00:00:00').length;
      const totalPublish = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Publish').length;
      const totalDraft = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Draft').length;
      const totalTrash = allProducts.filter(p => p.deletedAt && p.deletedAt !== '0000-00-00 00:00:00').length;

      document.getElementById('count-all').innerText = totalAll;
      document.getElementById('count-publish').innerText = totalPublish;
      document.getElementById('count-draft').innerText = totalDraft;
      document.getElementById('count-trash').innerText = totalTrash;

      let filtered = allProducts;
      if (this.currentTab === 'all') {
        filtered = allProducts.filter(p => !p.deletedAt || p.deletedAt === '0000-00-00 00:00:00');
      } else if (this.currentTab === 'Publish') {
        filtered = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Publish');
      } else if (this.currentTab === 'Draft') {
        filtered = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Draft');
      } else if (this.currentTab === 'Trash') {
        filtered = allProducts.filter(p => p.deletedAt && p.deletedAt !== '0000-00-00 00:00:00');
      }

      if (this.categoryFilter !== 'all') {
        filtered = filtered.filter(p => p.categoryId === this.categoryFilter);
      }

      if (this.searchQuery) {
        filtered = filtered.filter(p => {
          const nameMatch = p.name.toLowerCase().includes(this.searchQuery);
          const skuMatch = p.sku.toLowerCase().includes(this.searchQuery);
          const barcodeMatch = p.barcode ? p.barcode.includes(this.searchQuery) : false;
          const tagMatch = p.tag ? p.tag.toLowerCase().includes(this.searchQuery) : false;

          let varMatch = false;
          if (p.variations && p.variations.length > 0) {
            varMatch = p.variations.some(v =>
              v.name.toLowerCase().includes(this.searchQuery) ||
              v.sku.toLowerCase().includes(this.searchQuery)
            );
          }
          return nameMatch || skuMatch || barcodeMatch || tagMatch || varMatch;
        });
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / this.perPage) || 1;

      if (this.currentPage > totalPages) this.currentPage = totalPages;
      if (this.currentPage < 1) this.currentPage = 1;

      const startIndex = (this.currentPage - 1) * this.perPage;
      const pageItems = filtered.slice(startIndex, startIndex + this.perPage);

      const tableBody = document.getElementById('products-table-body');
      tableBody.innerHTML = '';

      if (pageItems.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-muted text-center" style="padding: 30px;">
              ⚠️ No products found in this category or search selection.
            </td>
          </tr>
        `;
        document.getElementById('catalog-pagination').innerHTML = '';
        return;
      }

      pageItems.forEach((p, idx) => {
        const serialNo = startIndex + idx + 1;

        const statusClass = p.status === 'Publish' ? 'publish' : 'draft';
        const statusBadge = `<span class="badge-status ${statusClass}">${p.status || 'Publish'}</span>`;
        const priorityBadge = p.priority > 0 ? `<span class="badge-priority">⭐ Priority: ${p.priority}</span>` : '';

        let imgHtml = `<span style="font-size: 24px;">${H.categoryEmoji(p.category_name)}</span>`;
        if (p.image) {
          imgHtml = `<img src="${p.image}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; border: 1px solid #edf2f7;">`;
        }

        let piecePerUnitHtml = '';
        if (p.variations && p.variations.length > 0) {
          const varList = p.variations;
          const displayLimit = 2;
          const showMore = varList.length > displayLimit;

          piecePerUnitHtml += `<div class="stock-box">`;
          varList.forEach((v, vIdx) => {
            const cls = vIdx >= displayLimit ? 'variant-item stock-green extra-var-stock' : 'variant-item stock-green';
            const style = vIdx >= displayLimit ? 'style="display:none;"' : '';
            piecePerUnitHtml += `
              <div class="${cls}" ${style}>
                <span class="variant-item-lbl">${H.esc(v.name)}</span>
                <span class="variant-item-val">${v.qty_per_unit || v.qtyPerUnit || 1} pcs</span>
              </div>
            `;
          });
          if (showMore) {
            piecePerUnitHtml += `
              <button class="btn-more-variants btn-toggle-stock" data-expanded="false">
                +${varList.length - displayLimit} more ▾
              </button>
            `;
          }
          piecePerUnitHtml += `</div>`;
        } else {
          piecePerUnitHtml = `
            <div class="variant-item stock-green">
              <span class="variant-item-lbl">Standard</span>
              <span class="variant-item-val">1 pc</span>
            </div>
          `;
        }

        const isLowStock = p.stock <= (p.alertQty || 5);
        const stockStyle = isLowStock 
          ? 'background-color:#fef2f2; color:#b91c1c; border:1px solid #fecaca;' 
          : 'background-color:#ecfdf5; color:#047857; border:1px solid #a7f3d0;';
        const stockHtml = `<span style="display:inline-block; font-size:12px; font-weight:600; padding:4px 8px; border-radius:4px; ${stockStyle}">${p.stock} pcs</span>`;

        let priceHtml = '';
        if (p.variations && p.variations.length > 0) {
          const varList = p.variations;
          const displayLimit = 2;
          const showMore = varList.length > displayLimit;

          priceHtml += `<div class="price-box">`;
          varList.forEach((v, vIdx) => {
            const cls = vIdx >= displayLimit ? 'variant-item extra-var-price' : 'variant-item';
            const style = vIdx >= displayLimit ? 'style="display:none;"' : '';
            priceHtml += `
              <div class="${cls}" ${style}>
                <span class="variant-item-lbl">${H.esc(v.name)}</span>
                <span class="variant-item-val">৳ ${v.price}</span>
              </div>
            `;
          });
          if (showMore) {
            priceHtml += `
              <button class="btn-more-variants btn-toggle-price" data-expanded="false">
                +${varList.length - displayLimit} more ▾
              </button>
            `;
          }
          priceHtml += `</div>`;
        } else {
          priceHtml = `
            <div class="variant-item">
              <span class="variant-item-lbl">Standard</span>
              <span class="variant-item-val">৳ ${p.sellingPrice}</span>
            </div>
          `;
        }

        const isSelected = this.selectedProductIds.includes(p.id) ? 'checked' : '';
        tableBody.innerHTML += `
          <tr class="table-row">
            <td style="text-align:center;"><input type="checkbox" class="chk-prod-item" data-id="${p.id}" ${isSelected}></td>
            <td style="font-weight:700; color:#718096;">${serialNo}</td>
            <td>${imgHtml}</td>
            <td>
              <div class="prod-meta-wrap">
                <a href="javascript:void(0)" class="prod-meta-name" data-id="${p.id}">${H.esc(p.name)}</a>
                <div style="display:flex; align-items:center;">
                  ${statusBadge}
                  ${priorityBadge}
                </div>
              </div>
            </td>
             <td style="font-weight:600; color:#4a5568;">${H.esc(p.brand || '—')}</td>
             <td style="font-weight:600; color:#4a5568;">${H.esc(p.generic || '—')}</td>
             <td>${piecePerUnitHtml}</td>
             <td>${priceHtml}</td>
             <td>${stockHtml}</td>
            <td>
              <div class="actions-cell-wrap">
                <button class="action-btn-trigger">⋮</button>
                <div class="action-popup">
                  ${(!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') ? `
                    <button class="action-popup-item btn-edit-opt" data-id="${p.id}">✏️ Edit Details</button>
                    <button class="action-popup-item btn-label-opt" data-id="${p.id}">🏷️ Print Label</button>
                    <button class="action-popup-item danger btn-delete-opt" data-id="${p.id}">🗑️ Move to Trash</button>
                  ` : `
                    <button class="action-popup-item btn-restore-opt" data-id="${p.id}">↩️ Restore Product</button>
                    <button class="action-popup-item danger btn-delete-perm-opt" data-id="${p.id}">❌ Delete Permanently</button>
                  `}
                </div>
              </div>
            </td>
          </tr>
        `;
      });

      // Bind triggers
      document.querySelectorAll('.action-btn-trigger').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const popup = btn.nextElementSibling;
          const open = popup.classList.contains('open');
          document.querySelectorAll('.action-popup').forEach(pop => pop.classList.remove('open'));
          if (!open) popup.classList.add('open');
        };
      });

      document.querySelectorAll('.chk-prod-item').forEach(chk => {
        chk.onclick = () => {
          const pid = chk.dataset.id;
          if (chk.checked) {
            if (!this.selectedProductIds.includes(pid)) this.selectedProductIds.push(pid);
          } else {
            this.selectedProductIds = this.selectedProductIds.filter(id => id !== pid);
          }
        };
      });

      document.querySelectorAll('.prod-meta-name').forEach(link => {
        link.onclick = () => {
          const p = allProducts.find(prod => prod.id === link.dataset.id);
          this.showAddEditModal(p);
        };
      });

      document.querySelectorAll('.btn-edit-opt').forEach(btn => {
        btn.onclick = () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          this.showAddEditModal(p);
        };
      });

      document.querySelectorAll('.btn-label-opt').forEach(btn => {
        btn.onclick = () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          POS.LabelPrinter.selectedProducts = [];
          POS.LabelPrinter.addProduct(p, false);
          POS.Router.navigate('/label-printer');
        };
      });

      document.querySelectorAll('.btn-delete-opt').forEach(btn => {
        btn.onclick = async () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          if (await H.confirm(`Are you sure you want to move "${p.name}" to Trash? It will stay in Trash for 30 days.`)) {
            await fetch(`${window.POS.API_BASE}/api/products/${p.id}`, {
              method: 'DELETE',
              headers: S.getHeaders()
            });
            H.showToast(`"${p.name}" moved to Trash.`);
            await this.render();
          }
        };
      });

      document.querySelectorAll('.btn-restore-opt').forEach(btn => {
        btn.onclick = async () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          await fetch(`${window.POS.API_BASE}/api/products/${p.id}/restore`, {
            method: 'POST',
            headers: S.getHeaders()
          });
          H.showToast(`"${p.name}" restored to inventory.`);
          await this.render();
        };
      });

      document.querySelectorAll('.btn-delete-perm-opt').forEach(btn => {
        btn.onclick = async () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          if (await H.confirm(`⚠️ WARNING: Are you sure you want to permanently delete "${p.name}"? This action CANNOT be undone.`)) {
            await fetch(`${window.POS.API_BASE}/api/products/${p.id}?permanent=true`, {
              method: 'DELETE',
              headers: S.getHeaders()
            });
            H.showToast(`"${p.name}" deleted permanently.`);
            await this.render();
          }
        };
      });

      document.querySelectorAll('.btn-toggle-stock').forEach(btn => {
        btn.onclick = () => {
          const parent = btn.parentElement;
          const extra = parent.querySelectorAll('.extra-var-stock');
          const isExpanded = btn.dataset.expanded === 'true';

          if (isExpanded) {
            extra.forEach(el => el.style.display = 'none');
            btn.innerHTML = `+${extra.length} more ▾`;
            btn.dataset.expanded = 'false';
          } else {
            extra.forEach(el => el.style.display = 'flex');
            btn.innerHTML = `Show less ▴`;
            btn.dataset.expanded = 'true';
          }
        };
      });

      document.querySelectorAll('.btn-toggle-price').forEach(btn => {
        btn.onclick = () => {
          const parent = btn.parentElement;
          const extra = parent.querySelectorAll('.extra-var-price');
          const isExpanded = btn.dataset.expanded === 'true';

          if (isExpanded) {
            extra.forEach(el => el.style.display = 'none');
            btn.innerHTML = `+${extra.length} more ▾`;
            btn.dataset.expanded = 'false';
          } else {
            extra.forEach(el => el.style.display = 'flex');
            btn.innerHTML = `Show less ▴`;
            btn.dataset.expanded = 'true';
          }
        };
      });

      const pagination = document.getElementById('catalog-pagination');
      if (totalPages > 1) {
        let pagHtml = `
          <div style="font-size:12px; color:#718096; font-weight:600;">
            Showing ${startIndex + 1} - ${Math.min(startIndex + this.perPage, totalItems)} of ${totalItems} products
          </div>
          <div style="display:flex; gap:6px;">
        `;
        if (this.currentPage > 1) {
          pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-pag-prev" style="padding:4px 10px;">◀ Prev</button>`;
        }
        pagHtml += `<span style="font-size:13px; font-weight:700; color:#4a5568; align-self:center; margin:0 8px;">Page ${this.currentPage} of ${totalPages}</span>`;
        if (this.currentPage < totalPages) {
          pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-pag-next" style="padding:4px 10px;">Next ▶</button>`;
        }
        pagHtml += `</div>`;
        pagination.innerHTML = pagHtml;

        const prevBtn = document.getElementById('btn-pag-prev');
        if (prevBtn) {
          prevBtn.onclick = async () => {
            this.currentPage--;
            await this.updateList();
          };
        }
        const nextBtn = document.getElementById('btn-pag-next');
        if (nextBtn) {
          nextBtn.onclick = async () => {
            this.currentPage++;
            await this.updateList();
          };
        }
      } else {
        pagination.innerHTML = `
          <div style="font-size:12px; color:#718096; font-weight:600;">
            Showing all ${totalItems} products
          </div>
        `;
      }
    },

    async showAddEditModal(p, onSaved, prefillName) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('prod-modal-overlay');

      const isEdit = !!p;
      const title = isEdit ? 'Edit Product Details' : 'Add New Product';

      let currentVariations = isEdit && p.variations ? JSON.parse(JSON.stringify(p.variations)) : [];
      let activeImage = isEdit && p.image ? p.image : '';

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:750px;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" id="modal-close-prod">&times;</button>
          </div>
          <div class="modal-body" style="max-height: 480px; overflow-y: auto;">
            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Medicine Name</label>
                <input type="text" class="form-input" id="p-name" value="${isEdit ? H.esc(p.name) : H.esc(prefillName || '')}">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Manufacturer / Brand</label>
                <input type="text" class="form-input" id="p-brand" list="dl-brand" autocomplete="off" value="${isEdit ? H.esc(p.brand || '') : ''}">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Generic Name</label>
                <input type="text" class="form-input" id="p-generic" list="dl-generic" autocomplete="off" value="${isEdit ? H.esc(p.generic || '') : ''}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Category / Dosage Form</label>
                <input type="text" class="form-input" id="p-category" list="dl-category" autocomplete="off" value="${isEdit ? H.esc(p.category_name || '') : ''}" placeholder="e.g. Tablet, Syrup, Injection">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Strength</label>
                <input type="text" class="form-input" id="p-strength" list="dl-strength" autocomplete="off" value="${isEdit ? H.esc(p.strength || '') : ''}" placeholder="e.g. 500 mg">
              </div>
            </div>

            <!-- Suggestions for the four fields above, filled from the catalog after the modal opens -->
            <datalist id="dl-brand"></datalist>
            <datalist id="dl-generic"></datalist>
            <datalist id="dl-category"></datalist>
            <datalist id="dl-strength"></datalist>

            <!-- Product Picture Section -->
            <div class="form-row" style="margin-bottom:15px;">
              <div class="form-group" style="width:100%;">
                <label class="form-label">Product Image Reference</label>
                <div style="display:flex; gap:16px; align-items:center; background:#f8fafc; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm);">
                  <div id="p-img-preview" style="width:75px; height:75px; border:1px solid var(--border); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:26px; background:#fff;">
                    ${isEdit && p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">` : H.categoryEmoji(isEdit ? p.category_name : '')}
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:12px; font-weight:600; color:var(--text-light)">Upload File:</span>
                      <input type="file" id="p-file-input" accept="image/*" style="font-size:12px;">
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:12px; font-weight:600; color:var(--text-light)">Or URL:</span>
                      <input type="text" class="form-input" id="p-image-url" placeholder="Paste image link URL..." value="${isEdit && p.image && !p.image.startsWith('data:') ? H.esc(p.image) : ''}" style="height:32px; font-size:12px; flex:1;">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Main Barcode</label>
                <input type="text" class="form-input" id="p-barcode" value="${isEdit ? H.esc(p.barcode || '') : ''}">
              </div>
            </div>

            <!-- Single Product Fields -->
            <div id="single-product-fields" style="border: 1px solid var(--border); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px; background:#F8FAFC;">
              <h4 style="margin-bottom:12px;">💲 Pricing & Inventory</h4>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Selling Price (৳)</label>
                  <input type="number" class="form-input" id="p-price" value="${isEdit ? p.sellingPrice : '0'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Current Stock</label>
                  <input type="number" class="form-input" id="p-stock" value="${isEdit ? (p.stock ?? 0) : '0'}">
                </div>
                <div class="form-group">
                  <label class="form-label">+ Add Stock (optional)</label>
                  <input type="number" class="form-input" id="p-add-stock" value="" placeholder="e.g. 50">
                </div>
              </div>
              <p class="text-muted" style="font-size:11px; margin-top:6px;">"Current Stock" sets the exact count. "+ Add Stock" tops it up on save instead — use whichever is easier, or fill both (they add together).</p>
            </div>

            <!-- Variations Fields -->
            <div style="border: 1px solid var(--border); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4>📦 Product Units (e.g. Box, Strip, Tablet)</h4>
                <button class="btn btn-secondary btn-sm" id="btn-add-var-row" type="button">+ Add Unit</button>
              </div>
              <div id="variation-rows-container"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-prod-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-prod-save">Save Product</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      // Manufacturer / Generic / Category / Strength suggestions come from the
      // medicines already in the catalog (medicines.csv + anything added since),
      // so a new medicine reuses the existing spelling instead of creating a variant.
      // Filled after the modal is on screen so opening it never waits on the catalog.
      S.getProductCatalog().then(catalog => {
        if (!catalog.length) return;
        const sg = H.catalogSuggestions(catalog);
        const fill = (id, vals) => { const el = overlay.querySelector('#' + id); if (el) el.innerHTML = H.datalistOptions(vals); };
        fill('dl-brand', sg.brand);
        fill('dl-generic', sg.generic);
        fill('dl-category', sg.category);
        fill('dl-strength', sg.strength);
      });

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-prod').onclick = close;
      overlay.querySelector('#btn-prod-cancel').onclick = close;

      const fileInput = overlay.querySelector('#p-file-input');
      const preview = overlay.querySelector('#p-img-preview');
      const urlInput = overlay.querySelector('#p-image-url');

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target.result;
          preview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
          activeImage = base64;
          urlInput.value = '';
        };
        reader.readAsDataURL(file);
      };

      urlInput.oninput = (e) => {
        const url = e.target.value.trim();
        if (url) {
          preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
          activeImage = url;
        } else {
          preview.innerHTML = H.categoryEmoji(overlay.querySelector('#p-category').value);
          activeImage = '';
        }
      };

      const renderVariations = () => {
        const container = overlay.querySelector('#variation-rows-container');
        container.innerHTML = '';
        overlay.querySelector('#single-product-fields').style.display = 'block';

        if (currentVariations.length === 0) {
          container.innerHTML = `<p class="text-muted text-sm text-center py-2">No units defined.</p>`;
          return;
        }

        currentVariations.forEach((v, index) => {
          container.innerHTML += `
            <div class="var-row" data-id="${v.id || ''}" style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
              <input type="text" class="form-input var-name-input" placeholder="Unit Name (e.g. Box, Strip, Tablet)" value="${H.esc(v.name)}" style="flex:2;">
              <input type="number" class="form-input var-qty-input" placeholder="Pieces per Unit" value="${v.qty_per_unit || v.qtyPerUnit || 1}" style="flex:1;" min="1">
              <input type="text" class="form-input var-sku-input" placeholder="SKU" value="${H.esc(v.sku)}" style="flex:2;">
              <button type="button" class="btn btn-secondary btn-sm btn-remove-var" data-index="${index}" style="color:var(--danger); padding:0 8px; height:38px;">&times;</button>
            </div>
          `;
        });

        container.querySelectorAll('.btn-remove-var').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.index);
            saveCurrentVariationInputs();
            currentVariations.splice(idx, 1);
            renderVariations();
          };
        });
      };

      const saveCurrentVariationInputs = () => {
        const rows = overlay.querySelectorAll('.var-row');
        rows.forEach((row, index) => {
          if (currentVariations[index]) {
            currentVariations[index].name = row.querySelector('.var-name-input').value.trim();
            currentVariations[index].qty_per_unit = parseInt(row.querySelector('.var-qty-input').value) || 1;
            currentVariations[index].sku = row.querySelector('.var-sku-input').value.trim();
          }
        });
      };

      overlay.querySelector('#btn-add-var-row').onclick = () => {
        saveCurrentVariationInputs();
        currentVariations.push({
          id: 'var_' + Math.random().toString(36).substr(2, 9),
          name: '',
          qty_per_unit: 1,
          sku: ''
        });
        renderVariations();
      };

      overlay.querySelector('#btn-prod-save').onclick = async () => {
        const medicine_name = overlay.querySelector('#p-name').value.trim();
        const manufacturer_name = overlay.querySelector('#p-brand').value.trim() || null;
        const generic_name = overlay.querySelector('#p-generic').value.trim() || null;
        const category_name = overlay.querySelector('#p-category').value.trim() || null;
        const strength = overlay.querySelector('#p-strength').value.trim() || '';
        const barcode = overlay.querySelector('#p-barcode').value.trim() || null;

        const price = parseFloat(overlay.querySelector('#p-price').value) || 0;
        const baseStock = parseInt(overlay.querySelector('#p-stock').value) || 0;
        const addStock = parseInt(overlay.querySelector('#p-add-stock').value) || 0;
        // "Current Stock" is an absolute set; "+ Add Stock" is a top-up on
        // top of it — combined into one number since upsertProduct sets
        // stock directly (it doesn't know about "delta" vs "absolute").
        const stock = baseStock + addStock;

        if (!medicine_name) {
          H.showToast('Medicine name is required!', 'error');
          return;
        }

        // NOTE: Product Units (variations) below aren't sent here — the
        // Firestore backend (productsFirestore.js) doesn't store per-medicine
        // variations, only price/stock/barcode/unit overrides on the base
        // CSV catalog row. Leaving this section out of the save just means
        // it's not touched (merge:true won't clear it if it was set via a
        // bulk CSV import) rather than silently failing to save it.

        const productData = {
          id: isEdit ? p.id : ('prod_' + Math.random().toString(36).substr(2, 9)),
          medicine_name,
          generic_name,
          category_name,
          strength,
          manufacturer_name,
          price,
          stock,
          barcode,
          image: activeImage || ''
        };

        try {
          const method = isEdit ? 'PUT' : 'POST';
          const url = isEdit ? `${window.POS.API_BASE}/api/products/${p.id}` : `${window.POS.API_BASE}/api/products`;
          const res = await fetch(url, {
            method,
            headers: S.getHeaders(),
            body: JSON.stringify(productData)
          });
          if (res.ok) {
            H.showToast(isEdit ? 'Product updated successfully!' : 'Product added successfully!');
            close();
            if (onSaved) {
              await onSaved(productData);
            } else {
              await this.render();
            }
          } else {
            const err = await res.json();
            H.showToast(err.error || 'Failed to save product', 'error');
          }
        } catch (err) {
          H.showToast('Save Error: ' + err.message, 'error');
        }
      };

      renderVariations();
    }
  };

  window.POS = window.POS || {};
  window.POS.Products = Products;
})();
