/**
 * ==============================================================================
 * KisanConnect - Farmer Dashboard Controller (farmer.js)
 * Implements My Produce, Incoming Orders, Logistics Step Tracker, 
 * AI Demand Forecast (Chart.js), and Earnings comparison.
 * ==============================================================================
 */

import { fetchProduce, createProduce, deleteProduce, updateProduceStock, fetchOrders, updateOrderStatus, fetchDemandForecast, fetchFarmerEarnings } from './api.js';
import { getCurrentUser, formatINR, showToast, renderDemoBar, logout } from './app.js';

let chartInstance = null;
let currentForecastCrop = 'Tomatoes';
let currentForecastDays = 14;

// Preset sample images for quick farmer addition
const PRESET_IMAGES = {
  'Vegetables': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
  'Fruits': 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600&auto=format&fit=crop&q=80',
  'Grains': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80',
  'Pulses': 'https://images.unsplash.com/photo-1585994192701-705307374a44?w=600&auto=format&fit=crop&q=80',
  'Dairy': 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=600&auto=format&fit=crop&q=80',
  'Spices': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80'
};

document.addEventListener('DOMContentLoaded', async () => {
  renderDemoBar('farmer');
  setupSidebarNavigation();
  setupUserHeader();
  setupAddProduceModal();
  setupForecastControls();

  // Load initial sections
  await loadProduceGrid();
  await loadOrders();
  await loadLogistics();
  await renderDemandChart();
  await loadEarnings();
});

function setupUserHeader() {
  const user = getCurrentUser();
  const userNameEl = document.getElementById('farmer-name-display');
  const userLocationEl = document.getElementById('farmer-location-display');
  const userAvatarEl = document.getElementById('farmer-avatar-letter');

  if (userNameEl) userNameEl.textContent = user.name || 'Ramesh Patil';
  if (userLocationEl) userLocationEl.textContent = user.location || 'Nashik, Maharashtra';
  if (userAvatarEl) userAvatarEl.textContent = (user.name || 'R').charAt(0).toUpperCase();

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// Tab Switching
function setupSidebarNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      if (!tabId) return;

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      // Update page title
      const titleEl = document.getElementById('page-title');
      if (titleEl) {
        titleEl.textContent = link.textContent.trim();
      }

      if (tabId === 'forecast' && chartInstance) {
        chartInstance.resize();
      }
    });
  });
}

/**
 * 1. MY PRODUCE MANAGEMENT
 */
async function loadProduceGrid() {
  const container = document.getElementById('farmer-produce-grid');
  if (!container) return;

  container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Loading your farm produce...</div>`;

  try {
    const produce = await fetchProduce();
    if (!produce || produce.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #fff; border-radius: 12px; border: 1px dashed #ccc;">
          <p style="font-size: 1.1rem; color: #555; margin-bottom: 12px;">No produce listed yet.</p>
          <button class="btn btn-primary" onclick="document.getElementById('add-produce-modal').classList.add('active')">
            + Add Your First Crop
          </button>
        </div>
      `;
      return;
    }

    // Update stat card
    const totalListedCount = document.getElementById('stat-total-produce-count');
    if (totalListedCount) totalListedCount.textContent = `${produce.length} Active Crops`;

    container.innerHTML = produce.map(item => `
      <div class="produce-card" id="produce-card-${item.id}">
        <div class="produce-img-wrap">
          <img src="${item.imageUrl || PRESET_IMAGES[item.category] || PRESET_IMAGES['Vegetables']}" alt="${item.name}" class="produce-img" />
          <span class="produce-category-tag">${item.category}</span>
          <span class="produce-stock-badge">${item.quantityAvailable} kg in stock</span>
        </div>
        <div class="produce-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h4 class="produce-title">${item.name}</h4>
            ${item.isOrganic ? '<span class="badge badge-success" title="Certified Organic">🌱 Organic</span>' : ''}
          </div>
          <div class="produce-meta">
            <span>📅 Harvest: ${item.harvestDate || 'Fresh'}</span>
            <span style="display: block; margin-top: 2px;">📍 ${item.location}</span>
          </div>
          
          <div class="produce-price-row">
            <div class="produce-price">
              ${formatINR(item.pricePerKg)}<span> / kg</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-outline btn-edit-stock" data-id="${item.id}" data-current="${item.quantityAvailable}" title="Quick Stock Update">
                Stock
              </button>
              <button class="btn btn-sm btn-danger btn-delete-produce" data-id="${item.id}" data-name="${item.name}" title="Remove Crop">
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    container.querySelectorAll('.btn-delete-produce').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (confirm(`Are you sure you want to remove ${name} from your listings?`)) {
          await deleteProduce(id);
          showToast(`${name} removed successfully.`, 'warning');
          loadProduceGrid();
        }
      });
    });

    container.querySelectorAll('.btn-edit-stock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-current');
        const updated = prompt('Enter new stock quantity in kg:', current);
        if (updated !== null && !isNaN(updated) && updated.trim() !== '') {
          await updateProduceStock(id, Number(updated));
          showToast('Stock quantity updated.', 'success');
          loadProduceGrid();
        }
      });
    });

  } catch (err) {
    console.error('Failed to load produce:', err);
    container.innerHTML = `<div style="grid-column: 1/-1; color: #D32F2F;">Failed to load produce list.</div>`;
  }
}

function setupAddProduceModal() {
  const modal = document.getElementById('add-produce-modal');
  const openBtn = document.getElementById('btn-open-add-produce');
  const closeBtn = document.getElementById('btn-close-modal');
  const form = document.getElementById('form-add-produce');

  if (!modal) return;

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  // Auto-fill preset image when category changes
  const categorySelect = document.getElementById('produce-category');
  const imageInput = document.getElementById('produce-image');
  if (categorySelect && imageInput) {
    categorySelect.addEventListener('change', () => {
      if (!imageInput.value || Object.values(PRESET_IMAGES).includes(imageInput.value)) {
        imageInput.value = PRESET_IMAGES[categorySelect.value] || PRESET_IMAGES['Vegetables'];
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = getCurrentUser();

      const cropName = document.getElementById('produce-name').value.trim();
      const category = document.getElementById('produce-category').value;
      const pricePerKg = Number(document.getElementById('produce-price').value);
      const quantityAvailable = Number(document.getElementById('produce-quantity').value);
      const harvestDate = document.getElementById('produce-harvest-date').value || new Date().toISOString().substring(0, 10);
      const isOrganic = document.getElementById('produce-organic').checked;
      let imageUrl = document.getElementById('produce-image').value.trim();

      if (!imageUrl) {
        imageUrl = PRESET_IMAGES[category] || PRESET_IMAGES['Vegetables'];
      }

      const newProduce = {
        name: cropName,
        category,
        variety: "Fresh Farm Produce",
        farmerId: user.id || "farmer-1",
        farmerName: user.name || "Ramesh Patil",
        fpoName: user.fpo || "Sahyadri Agro Farmers Co-op",
        location: user.location || "Nashik, Maharashtra",
        pricePerKg,
        mandiPricePerKg: Math.round(pricePerKg * 1.35),
        quantityAvailable,
        harvestDate,
        isOrganic,
        imageUrl,
        description: `Direct farm-fresh ${cropName} harvested at ${user.location}. Packed with care.`
      };

      await createProduce(newProduce);
      showToast(`🎉 "${cropName}" added to marketplace! Available to all buyers.`, 'success');
      form.reset();
      modal.classList.remove('active');
      await loadProduceGrid();
    });
  }
}

/**
 * 2. ORDERS MANAGEMENT
 */
async function loadOrders() {
  const container = document.getElementById('farmer-orders-body');
  if (!container) return;

  try {
    const orders = await fetchOrders('farmer');
    
    // Update stats
    const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
    const pendingStatEl = document.getElementById('stat-pending-orders');
    if (pendingStatEl) pendingStatEl.textContent = pendingOrdersCount;

    if (orders.length === 0) {
      container.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #666;">No buyer orders received yet.</td></tr>`;
      return;
    }

    container.innerHTML = orders.map(o => {
      const itemsDesc = o.items.map(i => `${i.qtyKg}kg ${i.name}`).join(', ');
      
      let badgeClass = 'badge-warning';
      if (o.status === 'Packed') badgeClass = 'badge-info';
      if (o.status === 'In Transit' || o.status === 'Shipped') badgeClass = 'badge-accent';
      if (o.status === 'Delivered') badgeClass = 'badge-success';

      return `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>
            <div style="font-weight: 600;">${o.buyerName}</div>
            <small style="color: #666;">📍 ${o.deliveryCity}</small>
          </td>
          <td style="max-width: 220px;">${itemsDesc}</td>
          <td><strong>${formatINR(o.total)}</strong></td>
          <td><small>${o.date.split(' ')[0]}</small></td>
          <td>
            <span class="badge ${badgeClass}">${o.status}</span>
          </td>
          <td>
            <select class="form-control form-control-sm order-status-select" data-id="${o.id}" style="width: auto; padding: 4px 8px; font-size: 0.82rem; font-weight: 600;">
              <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Packed" ${o.status === 'Packed' ? 'selected' : ''}>Packed</option>
              <option value="In Transit" ${o.status === 'In Transit' || o.status === 'Shipped' ? 'selected' : ''}>In Transit</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');

    // Attach status update event
    container.querySelectorAll('.order-status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const orderId = select.getAttribute('data-id');
        const newStatus = select.value;
        await updateOrderStatus(orderId, newStatus);
        showToast(`Order #${orderId} marked as "${newStatus}". Syncing with buyer tracker.`, 'success');
        await loadOrders();
        await loadLogistics();
      });
    });

  } catch (err) {
    console.error('Failed to load orders:', err);
  }
}

/**
 * 3. LOGISTICS STEP TRACKER PANEL
 */
async function loadLogistics() {
  const container = document.getElementById('logistics-cards-container');
  if (!container) return;

  try {
    const orders = await fetchOrders('farmer');
    // Only show active and recent shipments
    const activeShipments = orders.filter(o => o.logistics);

    if (activeShipments.length === 0) {
      container.innerHTML = `<div class="card" style="text-align: center; padding: 40px; color: #666;">No active dispatches right now.</div>`;
      return;
    }

    container.innerHTML = activeShipments.map(order => {
      const status = order.status;
      const steps = ['Pending', 'Packed', 'In Transit', 'Delivered'];
      const currentIndex = steps.indexOf(status === 'Shipped' ? 'In Transit' : status);

      // Stepper percentage for horizontal line fill
      const percent = currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 100;

      return `
        <div class="card" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
            <div>
              <h4 style="font-size: 1.15rem; margin-bottom: 4px;">Shipment for Order #${order.id}</h4>
              <div style="font-size: 0.85rem; color: #666;">
                Tracking ID: <strong style="color: #212121;">${order.logistics.trackingId}</strong> • ${order.logistics.carrier}
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${status === 'Delivered' ? 'badge-success' : 'badge-accent'}" style="font-size: 0.85rem; padding: 6px 14px;">
                ${status}
              </span>
              <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">Est. Delivery: ${order.logistics.estimatedDelivery}</div>
            </div>
          </div>

          <!-- Pickup & Delivery Nodes -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #F8F9FA; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
            <div>
              <small style="color: #666; font-weight: 600; text-transform: uppercase;">Origin Farm Pickup</small>
              <div style="font-weight: 700; color: #2E7D32;">📍 ${order.logistics.origin}</div>
              <small style="color: #888;">Farmer: ${order.farmerName || 'Ramesh Patil'}</small>
            </div>
            <div>
              <small style="color: #666; font-weight: 600; text-transform: uppercase;">Destination Buyer Drop</small>
              <div style="font-weight: 700; color: #F4A300;">🏁 ${order.deliveryAddress || order.deliveryCity}</div>
              <small style="color: #888;">Recipient: ${order.buyerName}</small>
            </div>
          </div>

          <!-- Horizontal 4-Step Indicator -->
          <div class="stepper-container">
            <div class="stepper-line">
              <div class="stepper-line-fill" style="width: ${percent}%;"></div>
            </div>
            
            <div class="stepper-step ${currentIndex >= 0 ? 'completed' : ''} ${currentIndex === 0 ? 'active' : ''}">
              <div class="stepper-circle">${currentIndex > 0 ? '✓' : '1'}</div>
              <span class="stepper-title">Pending</span>
            </div>

            <div class="stepper-step ${currentIndex >= 1 ? 'completed' : ''} ${currentIndex === 1 ? 'active' : ''}">
              <div class="stepper-circle">${currentIndex > 1 ? '✓' : '2'}</div>
              <span class="stepper-title">Packed</span>
            </div>

            <div class="stepper-step ${currentIndex >= 2 ? 'completed' : ''} ${currentIndex === 2 ? 'active' : ''}">
              <div class="stepper-circle">${currentIndex > 2 ? '✓' : '3'}</div>
              <span class="stepper-title">In Transit</span>
            </div>

            <div class="stepper-step ${currentIndex >= 3 ? 'completed' : ''} ${currentIndex === 3 ? 'active' : ''}">
              <div class="stepper-circle">${currentIndex >= 3 ? '✓' : '4'}</div>
              <span class="stepper-title">Delivered</span>
            </div>
          </div>

          <!-- Driver & Vehicle Details -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 12px; font-size: 0.85rem; color: #666; flex-wrap: wrap; gap: 8px;">
            <div>
              🚚 Vehicle: <strong>${order.logistics.vehicleNumber}</strong> | Driver: <strong>${order.logistics.driverName}</strong>
            </div>
            <div>
              Consignment: <strong>${order.items.reduce((s, i) => s + i.qtyKg, 0)} kg total</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load logistics:', err);
  }
}

/**
 * 4. AI DEMAND FORECASTING (CHART.JS)
 */
async function renderDemandChart() {
  const canvas = document.getElementById('demandForecastChart');
  if (!canvas) return;

  try {
    const data = await fetchDemandForecast(currentForecastCrop, currentForecastDays);

    // Update Text Insights
    const insightBox = document.getElementById('ai-forecast-insight');
    if (insightBox) {
      insightBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span class="ai-pill">✨ AI Forecast Insight</span>
          <span style="font-weight: 700; color: #2E7D32;">${data.insight.sentiment} (${data.insight.changePct})</span>
        </div>
        <p style="font-size: 0.95rem; color: #212121; margin-bottom: 6px; line-height: 1.5;">
          ${data.insight.recommendation}
        </p>
        <div style="font-size: 0.85rem; color: #555; background: #fff; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #F4A300;">
          <strong>Suggested Action:</strong> ${data.insight.action}
        </div>
      `;
    }

    // Initialize or Update Chart.js
    const ctx = canvas.getContext('2d');
    if (chartInstance) {
      chartInstance.destroy();
    }

    // Verify Chart.js is loaded via CDN
    if (typeof window.Chart === 'undefined') {
      canvas.parentElement.innerHTML = `<div style="padding: 30px; text-align: center; color: #666;">Chart.js loading...</div>`;
      return;
    }

    chartInstance = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: `Predicted Direct Demand (Quintals) - ${data.crop}`,
            data: data.predictedDemand,
            borderColor: '#2E7D32',
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#2E7D32',
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Historical APMC Mandi Inflow Baseline',
            data: data.baselineDemand,
            borderColor: '#9E9E9E',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            tension: 0.2,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: "'Inter', sans-serif", size: 12, weight: '600' }
            }
          },
          tooltip: {
            backgroundColor: '#212121',
            padding: 12,
            titleFont: { family: "'Poppins', sans-serif", size: 13 },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw} Quintals`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: '#E0E0E0' },
            title: {
              display: true,
              text: 'Projected Demand (Quintals/day)',
              font: { weight: '600' }
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

  } catch (err) {
    console.error('Failed to render forecast chart:', err);
  }
}

function setupForecastControls() {
  const cropSelect = document.getElementById('forecast-crop-select');
  const daysSelect = document.getElementById('forecast-days-select');

  if (cropSelect) {
    cropSelect.addEventListener('change', (e) => {
      currentForecastCrop = e.target.value;
      renderDemandChart();
    });
  }

  if (daysSelect) {
    daysSelect.addEventListener('change', (e) => {
      currentForecastDays = Number(e.target.value);
      renderDemandChart();
    });
  }
}

/**
 * 5. EARNINGS & MANDI COMPARISON METRICS
 */
async function loadEarnings() {
  try {
    const data = await fetchFarmerEarnings();

    const totalRevEl = document.getElementById('earnings-total-revenue');
    const pendingPayEl = document.getElementById('earnings-pending');
    const extraProfitEl = document.getElementById('earnings-extra-profit');
    const commissionSavedEl = document.getElementById('earnings-commission-saved');

    if (totalRevEl) totalRevEl.textContent = formatINR(data.totalRevenue);
    if (pendingPayEl) pendingPayEl.textContent = formatINR(data.pendingPayments);
    if (extraProfitEl) extraProfitEl.textContent = `+${data.extraProfitPct}% (${formatINR(data.extraProfitAmount)})`;
    if (commissionSavedEl) commissionSavedEl.textContent = formatINR(data.middlemanCommissionSaved);

    // Populate recent payouts table
    const payoutsBody = document.getElementById('earnings-payouts-body');
    if (payoutsBody && data.recentPayouts) {
      payoutsBody.innerHTML = data.recentPayouts.map(p => `
        <tr>
          <td><strong>#${p.id}</strong></td>
          <td>${p.date}</td>
          <td><strong>${formatINR(p.amount)}</strong></td>
          <td>${p.method}</td>
          <td><span class="badge badge-success">${p.status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="alert('Downloading Payout Invoice #${p.id} (PDF)...')">
              Receipt
            </button>
          </td>
        </tr>
      `).join('');
    }

  } catch (err) {
    console.error('Failed to load earnings:', err);
  }
}
