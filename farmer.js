/**
 * ==============================================================================
 * KisanConnect - Farmer Dashboard Controller (farmer.js)
 * Implements My Produce, Incoming Orders, Logistics Step Tracker, 
 * AI Demand Forecast (Chart.js), and Earnings comparison.
 * ==============================================================================
 */

import { fetchProduce, createProduce, deleteProduce, updateProduceStock, fetchOrders, updateOrderStatus, fetchDemandForecast, fetchFarmerEarnings, getLogisticsData } from './api.js';
import { getCurrentUser, setCurrentUser, formatINR, showToast, renderDemoBar, logout } from './app.js';

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
  // STRICT ROLE-BASED ACCESS CONTROL (RBAC) CHECK
  const user = getCurrentUser();
  if (!user || user.role !== 'farmer') {
    renderAccessRestrictedScreen(user);
    return;
  }

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

function renderAccessRestrictedScreen(user) {
  const currentRole = user ? user.role : 'Guest';
  const currentName = user ? user.name : 'Visitor';

  document.body.innerHTML = `
    <header class="amz-header">
      <div class="amz-topbar">
        <a href="index.html" class="amz-logo-wrap">
          <span style="font-size: 1.6rem;">🌾</span>
          <div>
            <div class="amz-brand-title">Kisan<span>Connect</span></div>
            <div class="amz-brand-sub">Seller Central</div>
          </div>
        </a>
        <a href="index.html" class="btn btn-sm btn-outline-white" style="margin-left: auto;">
          🛒 Back to Marketplace
        </a>
      </div>
    </header>

    <div class="seller-restricted-wrap">
      <div class="seller-restricted-card">
        <div class="seller-restricted-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 class="seller-restricted-title">Seller Central Access Restricted</h2>
        <p class="seller-restricted-desc">
          You are currently signed in as <strong>${currentName}</strong> (Role: <span class="badge badge-info" style="text-transform: capitalize;">${currentRole}</span>).<br><br>
          KisanConnect Seller features (Crop inventory, Dispatch management, Cold-chain logistics, AI demand forecasting, and Mandi earnings audits) are <strong>accessible only to verified Farmers and FPO Cooperatives</strong>.
        </p>
        <div class="seller-restricted-actions">
          <button class="btn btn-primary" id="btn-login-farmer-direct">
            👨‍🌾 Log In as Farmer (Ramesh Patil)
          </button>
          <a href="login.html?role=farmer" class="btn btn-accent">
            Register as New Farmer / FPO Seller
          </a>
          <a href="index.html" class="btn btn-outline">
            🛒 Continue Shopping on KisanConnect Store
          </a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-login-farmer-direct')?.addEventListener('click', () => {
    const farmerUser = {
      id: "farmer-1",
      name: "Ramesh Patil",
      email: "ramesh.patil@kisanconnect.in",
      role: "farmer",
      phone: "+91 98220 54321",
      location: "Lasalgaon, Nashik, Maharashtra",
      fpo: "Sahyadri Agro Farmers Co-op",
      farmSizeAcres: 8.5
    };
    setCurrentUser(farmerUser);
    showToast('Switched account to Farmer: Ramesh Patil', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 400);
  });
}

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
 * 3. LOGISTICS STEP TRACKER PANEL & ACTIVE OR-TOOLS ROUTE TRACKER
 */
let liveLogisticsState = null;

async function renderActiveLogisticsTracker() {
  const card = document.getElementById('active-logistics-card');
  if (!card) return;

  try {
    if (!liveLogisticsState) {
      liveLogisticsState = await getLogisticsData();
    }
    const data = liveLogisticsState;

    // Update quick banner if present in Tab 1
    const quickTruckEl = document.getElementById('quick-banner-truck-id');
    if (quickTruckEl) quickTruckEl.textContent = data.truckId;

    // Steps definition
    const steps = ["Pending Pickup", "Truck En Route", "Picked Up", "Delivered to Hub"];
    const activeIndex = steps.indexOf(data.currentStatus);

    // Build timeline HTML
    const timelineHtml = `
      <div class="relative py-4">
        <!-- Connecting Progress Bar -->
        <div class="absolute top-8 left-6 right-6 h-1.5 bg-gray-200 rounded -translate-y-1/2 z-0">
          <div class="h-full bg-emerald-600 rounded transition-all duration-500" 
               style="width: ${activeIndex <= 0 ? '0%' : activeIndex === 1 ? '38%' : activeIndex === 2 ? '72%' : '100%'}">
          </div>
        </div>

        <!-- 4 Milestones Grid -->
        <div class="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          ${steps.map((stepName, idx) => {
            const isPassed = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const milestoneData = data.milestones ? data.milestones[idx] : null;
            const timeStr = milestoneData ? milestoneData.time : '';
            const noteStr = milestoneData ? milestoneData.note : '';

            let circleClasses = "bg-gray-100 border-2 border-gray-300 text-gray-400";
            let badgeHtml = "";

            if (isPassed) {
              circleClasses = "bg-emerald-600 border-2 border-emerald-600 text-white shadow-sm";
            } else if (isCurrent) {
              circleClasses = "bg-emerald-500 border-4 border-emerald-200 text-white ring-4 ring-emerald-100 shadow-md animate-pulse";
              badgeHtml = `<span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full">Current Stage</span>`;
            }

            return `
              <div class="flex flex-col items-center text-center p-2 rounded-xl ${isCurrent ? 'bg-emerald-50/60 border border-emerald-200' : ''}">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 ${circleClasses} transition-all">
                  ${isPassed ? '✓' : (idx + 1)}
                </div>
                <div class="text-sm font-bold ${isCurrent ? 'text-emerald-900' : isPassed ? 'text-gray-900' : 'text-gray-400'}">
                  ${stepName}
                </div>
                <div class="text-xs font-semibold text-emerald-700 mt-0.5">${timeStr}</div>
                <div class="text-[11px] text-gray-500 mt-1 max-w-[160px] line-clamp-2">${noteStr}</div>
                ${badgeHtml}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Build Stops HTML for the Route Plan
    const stopsHtml = data.routePlan.stops.map((stop) => {
      const isFarmer = stop.isFarmerFarm;
      const isCompleted = stop.status === 'Completed';
      const isCurrentStop = stop.status.includes('En Route') || stop.status.includes('Next');

      return `
        <div class="relative p-3.5 rounded-xl border transition-all ${
          isFarmer 
            ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-200 shadow-sm' 
            : isCompleted
            ? 'bg-slate-50 border-slate-200 text-slate-700'
            : 'bg-white border-gray-200 text-gray-600'
        }">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              isFarmer ? 'bg-emerald-700 text-white font-mono' : 'bg-gray-200 text-gray-700'
            }">
              ${stop.code}
            </span>
            <span class="text-xs font-semibold ${isFarmer ? 'text-emerald-800' : 'text-gray-500'}">
              ${stop.time}
            </span>
          </div>

          <div class="font-bold text-sm ${isFarmer ? 'text-emerald-950 flex items-center gap-1.5' : 'text-gray-900'}">
            ${isFarmer ? '📍 ' : ''}${stop.title}
          </div>

          <div class="text-xs text-gray-500 mt-0.5 truncate" title="${stop.location}">
            ${stop.location}
          </div>

          <div class="mt-2.5 pt-2 border-t ${isFarmer ? 'border-emerald-200' : 'border-gray-100'} flex items-center justify-between text-xs">
            <span class="font-medium ${
              isCompleted ? 'text-emerald-700 font-semibold' : isCurrentStop ? 'text-amber-700 font-bold' : 'text-gray-500'
            }">
              ${isCompleted ? '✓ ' : isCurrentStop ? '⏳ ' : '⏱️ '}${stop.status}
            </span>
            ${isFarmer ? '<span class="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">You</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl text-emerald-800 shadow-inner">
            🚚
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-gray-900">Active Logistics & Tracking</h3>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 animate-pulse">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Live Telematics
              </span>
            </div>
            <p class="text-sm text-gray-500 mt-0.5">
              Farm-to-hub cold-chain dispatch with AI-optimized multi-stop consolidation
            </p>
          </div>
        </div>

        <!-- Telematics Info Pill -->
        <div class="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200 px-4 py-2.5 rounded-xl text-sm">
          <div>
            <div class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Assigned Truck</div>
            <div class="font-mono font-extrabold text-emerald-950 text-base">${data.truckId}</div>
          </div>
          <div class="h-8 w-px bg-emerald-200"></div>
          <div>
            <div class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Est. Farm Pickup</div>
            <div class="font-bold text-emerald-900">${data.estimatedPickup}</div>
          </div>
        </div>
      </div>

      <!-- Bulk Order Metadata Strip -->
      <div class="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div class="flex items-center gap-2 text-slate-700">
          <span class="font-bold text-slate-900">Consignment:</span>
          <span class="font-medium text-slate-700">${data.consignmentName}</span>
          <span class="text-xs bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-emerald-700">${data.volumeKg} kg Bulk Lot</span>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-slate-600 text-xs sm:text-sm">
          <span class="flex items-center gap-1.5 font-medium">
            ❄️ Reefer Temp: <strong class="text-slate-800">${data.coolingTemp}</strong>
          </span>
          <span class="flex items-center gap-1.5 font-medium">
            👤 Driver: <strong class="text-slate-800">${data.driverName}</strong> (${data.driverPhone})
          </span>
          <span class="flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md font-semibold">
            ${data.vehicleType}
          </span>
        </div>
      </div>

      <!-- Milestone Timeline Progress Tracker -->
      <div class="mb-7">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Live Delivery Milestones</span>
          <span class="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            Current: ${data.currentStatus}
          </span>
        </div>

        ${timelineHtml}
      </div>

      <!-- Optimized Route Plan (Google OR-Tools VRP) -->
      <div class="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-green-50/40 p-5 shadow-inner">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <span class="text-lg">🗺️</span>
            <h4 class="font-bold text-gray-900 text-base">Optimized Route Plan</h4>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-700 text-white">
              Google OR-Tools VRP
            </span>
          </div>
          <div class="text-xs text-emerald-900 font-bold bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200">
            🌱 ${data.routePlan.co2SavedKg} saved • ${data.routePlan.efficiencyScore}
          </div>
        </div>

        <p class="text-xs text-gray-600 mb-4 leading-relaxed">
          Simulated Capacitated Vehicle Routing Problem (CVRP) consolidation algorithm. Clusters nearby farm harvests (Niphad + Lasalgaon) to maximize truck utilization and maintain rural cold-chain freshness.
        </p>

        <!-- Route Stops Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          ${stopsHtml}
        </div>

        <!-- Route Summary Footer & Interactive Simulation Button -->
        <div class="mt-4 pt-3.5 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 font-mono text-emerald-900 font-semibold">
            <span>Route:</span>
            <span>${data.route}</span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-gray-500 font-medium">${data.routePlan.totalDistanceKm} km total • Fuel saving: ${data.routePlan.fuelSavingPct}</span>
            <button type="button" id="btn-advance-logistics-demo" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs flex items-center gap-1">
              <span>⚡ Advance Milestone (Demo)</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Interactive milestone advance for realistic live demo
    const advanceBtn = document.getElementById('btn-advance-logistics-demo');
    if (advanceBtn) {
      advanceBtn.addEventListener('click', () => {
        const nextSteps = ["Pending Pickup", "Truck En Route", "Picked Up", "Delivered to Hub"];
        const curIdx = nextSteps.indexOf(liveLogisticsState.currentStatus);
        const nextIdx = (curIdx + 1) % nextSteps.length;
        liveLogisticsState.currentStatus = nextSteps[nextIdx];

        if (liveLogisticsState.milestones) {
          liveLogisticsState.milestones.forEach((m, idx) => {
            m.isCompleted = idx <= nextIdx;
            m.isCurrent = idx === nextIdx;
          });
        }

        if (nextIdx === 2) {
          liveLogisticsState.estimatedPickup = "Picked Up at Farm Gate!";
          showToast(`Consignment picked up! Truck ${liveLogisticsState.truckId} heading to City Market.`, 'success');
        } else if (nextIdx === 3) {
          liveLogisticsState.estimatedPickup = "Delivered to Hub Terminal!";
          showToast(`Consignment delivered to City Market terminal!`, 'success');
        } else if (nextIdx === 0) {
          liveLogisticsState.estimatedPickup = "Today, 11:45 AM";
          showToast(`Telematics reset: Consignment pending pickup.`, 'info');
        } else {
          showToast(`Telematics updated: Status is now "${liveLogisticsState.currentStatus}".`, 'info');
        }

        renderActiveLogisticsTracker();
      });
    }

  } catch (err) {
    console.error('Failed to render active logistics tracker:', err);
    if (card) {
      card.innerHTML = `<div class="p-4 text-red-600 text-sm">Error loading active route tracker: ${err.message}</div>`;
    }
  }
}

async function loadLogistics() {
  await renderActiveLogisticsTracker();
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
