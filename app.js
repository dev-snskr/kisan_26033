/**
 * ==============================================================================
 * KisanConnect - Shared Application Controller & Utilities
 * ==============================================================================
 */

// User Session Management
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('kisan_auth_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading auth user:', e);
  }
  // Default fallback user for convenient exploration
  return {
    id: "farmer-1",
    name: "Ramesh Patil",
    email: "ramesh.patil@kisanconnect.in",
    role: "farmer",
    location: "Lasalgaon, Nashik, Maharashtra",
    fpo: "Sahyadri Agro Farmers Co-op"
  };
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem('kisan_auth_user', JSON.stringify(user));
  } catch (e) {
    console.error('Error writing auth user:', e);
  }
}

export function logout() {
  localStorage.removeItem('kisan_auth_user');
  window.location.href = 'login.html';
}

// Format Indian Rupee currency (e.g. ₹1,48,500)
export function formatINR(amount) {
  if (isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Toast Notification System
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`;
  if (type === 'danger') {
    iconSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Cart LocalStorage Management for Buyer Flow
export function getCart() {
  try {
    const raw = localStorage.getItem('kisan_cart');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCart(cartItems) {
  try {
    localStorage.setItem('kisan_cart', JSON.stringify(cartItems));
    updateCartBadges();
  } catch (e) {
    console.error('Error saving cart:', e);
  }
}

export function updateCartBadges() {
  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + Number(item.qtyKg || 1), 0);
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => {
    b.textContent = totalCount;
    b.style.display = totalCount > 0 ? 'flex' : 'none';
  });
}

// Quick Demo Switcher Bar injected at the top of every screen
export function renderDemoBar(activePage = '') {
  const existing = document.getElementById('demo-quick-bar');
  if (existing) return;

  const bar = document.createElement('div');
  bar.id = 'demo-quick-bar';
  bar.className = 'demo-bar';

  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span class="demo-bar-badge">SIH26033 Prototype</span>
      <span style="opacity: 0.9;">KisanConnect: Farm to Consumer Marketplace</span>
    </div>
    <div class="demo-bar-links">
      <span style="font-size: 0.78rem; opacity: 0.8; margin-right: 4px;">Quick Role Jump:</span>
      <a href="index.html" class="demo-bar-btn ${activePage === 'landing' ? 'active' : ''}">
        🌿 Landing Page
      </a>
      <a href="farmer-dashboard.html" class="demo-bar-btn ${activePage === 'farmer' ? 'active' : ''}" id="demo-switch-farmer">
        👨‍🌾 Farmer Dashboard
      </a>
      <a href="buyer-dashboard.html" class="demo-bar-btn ${activePage === 'buyer' ? 'active' : ''}" id="demo-switch-buyer">
        🛒 Buyer Marketplace
      </a>
      <a href="login.html" class="demo-bar-btn ${activePage === 'login' ? 'active' : ''}">
        🔑 Auth / Roles
      </a>
    </div>
  `;

  document.body.insertBefore(bar, document.body.firstChild);

  // Hook 1-click switch handlers
  const farmerBtn = document.getElementById('demo-switch-farmer');
  if (farmerBtn) {
    farmerBtn.addEventListener('click', () => {
      setCurrentUser({
        id: "farmer-1",
        name: "Ramesh Patil",
        email: "ramesh.patil@kisanconnect.in",
        role: "farmer",
        location: "Lasalgaon, Nashik, Maharashtra",
        fpo: "Sahyadri Agro Farmers Co-op"
      });
    });
  }

  const buyerBtn = document.getElementById('demo-switch-buyer');
  if (buyerBtn) {
    buyerBtn.addEventListener('click', () => {
      setCurrentUser({
        id: "buyer-1",
        name: "Ananya Sharma",
        email: "ananya.sharma@gmail.com",
        role: "buyer",
        city: "Pune, Maharashtra",
        address: "Flat 402, Green Meadows, Baner, Pune - 411045",
        buyerType: "Consumer & Bulk Group"
      });
    });
  }
}
