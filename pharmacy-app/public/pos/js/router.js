(function () {
  'use strict';

  const Router = {
    routes: {},
    current: null,

    register(path, handler) {
      this.routes[path] = handler;
    },

    navigate(path) {
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      window.history.pushState(null, '', POS.BASE + path);
      this._resolve();
    },

    init() {
      window.addEventListener('popstate', () => this._resolve());

      // Intercept relative internal link clicks to perform SPA transitions
      document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor) {
          const href = anchor.getAttribute('href');
          // Intercept paths starting with '/' but not API paths or HTML pages
          if (href && href.startsWith('/') && !href.startsWith('/api') && !href.endsWith('.html')) {
            e.preventDefault();
            this.navigate(href);
          }
        }
      });

      const user = POS.Store.getCurrentUser();
      if (!user) {
        this._toLogin();
        return;
      }

      let path = POS.routePath();
      if (path === '/' || path === '/index.html' || path === '') {
        path = user.role === 'cashier' ? '/new-order' : '/dashboard';
        window.history.replaceState(null, '', POS.BASE + path);
      }

      this._resolve();
    },

    _resolve() {
      let path = POS.routePath();
      if (path === '/' || path === '/index.html' || path === '') {
        path = '/dashboard';
      }

      const S = POS.Store;
      const H = POS.Helpers;
      const currentUser = S.getCurrentUser();

      // Check session
      if (!currentUser) {
        this._toLogin();
        return;
      }

      // Route authorizations guard
      if (currentUser) {
        const role = currentUser.role;
        let allowed = true;

        if (role === 'cashier') {
          const permitted = ['/new-order', '/sales-list', '/sales-return', '/return-list', '/inventory-details', '/gallery'];
          if (!permitted.includes(path)) {
            allowed = false;
          }
        } else if (role === 'manager') {
          const forbidden = ['/reports', '/users'];
          const isReport = path.startsWith('/reports');
          const isUser = path.startsWith('/users');
          if (isReport || isUser) {
            allowed = false;
          }
        }

        if (!allowed) {
          H.showToast('Access Denied for your Role privilege.', 'error');
          path = role === 'cashier' ? '/new-order' : '/dashboard';
          window.history.replaceState(null, '', POS.BASE + path);
        }
      }

      let handler = this.routes[path];
      let params = {};

      if (!handler) {
        for (const [route, h] of Object.entries(this.routes)) {
          const rp = route.split('/');
          const pp = path.split('/');
          if (rp.length !== pp.length) continue;
          let match = true;
          const p = {};
          for (let i = 0; i < rp.length; i++) {
            if (rp[i].startsWith(':')) { p[rp[i].slice(1)] = pp[i]; }
            else if (rp[i] !== pp[i]) { match = false; break; }
          }
          if (match) { handler = h; params = p; break; }
        }
      }

      if (handler) {
        try {
          this.current = path;
          const mainContent = document.getElementById('main-content');
          if (mainContent) mainContent.scrollTop = 0;
          const result = handler(params);
          // Pages render asynchronously. Their errors used to escape this
          // try/catch (nothing awaited the promise), leaving a blank page that
          // a reload could not fix. Catch them and show what went wrong.
          if (result && typeof result.catch === 'function') {
            result.catch(err => this._showPageError(err, path));
          }
          this._updateNav(path);
          this._updateBreadcrumb(path);
        } catch (err) {
          this._showPageError(err, path);
        }
      }
    },

    // Send to the login page WITHOUT leaving a stale session behind. Otherwise
    // login.html sees the leftover user/token, sends you straight back here,
    // and the two pages redirect to each other forever (a blank, "crashed" page).
    _toLogin() {
      localStorage.removeItem('pos_user');
      localStorage.removeItem('pos_token');
      window.location.href = POS.BASE + '/login.html';
    },

    _showPageError(err, path) {
      const H = POS.Helpers;
      console.error('Routing execution error:', err);
      if (this.current !== path) return; // the user already moved on to another page
      const message = (err && err.message) || String(err);
      const mc = document.getElementById('main-content');
      if (!mc) return;
      mc.innerHTML = `
        <div class="card fade-in" style="max-width:560px; margin:40px auto;">
          <div class="card-body" style="text-align:center; padding:32px;">
            <div style="font-size:40px;">\u26a0\ufe0f</div>
            <h3 style="margin:8px 0;">This page couldn't load</h3>
            <p class="text-muted" style="margin-bottom:8px;">Something went wrong while opening <strong>${H.esc(path)}</strong>.</p>
            <p style="font-family:monospace; font-size:12px; background:#f1f5f9; padding:8px 10px; border-radius:6px; word-break:break-word; text-align:left;">${H.esc(message)}</p>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:18px; flex-wrap:wrap;">
              <button class="btn btn-primary" id="page-error-retry">Try again</button>
              <a href="/dashboard" class="btn btn-secondary">Go to Dashboard</a>
            </div>
          </div>
        </div>`;
      const retry = document.getElementById('page-error-retry');
      if (retry) retry.onclick = () => this._resolve();
    },

    _updateNav(path) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const link = document.querySelector('.nav-item[href="' + path + '"]');
      if (link) {
        link.classList.add('active');
        const groupItems = link.closest('.nav-group-items');
        if (groupItems) {
          groupItems.classList.add('open');
          const header = groupItems.previousElementSibling;
          if (header) header.classList.add('open');
        }
      }
    },

    _updateBreadcrumb(path) {
      const el = document.getElementById('breadcrumb');
      if (!el) return;
      const parts = path.split('/').filter(Boolean);
      const labels = parts.map(p => {
        if (p === 'products') return 'Medicine';
        return p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      });
      el.innerHTML = labels.map((name, i) =>
        i < labels.length - 1
          ? '<span class="bc-item">' + name + '</span><span class="bc-sep">›</span>'
          : '<span class="bc-item bc-active">' + name + '</span>'
      ).join('');
    }
  };

  window.POS = window.POS || {};
  window.POS.Router = Router;
})();
