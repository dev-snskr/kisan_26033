/**
 * ==============================================================================
 * KisanConnect - Consumer & Bulk Buyer Marketplace Controller (buyer.js)
 * Implements Produce Browsing, Filters, Bulk Mode Tiers, Cart Drawer,
 * Checkout with Mock Payment, Order History, and Live Logistics Tracking.
 * ==============================================================================
 */

import { fetchProduce, fetchOrders, placeOrder } from './api.js';
import { getCurrentUser, formatINR, showToast, getCart, saveCart, updateCartBadges, renderDemoBar, logout } from './app.js';

let isBulkMode = false;
let currentCategory = 'All';
let maxPriceFilter = 250;
let searchQuery = '';
let organicOnlyFilter = false;
let locationFilter = 'All';
let sortBy = 'featured';

document.addEventListener('DOMContentLoaded', async () => {
  renderDemoBar('buyer');
  setupNavbar();
  setupFilters();
  setupCartDrawer();
  setupCheckoutModal();
  setupTabs();

  updateCartBadges();
  await loadMarketplaceProduce();
  await loadBuyerOrders();
});

function setupNavbar() {
  const user = getCurrentUser();
  const buyerNameEl = document.getElementById('buyer-name-display');
  if (buyerNameEl) buyerNameEl.textContent = user.name || 'Ananya Sharma';

  const logoutBtn = document.getElementById('buyer-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Search Bar
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        loadMarketplaceProduce();
      }, 250);
    });
  }

  // Bulk Order Mode Toggle
  const bulkToggleBtn = document.getElementById('bulk-mode-btn');
  const bulkCheckbox = document.getElementById('bulk-mode-checkbox');

  if (bulkToggleBtn && bulkCheckbox) {
    bulkToggleBtn.addEventListener('click', () => {
      bulkCheckbox.checked = !bulkCheckbox.checked;
      isBulkMode = bulkCheckbox.checked;
      updateBulkModeUI();
      loadMarketplaceProduce();
    });

    bulkCheckbox.addEventListener('change', () => {
      isBulkMode = bulkCheckbox.checked;
      updateBulkModeUI();
      loadMarketplaceProduce();
    });
  }

  // Category Strip
  const categoryChips = document.querySelectorAll('.category-chip');
  categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      categoryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-category') || 'All';
      loadMarketplaceProduce();
    });
  });
}

function updateBulkModeUI() {
  const bulkToggleBtn = document.getElementById('bulk-mode-btn');
  const bulkBanner = document.getElementById('bulk-mode-banner');

  if (isBulkMode) {
    bulkToggleBtn.classList.add('active');
    if (bulkBanner) bulkBanner.style.display = 'block';
    showToast('📦 Bulk Order Mode ON: Wholesale discounts (5% - 20%) unlocked for 10kg+!', 'success');
  } else {
    bulkToggleBtn.classList.remove('active');
    if (bulkBanner) bulkBanner.style.display = 'none';
  }
}

function setupTabs() {
  const navTabs = document.querySelectorAll('.buyer-nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = tab.getAttribute('data-view');
      if (!targetView) return;

      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.buyer-view-pane').forEach(p => p.style.display = 'none');
      const activePane = document.getElementById(`view-${targetView}`);
      if (activePane) activePane.style.display = 'block';

      if (targetView === 'orders') {
        loadBuyerOrders();
      } else if (targetView === 'tracking') {
        loadBuyerTracking();
      }
    });
  });
}

function setupFilters() {
  const priceSlider = document.getElementById('filter-price-slider');
  const priceVal = document.getElementById('filter-price-val');
  if (priceSlider && priceVal) {
    priceSlider.addEventListener('input', (e) => {
      maxPriceFilter = Number(e.target.value);
      priceVal.textContent = `Up to ${formatINR(maxPriceFilter)}/kg`;
      loadMarketplaceProduce();
    });
  }

  const organicCheck = document.getElementById('filter-organic-check');
  if (organicCheck) {
    organicCheck.addEventListener('change', (e) => {
      organicOnlyFilter = e.target.checked;
      loadMarketplaceProduce();
    });
  }

  const locationSelect = document.getElementById('filter-location-select');
  if (locationSelect) {
    locationSelect.addEventListener('change', (e) => {
      locationFilter = e.target.value;
      loadMarketplaceProduce();
    });
  }

  const sortSelect = document.getElementById('sort-by-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      loadMarketplaceProduce();
    });
  }
}

/**
 * 1. LOAD PRODUCE INTO MARKETPLACE
 */
async function loadMarketplaceProduce() {
  const grid = document.getElementById('buyer-produce-grid');
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Fetching fresh farm produce...</div>`;

  try {
    let produce = await fetchProduce({
      category: currentCategory,
      search: searchQuery,
      maxPrice: maxPriceFilter,
      state: locationFilter === 'All' ? null : locationFilter,
      organicOnly: organicOnlyFilter
    });

    // Sort produce
    if (sortBy === 'price-low') {
      produce.sort((a, b) => a.pricePerKg - b.pricePerKg);
    } else if (sortBy === 'price-high') {
      produce.sort((a, b) => b.pricePerKg - a.pricePerKg);
    } else if (sortBy === 'rating') {
      produce.sort((a, b) => b.rating - a.rating);
    }

    if (produce.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #fff; border-radius: 12px; border: 1px solid #E0E0E0;">
          <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No Produce Found</h3>
          <p style="color: #666; font-size: 0.95rem;">Try adjusting your filters, category, or search keywords.</p>
          <button class="btn btn-outline btn-sm" style="margin-top: 16px;" onclick="resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = produce.map(item => {
      // Calculate savings vs middleman retail price
      const retailPrice = item.mandiPricePerKg || Math.round(item.pricePerKg * 1.35);
      const savingsPct = Math.round(((retailPrice - item.pricePerKg) / retailPrice) * 100);

      // Bulk tier display
      let bulkPillHtml = '';
      if (isBulkMode && item.bulkTiers && item.bulkTiers.length > 0) {
        bulkPillHtml = `
          <div class="bulk-tier-box">
            <strong>📦 Wholesale Bulk Tiers:</strong><br/>
            ${item.bulkTiers.map(t => `${t.minQty}kg+: <strong>${formatINR(t.pricePerKg)}/kg</strong> (${t.discountPct}% off)`).join(' • ')}
          </div>
        `;
      }

      return `
        <div class="buyer-card" id="buyer-card-${item.id}">
          <div class="buyer-card-img-wrap">
            <img src="${item.imageUrl}" alt="${item.name}" class="buyer-card-img" />
            <div class="farmer-badge-pill">
              <span>👨‍🌾 ${item.farmerName}</span>
            </div>
            <div class="mandi-savings-pill">
              Save ${savingsPct}% vs Mandi
            </div>
          </div>

          <div class="buyer-card-body">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <h4 class="buyer-card-title">${item.name}</h4>
              ${item.isOrganic ? '<span class="badge badge-success" style="font-size: 0.72rem;">🌱 Organic</span>' : ''}
            </div>

            <div class="buyer-card-farmer">
              <span>📍 ${item.location}</span> • <span>★ ${item.rating || 4.8} (${item.reviewsCount || 24})</span>
            </div>

            <p style="font-size: 0.82rem; color: #666; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.description || 'Direct harvest from verified farm.'}
            </p>

            ${bulkPillHtml}

            <div class="buyer-card-price-row">
              <div class="buyer-price-wrap">
                <div style="font-size: 1.3rem; font-weight: 800; color: #2E7D32;">
                  ${formatINR(item.pricePerKg)}<span style="font-size: 0.85rem; font-weight: 500; color: #666;"> / kg</span>
                </div>
                <div class="buyer-retail-cut">Retail Mandi: ${formatINR(retailPrice)}/kg</div>
              </div>
              <small style="color: #666; font-weight: 600;">${item.quantityAvailable} kg left</small>
            </div>

            <div class="buyer-card-actions">
              <div class="qty-counter">
                <button type="button" class="qty-btn btn-qty-minus" data-id="${item.id}">-</button>
                <input type="number" class="qty-input" id="qty-input-${item.id}" value="${isBulkMode ? 10 : 2}" min="1" max="${item.quantityAvailable}" />
                <button type="button" class="qty-btn btn-qty-plus" data-id="${item.id}">+</button>
              </div>

              <button class="btn btn-primary btn-add-cart" style="flex-grow: 1;" data-id="${item.id}" data-name="${item.name}" data-price="${item.pricePerKg}" data-farmer="${item.farmerName}" data-img="${item.imageUrl}">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach quantity +/- actions
    grid.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const input = document.getElementById(`qty-input-${id}`);
        if (input && Number(input.value) > 1) {
          input.value = Number(input.value) - 1;
        }
      });
    });

    grid.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const input = document.getElementById(`qty-input-${id}`);
        if (input) {
          input.value = Number(input.value) + 1;
        }
      });
    });

    // Attach Add to Cart action
    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const price = Number(btn.getAttribute('data-price'));
        const farmer = btn.getAttribute('data-farmer');
        const img = btn.getAttribute('data-img');
        const qtyInput = document.getElementById(`qty-input-${id}`);
        const qty = Number(qtyInput ? qtyInput.value : 1);

        addToCart({
          produceId: id,
          name,
          pricePerKg: price,
          farmerName: farmer,
          imageUrl: img,
          qtyKg: qty
        });
      });
    });

  } catch (err) {
    console.error('Failed to load marketplace:', err);
    grid.innerHTML = `<div style="grid-column: 1/-1; color: #D32F2F;">Failed to load produce.</div>`;
  }
}

window.resetFilters = function() {
  currentCategory = 'All';
  searchQuery = '';
  maxPriceFilter = 250;
  organicOnlyFilter = false;
  locationFilter = 'All';
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.category-chip[data-category="All"]')?.classList.add('active');
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) searchInput.value = '';
  loadMarketplaceProduce();
};

/**
 * 2. CART SYSTEM
 */
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(x => x.produceId === item.produceId);
  if (existing) {
    existing.qtyKg += item.qtyKg;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  showToast(`🛒 Added ${item.qtyKg}kg of ${item.name} to your cart!`, 'success');
  renderCartDrawer();
}

function setupCartDrawer() {
  const openBtn = document.getElementById('open-cart-btn');
  const closeBtn = document.getElementById('close-cart-btn');
  const overlay = document.getElementById('cart-drawer-overlay');

  if (openBtn && overlay) {
    openBtn.addEventListener('click', () => {
      renderCartDrawer();
      overlay.classList.add('active');
    });
  }

  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  }

  const checkoutBtn = document.getElementById('btn-proceed-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
      openCheckoutModal();
    });
  }
}

function renderCartDrawer() {
  const cart = getCart();
  const body = document.getElementById('cart-drawer-body');
  const subtotalEl = document.getElementById('cart-drawer-subtotal');
  const deliveryEl = document.getElementById('cart-drawer-delivery');
  const totalEl = document.getElementById('cart-drawer-total');
  const savingsEl = document.getElementById('cart-drawer-savings');
  const checkoutBtn = document.getElementById('btn-proceed-checkout');

  if (!body) return;

  if (cart.length === 0) {
    body.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🧺</div>
        <h4 style="font-size: 1.15rem; margin-bottom: 6px;">Your cart is empty</h4>
        <p style="font-size: 0.88rem; color: #666; margin-bottom: 20px;">Explore farm fresh vegetables, fruits & grains direct from Indian farmers.</p>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('cart-drawer-overlay').classList.remove('active')">
          Browse Produce
        </button>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (deliveryEl) deliveryEl.textContent = '₹0';
    if (totalEl) totalEl.textContent = '₹0';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  let subtotal = 0;
  let totalSavings = 0;

  body.innerHTML = cart.map((item, idx) => {
    // Bulk price tier check: if qty >= 10, apply 8% discount
    let unitPrice = item.pricePerKg;
    if (item.qtyKg >= 10) {
      unitPrice = Math.round(unitPrice * 0.92);
    }
    const itemTotal = unitPrice * item.qtyKg;
    subtotal += itemTotal;
    totalSavings += Math.round(itemTotal * 0.3); // roughly 30% savings vs supermarket

    return `
      <div class="cart-item">
        <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-details">
          <h5 class="cart-item-title">${item.name}</h5>
          <div class="cart-item-farmer">👨‍🌾 ${item.farmerName}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <div class="cart-item-price">
              ${formatINR(itemTotal)} 
              <small style="font-size: 0.75rem; color: #666; font-weight: normal;">(${formatINR(unitPrice)}/kg)</small>
            </div>
            <div class="qty-counter" style="scale: 0.85; transform-origin: right;">
              <button class="qty-btn btn-cart-minus" data-idx="${idx}">-</button>
              <span style="padding: 0 10px; font-weight: 700; font-size: 0.9rem;">${item.qtyKg}kg</span>
              <button class="qty-btn btn-cart-plus" data-idx="${idx}">+</button>
            </div>
          </div>
        </div>
        <button class="btn btn-sm btn-danger btn-cart-remove" data-idx="${idx}" style="position: absolute; top: 0; right: 0; padding: 2px 6px; font-size: 0.75rem;">✕</button>
      </div>
    `;
  }).join('');

  // Delivery: Free if subtotal > ₹499 or Bulk mode
  const deliveryFee = (subtotal >= 499 || isBulkMode) ? 0 : 40;
  const grandTotal = subtotal + deliveryFee;

  if (subtotalEl) subtotalEl.textContent = formatINR(subtotal);
  if (deliveryEl) deliveryEl.textContent = deliveryFee === 0 ? 'FREE (Green Farm Fleet)' : formatINR(deliveryFee);
  if (totalEl) totalEl.textContent = formatINR(grandTotal);
  if (savingsEl) savingsEl.textContent = `You saved ${formatINR(totalSavings)} directly with zero middlemen!`;

  // Attach cart listeners
  body.querySelectorAll('.btn-cart-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      if (cart[idx].qtyKg > 1) {
        cart[idx].qtyKg -= 1;
      } else {
        cart.splice(idx, 1);
      }
      saveCart(cart);
      renderCartDrawer();
    });
  });

  body.querySelectorAll('.btn-cart-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      cart[idx].qtyKg += 1;
      saveCart(cart);
      renderCartDrawer();
    });
  });

  body.querySelectorAll('.btn-cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      cart.splice(idx, 1);
      saveCart(cart);
      renderCartDrawer();
    });
  });
}

/**
 * 3. CHECKOUT & MOCK PAYMENT SYSTEM
 */
function setupCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  const closeBtn = document.getElementById('close-checkout-modal');
  const form = document.getElementById('checkout-form');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cart = getCart();
      if (cart.length === 0) return;

      const subtotal = cart.reduce((s, i) => s + (i.pricePerKg * i.qtyKg), 0);
      const deliveryFee = subtotal >= 499 ? 0 : 40;
      const total = subtotal + deliveryFee;

      const buyerName = document.getElementById('checkout-name').value.trim();
      const buyerPhone = document.getElementById('checkout-phone').value.trim();
      const address = document.getElementById('checkout-address').value.trim();
      const city = document.getElementById('checkout-city').value.trim();

      const orderPayload = {
        buyerId: 'buyer-1',
        buyerName,
        buyerPhone,
        deliveryCity: city,
        deliveryAddress: address,
        farmerId: cart[0]?.farmerId || 'farmer-1',
        farmerName: cart[0]?.farmerName || 'Ramesh Patil',
        items: cart.map(i => ({
          produceId: i.produceId,
          name: i.name,
          qtyKg: i.qtyKg,
          pricePerKg: i.pricePerKg,
          subtotal: i.pricePerKg * i.qtyKg
        })),
        subtotal,
        deliveryFee,
        total
      };

      // Place order via API
      const createdOrder = await placeOrder(orderPayload);

      // Clear Cart
      saveCart([]);
      renderCartDrawer();
      modal.classList.remove('active');

      // Show Order Success Modal
      showOrderConfirmation(createdOrder);
    });
  }
}

function openCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  const user = getCurrentUser();
  if (!modal) return;

  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + (i.pricePerKg * i.qtyKg), 0);
  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const total = subtotal + deliveryFee;

  // Pre-fill user data
  const nameField = document.getElementById('checkout-name');
  const phoneField = document.getElementById('checkout-phone');
  const cityField = document.getElementById('checkout-city');
  const addressField = document.getElementById('checkout-address');

  if (nameField) nameField.value = user.name || 'Ananya Sharma';
  if (phoneField) phoneField.value = user.phone || '+91 98201 44521';
  if (cityField) cityField.value = user.city || 'Pune, Maharashtra';
  if (addressField) addressField.value = user.address || 'Flat 402, Green Meadows, Baner, Pune';

  const orderSummaryEl = document.getElementById('checkout-order-summary');
  if (orderSummaryEl) {
    orderSummaryEl.innerHTML = `
      <div style="background: #F1F8E9; padding: 14px; border-radius: 8px; border: 1px solid #C8E6C9; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px;">
          <span>Items (${cart.length} types)</span>
          <span>${formatINR(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 6px;">
          <span>Green Delivery Fleet</span>
          <span>${deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; border-top: 1px solid #C8E6C9; padding-top: 6px; color: #2E7D32;">
          <span>Total Payable</span>
          <span>${formatINR(total)}</span>
        </div>
      </div>
    `;
  }

  modal.classList.add('active');
}

function showOrderConfirmation(order) {
  const confirmModal = document.getElementById('order-success-modal');
  if (!confirmModal) return;

  const orderIdEl = document.getElementById('success-order-id');
  const totalEl = document.getElementById('success-order-total');
  const trackingLink = document.getElementById('btn-success-track');

  if (orderIdEl) orderIdEl.textContent = `#${order.id}`;
  if (totalEl) totalEl.textContent = formatINR(order.total);

  if (trackingLink) {
    trackingLink.onclick = () => {
      confirmModal.classList.remove('active');
      // Jump to tracking view
      document.querySelector('.buyer-nav-tab[data-view="tracking"]')?.click();
    };
  }

  confirmModal.classList.add('active');
}

/**
 * 4. ORDER HISTORY & LIVE STEP TRACKER
 */
async function loadBuyerOrders() {
  const container = document.getElementById('buyer-orders-container');
  if (!container) return;

  try {
    const orders = await fetchOrders('buyer');
    if (orders.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <h4>No orders placed yet.</h4>
          <p style="color: #666; margin-top: 6px;">Shop fresh produce directly from farmers on the marketplace!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      let badgeClass = 'badge-warning';
      if (order.status === 'Packed') badgeClass = 'badge-info';
      if (order.status === 'In Transit') badgeClass = 'badge-accent';
      if (order.status === 'Delivered') badgeClass = 'badge-success';

      return `
        <div class="card" style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
            <div>
              <h4 style="font-size: 1.1rem;">Order #${order.id}</h4>
              <small style="color: #666;">Placed on: ${order.date} • Farm Hub: <strong>${order.farmerName}</strong></small>
            </div>
            <div style="text-align: right;">
              <span class="badge ${badgeClass}" style="font-size: 0.85rem; padding: 4px 12px;">${order.status}</span>
              <div style="font-weight: 800; font-size: 1.15rem; color: #2E7D32; margin-top: 4px;">${formatINR(order.total)}</div>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px;">
              ${order.items.map(i => `
                <li style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                  <span>• ${i.name} (× ${i.qtyKg} kg)</span>
                  <span><strong>${formatINR(i.subtotal)}</strong></span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px solid #eee; padding-top: 12px;">
            <div style="font-size: 0.85rem; color: #666;">
              Delivery to: <strong>${order.deliveryAddress || order.deliveryCity}</strong>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-outline btn-buyer-track" data-id="${order.id}">
                🚚 Track Delivery
              </button>
              <button class="btn btn-sm btn-primary btn-buyer-reorder" data-id="${order.id}">
                Reorder Fresh
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach tracking listener
    container.querySelectorAll('.btn-buyer-track').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('.buyer-nav-tab[data-view="tracking"]')?.click();
      });
    });

    // Attach reorder listener
    container.querySelectorAll('.btn-buyer-reorder').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const order = orders.find(o => o.id === id);
        if (order && order.items) {
          order.items.forEach(i => {
            addToCart({
              produceId: i.produceId,
              name: i.name,
              pricePerKg: i.pricePerKg,
              farmerName: order.farmerName,
              imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
              qtyKg: i.qtyKg
            });
          });
          document.getElementById('open-cart-btn')?.click();
        }
      });
    });

  } catch (err) {
    console.error('Failed to load buyer orders:', err);
  }
}

async function loadBuyerTracking() {
  const container = document.getElementById('buyer-tracking-content');
  if (!container) return;

  try {
    const orders = await fetchOrders('buyer');
    const trackableOrder = orders.find(o => o.logistics) || orders[0];

    if (!trackableOrder) {
      container.innerHTML = `<div class="card" style="text-align: center; padding: 40px; color: #666;">No active shipments to track right now.</div>`;
      return;
    }

    const status = trackableOrder.status;
    const steps = ['Pending', 'Packed', 'In Transit', 'Delivered'];
    const currentIndex = steps.indexOf(status === 'Shipped' ? 'In Transit' : status);
    const percent = currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 100;

    container.innerHTML = `
      <div class="card" style="margin-top: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 1.35rem; margin-bottom: 4px;">Live Shipment Status (Order #${trackableOrder.id})</h3>
            <div style="color: #666; font-size: 0.88rem;">
              Tracking ID: <strong>${trackableOrder.logistics.trackingId}</strong> • Carrier: <strong>${trackableOrder.logistics.carrier}</strong>
            </div>
          </div>
          <span class="badge ${status === 'Delivered' ? 'badge-success' : 'badge-accent'}" style="font-size: 0.95rem; padding: 8px 16px;">
            ${status}
          </span>
        </div>

        <!-- Horizontal Stepper -->
        <div class="stepper-container" style="margin: 40px 0;">
          <div class="stepper-line">
            <div class="stepper-line-fill" style="width: ${percent}%;"></div>
          </div>
          
          <div class="stepper-step ${currentIndex >= 0 ? 'completed' : ''} ${currentIndex === 0 ? 'active' : ''}">
            <div class="stepper-circle">${currentIndex > 0 ? '✓' : '1'}</div>
            <span class="stepper-title">Order Placed</span>
          </div>

          <div class="stepper-step ${currentIndex >= 1 ? 'completed' : ''} ${currentIndex === 1 ? 'active' : ''}">
            <div class="stepper-circle">${currentIndex > 1 ? '✓' : '2'}</div>
            <span class="stepper-title">Farm-Gate Packed</span>
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

        <!-- Origin, Destination & Dispatch Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #F1F8E9; border: 1px solid #C8E6C9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #2E7D32; text-transform: uppercase;">Origin Farm Pickup</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: #212121; margin-top: 2px;">📍 ${trackableOrder.logistics.origin}</div>
            <small style="color: #666;">Farmer: ${trackableOrder.farmerName}</small>
          </div>
          <div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #F4A300; text-transform: uppercase;">Your Delivery Address</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: #212121; margin-top: 2px;">🏠 ${trackableOrder.deliveryAddress || trackableOrder.deliveryCity}</div>
            <small style="color: #666;">Recipient: ${trackableOrder.buyerName} (${trackableOrder.buyerPhone})</small>
          </div>
        </div>

        <!-- Live Milestones Timeline -->
        <div style="border-top: 1px solid #eee; padding-top: 20px;">
          <h4 style="font-size: 1rem; margin-bottom: 12px;">Shipment Activity Log</h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${(trackableOrder.statusHistory || []).map(h => `
              <div style="display: flex; gap: 12px; align-items: baseline; font-size: 0.9rem;">
                <span style="color: #2E7D32; font-weight: 700; min-width: 90px;">${h.status}</span>
                <span style="color: #666; font-size: 0.8rem; min-width: 130px;">${h.time}</span>
                <span style="color: #212121;">${h.note}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    console.error('Failed to load tracking view:', err);
  }
}
