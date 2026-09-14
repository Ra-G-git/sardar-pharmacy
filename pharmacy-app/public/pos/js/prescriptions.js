(function () {
  'use strict';

  const Prescriptions = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📋 Prescriptions</h2>
            <p class="page-subtitle">Review and approve prescriptions uploaded by customers on the main site.</p>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="search-box" style="flex:1;">
            <input type="text" id="presc-search" placeholder="Search by customer email or note...">
          </div>
          <select id="presc-status-filter" class="form-select" style="max-width:180px;">
            <option value="all">All Statuses</option>
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
          </select>
        </div>

        <div id="presc-container" class="fade-in"></div>

        <div id="presc-lightbox" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:9999; align-items:center; justify-content:center; flex-direction:column; cursor:zoom-out;">
          <img id="presc-lightbox-img" style="max-width:90%; max-height:85vh; border-radius:12px; object-fit:contain;">
          <p style="color:rgba(255,255,255,0.5); margin-top:16px; font-size:13px;">Tap anywhere to close</p>
        </div>
      `;

      document.getElementById('presc-lightbox').onclick = () => {
        document.getElementById('presc-lightbox').style.display = 'none';
      };

      const refresh = H.debounce(() => this.updateList(), 200);
      document.getElementById('presc-search').oninput = refresh;
      document.getElementById('presc-status-filter').onchange = refresh;

      this.all = await POS.Store.getAll('prescriptions');
      await this.updateList();
    },

    async updateList() {
      const H = POS.Helpers;
      const search = document.getElementById('presc-search').value.toLowerCase().trim();
      const statusFilter = document.getElementById('presc-status-filter').value;
      const container = document.getElementById('presc-container');

      let list = this.all || [];
      if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
      if (search) {
        list = list.filter(p =>
          (p.userEmail || '').toLowerCase().includes(search) ||
          (p.note || '').toLowerCase().includes(search)
        );
      }
      list.sort((a, b) => H.toMillis(b.uploadedAt) - H.toMillis(a.uploadedAt));

      if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><p style="font-size:48px;">📋</p><p>No prescriptions found</p></div>`;
        return;
      }

      const badgeClass = (status) => status === 'approved' ? 'badge-success' : status === 'rejected' ? 'badge-danger' : 'badge-warning';

      container.innerHTML = list.map(p => `
        <div class="card" style="display:flex; gap:14px; padding:14px; margin-bottom:10px; align-items:flex-start;">
          <img src="${p.imageUrl}" class="presc-thumb" data-src="${p.imageUrl}" style="width:80px; height:80px; object-fit:cover; border-radius:10px; border:2px solid var(--border); cursor:zoom-in; flex-shrink:0;">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
              <strong style="word-break:break-all;">👤 ${H.esc(p.userEmail || 'Unknown')}</strong>
              <span class="badge ${badgeClass(p.status)}" style="text-transform:capitalize;">${p.status || 'pending'}</span>
            </div>
            <p class="text-muted" style="font-size:12px; margin:4px 0;">📅 ${H.formatDateTime(p.uploadedAt)}</p>
            ${p.note ? `<p style="font-size:12px; background:var(--bg-subtle); padding:6px 10px; border-radius:8px; margin:6px 0;">📝 ${H.esc(p.note)}</p>` : ''}
            <div style="display:flex; gap:6px; margin-top:8px;">
              <button class="btn btn-sm" style="background:var(--success-bg); color:var(--success);" data-id="${p.id}" data-action="approved">✅ Approve</button>
              <button class="btn btn-sm" style="background:var(--danger-bg); color:var(--danger);" data-id="${p.id}" data-action="rejected">❌ Reject</button>
            </div>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.presc-thumb').forEach(img => {
        img.onclick = () => {
          document.getElementById('presc-lightbox-img').src = img.dataset.src;
          document.getElementById('presc-lightbox').style.display = 'flex';
        };
      });

      container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.onclick = async () => {
          try {
            await fetch(`${window.location.origin}/api/prescriptions/${btn.dataset.id}`, {
              method: 'PUT',
              headers: POS.Store.getHeaders(),
              body: JSON.stringify({ status: btn.dataset.action })
            });
            const item = this.all.find(p => p.id === btn.dataset.id);
            if (item) item.status = btn.dataset.action;
            H.showToast(`Prescription ${btn.dataset.action}`);
            this.updateList();
          } catch (err) {
            H.showToast('Failed to update prescription', 'error');
          }
        };
      });
    },
  };

  window.POS = window.POS || {};
  window.POS.Prescriptions = Prescriptions;
})();
