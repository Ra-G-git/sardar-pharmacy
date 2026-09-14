(function () {
  'use strict';

  const InventoryDetails = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      let searchQuery = '';
      let categoryFilter = 'all';
      let statusFilter = 'all'; // all, low, out

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📊 Inventory Details</h2>
            <p class="page-subtitle">Track real-time stock levels, view valuation metrics, filter low-stock alerts, and perform searches.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-success btn-sm" id="btn-export-inventory">📥 Export CSV</button>
          </div>
        </div>

        <!-- Inventory Stats -->
        <div class="stats-grid fade-in" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px; margin-bottom:20px;">
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon">📦</div>
            <div class="stat-info">
              <div class="stat-label">Total Unique Products</div>
              <div class="stat-value" id="inv-total-items">0</div>
            </div>
          </div>
          <div class="stat-card green" style="padding: 15px;">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <div class="stat-label">Total Stock Valuation</div>
              <div class="stat-value" id="inv-total-valuation">৳0.00</div>
            </div>
          </div>
          <div class="stat-card orange" style="padding: 15px;">
            <div class="stat-icon">⚠️</div>
            <div class="stat-info">
              <div class="stat-label">Low Stock Alerts</div>
              <div class="stat-value" id="inv-low-alerts">0</div>
            </div>
          </div>
          <div class="stat-card red" style="padding: 15px;">
            <div class="stat-icon">🛑</div>
            <div class="stat-info">
              <div class="stat-label">Out of Stock Items</div>
              <div class="stat-value" id="inv-out-alerts">0</div>
            </div>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="filter-bar fade-in" style="display:flex; flex-wrap:wrap; gap:16px; align-items:center;">
          <div class="search-box" style="flex:2; min-width:250px;">
            <input type="text" id="inv-search" placeholder="Search by name, SKU or barcode...">
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
            <label class="form-label">Generic Name</label>
            <select class="form-select" id="inv-category-filter">
              <option value="all">All Generics</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
            <label class="form-label">Stock Status</label>
            <select class="form-select" id="inv-status-filter">
              <option value="all">All Statuses</option>
              <option value="low">Low Stock Alert</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        <!-- Inventory List Card -->
        <div class="card fade-in" style="margin-top:20px;">
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr style="background:#f8fafc; border-bottom:1px solid #edf2f7;">
                    <th style="padding:12px 16px; text-align:left;">Item Name</th>
                    <th style="padding:12px 16px; text-align:left;">SKU Code</th>
                    <th style="padding:12px 16px; text-align:left;">Barcode</th>
                    <th style="padding:12px 16px; text-align:right;">Cost Price</th>
                    <th style="padding:12px 16px; text-align:right;">Selling Price</th>
                    <th style="padding:12px 16px; text-align:center;">Current Stock</th>
                    <th style="padding:12px 16px; text-align:center;">Alert Qty</th>
                    <th style="padding:12px 16px; text-align:right;">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody id="inventory-tbody">
                  <tr>
                    <td colspan="8" style="padding:30px; text-align:center; color:#64748b; font-style:italic;">
                      Loading inventory records...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Load Generics filter list
      const products = await S.getAll('products?tracked=true');
      const generics = Array.from(new Set(products.map(p => p.generic).filter(g => g && g.trim() !== ''))).sort();
      const genSelect = document.getElementById('inv-category-filter');
      generics.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        genSelect.appendChild(opt);
      });

      // Bind Filter Handlers
      document.getElementById('inv-search').oninput = H.debounce(async (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        await this.updateList(searchQuery, categoryFilter, statusFilter);
      }, 200);

      document.getElementById('inv-category-filter').onchange = async (e) => {
        categoryFilter = e.target.value;
        await this.updateList(searchQuery, categoryFilter, statusFilter);
      };

      document.getElementById('inv-status-filter').onchange = async (e) => {
        statusFilter = e.target.value;
        await this.updateList(searchQuery, categoryFilter, statusFilter);
      };

      document.getElementById('btn-export-inventory').onclick = async () => {
        const list = await this.getFilteredInventory(searchQuery, categoryFilter, statusFilter);
        const csvData = list.map(item => ({
          'Item Name': item.fullName,
          'SKU': item.sku || 'N/A',
          'Barcode': item.barcode || 'N/A',
          'Cost Price': item.costPrice,
          'Selling Price': item.sellingPrice,
          'Current Stock': item.stock,
          'Alert Qty': item.alertQty || 0,
          'Valuation (Cost)': item.stock * item.costPrice,
          'Valuation (Selling)': item.stock * item.sellingPrice
        }));
        H.exportCSV(csvData, 'inventory_details');
      };

      // Load items
      await this.updateList(searchQuery, categoryFilter, statusFilter);
    },

    async getFilteredInventory(search, category, status) {
      const S = POS.Store;
      const products = await S.getAll('products?tracked=true');

      // Expand main products and variations into a single row representation
      const inventoryList = [];

      products.forEach(p => {
        inventoryList.push({
          id: p.id,
          type: 'product',
          productId: p.id,
          name: p.name,
          fullName: p.name,
          sku: p.sku,
          barcode: p.barcode,
          costPrice: parseFloat(p.costPrice) || 0,
          sellingPrice: parseFloat(p.sellingPrice) || 0,
          stock: parseInt(p.stock) || 0,
          alertQty: parseInt(p.alertQty) || 0,
          generic: p.generic
        });
      });

      return inventoryList.filter(item => {
        // Search filter
        if (search) {
          const nameMatch = item.fullName.toLowerCase().includes(search);
          const skuMatch = item.sku ? item.sku.toLowerCase().includes(search) : false;
          const barcodeMatch = item.barcode ? item.barcode.toLowerCase().includes(search) : false;
          if (!nameMatch && !skuMatch && !barcodeMatch) return false;
        }

        // Category (Generic) filter
        if (category !== 'all' && item.generic !== category) return false;

        // Status filter
        if (status === 'low' && item.stock > item.alertQty) return false;
        if (status === 'out' && item.stock > 0) return false;

        return true;
      });
    },

    async updateList(search, category, status) {
      const H = POS.Helpers;
      const list = await this.getFilteredInventory(search, category, status);

      // valuation based on selling price
      const totalValuation = list.reduce((sum, item) => sum + (item.stock * item.sellingPrice), 0);
      const lowStockCount = list.filter(item => item.stock <= item.alertQty && item.stock > 0).length;
      const outOfStockCount = list.filter(item => item.stock === 0).length;

      document.getElementById('inv-total-items').textContent = list.length;
      document.getElementById('inv-total-valuation').textContent = H.formatCurrency(totalValuation);
      document.getElementById('inv-low-alerts').textContent = lowStockCount;
      document.getElementById('inv-out-alerts').textContent = outOfStockCount;

      const tbody = document.getElementById('inventory-tbody');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">
              No matching inventory items found.
            </td>
          </tr>
        `;
        return;
      }

      list.forEach(item => {
        let stockStyle = 'color:#16a34a; font-weight:700;'; // green
        let rowStyle = '';
        if (item.stock === 0) {
          stockStyle = 'color:#ef4444; font-weight:700; background:#fef2f2; padding:2px 8px; border-radius:4px;'; // red box
          rowStyle = 'background:#fcfcfc;';
        } else if (item.stock <= item.alertQty) {
          stockStyle = 'color:#ea580c; font-weight:700; background:#fff7ed; padding:2px 8px; border-radius:4px;'; // orange box
        }

        tbody.innerHTML += `
          <tr style="border-bottom:1px solid #edf2f7; ${rowStyle}">
            <td style="padding:12px 16px; font-weight:600; color:#1e293b;">${H.esc(item.fullName)}</td>
            <td style="padding:12px 16px; font-family:monospace; color:#475569;">${H.esc(item.sku || 'N/A')}</td>
            <td style="padding:12px 16px; font-family:monospace; color:#475569;">${H.esc(item.barcode || 'N/A')}</td>
            <td style="padding:12px 16px; text-align:right; color:#64748b;">${H.formatCurrency(item.costPrice)}</td>
            <td style="padding:12px 16px; text-align:right; color:#1e293b; font-weight:500;">${H.formatCurrency(item.sellingPrice)}</td>
            <td style="padding:12px 16px; text-align:center;">
              <span style="${stockStyle}">${item.stock}</span>
            </td>
            <td style="padding:12px 16px; text-align:center; color:#94a3b8;">${item.alertQty}</td>
            <td style="padding:12px 16px; text-align:right; font-weight:600; color:#0f172a;">${H.formatCurrency(item.stock * item.sellingPrice)}</td>
          </tr>
        `;
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.InventoryDetails = InventoryDetails;
})();
