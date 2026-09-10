/**
 * ==============================================================================
 * KisanConnect - Consumer & Bulk Buyer Marketplace Controller (buyer.js)
 * Modern Amazon / Flipkart Style Direct Farm-to-Consumer Platform
 * ==============================================================================
 */

import { fetchProduce, fetchOrders, placeOrder } from './api.js';
import { 
  getCurrentUser, 
  setCurrentUser, 
  formatINR, 
  showToast, 
  getCart, 
  saveCart, 
  updateCartBadges, 
  getDeliveryLocation, 
  setDeliveryLocation, 
  logout 
} from './app.js';

// State Variables
let produceCatalog = [];
let isBulkMode = false;
let currentCategory = 'All';
let maxPriceFilter = 250;
let searchQuery = '';
let organicOnlyFilter = false;
let stateFilter = 'All';
let minRatingFilter = 0;
let sortBy = 'featured';

// Card stepper local quantities (keyed by produceId)
const cardQuantities = {};

document.addEventListener('DOMContentLoaded', async () => {
  setupUserAndLocation();
  setupNavigation();
  setupSearchAndFilters();
  setupCartDrawer();
  setupProductModal();
  setupCheckoutModal();
  setupLocationModal();

  updateCartBadges();
  await loadMarketplaceProduce();
  await loadBuyerOrders();
});

/**
 * 1. USER & LOCATION MANAGEMENT
 */
function setupUserAndLocation() {
  const user = getCurrentUser();
  const loc = getDeliveryLocation();

  // Greeting & Location in topbar
  const greetingEl = document.getElementById('nav-user-greeting');
  const locEl = document.getElementById('nav-user-location');
  const accountNameEl = document.getElementById('nav-account-name');
  const accountLabelEl = document.getElementById('nav-account-label');

  if (greetingEl) greetingEl.textContent = `Deliver to ${user.name ? user.name.split(' ')[0] : 'You'}`;
  if (locEl) locEl.textContent = loc.formatted || `${loc.area}, ${loc.city} ${loc.pincode}`;
  if (accountNameEl) accountNameEl.textContent = user.name || 'Sign In';
  if (accountLabelEl) accountLabelEl.textContent = `Hello, ${user.role === 'farmer' ? 'Farmer' : 'Customer'}`;

  // Seller Central Button (Role-based state)
  const sellerBtnText = document.getElementById('nav-seller-btn-text');
  const sellerBtn = document.getElementById('nav-seller-btn');
  if (sellerBtnText && sellerBtn) {
    if (user.role === 'farmer') {
      sellerBtnText.textContent = '👨‍🌾 Seller Central (Active)';
      sellerBtn.style.background = '#1B5E20';
      sellerBtn.title = 'Open Farmer & FPO Seller Central Hub';
    } else {
      sellerBtnText.textContent = 'Sell on KisanConnect';
      sellerBtn.style.background = '#2E7D32';
      sellerBtn.title = 'Register as a Farmer or FPO Seller';
    }
  }

  // Account Menu Click (Quick Account Switcher / Logout)
  const accountBtn = document.getElementById('nav-account-btn');
  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      openAccountSwitcherModal();
    });
  }
}

function openAccountSwitcherModal() {
  const user = getCurrentUser();
  const modalHtml = `
    <div class="modal active" id="modal-account-switcher" style="display: flex;">
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Your Account & Role</h3>
          <button type="button" class="modal-close" id="close-account-modal">✕</button>
        </div>
        <div class="modal-body">
          <div style="background: #F4F3EF; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-size: 0.82rem; color: #666;">Signed in as:</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #111;">${user.name}</div>
            <div style="font-size: 0.85rem; color: #2E7D32; font-weight: 600; text-transform: capitalize;">Role: ${user.role} (${user.role === 'farmer' ? 'FPO Seller' : 'Direct Consumer'})</div>
          </div>

          <h5 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 10px;">Switch Session Role:</h5>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <button type="button" class="btn btn-outline" id="switch-to-farmer" style="text-align: left; justify-content: flex-start; gap: 10px;">
              <span>👨‍🌾</span>
              <div>
                <strong>Farmer / FPO Account</strong>
                <div style="font-size: 0.75rem; color: #666;">Ramesh Patil • Lasalgaon, Nashik</div>
              </div>
            </button>
            <button type="button" class="btn btn-outline" id="switch-to-buyer" style="text-align: left; justify-content: flex-start; gap: 10px;">
              <span>🛒</span>
              <div>
                <strong>Customer Account</strong>
                <div style="font-size: 0.75rem; color: #666;">Ananya Sharma • Baner, Pune</div>
              </div>
            </button>
          </div>

          <div style="display: flex; gap: 8px;">
            <a href="farmer-dashboard.html" class="btn btn-primary btn-sm" style="flex-grow: 1;">
              Go to Seller Central
            </a>
            <button type="button" class="btn btn-danger btn-sm" id="btn-modal-logout">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing if any
  document.getElementById('modal-account-switcher')?.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('modal-account-switcher');
  document.getElementById('close-account-modal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  document.getElementById('switch-to-farmer').onclick = () => {
    setCurrentUser({
      id: "farmer-1",
      name: "Ramesh Patil",
      email: "ramesh.patil@kisanconnect.in",
      role: "farmer",
      phone: "+91 98220 54321",
      location: "Lasalgaon, Nashik, Maharashtra",
      fpo: "Sahyadri Agro Farmers Co-op",
      farmSizeAcres: 8.5
    });
    showToast('Switched to Farmer Seller: Ramesh Patil!', 'success');
    modal.remove();
    setupUserAndLocation();
  };

  document.getElementById('switch-to-buyer').onclick = () => {
    setCurrentUser({
      id: "buyer-1",
      name: "Ananya Sharma",
      email: "ananya.sharma@gmail.com",
      role: "buyer",
      phone: "+91 98201 44521",
      city: "Pune, Maharashtra",
      address: "Flat 402, Green Meadows, Baner, Pune - 411045",
      pincode: "411045",
      buyerType: "Household & Community Buyer"
    });
    showToast('Switched to Customer: Ananya Sharma!', 'success');
    modal.remove();
    setupUserAndLocation();
  };

  document.getElementById('btn-modal-logout').onclick = () => {
    logout('index.html');
  };
}

/**
 * 2. TOPBAR & SUBNAV NAVIGATION
 */
function setupNavigation() {
  // Returns & Orders Tab toggle
  const ordersTabBtn = document.getElementById('nav-orders-tab-btn');
  const backToStoreBtn = document.getElementById('btn-back-to-store');
  const viewMarketplace = document.getElementById('view-marketplace');
  const viewOrders = document.getElementById('view-orders');

  if (ordersTabBtn && viewMarketplace && viewOrders) {
    ordersTabBtn.addEventListener('click', () => {
      viewMarketplace.style.display = 'none';
      viewOrders.style.display = 'block';
      loadBuyerOrders();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (backToStoreBtn && viewMarketplace && viewOrders) {
    backToStoreBtn.addEventListener('click', () => {
      viewOrders.style.display = 'none';
      viewMarketplace.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Home logo click returns to store view
  document.getElementById('logo-home-btn')?.addEventListener('click', (e) => {
    if (viewOrders && viewOrders.style.display === 'block') {
      e.preventDefault();
      viewOrders.style.display = 'none';
      viewMarketplace.style.display = 'block';
    }
  });

  // Hero CTAs
  document.getElementById('btn-hero-shop-deals')?.addEventListener('click', () => {
    document.querySelector('.products-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-hero-toggle-bulk')?.addEventListener('click', () => {
    toggleBulkMode(true);
    document.querySelector('.products-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Subnav Category Items
  const subnavItems = document.querySelectorAll('.amz-subnav-item[data-category]');
  subnavItems.forEach(item => {
    item.addEventListener('click', () => {
      const cat = item.getAttribute('data-category');
      subnavItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      setCategoryFilter(cat);
    });
  });

  // Category Circle Chips
  const catItems = document.querySelectorAll('.amz-cat-item');
  catItems.forEach(item => {
    item.addEventListener('click', () => {
      const cat = item.getAttribute('data-category');
      catItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      setCategoryFilter(cat);
    });
  });

  // Deals of the day subnav trigger
  document.getElementById('subnav-deals-btn')?.addEventListener('click', () => {
    setCategoryFilter('All');
    document.getElementById('sort-select').value = 'price-asc';
    sortBy = 'price-asc';
    loadMarketplaceProduce();
    showToast('⚡ Showing Deals of the Day with largest Mandi price drops!', 'info');
  });

  // Bulk Wholesale toggle in subnav & banner
  const subnavBulkBtn = document.getElementById('subnav-bulk-toggle-btn');
  const bulkCheckbox = document.getElementById('bulk-mode-checkbox');

  if (subnavBulkBtn) {
    subnavBulkBtn.addEventListener('click', () => {
      toggleBulkMode(!isBulkMode);
    });
  }

  if (bulkCheckbox) {
    bulkCheckbox.addEventListener('change', () => {
      toggleBulkMode(bulkCheckbox.checked);
    });
  }

  // Footer category links
  document.querySelectorAll('.footer-cat-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.getAttribute('data-category');
      setCategoryFilter(cat);
      window.scrollTo({ top: 500, behavior: 'smooth' });
    });
  });
}

function toggleBulkMode(enable) {
  isBulkMode = enable;
  const bulkCheckbox = document.getElementById('bulk-mode-checkbox');
  const statusText = document.getElementById('bulk-mode-status-text');
  const banner = document.getElementById('bulk-mode-banner');

  if (bulkCheckbox) bulkCheckbox.checked = isBulkMode;
  if (statusText) statusText.textContent = isBulkMode ? 'Wholesale ON' : 'Wholesale OFF';
  if (banner) {
    banner.style.background = isBulkMode ? '#E8F5E9' : '#FFF8E7';
    banner.style.borderColor = isBulkMode ? '#81C784' : '#FFE082';
  }

  if (isBulkMode) {
    showToast('📦 Wholesale Bulk Mode Activated: Volume tier discounts (8%-22%) applied for 10kg+ orders!', 'success');
  } else {
    showToast('Standard household retail mode active.', 'info');
  }

  loadMarketplaceProduce();
}

function setCategoryFilter(category) {
  currentCategory = category;
  const select = document.getElementById('search-category-select');
  if (select) select.value = category === 'All' ? 'All' : category;

  // Sync category active classes
  document.querySelectorAll('.amz-cat-item').forEach(c => {
    if (c.getAttribute('data-category') === category) c.classList.add('active');
    else c.classList.remove('active');
  });

  document.querySelectorAll('.amz-subnav-item[data-category]').forEach(s => {
    if (s.getAttribute('data-category') === category) s.classList.add('active');
    else s.classList.remove('active');
  });

  loadMarketplaceProduce();
}

/**
 * 3. SEARCH & FILTERS
 */
function setupSearchAndFilters() {
  const searchInput = document.getElementById('global-search-input');
  const searchCatSelect = document.getElementById('search-category-select');
  const searchBtn = document.getElementById('btn-search-trigger');

  const executeSearch = () => {
    if (searchInput) searchQuery = searchInput.value.trim();
    if (searchCatSelect) currentCategory = searchCatSelect.value;
    loadMarketplaceProduce();
  };

  if (searchBtn) searchBtn.addEventListener('click', executeSearch);
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(executeSearch, 250);
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') executeSearch();
    });
  }

  if (searchCatSelect) {
    searchCatSelect.addEventListener('change', () => {
      currentCategory = searchCatSelect.value;
      loadMarketplaceProduce();
    });
  }

  // Price Slider
  const priceSlider = document.getElementById('price-range-slider');
  const priceValText = document.getElementById('price-slider-val');
  if (priceSlider && priceValText) {
    priceSlider.addEventListener('input', (e) => {
      maxPriceFilter = Number(e.target.value);
      priceValText.textContent = `₹${maxPriceFilter}/kg`;
      loadMarketplaceProduce();
    });
  }

  // Organic Checkbox
  const organicCheck = document.getElementById('filter-organic');
  if (organicCheck) {
    organicCheck.addEventListener('change', (e) => {
      organicOnlyFilter = e.target.checked;
      loadMarketplaceProduce();
    });
  }

  // State Filter
  const stateSelect = document.getElementById('filter-state');
  if (stateSelect) {
    stateSelect.addEventListener('change', (e) => {
      stateFilter = e.target.value;
      loadMarketplaceProduce();
    });
  }

  // Rating Filter
  const ratingRadios = document.querySelectorAll('input[name="filter-rating"]');
  ratingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      minRatingFilter = Number(e.target.value);
      loadMarketplaceProduce();
    });
  });

  // Sort Select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      loadMarketplaceProduce();
    });
  }

  // Reset Filters Button
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    currentCategory = 'All';
    searchQuery = '';
    maxPriceFilter = 250;
    organicOnlyFilter = false;
    stateFilter = 'All';
    minRatingFilter = 0;
    sortBy = 'featured';

    if (searchInput) searchInput.value = '';
    if (searchCatSelect) searchCatSelect.value = 'All';
    if (priceSlider) priceSlider.value = 250;
    if (priceValText) priceValText.textContent = '₹250/kg';
    if (organicCheck) organicCheck.checked = false;
    if (stateSelect) stateSelect.value = 'All';
    if (sortSelect) sortSelect.value = 'featured';

    const defaultRatingRadio = document.querySelector('input[name="filter-rating"][value="0"]');
    if (defaultRatingRadio) defaultRatingRadio.checked = true;

    document.querySelectorAll('.amz-cat-item').forEach(c => c.classList.remove('active'));
    document.querySelector('.amz-cat-item[data-category="All"]')?.classList.add('active');

    loadMarketplaceProduce();
    showToast('Filters cleared to default catalog.', 'info');
  });
}

/**
 * 4. LOAD & RENDER PRODUCE CATALOG
 */
async function loadMarketplaceProduce() {
  const container = document.getElementById('products-container');
  const countText = document.getElementById('catalog-count-text');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #666;">
      <div style="font-size: 2rem; margin-bottom: 8px;">🌾</div>
      Fetching farm-fresh lots from verified growers...
    </div>
  `;

  try {
    const filters = {
      category: currentCategory,
      search: searchQuery,
      maxPrice: maxPriceFilter,
      organicOnly: organicOnlyFilter,
      state: stateFilter === 'All' ? '' : stateFilter
    };

    let items = await fetchProduce(filters);

    // Apply client rating filter
    if (minRatingFilter > 0) {
      items = items.filter(p => (p.rating || 5) >= minRatingFilter);
    }

    // Apply sorting
    if (sortBy === 'price-asc') {
      items.sort((a, b) => a.pricePerKg - b.pricePerKg);
    } else if (sortBy === 'price-desc') {
      items.sort((a, b) => b.pricePerKg - a.pricePerKg);
    } else if (sortBy === 'rating') {
      items.sort((a, b) => (b.rating || 5) - (a.rating || 5));
    }

    produceCatalog = items;

    if (countText) {
      countText.textContent = `${items.length} Fresh Farm Lots Available for Direct Dispatch`;
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #FFF; border-radius: 12px; border: 1px dashed var(--border);">
          <div style="font-size: 2.4rem; margin-bottom: 12px;">🧺</div>
          <h4 style="font-size: 1.15rem; font-weight: 700;">No Farm Produce Found</h4>
          <p style="color: #666; font-size: 0.9rem; max-width: 420px; margin: 6px auto 16px;">
            We couldn't find matches for "${searchQuery || currentCategory}". Try broadening your price range or clearing search terms.
          </p>
          <button class="btn btn-primary btn-sm" id="btn-empty-reset">View All Produce</button>
        </div>
      `;
      document.getElementById('btn-empty-reset')?.addEventListener('click', () => {
        document.getElementById('btn-reset-filters')?.click();
      });
      return;
    }

    // Render Amazon/Flipkart Product Cards
    container.innerHTML = items.map(product => {
      const currentQty = cardQuantities[product.id] || (isBulkMode ? 10 : 1);
      const discount = Math.round(((product.mandiPricePerKg - product.pricePerKg) / product.mandiPricePerKg) * 100);

      // Determine price based on bulk mode
      let effectivePrice = product.pricePerKg;
      let bulkSavingsNotice = '';

      if (isBulkMode && product.bulkTiers && product.bulkTiers.length > 0) {
        const tier = product.bulkTiers[0];
        effectivePrice = tier.pricePerKg;
        bulkSavingsNotice = `<div style="font-size: 0.72rem; color: #2E7D32; font-weight: 700;">Bulk Tier: ₹${tier.pricePerKg}/kg (${tier.discountPct}% off for ${tier.minQty}kg+)</div>`;
      }

      return `
        <div class="amz-product-card" id="card-${product.id}">
          <div class="amz-card-img-wrap" onclick="window.openProductModal('${product.id}')">
            <img src="${product.imageUrl}" alt="${product.name}" class="amz-card-img" loading="lazy" />
            ${discount > 20 ? `<span class="amz-card-badge-deal">Deal of Day</span>` : ''}
            ${product.isOrganic ? `<span class="amz-card-badge-organic">🌱 Organic</span>` : ''}
          </div>

          <div class="amz-product-farmer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span>Direct from ${product.farmerName} (${product.location.split(',')[0]})</span>
          </div>

          <h3 class="amz-product-title" onclick="window.openProductModal('${product.id}')">
            ${product.name}
          </h3>

          <div class="amz-product-rating">
            <span class="amz-stars">★★★★☆</span>
            <span style="font-weight: 700; color: #111;">${product.rating || 4.8}</span>
            <span class="amz-review-count">(${product.reviewsCount || 42})</span>
          </div>

          <div class="amz-price-box">
            <span class="amz-current-price">${formatINR(effectivePrice)}<small style="font-size: 0.8rem; font-weight: 500; color: #555;">/kg</small></span>
            <span class="amz-mrp-price">M.R.P: ${formatINR(product.mandiPricePerKg)}</span>
            <span class="amz-discount-pct">(${discount}% off)</span>
          </div>

          ${bulkSavingsNotice}

          <div class="amz-harvest-tag">
            🚜 Plucked: ${product.harvestDate || 'Yesterday'} • ${product.quantityAvailable}kg left
          </div>

          <div class="amz-card-actions">
            <div class="amz-qty-stepper">
              <button type="button" class="amz-qty-btn" onclick="window.updateCardQty('${product.id}', -1)">-</button>
              <span class="amz-qty-val" id="qty-display-${product.id}">${currentQty} kg</span>
              <button type="button" class="amz-qty-btn" onclick="window.updateCardQty('${product.id}', 1)">+</button>
            </div>

            <button type="button" class="btn-add-cart" onclick="window.handleAddToCart('${product.id}')">
              Add to Cart
            </button>
            <button type="button" class="btn-buy-now" onclick="window.handleBuyNow('${product.id}')">
              Buy Now
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading produce:', err);
    container.innerHTML = `<div style="grid-column: 1/-1; color: red; text-align: center; padding: 30px;">Failed to load farm produce. Please refresh.</div>`;
  }
}

// Global window helpers for in-card interactions
window.updateCardQty = function(productId, delta) {
  const current = cardQuantities[productId] || (isBulkMode ? 10 : 1);
  const minQty = isBulkMode ? 5 : 1;
  const next = Math.max(minQty, current + delta);
  cardQuantities[productId] = next;

  const display = document.getElementById(`qty-display-${productId}`);
  if (display) display.textContent = `${next} kg`;
};

window.handleAddToCart = function(productId) {
  const product = produceCatalog.find(p => p.id === productId);
  if (!product) return;

  const qty = cardQuantities[productId] || (isBulkMode ? 10 : 1);

  // Check bulk discount
  let price = product.pricePerKg;
  if (product.bulkTiers) {
    for (const tier of product.bulkTiers) {
      if (qty >= tier.minQty) {
        price = tier.pricePerKg;
      }
    }
  }

  const cart = getCart();
  const existing = cart.find(i => i.produceId === productId);

  if (existing) {
    existing.qtyKg += qty;
    existing.subtotal = existing.qtyKg * existing.pricePerKg;
  } else {
    cart.push({
      produceId: product.id,
      name: product.name,
      farmerId: product.farmerId,
      farmerName: product.farmerName,
      location: product.location,
      pricePerKg: price,
      mandiPricePerKg: product.mandiPricePerKg,
      qtyKg: qty,
      subtotal: qty * price,
      imageUrl: product.imageUrl
    });
  }

  saveCart(cart);
  updateCartBadges();
  showToast(`Added ${qty} kg ${product.name} to Cart!`, 'success');
  
  if (typeof window.openCart === 'function') {
    window.openCart();
  } else {
    renderCartDrawerItems();
  }
};

window.handleBuyNow = function(productId) {
  const product = produceCatalog.find(p => p.id === productId);
  if (!product) return;

  const qty = cardQuantities[productId] || (isBulkMode ? 10 : 1);
  let price = product.pricePerKg;
  if (product.bulkTiers) {
    for (const tier of product.bulkTiers) {
      if (qty >= tier.minQty) price = tier.pricePerKg;
    }
  }

  const cart = getCart();
  const existing = cart.find(i => i.produceId === productId);
  if (existing) {
    existing.qtyKg += qty;
    existing.subtotal = existing.qtyKg * existing.pricePerKg;
  } else {
    cart.push({
      produceId: product.id,
      name: product.name,
      farmerId: product.farmerId,
      farmerName: product.farmerName,
      location: product.location,
      pricePerKg: price,
      mandiPricePerKg: product.mandiPricePerKg,
      qtyKg: qty,
      subtotal: qty * price,
      imageUrl: product.imageUrl
    });
  }
  saveCart(cart);
  updateCartBadges();
  openCheckoutModal();
};

window.openProductModal = function(productId) {
  const product = produceCatalog.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('modal-product-details');
  const modalBody = document.getElementById('modal-prod-body');
  const modalTitle = document.getElementById('modal-prod-title');

  if (modalTitle) modalTitle.textContent = `${product.name} (${product.variety || 'Grade A'})`;

  let tiersHtml = '';
  if (product.bulkTiers && product.bulkTiers.length > 0) {
    tiersHtml = `
      <div style="margin: 16px 0; background: #FFF8E7; border: 1px solid #FFE082; padding: 12px; border-radius: 8px;">
        <h5 style="font-size: 0.88rem; font-weight: 700; color: #795548; margin-bottom: 6px;">📦 Wholesale Volume Tiers (Restaurants / Societies):</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem;">
          ${product.bulkTiers.map(t => `
            <div style="background: #FFF; padding: 6px 10px; border-radius: 4px; border: 1px solid #DDD;">
              <strong>${t.minQty}kg+:</strong> ₹${t.pricePerKg}/kg <span style="color: #2E7D32;">(${t.discountPct}% OFF)</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      <img src="${product.imageUrl}" alt="${product.name}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 8px;" />
      <div>
        <div style="font-size: 0.85rem; color: #2E7D32; font-weight: 700; margin-bottom: 4px;">🌿 ${product.fpoName || 'Sahyadri Agro FPO'}</div>
        <h4 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 8px;">${product.name}</h4>
        <div class="amz-product-rating" style="margin-bottom: 12px;">
          <span class="amz-stars">★★★★★</span>
          <span style="font-weight: 700;">${product.rating || 4.8} / 5.0</span>
          <span class="amz-review-count">(${product.reviewsCount || 42} reviews)</span>
        </div>
        <div style="font-size: 1.4rem; font-weight: 800; color: #111; margin-bottom: 6px;">
          ${formatINR(product.pricePerKg)}/kg
          <span style="font-size: 0.85rem; text-decoration: line-through; color: #777;">MRP: ${formatINR(product.mandiPricePerKg)}</span>
        </div>
        <div style="font-size: 0.82rem; color: #555;">
          📍 Farm Gate: ${product.location}<br>
          🌱 Harvest Date: ${product.harvestDate}<br>
          📦 In Stock: ${product.quantityAvailable} kg available
        </div>
      </div>
    </div>

    <p style="font-size: 0.9rem; color: #444; line-height: 1.5; margin-bottom: 16px;">
      ${product.description || 'Direct farm harvested crop cultivated under standard GAP (Good Agricultural Practices). Graded and packed in ventilated crates for farm freshness.'}
    </p>

    ${tiersHtml}

    <div style="display: flex; gap: 12px; margin-top: 16px;">
      <button class="btn btn-primary" style="flex-grow: 1;" onclick="window.handleAddToCart('${product.id}'); document.getElementById('modal-product-details').classList.remove('active');">
        Add to Shopping Cart
      </button>
      <button class="btn btn-accent" style="flex-grow: 1;" onclick="window.handleBuyNow('${product.id}'); document.getElementById('modal-product-details').classList.remove('active');">
        Instant Checkout
      </button>
    </div>
  `;

  modal.classList.add('active');
  modal.style.display = 'flex';
};

/**
 * 5. CART DRAWER CONTROLS
 */
function setupCartDrawer() {
  const navCartBtn = document.getElementById('nav-cart-btn');
  const cartDrawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  const closeBtn = document.getElementById('btn-close-cart');
  const checkoutBtn = document.getElementById('btn-proceed-checkout');

  const openCart = () => {
    renderCartDrawerItems();
    if (cartDrawer) cartDrawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeCart = () => {
    if (cartDrawer) cartDrawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.openCart = openCart;
  window.closeCart = closeCart;

  if (navCartBtn) {
    navCartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeCart();
    });
  }
  if (overlay) {
    overlay.addEventListener('click', closeCart);
  }

  // Keyboard shortcut to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartDrawer?.classList.contains('active')) {
      closeCart();
    }
  });

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = getCart();
      if (cart.length === 0) {
        showToast('Your cart is empty. Add farm produce first!', 'info');
        return;
      }
      closeCart();
      openCheckoutModal();
    });
  }
}

function renderCartDrawerItems() {
  const container = document.getElementById('cart-items-list');
  const subtotalValEl = document.getElementById('cart-subtotal-val');
  const deliveryValEl = document.getElementById('cart-delivery-val');
  const savingsValEl = document.getElementById('cart-savings-val');
  const totalValEl = document.getElementById('cart-total-val');
  const freeProgress = document.getElementById('cart-free-delivery-progress');
  const freeBadge = document.getElementById('cart-free-delivery-badge');
  const countPill = document.getElementById('cart-drawer-count-pill');

  const cart = getCart();

  if (!container) return;

  if (cart.length === 0) {
    if (countPill) countPill.textContent = '0 items';
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; color: #777;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🧺</div>
        <h4 style="font-size: 1.15rem; font-weight: 700; color: #222;">Your Shopping Cart is Empty</h4>
        <p style="font-size: 0.88rem; margin-top: 6px; color: #666; line-height: 1.5;">
          You haven't added any fresh harvest items yet. Support local farmers directly at fair prices!
        </p>
        <button type="button" class="btn btn-primary" style="margin-top: 20px; border-radius: 20px; padding: 10px 24px;" onclick="window.closeCart(); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });">
          Explore Fresh Produce
        </button>
      </div>
    `;
    if (subtotalValEl) subtotalValEl.textContent = '₹0';
    if (deliveryValEl) deliveryValEl.textContent = '₹0';
    if (savingsValEl) savingsValEl.textContent = '₹0';
    if (totalValEl) totalValEl.textContent = '₹0';
    if (freeProgress) freeProgress.style.width = '0%';
    if (freeBadge) {
      freeBadge.textContent = 'FREE over ₹300';
      freeBadge.style.color = '#2E7D32';
    }
    return;
  }

  const subtotal = cart.reduce((sum, i) => sum + (Number(i.pricePerKg) * Number(i.qtyKg)), 0);
  const mandiTotal = cart.reduce((sum, i) => sum + ((Number(i.mandiPricePerKg) || (Number(i.pricePerKg) * 1.3)) * Number(i.qtyKg)), 0);
  const savings = Math.max(0, Math.round(mandiTotal - subtotal));
  const deliveryFee = subtotal >= 300 ? 0 : 30;
  const total = subtotal + deliveryFee;
  const totalKg = cart.reduce((sum, i) => sum + Number(i.qtyKg || 1), 0);

  if (countPill) {
    countPill.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''} (${totalKg} kg)`;
  }

  // Free delivery bar
  if (freeProgress) {
    const pct = Math.min(100, Math.round((subtotal / 300) * 100));
    freeProgress.style.width = `${pct}%`;
  }
  if (freeBadge) {
    if (subtotal >= 300) {
      freeBadge.textContent = '🎉 You unlocked FREE Delivery!';
      freeBadge.style.color = '#1B5E20';
    } else {
      freeBadge.textContent = `Add ${formatINR(300 - subtotal)} more for FREE Delivery`;
      freeBadge.style.color = '#2E7D32';
    }
  }

  if (subtotalValEl) subtotalValEl.textContent = formatINR(subtotal);
  if (deliveryValEl) deliveryValEl.textContent = deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee);
  if (savingsValEl) savingsValEl.textContent = `- ${formatINR(savings)}`;
  if (totalValEl) totalValEl.textContent = formatINR(total);

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600'}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <div class="cart-item-farmer">Sold by: ${item.farmerName || 'Direct Grower'}</div>
        <div class="cart-item-price">${formatINR(item.pricePerKg * item.qtyKg)} <small style="font-weight: 400; color: #666;">(${formatINR(item.pricePerKg)}/kg)</small></div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
          <div class="amz-qty-stepper" style="height: 28px;">
            <button type="button" class="amz-qty-btn" style="width: 26px;" onclick="window.updateCartItemQty(${idx}, -1)" title="Decrease Quantity">-</button>
            <span class="amz-qty-val" style="min-width: 36px; font-size: 0.8rem; line-height: 28px;">${item.qtyKg} kg</span>
            <button type="button" class="amz-qty-btn" style="width: 26px;" onclick="window.updateCartItemQty(${idx}, 1)" title="Increase Quantity">+</button>
          </div>
          <button type="button" onclick="window.removeCartItem(${idx})" style="background: none; border: none; color: #D32F2F; font-size: 0.8rem; cursor: pointer; text-decoration: underline; padding: 4px;">
            Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.updateCartItemQty = function(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;

  const next = cart[index].qtyKg + delta;
  if (next <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].qtyKg = next;
    cart[index].subtotal = next * cart[index].pricePerKg;
  }
  saveCart(cart);
  renderCartDrawerItems();
};

window.removeCartItem = function(index) {
  const cart = getCart();
  if (cart[index]) {
    cart.splice(index, 1);
    saveCart(cart);
    renderCartDrawerItems();
  }
};

/**
 * 6. CHECKOUT MODAL & FLOW
 */
function setupCheckoutModal() {
  const modal = document.getElementById('modal-checkout');
  const closeBtn = document.getElementById('btn-close-checkout-modal');
  const form = document.getElementById('form-checkout');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      modal.style.display = 'none';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cart = getCart();
      if (cart.length === 0) return;

      const subtotal = cart.reduce((sum, i) => sum + (i.pricePerKg * i.qtyKg), 0);
      const deliveryFee = subtotal >= 300 ? 0 : 30;
      const total = subtotal + deliveryFee;

      const user = getCurrentUser();
      const name = document.getElementById('checkout-name').value.trim();
      const phone = document.getElementById('checkout-phone').value.trim();
      const address = document.getElementById('checkout-address').value.trim();

      const submitBtn = document.getElementById('btn-confirm-order');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Cold-Chain Booking...';

      try {
        const orderPayload = {
          buyerId: user.id || 'buyer-1',
          buyerName: name,
          buyerPhone: phone,
          deliveryCity: 'Pune, Maharashtra',
          deliveryAddress: address,
          farmerId: cart[0].farmerId || 'farmer-1',
          farmerName: cart[0].farmerName || 'Ramesh Patil',
          items: cart,
          subtotal,
          deliveryFee,
          total
        };

        const newOrder = await placeOrder(orderPayload);
        saveCart([]); // empty cart

        modal.classList.remove('active');
        modal.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Farm-Direct Order';

        showToast(`🎉 Order ${newOrder.id} Placed! Dispatch scheduled with KisanLogistics.`, 'success');

        // Switch directly to Orders tab to show live package tracker
        document.getElementById('view-marketplace').style.display = 'none';
        document.getElementById('view-orders').style.display = 'block';
        await loadBuyerOrders();
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (err) {
        console.error('Checkout error:', err);
        showToast('Error placing order. Please try again.', 'danger');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Farm-Direct Order';
      }
    });
  }
}

function openCheckoutModal() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Add items to cart before proceeding to checkout.', 'info');
    return;
  }

  const subtotal = cart.reduce((sum, i) => sum + (i.pricePerKg * i.qtyKg), 0);
  const deliveryFee = subtotal >= 300 ? 0 : 30;
  const total = subtotal + deliveryFee;

  document.getElementById('modal-checkout-subtotal').textContent = formatINR(subtotal);
  document.getElementById('modal-checkout-delivery').textContent = deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee);
  document.getElementById('modal-checkout-total').textContent = formatINR(total);

  const user = getCurrentUser();
  if (user.name) document.getElementById('checkout-name').value = user.name;
  if (user.phone) document.getElementById('checkout-phone').value = user.phone;
  if (user.address) document.getElementById('checkout-address').value = user.address;

  const modal = document.getElementById('modal-checkout');
  modal.classList.add('active');
  modal.style.display = 'flex';
}

/**
 * 7. LOCATION MODAL CONTROLS
 */
function setupLocationModal() {
  const modal = document.getElementById('modal-location');
  const trigger = document.getElementById('nav-location-btn');
  const closeBtn = document.getElementById('btn-close-location-modal');
  const customInput = document.getElementById('input-custom-pin');
  const applyBtn = document.getElementById('btn-apply-pin');

  const openLoc = () => {
    modal.classList.add('active');
    modal.style.display = 'flex';
  };

  const closeLoc = () => {
    modal.classList.remove('active');
    modal.style.display = 'none';
  };

  if (trigger) trigger.addEventListener('click', openLoc);
  if (closeBtn) closeBtn.addEventListener('click', closeLoc);

  // Popular Chips
  document.querySelectorAll('.location-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.location-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const loc = {
        city: chip.getAttribute('data-city'),
        area: chip.getAttribute('data-area'),
        pincode: chip.getAttribute('data-pin'),
        formatted: `${chip.getAttribute('data-area')}, ${chip.getAttribute('data-city')} ${chip.getAttribute('data-pin')}`
      };
      setDeliveryLocation(loc);
      setupUserAndLocation();
      closeLoc();
      showToast(`Delivery location set to ${loc.formatted}!`, 'success');
    });
  });

  if (applyBtn && customInput) {
    applyBtn.addEventListener('click', () => {
      const pin = customInput.value.trim();
      if (pin.length !== 6 || isNaN(pin)) {
        showToast('Please enter a valid 6-digit Indian Pincode.', 'danger');
        return;
      }
      const loc = {
        city: 'Delivery Hub',
        area: `PIN ${pin}`,
        pincode: pin,
        formatted: `Area Pincode ${pin}`
      };
      setDeliveryLocation(loc);
      setupUserAndLocation();
      closeLoc();
      showToast(`Delivery address updated to Pincode ${pin}!`, 'success');
    });
  }
}

/**
 * 8. BUYER ORDERS & LIVE LOGISTICS TRACKER
 */
async function loadBuyerOrders() {
  const container = document.getElementById('buyer-orders-container');
  if (!container) return;

  container.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">Loading your farm dispatches...</div>`;

  try {
    const user = getCurrentUser();
    const orders = await fetchOrders('buyer', user.id || 'buyer-1');

    if (orders.length === 0) {
      container.innerHTML = `
        <div style="background: #FFF; padding: 48px 24px; border-radius: 12px; text-align: center; border: 1px solid var(--border);">
          <div style="font-size: 2.8rem; margin-bottom: 12px;">📦</div>
          <h4 style="font-size: 1.2rem; font-weight: 700;">No Orders Placed Yet</h4>
          <p style="color: #666; font-size: 0.9rem; margin-top: 6px; margin-bottom: 16px;">
            Order fresh produce directly from farmers to see your live cold-chain truck delivery status here.
          </p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-back-to-store').click();">
            Start Shopping Fresh Produce
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      const statusClass = {
        'Pending': 'badge-warning',
        'Packed': 'badge-info',
        'In Transit': 'badge-primary',
        'Delivered': 'badge-success'
      }[order.status] || 'badge-info';

      // 4-step progress stepper
      const steps = ['Pending', 'Packed', 'In Transit', 'Delivered'];
      const currentIndex = steps.indexOf(order.status);

      return `
        <div class="order-card" style="background: #FFF; border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #EEE; padding-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #111;">Order #${order.id}</div>
              <div style="font-size: 0.8rem; color: #666;">Placed on: ${order.date} • Farm: ${order.farmerName || 'Ramesh Patil (Nashik)'}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${statusClass}" style="font-size: 0.85rem; padding: 4px 12px;">${order.status}</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: #2E7D32; margin-top: 4px;">${formatINR(order.total)}</div>
            </div>
          </div>

          <!-- 4-step Visual Stepper -->
          <div class="stepper" style="display: flex; justify-content: space-between; position: relative; margin: 24px 0 28px;">
            ${steps.map((st, i) => {
              const isCompleted = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return `
                <div style="text-align: center; flex: 1; position: relative; z-index: 1;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; background: ${isCompleted ? '#2E7D32' : '#E0E0E0'}; color: ${isCompleted ? '#FFF' : '#777'}; box-shadow: ${isCurrent ? '0 0 0 4px #C8E6C9' : 'none'};">
                    ${isCompleted ? '✓' : (i + 1)}
                  </div>
                  <div style="font-size: 0.75rem; font-weight: ${isCompleted ? '700' : '500'}; color: ${isCompleted ? '#111' : '#888'};">
                    ${st}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Items list in order -->
          <div style="background: #F9F9F9; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 0.88rem;">
            <strong>Consignment Items:</strong>
            <ul style="margin: 6px 0 0 18px;">
              ${order.items.map(item => `
                <li>${item.name} — ${item.qtyKg}kg @ ${formatINR(item.pricePerKg)}/kg (${formatINR(item.subtotal || item.pricePerKg * item.qtyKg)})</li>
              `).join('')}
            </ul>
          </div>

          <!-- Live Logistics Details Box -->
          ${order.logistics ? `
            <div style="background: #F1F8E9; border: 1px solid #C8E6C9; border-radius: 8px; padding: 14px 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 0.82rem;">
              <div>
                <span style="color: #666; display: block;">Tracking AWB:</span>
                <strong style="color: #1B5E20;">${order.logistics.trackingId || 'KL-IN-8921'}</strong>
              </div>
              <div>
                <span style="color: #666; display: block;">Carrier Fleet:</span>
                <strong>${order.logistics.carrier || 'KisanLogistics Cold-Chain'}</strong>
              </div>
              <div>
                <span style="color: #666; display: block;">Assigned Vehicle:</span>
                <strong>${order.logistics.vehicleNumber || 'MH-15-EV-4291'}</strong>
              </div>
              <div>
                <span style="color: #666; display: block;">Driver Contact:</span>
                <strong>${order.logistics.driverName || 'Sanjay Shinde'}</strong>
              </div>
              <div>
                <span style="color: #666; display: block;">Estimated Doorstep:</span>
                <strong style="color: #E65100;">${order.logistics.estimatedDelivery || 'Today afternoon'}</strong>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading buyer orders:', err);
    container.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">Failed to load order history.</div>`;
  }
}

function setupProductModal() {
  const modal = document.getElementById('modal-product-details');
  const closeBtn = document.getElementById('btn-close-product-modal');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      modal.style.display = 'none';
    });
  }
}
