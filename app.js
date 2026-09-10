/**
 * ==============================================================================
 * KisanConnect - Shared Application Controller & Utilities
 * Modern E-Commerce Platform (Amazon / Flipkart Style)
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
  // Default customer session (can also be switched to farmer anytime)
  const defaultCustomer = {
    id: "buyer-1",
    name: "Ananya Sharma",
    email: "ananya.sharma@gmail.com",
    role: "buyer",
    phone: "+91 98201 44521",
    city: "Pune, Maharashtra",
    address: "Flat 402, Green Meadows, Baner, Pune - 411045",
    pincode: "411045",
    buyerType: "Household & Community Buyer"
  };
  localStorage.setItem('kisan_auth_user', JSON.stringify(defaultCustomer));
  return defaultCustomer;
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem('kisan_auth_user', JSON.stringify(user));
  } catch (e) {
    console.error('Error writing auth user:', e);
  }
}

export function isFarmer() {
  const user = getCurrentUser();
  return user && user.role === 'farmer';
}

export function isBuyer() {
  const user = getCurrentUser();
  return user && user.role === 'buyer';
}

export function logout(redirect = 'index.html') {
  localStorage.removeItem('kisan_auth_user');
  window.location.href = redirect;
}

// Delivery Location Management (Amazon/Flipkart "Deliver to..." feature)
export function getDeliveryLocation() {
  try {
    const raw = localStorage.getItem('kisan_delivery_location');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading location:', e);
  }
  return {
    city: "Pune",
    area: "Baner",
    pincode: "411045",
    formatted: "Baner, Pune 411045"
  };
}

export function setDeliveryLocation(loc) {
  try {
    localStorage.setItem('kisan_delivery_location', JSON.stringify(loc));
  } catch (e) {
    console.error('Error writing location:', e);
  }
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
  } else if (type === 'info') {
    iconSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
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

  const cartSubtotalEl = document.getElementById('nav-cart-subtotal');
  if (cartSubtotalEl) {
    const subtotal = cart.reduce((sum, item) => sum + (item.pricePerKg * (item.qtyKg || 1)), 0);
    cartSubtotalEl.textContent = formatINR(subtotal);
  }
}

// Backward compatibility stub for renderDemoBar so any leftover call doesn't throw
export function renderDemoBar() {
  // Demo bar removed as requested to provide authentic Amazon/Flipkart e-commerce experience
}
