(function () {
  'use strict';

  const NewOrder = {
    cart: [],
    selectedCustomer: null,
    payments: [{ method: 'Cash', amount: 0 }],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.cart = [];
      this.selectedCustomer = null;
      this.payments = [{ method: 'Cash', amount: 0, lastFour: '' }];

      // Start loading the catalog immediately (don't await) so it's likely
      // already cached by the time someone starts typing in the search box.
      S.getProductCatalog();

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🛒 New Sale</h2>
            <p class="page-subtitle">Add customer details, scan or search products, and process payment.</p>
          </div>
          <div class="page-actions">
            <a href="/sales-list" class="btn btn-secondary btn-sm">Back to Sales List</a>
          </div>
        </div>

        <div class="order-layout fade-in">
          <!-- Left Panel: Form & Cart -->
          <div class="flex flex-col gap-2">
            <!-- Customer & Date -->
            <div class="card">
              <div class="card-body form-row">
                <div class="form-group" style="position:relative;">
                  <label class="form-label">Customer Phone / Name</label>
                  <input type="text" class="form-input" id="search-customer" placeholder="Search phone or name...">
                  <div class="product-results" id="customer-results"></div>
                  <div id="customer-details" class="mt-1" style="display:none;"></div>
                </div>
                <div class="form-group">
                  <label class="form-label">Sales Date</label>
                  <input type="date" class="form-input" id="sales-date" value="${H.today()}">
                </div>
              </div>
            </div>

            <!-- Product Search / Scan -->
            <div class="card">
              <div class="card-body">
                <div class="product-search-wrap">
                  <div style="display: flex; gap: 8px;">
                    <div class="search-box" style="flex: 1;">
                      <input type="text" id="search-product" placeholder="Type product name, SKU or scan barcode...">
                    </div>
                    <button class="btn btn-secondary" id="btn-scan" title="Simulate Barcode Scan">📷 Scan</button>
                  </div>
                  <div class="product-results" id="product-results"></div>
                </div>

                <div class="table-wrapper mt-2">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Product / Unit</th>
                        <th>Price</th>
                        <th style="width:120px;">Qty</th>
                        <th>Total</th>
                        <th style="width:50px;"></th>
                      </tr>
                    </thead>
                    <tbody id="cart-tbody">
                      <tr>
                        <td colspan="5" class="text-center text-muted">Cart is empty. Add products to start.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Discount & Tax -->
            <div class="card">
              <div class="card-header">💸 Discount & Tax Settings</div>
              <div class="card-body">
                <div class="form-row" style="grid-template-columns: 2fr 1fr 1fr; margin-bottom:0;">
                  <div class="form-group">
                    <label class="form-label">Discount</label>
                    <div style="display:flex; gap:4px; margin-bottom:8px;">
                      <button type="button" class="btn discount-mode-btn" data-mode="percentage" style="flex:1; font-weight:700;">% Percent</button>
                      <button type="button" class="btn btn-secondary discount-mode-btn" data-mode="amount" style="flex:1; font-weight:700;">৳ Amount</button>
                    </div>
                    <div id="discount-percent-controls" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                      <button type="button" class="btn discount-preset-btn" data-val="0" style="font-weight:700;">0%</button>
                      <button type="button" class="btn btn-secondary discount-preset-btn" data-val="5" style="font-weight:700;">5%</button>
                      <button type="button" class="btn btn-secondary discount-preset-btn" data-val="7" style="font-weight:700;">7%</button>
                      <input type="number" class="form-input" id="discount-custom-input" placeholder="Custom %" min="0" max="100" style="width:100px;">
                    </div>
                    <div id="discount-amount-controls" style="display:none;">
                      <input type="number" class="form-input" id="discount-amount-input" placeholder="Enter amount in ৳" min="0">
                    </div>
                    <input type="hidden" id="discount-type" value="percentage">
                    <input type="hidden" id="discount-value" value="0">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Promo Coupon</label>
                    <div style="display:flex; gap:4px;">
                      <input type="text" class="form-input" id="coupon-code" placeholder="e.g. SAVE10" style="text-transform:uppercase;">
                      <button class="btn btn-secondary" id="btn-apply-coupon" style="padding:0 12px; font-size:12px; font-weight:700;">Apply</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tax (%)</label>
                    <input type="number" class="form-input" id="tax-percent" value="0" min="0">
                  </div>
                </div>
              </div>
            </div>

            <!-- Multi Payment Options -->
            <div class="card">
              <div class="card-header flex justify-between items-center">
                <span>💳 Payment Information</span>
                <button class="btn btn-secondary btn-sm" id="btn-add-payment">+ Add Split Payment</button>
              </div>
              <div class="card-body">
                <div id="payment-rows-container"></div>
              </div>
            </div>
          </div>

          <!-- Right Panel: Order Summary & Place Order -->
          <div class="order-summary flex flex-col gap-2">
            <div class="summary-header">📋 Order Summary</div>
            <div class="summary-body">
              <div class="summary-row">
                <span>Sub Total:</span>
                <span class="summary-val" id="summary-subtotal">৳0.00</span>
              </div>
              <div class="summary-row">
                <span>Discount:</span>
                <span class="summary-val text-danger" id="summary-discount">-৳0.00</span>
              </div>
              <div class="summary-row">
                <span>Tax:</span>
                <span class="summary-val" id="summary-tax">৳0.00</span>
              </div>
              <div class="summary-row total">
                <span>Grand Total:</span>
                <span class="summary-val" id="summary-total">৳0.00</span>
              </div>

              <button class="btn btn-success btn-lg btn-block mt-3" id="btn-place-order" style="padding:16px;">
                🎉 PLACE ORDER
              </button>
            </div>
          </div>
        </div>

        <!-- Reused by POS.Products.showAddEditModal() when editing a medicine from here -->
        <div class="modal-overlay" id="prod-modal-overlay"></div>
      `;

      this.initEvents();
      this.renderCart();
      this.renderPayments();
      this.recalculate();
    },

    initEvents() {
      const S = POS.Store;
      const H = POS.Helpers;

      // ── Customer Search & Select ─────────────────────
      const searchCust = document.getElementById('search-customer');
      const custResults = document.getElementById('customer-results');

      searchCust.addEventListener('input', H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          custResults.classList.remove('open');
          return;
        }

        const matches = await S.query('customers', c =>
          c.name.toLowerCase().includes(query) || c.phone.includes(query)
        );

        custResults.innerHTML = '';
        if (matches.length === 0) {
          custResults.innerHTML = `<div class="product-result-item" style="color:var(--text-secondary)">No customers found. Click to add new.</div>`;
          custResults.onclick = () => this.showAddCustomerModal(query);
        } else {
          matches.forEach(c => {
            const labelStyle = c.label ? `background:${H.labelColors[c.label] || '#64748b'};` : '';
            custResults.innerHTML += `
              <div class="product-result-item" data-id="${c.id}">
                <div>
                  <span class="pr-name">${H.esc(c.name)}</span>
                  <span class="pr-sku" style="margin-left: 8px;">${H.esc(c.phone)}</span>
                </div>
                ${c.label ? `<span class="badge-label" style="${labelStyle} font-size:9px; padding:2px 6px;">${c.label}</span>` : ''}
              </div>
            `;
          });

          // Click handler
          custResults.onclick = async (ev) => {
            const item = ev.target.closest('.product-result-item');
            if (!item) return;
            const cid = item.dataset.id;
            if (cid) {
              const customer = await S.getById('customers', cid);
              this.selectCustomer(customer);
            }
            custResults.classList.remove('open');
          };
        }
        custResults.classList.add('open');
      }, 200));

      // Close dropdowns on outside click (only if elements exist in current view)
      document.addEventListener('click', (e) => {
        const custEl = document.getElementById('customer-results');
        const prodEl = document.getElementById('product-results');
        if (custEl && !e.target.closest('#search-customer')) custEl.classList.remove('open');
        if (prodEl && !e.target.closest('#search-product')) prodEl.classList.remove('open');
      });

      // ── Product Search ──────────────────────────────
      const searchProd = document.getElementById('search-product');
      const prodResults = document.getElementById('product-results');

      searchProd.addEventListener('input', H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          prodResults.classList.remove('open');
          return;
        }

        // Catalog is loaded once and cached (see S.getProductCatalog) —
        // this filters in-memory, same as the customer site's search, so
        // it's instant instead of round-tripping to the server per keystroke.
        const products = await S.getProductCatalog();
        const matches = [];
        const MAX_RESULTS = 30;

        // No early break here — we sort by priority below (barcoded /
        // tracked items first) before trimming to MAX_RESULTS, so we need
        // to see every match in the ~20k catalog first, not just the
        // first 30 encountered in file order.
        for (const p of products) {
          if (p.deletedAt && p.deletedAt !== '0000-00-00 00:00:00') continue;

          // Check standard product sku / barcode / name / tag
          const pNameMatch = p.name ? p.name.toLowerCase().includes(query) : false;
          const pSkuMatch = p.sku ? p.sku.toLowerCase().includes(query) : false;
          const pBarcodeMatch = p.barcode ? p.barcode.includes(query) : false;
          const pTagMatch = p.tag ? p.tag.toLowerCase().includes(query) : false;

          if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              const vNameMatch = v.name ? v.name.toLowerCase().includes(query) : false;
              const vSkuMatch = v.sku ? v.sku.toLowerCase().includes(query) : false;
              const vBarcodeMatch = v.barcode ? v.barcode.includes(query) : false;
              if (pNameMatch || pSkuMatch || pBarcodeMatch || pTagMatch || vNameMatch || vSkuMatch || vBarcodeMatch) {
                const calculatedStock = Math.floor(p.stock / (v.qty_per_unit || 1));
                const calculatedPrice = v.price || (p.sellingPrice * (v.qty_per_unit || 1));
                matches.push({
                  id: p.id,
                  productId: p.id,
                  name: p.name + ` (${v.name})`,
                  sku: v.sku,
                  barcode: v.barcode,
                  price: calculatedPrice,
                  stock: calculatedStock,
                  image: p.image,
                  category: p.category_name,
                  tracked: p.tracked,
                  variationName: v.name
                });
              }
            });
          } else {
            if (pNameMatch || pSkuMatch || pBarcodeMatch || pTagMatch) {
              matches.push({
                id: p.id,
                name: p.name,
                sku: p.sku,
                barcode: p.barcode,
                price: p.sellingPrice,
                stock: p.stock,
                image: p.image,
                category: p.category_name,
                unit: p.unit,
                unitSize: p.unit_size,
                tracked: p.tracked,
                variationName: ''
              });
            }
          }
        }

        // Items someone has actually edited/sold (tracked) — especially
        // ones with a real barcode assigned — are the pharmacist's curated
        // inventory, so surface those above plain untouched CSV matches.
        matches.sort((a, b) => {
          const aBar = a.barcode ? 1 : 0, bBar = b.barcode ? 1 : 0;
          if (aBar !== bBar) return bBar - aBar;
          const aTr = a.tracked ? 1 : 0, bTr = b.tracked ? 1 : 0;
          return bTr - aTr;
        });
        matches.length = Math.min(matches.length, MAX_RESULTS);

        if (matches.length === 0) {
          const rawQuery = searchProd.value.trim();
          prodResults.innerHTML = `
            <div class="text-muted" style="flex-direction:column; align-items:flex-start; gap:8px; padding:14px; display:flex;">
              <span>No products found for "${H.esc(rawQuery)}".</span>
              <button type="button" class="btn btn-primary btn-sm" id="btn-quick-add-medicine">➕ Add "${H.esc(rawQuery)}" as new medicine</button>
            </div>
          `;
          const quickAddBtn = document.getElementById('btn-quick-add-medicine');
          if (quickAddBtn) {
            quickAddBtn.onclick = (ev) => {
              ev.stopPropagation();
              POS.Products.showAddEditModal(null, async (saved) => {
                // Newly created — drop the cached catalog so it shows up in
                // future searches, and add it straight to the cart.
                S._productCatalogPromise = null;
                this.addToCart({
                  productId: saved.id,
                  productName: saved.medicine_name,
                  variationName: '',
                  unitPrice: parseFloat(saved.price) || 0,
                  qty: 1,
                  image: saved.image || null,
                  category: saved.category_name || '',
                  unit: '',
                  unitSize: 1,
                  stripPrice: parseFloat(saved.price) || 0,
                  byPiece: false,
                  stock: saved.stock ?? null
                });
                prodResults.classList.remove('open');
                searchProd.value = '';
                searchProd.focus();
              }, rawQuery);
            };
          }
        } else {
          // Build all the HTML in one array + a single join instead of
          // `innerHTML +=` in a loop, which re-parses the whole growing
          // string on every iteration and is what caused the freeze.
          const rowsHtml = matches.map(m => {
            const stockFinite = Number.isFinite(m.stock);
            const imgHtml = m.image 
              ? `<img src="${m.image}" style="width:36px; height:36px; object-fit:cover; border-radius:var(--radius-sm); margin-right:10px;">`
              : `<div style="width:36px; height:36px; border-radius:var(--radius-sm); background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-right:10px; font-size:18px;">${H.categoryEmoji(m.category)}</div>`;
            const stockLabel = stockFinite ? m.stock : '∞';

            return `
              <div class="product-result-item" data-id="${m.id}" data-var="${H.esc(m.variationName)}" data-sku="${H.esc(m.sku)}" data-price="${m.price}" data-stock="${stockFinite ? m.stock : ''}" data-name="${H.esc(m.name)}" data-image="${m.image || ''}" data-category="${H.esc(m.category || '')}" data-unit="${H.esc(m.unit || '')}" data-unit-size="${m.unitSize || '1'}" style="display:flex; align-items:center;">
                ${imgHtml}
                <div style="flex:1;">
                  <div class="pr-name">${H.esc(m.name)}</div>
                  <div class="pr-sku">SKU: ${H.esc(m.sku)} | Stock: ${stockLabel}</div>
                </div>
                <div class="pr-price">${H.formatCurrency(m.price)}</div>
                <button type="button" class="btn-edit-result" data-edit-id="${m.id}" title="Edit this medicine" style="background:none; border:none; cursor:pointer; font-size:15px; padding:4px 8px; margin-left:6px;">✏️</button>
              </div>
            `;
          });
          prodResults.innerHTML = rowsHtml.join('');

          prodResults.onclick = async (ev) => {
            const editBtn = ev.target.closest('.btn-edit-result');
            if (editBtn) {
              const catalog = await S.getProductCatalog();
              const full = catalog.find(prod => prod.id === editBtn.dataset.editId);
              if (!full) return;
              POS.Products.showAddEditModal(full, async () => {
                // Editing a medicine changes its Firestore `inventory` doc,
                // so drop the cached catalog and re-run the current search
                // to reflect the new price/stock/image immediately.
                S._productCatalogPromise = null;
                searchProd.dispatchEvent(new Event('input'));
              });
              return;
            }
            const item = ev.target.closest('.product-result-item');
            if (!item) return;
            const ds = item.dataset;
            const unitSize = parseFloat(ds.unitSize) || 1;
            this.addToCart({
              productId: ds.id,
              productName: ds.name,
              variationName: ds.var,
              unitPrice: parseFloat(ds.price),
              qty: 1,
              image: ds.image,
              category: ds.category,
              unit: ds.unit || '',
              unitSize,
              // Original per-strip/pack price and byPiece flag — lets the
              // Strip/Piece toggle switch pricing without losing the base
              // price it should return to.
              stripPrice: parseFloat(ds.price),
              byPiece: false,
              // Empty data-stock attribute means untracked/unlimited stock
              stock: ds.stock === '' ? null : parseInt(ds.stock)
            });
            prodResults.classList.remove('open');
            searchProd.value = '';
            searchProd.focus();
          };
        }
        prodResults.classList.add('open');
      }, 200));

      // Barcode Enter keypress lookup & Scan Button setup
      searchProd.onkeydown = async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchProd.value.trim();
          if (!query) return;

          // Uses the dedicated scan-lookup endpoint instead of scanning the
          // full ~20k-item catalog client-side.
          let matchedItem = null;
          try {
            const res = await fetch(`${window.POS.API_BASE}/api/products/resolve-scan?query=${encodeURIComponent(query)}`, { headers: S.getHeaders() });
            const data = await res.json();
            if (data.success && data.item) {
              const p = data.item;
              matchedItem = {
                productId: p.id,
                productName: p.name,
                variationName: '',
                unitPrice: parseFloat(p.sellingPrice ?? p.price),
                qty: 1,
                image: p.image || null,
                category: p.category_name,
                stock: p.stock == null ? null : parseInt(p.stock)
              };
            }
          } catch (err) {
            console.error('Scan lookup failed:', err);
          }

          if (matchedItem) {
            // Cancel any debounced search logic
            H.debounce(() => {}, 0)();
            this.addToCart(matchedItem);
            searchProd.value = '';
            prodResults.classList.remove('open');
            H.showToast(`Scanned: ${matchedItem.productName} ${matchedItem.variationName ? `(${matchedItem.variationName})` : ''}`, 'success');
            this.playBeepSound();
          } else {
            // If not exact match, trigger normal filter search immediately
            searchProd.dispatchEvent(new Event('input'));
          }
        }
      };

      document.getElementById('btn-scan').onclick = () => {
        searchProd.value = '';
        searchProd.focus();
        
        searchProd.placeholder = "📷 Scanning... scan barcode now!";
        searchProd.style.borderColor = "var(--primary-color, #3b82f6)";
        searchProd.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.25)";
        
        H.showToast('Scanner ready. Scan the product barcode now.');

        const resetStyle = () => {
          searchProd.placeholder = "Type product name, SKU or scan barcode...";
          searchProd.style.borderColor = "";
          searchProd.style.boxShadow = "";
        };

        searchProd.onblur = resetStyle;
        searchProd.oninput = resetStyle;
      };

      // ── Discount & Tax Changes ───────────────────────
      const discType = document.getElementById('discount-type');
      const discVal = document.getElementById('discount-value');
      const taxPercent = document.getElementById('tax-percent');
      const percentControls = document.getElementById('discount-percent-controls');
      const amountControls = document.getElementById('discount-amount-controls');
      const customInput = document.getElementById('discount-custom-input');
      const amountInput = document.getElementById('discount-amount-input');

      document.querySelectorAll('.discount-mode-btn').forEach(btn => {
        btn.onclick = () => {
          this.setDiscountMode(btn.dataset.mode);
          if (btn.dataset.mode === 'percentage') {
            discVal.value = customInput.value || '0';
          } else {
            discVal.value = amountInput.value || '0';
          }
          this.recalculate();
        };
      });

      document.querySelectorAll('.discount-preset-btn').forEach(btn => {
        btn.onclick = () => {
          this.setPresetActive(btn.dataset.val);
          customInput.value = '';
          discVal.value = btn.dataset.val;
          this.recalculate();
        };
      });

      customInput.oninput = () => {
        this.setPresetActive(null); // no preset stays highlighted once typing a custom value
        discVal.value = customInput.value || '0';
        this.recalculate();
      };

      amountInput.oninput = () => {
        discVal.value = amountInput.value || '0';
        this.recalculate();
      };

      // Start in Percent mode, 0% preset selected — matches the site's own default
      this.setDiscountMode('percentage');
      this.setPresetActive('0');

      taxPercent.oninput = () => this.recalculate();

      // Apply Coupon
      document.getElementById('btn-apply-coupon').onclick = async () => {
        const codeInput = document.getElementById('coupon-code');
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
          H.showToast('Please enter a coupon code', 'warning');
          return;
        }

        const coupon = await S.getById('coupons', code);
        if (coupon) {
          this.setDiscountMode(coupon.discountType);
          if (coupon.discountType === 'percentage') {
            this.setPresetActive(coupon.discountValue);
            customInput.value = ['0', '5', '7'].includes(String(coupon.discountValue)) ? '' : coupon.discountValue;
          } else {
            amountInput.value = coupon.discountValue;
          }
          discVal.value = coupon.discountValue;
          H.showToast(`Coupon "${coupon.code}" applied successfully!`);
          this.recalculate();
        } else {
          H.showToast('Invalid coupon code', 'error');
        }
      };

      // ── Add Payment Split ────────────────────────────
      document.getElementById('btn-add-payment').onclick = () => {
        this.payments.push({ method: 'Cash', amount: 0, lastFour: '' });
        this.renderPayments();
        this.recalculate();
      };

      // ── Place Order ──────────────────────────────────
      document.getElementById('btn-place-order').onclick = () => this.placeOrder();
    },

    selectCustomer(c) {
      const H = POS.Helpers;
      this.selectedCustomer = c;
      const det = document.getElementById('customer-details');
      const searchInput = document.getElementById('search-customer');

      if (c) {
        searchInput.value = `${c.name} (${c.phone})`;
        const labelStyle = c.label ? `background:${H.labelColors[c.label] || '#64748b'};` : '';
        det.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg); padding:8px 12px; border-radius:var(--radius-xs); border:1px solid var(--border)">
            <span>👤 ${H.esc(c.name)} | Label: <span class="badge-label" style="${labelStyle} font-size:9px; padding:2px 6px;">${c.label}</span></span>
            ${c.customDiscount > 0 ? `<span class="text-success" style="font-weight:700;">(Auto Discount: ${c.customDiscount}%)</span>` : ''}
            <button class="btn btn-secondary btn-sm" id="btn-clear-customer" style="padding:2px 8px; margin-left:auto;">Clear</button>
          </div>
        `;
        det.style.display = 'block';

        // Auto apply custom customer discount if applicable
        if (c.customDiscount > 0) {
          const discVal = document.getElementById('discount-value');
          const customInput = document.getElementById('discount-custom-input');
          this.setDiscountMode('percentage');
          this.setPresetActive(c.customDiscount);
          customInput.value = ['0', '5', '7'].includes(String(c.customDiscount)) ? '' : c.customDiscount;
          discVal.value = c.customDiscount;
          this.recalculate();
        }

        document.getElementById('btn-clear-customer').onclick = () => {
          this.selectCustomer(null);
          const discVal = document.getElementById('discount-value');
          const customInput = document.getElementById('discount-custom-input');
          this.setDiscountMode('percentage');
          this.setPresetActive('0');
          customInput.value = '';
          discVal.value = '0';
          this.recalculate();
        };
      } else {
        searchInput.value = '';
        det.innerHTML = '';
        det.style.display = 'none';
        this.selectedCustomer = null;
      }
      this.recalculate();
    },

    showAddCustomerModal(prefilledPhone) {
      const H = POS.Helpers;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal" style="max-width:450px;">
          <div class="modal-header">
            <h3>👤 Add New Customer</h3>
            <button class="modal-close" id="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-input" id="cust-modal-name" required>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" class="form-input" id="cust-modal-phone" value="${H.esc(prefilledPhone)}">
            </div>
            <div class="form-group">
              <label class="form-label">Customer Label</label>
              <select class="form-select" id="cust-modal-label">
                ${H.customerLabels.map(l => `<option value="${l}">${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Custom Discount (%)</label>
              <input type="number" class="form-input" id="cust-modal-discount" value="0" min="0" max="100">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cust-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="cust-modal-save">Save & Select</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('#modal-close').onclick = close;
      overlay.querySelector('#cust-modal-cancel').onclick = close;

      overlay.querySelector('#cust-modal-save').onclick = async () => {
        const name = overlay.querySelector('#cust-modal-name').value.trim();
        const phone = overlay.querySelector('#cust-modal-phone').value.trim();
        const label = overlay.querySelector('#cust-modal-label').value;
        const discount = parseFloat(overlay.querySelector('#cust-modal-discount').value) || 0;

        if (!name || !phone) {
          H.showToast('Please enter name and phone', 'error');
          return;
        }

        const newCust = await POS.Store.add('customers', {
          name, phone, label, customDiscount: discount, email: '', address: ''
        });

        this.selectCustomer(newCust);
        close();
        H.showToast('Customer created successfully');
      };
    },

    addToCart(item) {
      const H = POS.Helpers;
      // stock is null for untracked catalog items (no Firestore doc yet) —
      // those are always sellable (matches the customer site's behavior).
      // Tracked items ARE allowed to be sold past recorded stock too — the
      // pharmacist may sell before logging a restock — we just warn so
      // they remember to update the stock count afterward.
      const limited = Number.isFinite(item.stock);
      const existing = this.cart.find(i => i.productId === item.productId && i.variationName === item.variationName);
      if (existing) {
        existing.qty++;
        if (limited && existing.qty > item.stock) {
          H.showToast(`Selling beyond recorded stock (${item.stock}) — remember to update inventory.`, 'warning');
        }
      } else {
        item.customDiscount = item.customDiscount || 0; // % off this line, skips the global discount below
        this.cart.push(item);
        if (limited && item.stock <= 0) {
          H.showToast('Recorded stock is 0 — sale allowed, remember to restock.', 'warning');
        }
      }
      this.renderCart();
      this.recalculate();
    },

    renderCart() {
      const H = POS.Helpers;
      const tbody = document.getElementById('cart-tbody');
      tbody.innerHTML = '';

      if (this.cart.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Cart is empty. Add products to start.</td></tr>`;
        return;
      }

      this.cart.forEach((item, index) => {
        const thumbHtml = item.image 
          ? `<img src="${item.image}" style="width:30px; height:30px; object-fit:cover; border-radius:var(--radius-xs); margin-right:8px;">`
          : `<div style="width:30px; height:30px; border-radius:var(--radius-xs); background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-right:8px; font-size:14px;">${H.categoryEmoji(item.category)}</div>`;

        const unitSize = parseFloat(item.unitSize) || 1;
        const pieceToggleHtml = unitSize > 1 ? `
          <button class="btn-toggle-piece" data-index="${index}" style="font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; border:none; cursor:pointer; margin-top:3px; background:${item.byPiece ? 'var(--primary)' : '#e2e8f0'}; color:${item.byPiece ? 'white' : '#475569'};">
            ${item.byPiece ? 'Piece' : 'Strip'}
          </button>
        ` : '';

        tbody.innerHTML += `
          <tr class="cart-item-row" data-index="${index}">
            <td>
              <div style="display:flex; align-items:center;">
                ${thumbHtml}
                <div>
                  <div class="cart-item-name">${H.esc(item.productName)}</div>
                  ${item.variationName ? `<div class="cart-item-variant">${H.esc(item.variationName)}</div>` : ''}
                  ${pieceToggleHtml}
                </div>
              </div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:4px; max-width:110px;">
                <span>৳</span>
                <input type="number" class="input-price form-input" value="${item.unitPrice}" min="0.01" step="0.01" style="padding:4px 6px; height:28px; width:100%; font-size:12px; font-weight:600;">
              </div>
              <div style="display:flex; align-items:center; gap:4px; max-width:110px; margin-top:4px;">
                <input type="number" class="input-item-discount form-input" value="${item.customDiscount || ''}" min="0" max="100" step="0.1" placeholder="Disc %" title="Discount just for this item — skips the global discount below" style="padding:4px 6px; height:24px; width:100%; font-size:11px;">
                <span style="font-size:10px; color:var(--text-muted);">%</span>
              </div>
            </td>
            <td>
              <div class="qty-control">
                <button class="btn-qty-dec">-</button>
                <input type="number" class="input-qty" value="${item.qty}" min="1" ${Number.isFinite(item.stock) ? `max="${item.stock}"` : ''}>
                <button class="btn-qty-inc">+</button>
              </div>
            </td>
            <td style="font-weight:700;">
              ${(() => {
                const lineSubtotal = item.unitPrice * item.qty;
                const disc = parseFloat(item.customDiscount) || 0;
                const lineTotal = disc > 0 ? lineSubtotal * (1 - disc / 100) : lineSubtotal;
                return disc > 0
                  ? `${H.formatCurrency(lineTotal)}<div style="font-size:10px; font-weight:600; color:var(--success);">-${disc}% (${H.formatCurrency(lineSubtotal - lineTotal)} off)</div>`
                  : H.formatCurrency(lineSubtotal);
              })()}
            </td>
            <td>
              <button class="btn btn-secondary btn-sm btn-cart-edit" style="padding:4px 8px;" title="Edit this medicine">✏️</button>
              <button class="btn btn-danger btn-sm btn-qty-remove" style="padding:4px 8px;">🗑️</button>
            </td>
          </tr>
        `;
      });

      // Bind events
      tbody.querySelectorAll('.cart-item-row').forEach(row => {
        const index = parseInt(row.dataset.index);
        const item = this.cart[index];

        const pieceBtn = row.querySelector('.btn-toggle-piece');
        if (pieceBtn) {
          pieceBtn.onclick = () => {
            const unitSize = parseFloat(item.unitSize) || 1;
            if (unitSize <= 1) return;
            item.byPiece = !item.byPiece;
            const stripPrice = item.stripPrice || item.unitPrice;
            item.unitPrice = item.byPiece
              ? parseFloat((stripPrice / unitSize).toFixed(2))
              : parseFloat(stripPrice.toFixed(2));
            this.renderCart();
            this.recalculate();
          };
        }

        row.querySelector('.btn-qty-dec').onclick = () => {
          if (item.qty > 1) {
            item.qty--;
            this.renderCart();
            this.recalculate();
          }
        };

        row.querySelector('.btn-qty-inc').onclick = () => {
          item.qty++;
          if (Number.isFinite(item.stock) && item.qty > item.stock) {
            H.showToast(`Selling beyond recorded stock (${item.stock}) — remember to update inventory.`, 'warning');
          }
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.input-qty').onchange = (e) => {
          let val = parseInt(e.target.value) || 1;
          if (val < 1) val = 1;
          if (Number.isFinite(item.stock) && val > item.stock) {
            H.showToast(`Selling beyond recorded stock (${item.stock}) — remember to update inventory.`, 'warning');
          }
          item.qty = val;
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.input-price').onchange = (e) => {
          let val = parseFloat(e.target.value) || 0;
          if (val < 0) val = 0;
          // Remember the catalog price this line started with (once), so at
          // checkout we can tell a real hand-edit from a price that was never touched.
          if (item.baseStripPrice === undefined) item.baseStripPrice = item.stripPrice ?? item.unitPrice;
          item.unitPrice = val;
          // Keep stripPrice in sync so the Strip/Piece toggle still computes
          // correctly after a manual price edit.
          const unitSize = parseFloat(item.unitSize) || 1;
          item.stripPrice = item.byPiece ? val * unitSize : val;
          item.priceEdited = Math.abs(item.stripPrice - item.baseStripPrice) > 0.004;
          // Re-render and recalculate without clearing input focus if possible,
          // but calling renderCart() is simple and correct
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.input-item-discount').onchange = (e) => {
          let val = parseFloat(e.target.value) || 0;
          if (val < 0) val = 0;
          if (val > 100) val = 100;
          item.customDiscount = val;
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.btn-cart-edit').onclick = async () => {
          const S = POS.Store;
          const catalog = await S.getProductCatalog();
          const full = catalog.find(prod => prod.id === item.productId);
          if (!full) {
            H.showToast('Could not find this medicine to edit', 'error');
            return;
          }
          POS.Products.showAddEditModal(full, async () => {
            // Drop the cached catalog so search results reflect the edit
            // too, and pull the freshly-saved data into this cart line.
            S._productCatalogPromise = null;
            const updatedCatalog = await S.getProductCatalog();
            const updated = updatedCatalog.find(p => p.id === item.productId);
            if (updated) {
              item.productName = updated.name;
              item.category = updated.category_name;
              // Deliberately NOT touching item.unitPrice here — the price
              // already in the cart (possibly hand-edited for this sale)
              // stays as-is; only name/category refresh from the edit.
            }
            this.renderCart();
          });
        };

        row.querySelector('.btn-qty-remove').onclick = () => {
          this.cart.splice(index, 1);
          this.renderCart();
          this.recalculate();
        };
      });
    },

    renderPayments() {
      const H = POS.Helpers;
      const container = document.getElementById('payment-rows-container');
      container.innerHTML = '';

      this.payments.forEach((p, idx) => {
        container.innerHTML += `
          <div class="payment-row" data-index="${idx}">
            <div class="form-group">
              <label class="form-label">Payment Method</label>
              <select class="form-select payment-method-select">
                ${H.paymentMethods.map(m => `<option value="${m}" ${p.method === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Last 4 Digits</label>
              <input type="text" class="form-input payment-lastfour-input" value="${p.lastFour || ''}" maxlength="4" placeholder="e.g. 1234">
            </div>
            <div class="form-group">
              <label class="form-label">Amount (৳)</label>
              <input type="number" class="form-input payment-amount-input" value="${p.amount}" min="0">
            </div>
            ${this.payments.length > 1 ? `
              <button class="btn-remove-payment">🗑️</button>
            ` : ''}
          </div>
        `;
      });

      // Bind input events
      container.querySelectorAll('.payment-row').forEach(row => {
        const idx = parseInt(row.dataset.index);

        row.querySelector('.payment-method-select').onchange = (e) => {
          this.payments[idx].method = e.target.value;
        };

        row.querySelector('.payment-lastfour-input').oninput = (e) => {
          this.payments[idx].lastFour = e.target.value.trim();
        };

        row.querySelector('.payment-amount-input').oninput = (e) => {
          const val = parseFloat(e.target.value) || 0;
          this.payments[idx].amount = val;

          // Auto-balance remaining payment amount across other split row
          if (this.payments.length > 1) {
            const { grandTotal } = this.calculateTotals();

            let balancingIdx = this.payments.length - 1;
            if (idx === balancingIdx) {
              balancingIdx = 0;
            }

            let sumOthers = 0;
            this.payments.forEach((p, pIdx) => {
              if (pIdx !== balancingIdx) {
                sumOthers += p.amount;
              }
            });

            let balancedAmount = grandTotal - sumOthers;
            if (balancedAmount < 0) balancedAmount = 0;
            this.payments[balancingIdx].amount = balancedAmount;

            const balancedInput = container.querySelector(`.payment-row[data-index="${balancingIdx}"] .payment-amount-input`);
            if (balancedInput) {
              balancedInput.value = balancedAmount.toFixed(2);
            }
          }
          this.recalculate();
        };

        const removeBtn = row.querySelector('.btn-remove-payment');
        if (removeBtn) {
          removeBtn.onclick = () => {
            this.payments.splice(idx, 1);
            this.renderPayments();
            this.recalculate();
          };
        }
      });
    },

    setDiscountMode(mode) {
      const discType = document.getElementById('discount-type');
      const percentControls = document.getElementById('discount-percent-controls');
      const amountControls = document.getElementById('discount-amount-controls');
      discType.value = mode;
      document.querySelectorAll('.discount-mode-btn').forEach(b => {
        b.classList.toggle('btn-secondary', b.dataset.mode !== mode);
      });
      percentControls.style.display = mode === 'percentage' ? 'flex' : 'none';
      amountControls.style.display = mode === 'amount' ? 'block' : 'none';
    },

    setPresetActive(val) {
      document.querySelectorAll('.discount-preset-btn').forEach(b => {
        b.classList.toggle('btn-secondary', b.dataset.val !== String(val));
      });
    },

    // Single source of truth for subtotal/discount/tax/grandTotal — used by
    // recalculate() (live summary), split-payment auto-balancing, and the
    // final order submission, so all three can never drift out of sync.
    calculateTotals() {
      let subtotal = 0;
      let itemDiscountsTotal = 0;
      let eligibleForGlobalDiscount = 0;

      this.cart.forEach(item => {
        const lineSubtotal = item.unitPrice * item.qty;
        subtotal += lineSubtotal;
        const itemDisc = parseFloat(item.customDiscount) || 0;
        if (itemDisc > 0) {
          itemDiscountsTotal += lineSubtotal * (itemDisc / 100);
        } else {
          eligibleForGlobalDiscount += lineSubtotal;
        }
      });

      const discType = document.getElementById('discount-type').value;
      const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
      let globalDiscountAmount = 0;
      if (discType === 'percentage') {
        globalDiscountAmount = eligibleForGlobalDiscount * (discVal / 100);
      } else if (discType === 'amount') {
        globalDiscountAmount = discVal;
      }
      if (globalDiscountAmount > eligibleForGlobalDiscount) globalDiscountAmount = eligibleForGlobalDiscount;

      const discountAmount = itemDiscountsTotal + globalDiscountAmount;
      const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
      const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
      const grandTotal = subtotal - discountAmount + taxAmount;

      return { subtotal, itemDiscountsTotal, globalDiscountAmount, discountAmount, taxPercent, taxAmount, grandTotal };
    },

    recalculate() {
      const H = POS.Helpers;
      const { subtotal, discountAmount, taxAmount, grandTotal } = this.calculateTotals();

      // Default single payment row amount to grandTotal
      if (this.payments.length === 1) {
        this.payments[0].amount = grandTotal;
        const pInput = document.querySelector('.payment-amount-input');
        if (pInput) pInput.value = grandTotal.toFixed(2);
      }

      // Update Summary Fields
      document.getElementById('summary-subtotal').textContent = H.formatCurrency(subtotal);
      document.getElementById('summary-discount').textContent = `-${H.formatCurrency(discountAmount)}`;
      document.getElementById('summary-tax').textContent = H.formatCurrency(taxAmount);
      document.getElementById('summary-total').textContent = H.formatCurrency(grandTotal);
    },

    async placeOrder() {
      const S = POS.Store;
      const H = POS.Helpers;

      if (this.cart.length === 0) {
        H.showToast('Cart is empty. Please add items first.', 'error');
        return;
      }

      const salesDate = document.getElementById('sales-date').value;
      const { subtotal, discountAmount, taxPercent, taxAmount, grandTotal } = this.calculateTotals();
      const discType = document.getElementById('discount-type').value;
      const discVal = parseFloat(document.getElementById('discount-value').value) || 0;

      const totalPaid = this.payments.reduce((s, p) => s + p.amount, 0);

      const invoiceId = await S.getNextId('INV-');
      const orderId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

      // Construct a correct timezone-safe Date object keeping the current local hours/minutes/seconds
      const nowObj = new Date();
      const dateParts = salesDate.split('-'); // [YYYY, MM, DD]
      const finalDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        nowObj.getHours(),
        nowObj.getMinutes(),
        nowObj.getSeconds()
      );

      const order = {
        id: orderId,
        invoiceId,
        customerId: this.selectedCustomer ? this.selectedCustomer.id : 'walk-in',
        customerName: this.selectedCustomer ? this.selectedCustomer.name : 'Walk-in Customer',
        customerPhone: this.selectedCustomer ? this.selectedCustomer.phone : 'N/A',
        date: finalDate.toISOString(),
        subtotal,
        discountType: discType,
        discountValue: discVal,
        discountAmount,
        taxPercent,
        taxAmount,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount: 0,
        returnedAmount: 0,
        status: 'completed'
      };

      const orderItemsList = this.cart.map(item => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + '_' + item.productId,
        orderId,
        productId: item.productId,
        productName: item.productName,
        variationName: item.variationName,
        category: item.category || '',
        unit: item.byPiece ? 'Piece' : (item.unit || ''),
        unit_size: item.unitSize || '1',
        byPiece: item.byPiece || false,
        qty: item.qty,
        unitPrice: item.unitPrice,
        // Per-item discount (%) set on this cart row — skips the global
        // discount above, see calculateTotals(). total already reflects it.
        itemDiscount: parseFloat(item.customDiscount) || 0,
        total: (parseFloat(item.customDiscount) || 0) > 0
          ? (item.unitPrice * item.qty) * (1 - (parseFloat(item.customDiscount) / 100))
          : item.unitPrice * item.qty
      }));

      const orderPaymentsList = this.payments.map(p => ({
        id: 'pay_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        orderId,
        method: p.method,
        amount: p.amount,
        lastFour: p.lastFour || null
      }));

      const result = await S.placeOrder(order, orderItemsList, orderPaymentsList);

      if (result.success) {
        H.showToast(`Order ${invoiceId} placed successfully!`);

        // The sale above is already charged at whatever price is in the cart.
        // Separately, if an admin/manager hand-edited a price, also save it as
        // that medicine's new standing catalog price. Only edited lines are
        // sent (not every item in every sale), cashiers' edits stay one-off
        // (the server only lets admin/manager change catalog prices), and the
        // result is reported instead of failing silently.
        const me = S.getCurrentUser();
        if (me && ['admin', 'manager'].includes(me.role)) {
          const edited = this.cart.filter(i => i.productId && !i.variationName && i.priceEdited);
          if (edited.length) {
            const results = await Promise.allSettled(edited.map(async (i) => {
              const res = await fetch(`${window.POS.API_BASE}/api/products/${i.productId}`, {
                method: 'PUT',
                headers: S.getHeaders(),
                body: JSON.stringify({ price: i.stripPrice ?? i.unitPrice })
              });
              if (!res.ok) throw new Error('HTTP ' + res.status);
            }));
            const failed = results.filter(r => r.status === 'rejected');
            failed.forEach(f => console.error('Price sync failed:', f.reason));
            if (failed.length) {
              H.showToast(`Order placed, but ${failed.length} catalog price update(s) failed`, 'warning');
            } else {
              H.showToast(`Catalog price updated for ${edited.length} item(s)`);
            }
            S._productCatalogPromise = null; // catalog is now stale, drop the cache
          }
        }

        if (await H.confirm('Would you like to print the receipt?')) {
          H.printOrder(order, this.cart, orderPaymentsList);
        }
        POS.Router.navigate('/sales-list');
      } else {
        H.showToast('Failed to place/update order: ' + result.error, 'error');
      }
    },

    async printInvoice(order, cartItems) {
      const H = POS.Helpers;
      H.printOrder(order, cartItems);
    },

    playBeepSound() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (err) {
        console.warn('Web Audio API beep failed:', err);
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.NewOrder = NewOrder;
})();
