(function () {
  'use strict';

  const Dashboard = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      // Always default to all-time (blank = no constraint, see
      // H.isDateInRange). Deliberately NOT persisted across visits — a
      // saved filter from a previous session was causing confusion by
      // silently overriding "all-time" on every future page load.
      let fromDate = '';
      let toDate = '';

      mc.innerHTML = `
        <style>
          @keyframes livePulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }
          .pulse-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            display: inline-block;
            animation: livePulse 2s infinite;
          }
          .payment-channel-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px -2px rgba(0,0,0,0.06) !important;
          }
        </style>

        <div class="page-header fade-in" style="margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <h2 class="page-title" style="margin:0; font-size:24px; font-weight:800; color:#0f172a;">Executive Pharmacy Dashboard</h2>
              <span class="badge" style="background:#ecfdf5; color:#059669; font-weight:700; border:1px solid #a7f3d0; font-size:11px; padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
                <span class="pulse-dot"></span>
                Live Register • Active
              </span>
            </div>
            <p class="page-subtitle" style="margin-top:4px; font-size:13px; color:#FFFFFF;">Real-time sales performance, revenue analytics, and multi-channel payment reconciliation.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-today">Today</button>
            <button class="btn btn-secondary btn-sm" id="btn-yesterday">Yesterday</button>
            <button class="btn btn-secondary btn-sm" id="btn-this-week">This Week</button>
            <button class="btn btn-secondary btn-sm" id="btn-this-month">This Month</button>
            <button class="btn btn-secondary btn-sm" id="btn-refresh-dash" title="Refresh data" style="display:inline-flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Sync</span>
            </button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="dash-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="dash-to" value="${toDate}">
          </div>
          <button class="btn btn-primary" id="btn-filter" style="margin-top: 18px;">Apply Filter</button>
          <span id="dash-last-updated" style="font-size:11px; color:#94a3b8; margin-top:18px;"></span>
        </div>

        <div class="stats-grid fade-in" id="dashboard-stats">
          <div style="grid-column: 1/-1; text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 10px;"></div>Loading Stats...</div>
        </div>

        <!-- Payment Settlement & Tender Channels -->
        <div class="card fade-in" style="border:1px solid #e2e8f0; border-radius:12px; margin-top:24px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff; overflow:hidden;">
          <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #edf2f7; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-weight:700; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                Payment Settlement & Tender Channels
              </div>
              <p style="margin:2px 0 0; font-size:12px; color:#64748b;">Official tender channel reconciliation across all active payment methods and gateways.</p>
            </div>
            <div id="payment-summary-pill" style="font-size:12px; font-weight:700; color:#0f172a; background:#e2e8f0; padding:4px 14px; border-radius:20px;">
              Total Collections: ৳0.00
            </div>
          </div>
          <div class="card-body" style="padding:18px 20px;">
            <div id="payment-methods-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:14px;"></div>
          </div>
        </div>

        <!-- Sales Revenue Trend + Payment Method Share -->
        <div class="grid-2 fade-in" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(350px, 1fr)); gap:20px; margin-bottom:24px;">
          <div class="card" style="border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
            <div class="card-header" style="border-bottom:1px solid #edf2f7; padding:14px 18px; font-weight:700; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Sales Revenue Trend
            </div>
            <div class="card-body" style="padding:16px;">
              <div class="chart-container" style="height:260px; position:relative;">
                <canvas id="salesTrendChart"></canvas>
              </div>
            </div>
          </div>

          <div class="card" style="border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
            <div class="card-header" style="border-bottom:1px solid #edf2f7; padding:14px 18px; font-weight:700; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10H12V2z"/></svg>
              Payment Method Share
            </div>
            <div class="card-body" style="padding:16px;">
              <div class="chart-container" style="height:260px; position:relative;">
                <canvas id="paymentMethodChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- 24-Hour Hourly Distribution -->
        <div class="card fade-in" style="border:1px solid #e2e8f0; border-radius:12px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.04); background:#fff;">
          <div class="card-header" style="border-bottom:1px solid #edf2f7; padding:14px 18px; font-weight:700; font-size:14px; color:#1e293b; display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            24-Hour Peak Customer Traffic (Hourly Sales Distribution)
          </div>
          <div class="card-body" style="padding:16px;">
            <div class="chart-container" style="height:220px; position:relative;">
              <canvas id="hourlySalesChart"></canvas>
            </div>
          </div>
        </div>

        <div class="card mt-3 fade-in">
          <div class="card-header">🏆 Top Selling Products</div>
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Sold Qty</th>
                    <th>Subtotal Amount</th>
                  </tr>
                </thead>
                <tbody id="top-selling-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // ── Event listeners ─────────────────────────────
      const $ = (id) => document.getElementById(id);
      const applyRange = (from, to) => {
        $('dash-from').value = from;
        $('dash-to').value = to;
        $('btn-filter').click();
      };

      $('btn-filter').onclick = async () => {
        fromDate = $('dash-from').value;
        toDate = $('dash-to').value;
        await this.updateStats(fromDate, toDate);
      };

      $('btn-today').onclick = () => {
        const t = H.today();
        applyRange(t, t);
      };

      // Local-date helpers (formatDateInput uses local time, so "Yesterday"
      // and "This Week" are right even after midnight / before 6 AM in UTC+6).
      $('btn-yesterday').onclick = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = H.formatDateInput(d);
        applyRange(y, y);
      };

      $('btn-this-week').onclick = () => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay()); // week starts Sunday
        applyRange(H.formatDateInput(d), H.today());
      };

      $('btn-this-month').onclick = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        applyRange(`${y}-${m}-01`, H.today());
      };

      $('btn-refresh-dash').onclick = async () => {
        const btn = $('btn-refresh-dash');
        btn.classList.add('disabled');
        btn.style.opacity = '0.6';
        await this.updateStats($('dash-from').value, $('dash-to').value);
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
        H.showToast('Dashboard metrics refreshed', 'info');
      };

      // Initial stats load
      await this.updateStats(fromDate, toDate);
    },

    async updateStats(from, to) {
      const S = POS.Store;
      const H = POS.Helpers;

      const orders = await S.query('orders', o => H.isDateInRange(o.date, from, to));
      const orderItems = await S.getAll('orderItems');
      const payments = await S.getAll('payments');
      const products = await S.getAll('products?tracked=true');

      let totalSales = 0;
      let totalDue = 0;
      let cashSales = 0;
      let cardSales = 0;
      const paymentBreakdown = {};
      const paymentCount = {};

      H.paymentMethods.forEach(method => {
        paymentBreakdown[method] = 0;
        paymentCount[method] = 0;
      });

      orders.forEach(order => {
        totalSales += parseFloat(order.grandTotal) || 0;
        totalDue += parseFloat(order.dueAmount) || 0;

        // Sum payment methods for this order
        const ordPayments = payments.filter(p => p.orderId === order.id);
        ordPayments.forEach(p => {
          const amt = parseFloat(p.amount) || 0;
          if (paymentBreakdown[p.method] !== undefined) {
            paymentBreakdown[p.method] += amt;
          } else {
            paymentBreakdown[p.method] = amt;
          }
          // A "transaction" is a payment that actually moved money (a 0 row
          // on a credit sale isn't one).
          if (amt > 0) paymentCount[p.method] = (paymentCount[p.method] || 0) + 1;
          if (p.method === 'Cash') cashSales += amt;
          if (p.method === 'Card') cardSales += amt;
        });
      });

      // Calculate profit: Sell Price - Cost Price
      // We need to look up cost price for items sold in the date range
      let totalProfit = 0;
      orders.forEach(order => {
        const items = orderItems.filter(i => i.orderId === order.id);
        let orderCost = 0;
        items.forEach(item => {
          // Look up base product to find costPrice
          const product = products.find(p => p.id === item.productId);
          let cost = 0;
          if (product) {
            if (product.variations && product.variations.length > 0) {
              const variant = product.variations.find(v => v.name === item.variationName || (product.name + ' ' + v.name) === item.productName);
              cost = variant ? variant.costPrice : product.costPrice;
            } else {
              cost = product.costPrice;
            }
          }
          orderCost += (cost * item.qty);
        });

        // Profit = grandTotal - discountAmount - totalCost
        const discountAllocated = order.discountAmount || 0;
        const profitForOrder = order.subtotal - orderCost - discountAllocated;
        totalProfit += profitForOrder;
      });

      const lastUpdatedEl = document.getElementById('dash-last-updated');
      if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      // Render Summary Cards
      const statsGrid = document.getElementById('dashboard-stats');
      if (!statsGrid) return; // navigated away while loading
      statsGrid.innerHTML = `
        <div class="stat-card purple">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-label">Total Sale</div>
            <div class="stat-value" style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
              <span>${H.formatCurrency(totalSales)}</span>
              <span style="font-size: 13px; font-weight: 600; color: #ddd; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 4px;">${orders.length} Sales</span>
            </div>
            <div class="stat-sub">Invoiced Collections</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">📈</div>
          <div class="stat-info">
            <div class="stat-label">Total Profit</div>
            <div class="stat-value">${H.formatCurrency(totalProfit)}</div>
            <div class="stat-sub">Estimated Gross</div>
          </div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon">💳</div>
          <div class="stat-info">
            <div class="stat-label">Card Sales</div>
            <div class="stat-value">${H.formatCurrency(cardSales)}</div>
            <div class="stat-sub">All cards</div>
          </div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">💵</div>
          <div class="stat-info">
            <div class="stat-label">Cash In Hand</div>
            <div class="stat-value">${H.formatCurrency(cashSales)}</div>
            <div class="stat-sub">Physical cash</div>
          </div>
        </div>
      `;

      // ── Payment Settlement & Tender Channels ────────
      // Every method in the list, plus any other name that shows up in the
      // payment records (so no money is ever missing from the cards).
      let totalCollected = 0;
      Object.values(paymentBreakdown).forEach(amt => totalCollected += amt);

      const pmPill = document.getElementById('payment-summary-pill');
      if (pmPill) pmPill.textContent = `Total Collections: ${H.formatCurrency(totalCollected)}`;

      const pmGrid = document.getElementById('payment-methods-grid');
      if (pmGrid) {
        pmGrid.innerHTML = Object.keys(paymentBreakdown).map(method => {
          const amt = paymentBreakdown[method] || 0;
          const count = paymentCount[method] || 0;
          const pct = totalCollected > 0 ? ((amt / totalCollected) * 100).toFixed(1) : '0.0';
          const brandColor = H.getPaymentMethodColor(method);
          const iconHtml = H.getPaymentMethodIcon(method, 40);
          const isActive = amt > 0;

          return `
            <div class="payment-channel-card" style="background:#fff; border:1px solid ${isActive ? '#cbd5e1' : '#f1f5f9'}; border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; transition:all 0.2s ease; box-shadow:${isActive ? '0 2px 5px rgba(0,0,0,0.03)' : 'none'};">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  ${iconHtml}
                  <div style="min-width:0;">
                    <div style="font-weight:700; font-size:14px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${H.esc(method)}</div>
                    <div style="font-size:11px; color:#64748b;">${count} transaction${count === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <div>
                  ${isActive
                    ? `<span style="font-size:10px; font-weight:700; color:#16a34a; background:#f0fdf4; border:1px solid #bbf7d0; padding:2px 7px; border-radius:12px;">Active</span>`
                    : `<span style="font-size:10px; font-weight:600; color:#94a3b8; background:#f8fafc; border:1px solid #e2e8f0; padding:2px 7px; border-radius:12px;">0 Tx</span>`
                  }
                </div>
              </div>

              <div>
                <div style="font-size:17px; font-weight:800; color:#0f172a;">${H.formatCurrency(amt)}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:11px; color:#64748b;">
                  <span>Channel share</span>
                  <span style="font-weight:700; color:${brandColor};">${pct}%</span>
                </div>
                <div style="width:100%; height:5px; background:#f1f5f9; border-radius:4px; margin-top:4px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${brandColor}; border-radius:4px; transition:width 0.4s ease;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // ── Charts & Top Selling ─────────────────────────
      this.renderCharts(orders, paymentBreakdown, from, to);
      this.renderTopSelling(orders, orderItems);
    },

    renderCharts(orders, paymentBreakdown, from, to) {
      const H = POS.Helpers;
      const canvas = (id) => document.getElementById(id);
      if (!canvas('salesTrendChart') || !canvas('paymentMethodChart') || !canvas('hourlySalesChart')) return; // navigated away

      // Calculate diffDays inclusive
      const diffTime = Math.abs(new Date(to) - new Date(from));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // 1. Sales Revenue Trend (by day)
      const dailySales = {};
      orders.forEach(o => {
        const day = H.formatDate(o.date);
        dailySales[day] = (dailySales[day] || 0) + (parseFloat(o.grandTotal) || 0);
      });

      const trendLabels = Object.keys(dailySales).reverse();
      const trendData = Object.values(dailySales).reverse();

      const ctxTrend = canvas('salesTrendChart').getContext('2d');
      if (window.trendChart) window.trendChart.destroy();

      // Soft teal gradient under the line
      const gradient = ctxTrend.createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, 'rgba(13, 148, 136, 0.28)');
      gradient.addColorStop(1, 'rgba(13, 148, 136, 0.01)');

      window.trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: trendLabels.length ? trendLabels : ['No Data'],
          datasets: [{
            label: 'Sales Revenue',
            data: trendData.length ? trendData : [0],
            borderColor: '#0d9488',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#0d9488',
            pointBorderColor: '#fff',
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Revenue: ${H.formatCurrency(context.raw)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.04)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });

      // 2. Payment Method Share (brand colours)
      const payLabels = Object.keys(paymentBreakdown).filter(k => paymentBreakdown[k] > 0);
      const payData = payLabels.map(k => paymentBreakdown[k]);
      const payColors = payLabels.map(k => H.getPaymentMethodColor(k));

      const ctxPay = canvas('paymentMethodChart').getContext('2d');
      if (window.payChart) window.payChart.destroy();
      window.payChart = new Chart(ctxPay, {
        type: 'doughnut',
        data: {
          labels: payLabels.length ? payLabels : ['No Transactions'],
          datasets: [{
            data: payData.length ? payData : [1],
            backgroundColor: payColors.length ? payColors : ['#CBD5E1'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { size: 12, weight: 600 }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.label}: ${H.formatCurrency(context.raw)}`
              }
            }
          }
        }
      });

      // 3. 24-Hour Distribution (hourly peaks; the busiest hour is highlighted)
      const hourlyCounts = Array(24).fill(0);
      orders.forEach(o => {
        const hr = new Date(o.date).getHours();
        if (hr >= 0 && hr < 24) {
          hourlyCounts[hr]++;
        }
      });

      const hourlyData = diffDays > 2
        ? hourlyCounts.map(c => parseFloat((c / diffDays).toFixed(2)))
        : hourlyCounts;

      const hourLabels = Array.from({ length: 24 }, (_, i) => {
        const h = i % 12 || 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        return `${h} ${ampm}`;
      });

      const maxHourly = Math.max(...hourlyCounts, 1);
      const barColors = hourlyCounts.map(val => val === maxHourly && val > 0 ? '#0d9488' : 'rgba(59, 130, 246, 0.7)');

      const ctxHour = canvas('hourlySalesChart').getContext('2d');
      if (window.hourChart) window.hourChart.destroy();
      window.hourChart = new Chart(ctxHour, {
        type: 'bar',
        data: {
          labels: hourLabels,
          datasets: [{
            label: diffDays > 2 ? 'Avg Hourly Invoices' : 'Hourly Invoices',
            data: hourlyData,
            backgroundColor: barColors,
            borderColor: '#0d9488',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Traffic: ${context.raw} invoice(s)`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 },
              grid: { color: 'rgba(0, 0, 0, 0.04)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    },

    renderTopSelling(orders, orderItems) {
      const H = POS.Helpers;
      const orderIds = orders.map(o => o.id);
      const items = orderItems.filter(i => orderIds.includes(i.orderId));

      const totals = {};
      items.forEach(i => {
        const key = i.productName + (i.variationName ? ` (${i.variationName})` : '');
        if (!totals[key]) {
          totals[key] = { qty: 0, amount: 0 };
        }
        totals[key].qty += i.qty;
        totals[key].amount += i.total;
      });

      const sorted = Object.entries(totals)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5);

      const tbody = document.getElementById('top-selling-tbody');
      if (!tbody) return; // navigated away
      tbody.innerHTML = '';

      if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">No sales data in range.</td></tr>`;
        return;
      }

      sorted.forEach(([name, data]) => {
        tbody.innerHTML += `
          <tr>
            <td style="font-weight:600;">${H.esc(name)}</td>
            <td>${data.qty}</td>
            <td style="font-weight:700;" class="text-success">${H.formatCurrency(data.amount)}</td>
          </tr>
        `;
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.Dashboard = Dashboard;
})();
