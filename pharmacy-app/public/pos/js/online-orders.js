(function () {
  'use strict';

  const OnlineOrders = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🛒 Online Orders</h2>
            <p class="page-subtitle">Orders placed by customers through the main site (not POS sales — see Sales List for those).</p>
          </div>
        </div>

        <div class="filter-bar fade-in" style="flex-wrap:wrap;">
          <div class="search-box" style="flex:1; min-width:200px;">
            <input type="text" id="oo-search" placeholder="Search name, phone, email, or order ID...">
          </div>
          <select id="oo-status-filter" class="form-select" style="max-width:170px;">
            <option value="all">All Statuses</option>
            <option value="pending">⏳ Pending</option>
            <option value="processing">🔄 Processing</option>
            <option value="delivered">✅ Delivered</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>
          <select id="oo-payment-filter" class="form-select" style="max-width:150px;">
            <option value="all">All Payments</option>
            <option value="cash">💵 Cash</option>
            <option value="bkash">📱 bKash</option>
            <option value="nagad">📱 Nagad</option>
            <option value="card">💳 Card</option>
          </select>
        </div>

        <div id="oo-container" class="fade-in"></div>
      `;

      const refresh = H.debounce(() => this.updateList(), 200);
      document.getElementById('oo-search').oninput = refresh;
      document.getElementById('oo-status-filter').onchange = refresh;
      document.getElementById('oo-payment-filter').onchange = refresh;

      this.all = await POS.Store.getAll('online-orders');
      await this.updateList();
    },

    async updateList() {
      const H = POS.Helpers;
      const search = document.getElementById('oo-search').value.toLowerCase().trim();
      const statusFilter = document.getElementById('oo-status-filter').value;
      const paymentFilter = document.getElementById('oo-payment-filter').value;
      const container = document.getElementById('oo-container');

      let list = this.all || [];
      if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
      if (paymentFilter !== 'all') list = list.filter(o => o.paymentMethod === paymentFilter);
      if (search) {
        list = list.filter(o =>
          (o.name || '').toLowerCase().includes(search) ||
          (o.userEmail || '').toLowerCase().includes(search) ||
          (o.phone || '').includes(search) ||
          (o.id || '').toLowerCase().includes(search)
        );
      }
      list.sort((a, b) => H.toMillis(b.createdAt) - H.toMillis(a.createdAt));

      if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><p style="font-size:48px;">🛒</p><p>No online orders found</p></div>`;
        return;
      }

      const badgeClass = (status) => {
        if (status === 'delivered' || status === 'approved') return 'badge-success';
        if (status === 'processing') return 'badge-info';
        if (status === 'rejected' || status === 'cancelled') return 'badge-danger';
        return 'badge-warning';
      };

      container.innerHTML = list.map(o => `
        <div class="card" style="padding:14px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
            <div>
              <strong>👤 ${H.esc(o.name || o.userEmail || 'Unknown')}</strong>
              <p class="text-muted" style="font-size:11px; margin:2px 0 0;">#${(o.id || '').slice(0, 8).toUpperCase()}</p>
            </div>
            <span class="badge ${badgeClass(o.status)}" style="text-transform:capitalize;">${o.status || 'pending'}</span>
          </div>
          <p class="text-muted" style="font-size:12px; margin:6px 0 2px;">📅 ${H.formatDateTime(o.createdAt)}</p>
          <p class="text-muted" style="font-size:12px; margin:2px 0;">📞 ${H.esc(o.phone || 'N/A')} • 📍 ${H.esc(o.address || 'N/A')}</p>
          <p class="text-muted" style="font-size:12px; margin:2px 0 8px;">💳 ${H.esc(o.paymentMethod || 'N/A')}</p>
          <div style="background:var(--bg-subtle); border-radius:8px; padding:8px 10px; margin-bottom:8px;">
            ${(o.items || []).map(item => `
              <div style="display:flex; justify-content:space-between; font-size:12px; padding:2px 0;">
                <span>${H.esc(item.name)} ${item.byPiece ? '(Piece)' : (item.unit_size > 1 ? `(${H.esc(item.unit)})` : '')} ×${item.quantity}</span>
                <span>${H.formatCurrency((parseFloat(item.price) || 0) * (item.quantity || 0))}</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:var(--primary);">Total: ${H.formatCurrency(o.total)}</strong>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-secondary" data-id="${o.id}" data-status="processing">🔄 Processing</button>
            <button class="btn btn-sm" style="background:var(--success-bg); color:var(--success);" data-id="${o.id}" data-status="delivered">✅ Delivered</button>
            <button class="btn btn-sm" style="background:var(--danger-bg); color:var(--danger);" data-id="${o.id}" data-status="cancelled">❌ Cancel</button>
            <button class="btn btn-sm btn-secondary oo-print" data-id="${o.id}">🖨️ Print</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('button[data-status]').forEach(btn => {
        btn.onclick = async () => {
          try {
            await fetch(`${window.POS.API_BASE}/api/online-orders/${btn.dataset.id}`, {
              method: 'PUT',
              headers: POS.Store.getHeaders(),
              body: JSON.stringify({ status: btn.dataset.status })
            });
            const item = this.all.find(o => o.id === btn.dataset.id);
            if (item) item.status = btn.dataset.status;
            H.showToast(`Order marked as ${btn.dataset.status}`);
            this.updateList();
          } catch (err) {
            H.showToast('Failed to update order status', 'error');
          }
        };
      });

      container.querySelectorAll('.oo-print').forEach(btn => {
        btn.onclick = () => {
          const order = this.all.find(o => o.id === btn.dataset.id);
          if (order) H.printOrder(order, order.items || []);
        };
      });
    },
  };

  window.POS = window.POS || {};
  window.POS.OnlineOrders = OnlineOrders;
})();
