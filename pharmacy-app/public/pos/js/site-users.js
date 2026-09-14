(function () {
  'use strict';

  const SiteUsers = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">👤 Site Users</h2>
            <p class="page-subtitle">Customer accounts on the main site — read-only. Order counts and total spend are calculated from Online Orders.</p>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="search-box" style="flex:1;">
            <input type="text" id="su-search" placeholder="Search by email...">
          </div>
          <select id="su-sort" class="form-select" style="max-width:170px;">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <div id="su-container" class="fade-in"></div>
      `;

      const refresh = H.debounce(() => this.updateList(), 200);
      document.getElementById('su-search').oninput = refresh;
      document.getElementById('su-sort').onchange = refresh;

      const [users, orders] = await Promise.all([
        POS.Store.getAll('site-users'),
        POS.Store.getAll('online-orders'),
      ]);
      this.all = users;
      this.orders = orders;
      await this.updateList();
    },

    async updateList() {
      const H = POS.Helpers;
      const search = document.getElementById('su-search').value.toLowerCase().trim();
      const sort = document.getElementById('su-sort').value;
      const container = document.getElementById('su-container');

      let list = this.all || [];
      if (search) list = list.filter(u => (u.email || '').toLowerCase().includes(search));
      list = [...list].sort((a, b) => {
        const diff = H.toMillis(b.createdAt) - H.toMillis(a.createdAt);
        return sort === 'oldest' ? -diff : diff;
      });

      if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><p style="font-size:48px;">👤</p><p>No users found</p></div>`;
        return;
      }

      container.innerHTML = list.map(u => {
        const userOrders = (this.orders || []).filter(o => o.userEmail === u.email);
        const spend = userOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
        return `
          <div class="card" style="display:flex; align-items:center; gap:12px; padding:14px; margin-bottom:8px;">
            <div style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; flex-shrink:0;">
              ${(u.email || '?').charAt(0).toUpperCase()}
            </div>
            <div style="flex:1; min-width:0;">
              <strong style="word-break:break-all;">${H.esc(u.email || 'Unknown')}</strong>
              <p class="text-muted" style="font-size:12px; margin:2px 0;">📅 Joined: ${H.formatDateTime(u.createdAt)}</p>
              <div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">
                <span class="badge badge-info">🛒 ${userOrders.length} orders</span>
                ${spend > 0 ? `<span class="badge badge-success">${H.formatCurrency(spend)} spent</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    },
  };

  window.POS = window.POS || {};
  window.POS.SiteUsers = SiteUsers;
})();
