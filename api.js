/**
 * ==============================================================================
 * KisanConnect - API Client & Mock Data Service
 * Designed for SIH26033 (Smart India Hackathon)
 * 
 * NOTE FOR PRESENTATION / EVALUATION:
 * This module structures all frontend asynchronous communication using modern
 * fetch() API conventions. Each function maps directly to standard Django REST
 * Framework (DRF) Generic ViewSets / APIViews (e.g., ProduceViewSet, OrderViewSet).
 * 
 * In this standalone prototype, requests fallback smoothly to a synchronized
 * LocalStorage database so you can demo live:
 * 1. A Farmer listing a product -> instantly visible in Buyer marketplace.
 * 2. A Buyer placing an order -> instantly visible in Farmer's orders & logistics.
 * 3. A Farmer changing status to "Shipped" -> updates the Buyer's live tracker!
 * ==============================================================================
 */

const API_CONFIG = {
  // When deploying with a live Django backend, change USE_MOCK to false
  // and configure your Django REST server URL (e.g., 'http://127.0.0.1:8000/api')
  BASE_URL: '/api',
  USE_MOCK: true,
  SIMULATED_NETWORK_DELAY_MS: 250, // realistic smooth UX feedback
};

// Initial realistic dataset representing authentic Indian farm produce
const INITIAL_PRODUCE = [
  {
    id: "prod-101",
    name: "Desi Hybrid Tomatoes",
    category: "Vegetables",
    variety: "Himsona / Desi Sweet",
    farmerId: "farmer-1",
    farmerName: "Ramesh Patil",
    fpoName: "Sahyadri Agro Farmers Co-op",
    location: "Nashik, Maharashtra",
    pricePerKg: 32,
    mandiPricePerKg: 46, // retail/mandi comparison
    bulkTiers: [
      { minQty: 10, pricePerKg: 29, discountPct: 9 },
      { minQty: 50, pricePerKg: 26, discountPct: 18 }
    ],
    quantityAvailable: 480, // in kg
    harvestDate: "2026-09-07",
    isOrganic: true,
    rating: 4.8,
    reviewsCount: 42,
    imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    description: "Farm-fresh ripe tomatoes harvested at dawn. Grown with drip irrigation and minimal organic bio-pesticides."
  },
  {
    id: "prod-102",
    name: "Red Nasik Onions",
    category: "Vegetables",
    variety: "Garwa Onion Grade-A",
    farmerId: "farmer-1",
    farmerName: "Ramesh Patil",
    fpoName: "Sahyadri Agro Farmers Co-op",
    location: "Lasalgaon, Nashik",
    pricePerKg: 28,
    mandiPricePerKg: 38,
    bulkTiers: [
      { minQty: 25, pricePerKg: 25, discountPct: 10 },
      { minQty: 100, pricePerKg: 22, discountPct: 21 }
    ],
    quantityAvailable: 1200,
    harvestDate: "2026-09-05",
    isOrganic: false,
    rating: 4.9,
    reviewsCount: 88,
    imageUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
    description: "World-famous Lasalgaon onions. Well cured with excellent shelf life and pungent aroma."
  },
  {
    id: "prod-103",
    name: "Sharbati Golden Wheat",
    category: "Grains",
    variety: "MP Sharbati Premium",
    farmerId: "farmer-2",
    farmerName: "Gurpreet Singh",
    fpoName: "Malwa Golden Harvest FPO",
    location: "Sehore, Madhya Pradesh",
    pricePerKg: 45,
    mandiPricePerKg: 62,
    bulkTiers: [
      { minQty: 20, pricePerKg: 42, discountPct: 7 },
      { minQty: 100, pricePerKg: 38, discountPct: 15 }
    ],
    quantityAvailable: 2500,
    harvestDate: "2026-08-20",
    isOrganic: true,
    rating: 4.95,
    reviewsCount: 114,
    imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80",
    description: "Celebrated King of Wheat. Naturally rain-fed black cotton soil crop produces the softest rotis."
  },
  {
    id: "prod-104",
    name: "Fresh Baby Spinach (Palak)",
    category: "Vegetables",
    variety: "All Green Tender Leaves",
    farmerId: "farmer-1",
    farmerName: "Ramesh Patil",
    fpoName: "Sahyadri Agro Farmers Co-op",
    location: "Nashik, Maharashtra",
    pricePerKg: 35,
    mandiPricePerKg: 50,
    bulkTiers: [
      { minQty: 5, pricePerKg: 32, discountPct: 8 },
      { minQty: 20, pricePerKg: 28, discountPct: 20 }
    ],
    quantityAvailable: 150,
    harvestDate: "2026-09-08",
    isOrganic: true,
    rating: 4.7,
    reviewsCount: 31,
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
    description: "Crisp green tender leaves. Harvested within 12 hours of dispatch for maximum iron content."
  },
  {
    id: "prod-105",
    name: "Nagpur Sweet Oranges",
    category: "Fruits",
    variety: "Nagpur Mandarin",
    farmerId: "farmer-3",
    farmerName: "Vinayak Joshi",
    fpoName: "Vidarbha Citrus Producers FPO",
    location: "Katol, Nagpur",
    pricePerKg: 60,
    mandiPricePerKg: 85,
    bulkTiers: [
      { minQty: 10, pricePerKg: 54, discountPct: 10 },
      { minQty: 50, pricePerKg: 48, discountPct: 20 }
    ],
    quantityAvailable: 600,
    harvestDate: "2026-09-06",
    isOrganic: true,
    rating: 4.9,
    reviewsCount: 64,
    imageUrl: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600&auto=format&fit=crop&q=80",
    description: "GI-tagged sweet & tangy Nagpur oranges. Direct pluck from orchard trees, unwaxed and natural."
  },
  {
    id: "prod-106",
    name: "Organic Yellow Moong Dal",
    category: "Pulses",
    variety: "Unpolished Whole Moong",
    farmerId: "farmer-2",
    farmerName: "Gurpreet Singh",
    fpoName: "Malwa Golden Harvest FPO",
    location: "Hoshangabad, MP",
    pricePerKg: 110,
    mandiPricePerKg: 145,
    bulkTiers: [
      { minQty: 10, pricePerKg: 102, discountPct: 7 },
      { minQty: 50, pricePerKg: 95, discountPct: 13 }
    ],
    quantityAvailable: 850,
    harvestDate: "2026-08-15",
    isOrganic: true,
    rating: 4.85,
    reviewsCount: 52,
    imageUrl: "https://images.unsplash.com/photo-1585994192701-705307374a44?w=600&auto=format&fit=crop&q=80",
    description: "Traditional unpolished moong dal with zero artificial glazing. High protein, easy to digest."
  }
];

// Initial realistic orders connecting farmers and buyers
const INITIAL_ORDERS = [
  {
    id: "KC-8842",
    date: "2026-09-08 09:30",
    buyerId: "buyer-1",
    buyerName: "Ananya Sharma",
    buyerPhone: "+91 98201 44521",
    deliveryCity: "Pune, Maharashtra",
    deliveryAddress: "Flat 402, Green Meadows, Baner, Pune - 411045",
    farmerId: "farmer-1",
    farmerName: "Ramesh Patil",
    items: [
      { produceId: "prod-101", name: "Desi Hybrid Tomatoes", qtyKg: 5, pricePerKg: 32, subtotal: 160 },
      { produceId: "prod-104", name: "Fresh Baby Spinach (Palak)", qtyKg: 2, pricePerKg: 35, subtotal: 70 }
    ],
    subtotal: 230,
    deliveryFee: 30,
    total: 260,
    status: "In Transit", // Pending | Packed | Shipped | In Transit | Delivered
    statusHistory: [
      { status: "Pending", time: "2026-09-08 09:30", note: "Order placed via KisanConnect" },
      { status: "Packed", time: "2026-09-08 14:15", note: "Produce graded and packed at farm gate" },
      { status: "In Transit", time: "2026-09-09 06:40", note: "Dispatched with KisanLogistics MH-15-4291" }
    ],
    logistics: {
      trackingId: "KL-PN-98214",
      carrier: "KisanLogistics Rural Cold-Chain",
      origin: "Nashik Farm Hub, MH",
      destination: "Baner Delivery Hub, Pune, MH",
      estimatedDelivery: "Today, by 4:30 PM",
      vehicleNumber: "MH-15-EV-4291",
      driverName: "Sanjay Shinde (+91 94220 11234)"
    }
  },
  {
    id: "KC-8839",
    date: "2026-09-07 16:20",
    buyerId: "buyer-2",
    buyerName: "Hotel Rasoi (Bulk Buyer)",
    buyerPhone: "+91 99887 66554",
    deliveryCity: "Mumbai, Maharashtra",
    deliveryAddress: "Shop 12, Commercial Complex, Dadar West, Mumbai - 400028",
    farmerId: "farmer-1",
    farmerName: "Ramesh Patil",
    items: [
      { produceId: "prod-102", name: "Red Nasik Onions", qtyKg: 100, pricePerKg: 22, subtotal: 2200 },
      { produceId: "prod-101", name: "Desi Hybrid Tomatoes", qtyKg: 50, pricePerKg: 26, subtotal: 1300 }
    ],
    subtotal: 3500,
    deliveryFee: 0, // free for bulk
    total: 3500,
    status: "Packed",
    statusHistory: [
      { status: "Pending", time: "2026-09-07 16:20", note: "Bulk order received" },
      { status: "Packed", time: "2026-09-08 11:00", note: "150kg bulk crates sealed & verified" }
    ],
    logistics: {
      trackingId: "KL-MB-77140",
      carrier: "KisanLogistics Bulk Freight",
      origin: "Lasalgaon Aggregation Center, Nashik",
      destination: "Dadar Wholesale Market, Mumbai",
      estimatedDelivery: "Tomorrow, 8:00 AM",
      vehicleNumber: "MH-15-TR-9088",
      driverName: "Mahesh Jadhav"
    }
  },
  {
    id: "KC-8812",
    date: "2026-09-04 11:15",
    buyerId: "buyer-1",
    buyerName: "Ananya Sharma",
    buyerPhone: "+91 98201 44521",
    deliveryCity: "Pune, Maharashtra",
    deliveryAddress: "Flat 402, Green Meadows, Baner, Pune - 411045",
    farmerId: "farmer-1",
    farmerName: "Ramesh Patil",
    items: [
      { produceId: "prod-102", name: "Red Nasik Onions", qtyKg: 5, pricePerKg: 28, subtotal: 140 }
    ],
    subtotal: 140,
    deliveryFee: 30,
    total: 170,
    status: "Delivered",
    statusHistory: [
      { status: "Pending", time: "2026-09-04 11:15", note: "Order placed" },
      { status: "Packed", time: "2026-09-04 15:30", note: "Packed" },
      { status: "In Transit", time: "2026-09-05 07:00", note: "Dispatched" },
      { status: "Delivered", time: "2026-09-05 13:45", note: "Delivered to customer doorstep" }
    ],
    logistics: {
      trackingId: "KL-PN-65520",
      carrier: "KisanLogistics Express",
      origin: "Nashik Farm Hub",
      destination: "Pune Delivery Center",
      estimatedDelivery: "Delivered on 5th Sept",
      vehicleNumber: "MH-12-Q-1102",
      driverName: "Kailash Waghmare"
    }
  }
];

// Helper: Get or initialize LocalStorage collection
function getStorage(key, defaultData) {
  try {
    const raw = localStorage.getItem(`kisan_${key}`);
    if (!raw) {
      localStorage.setItem(`kisan_${key}`, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultData;
  }
}

function setStorage(key, data) {
  try {
    localStorage.setItem(`kisan_${key}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

// Simulated network sleep for authentic UX loading state
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ==============================================================================
 * DJANGO REST API ABSTRACTION LAYER
 * Each function below represents a Django REST Framework Endpoint.
 * In a production Django app, replace the mock block with the active fetch().
 * ==============================================================================
 */

/**
 * 1. PRODUCE ENDPOINTS
 * Corresponding Django Backend:
 * - URL: /api/produce/
 * - View: ProduceViewSet(viewsets.ModelViewSet)
 * - Serializer: ProduceSerializer
 */
export async function fetchProduce(filters = {}) {
  /* PRODUCTION DJANGO FETCH PATTERN:
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_CONFIG.BASE_URL}/produce/?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch produce');
  return await response.json();
  */
  await sleep(API_CONFIG.SIMULATED_NETWORK_DELAY_MS);
  let produceList = getStorage('produce', INITIAL_PRODUCE);

  // Apply in-memory filters
  if (filters.category && filters.category !== 'All') {
    produceList = produceList.filter(item => item.category.toLowerCase() === filters.category.toLowerCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    produceList = produceList.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q) ||
      item.farmerName.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  }
  if (filters.farmerId) {
    produceList = produceList.filter(item => item.farmerId === filters.farmerId);
  }
  if (filters.maxPrice) {
    produceList = produceList.filter(item => item.pricePerKg <= Number(filters.maxPrice));
  }
  if (filters.state) {
    produceList = produceList.filter(item => item.location.toLowerCase().includes(filters.state.toLowerCase()));
  }
  if (filters.organicOnly) {
    produceList = produceList.filter(item => item.isOrganic);
  }
  return produceList;
}

export async function createProduce(produceData) {
  /* PRODUCTION DJANGO FETCH PATTERN:
  const response = await fetch(`${API_CONFIG.BASE_URL}/produce/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(produceData)
  });
  return await response.json();
  */
  await sleep(API_CONFIG.SIMULATED_NETWORK_DELAY_MS);
  const produceList = getStorage('produce', INITIAL_PRODUCE);
  
  const newProduct = {
    id: `prod-${Date.now().toString().slice(-4)}`,
    ...produceData,
    rating: 5.0,
    reviewsCount: 1,
    bulkTiers: [
      { minQty: 10, pricePerKg: Math.round(produceData.pricePerKg * 0.92), discountPct: 8 },
      { minQty: 50, pricePerKg: Math.round(produceData.pricePerKg * 0.85), discountPct: 15 }
    ]
  };
  
  produceList.unshift(newProduct);
  setStorage('produce', produceList);
  return newProduct;
}

export async function updateProduceStock(produceId, newQtyKg) {
  await sleep(150);
  const produceList = getStorage('produce', INITIAL_PRODUCE);
  const item = produceList.find(p => p.id === produceId);
  if (item) {
    item.quantityAvailable = Number(newQtyKg);
    setStorage('produce', produceList);
  }
  return item;
}

export async function deleteProduce(produceId) {
  await sleep(150);
  let produceList = getStorage('produce', INITIAL_PRODUCE);
  produceList = produceList.filter(p => p.id !== produceId);
  setStorage('produce', produceList);
  return { success: true };
}

/**
 * 2. ORDERS ENDPOINTS
 * Corresponding Django Backend:
 * - URL: /api/orders/
 * - View: OrderViewSet(viewsets.ModelViewSet)
 * - Actions: @action(detail=True, methods=['patch']) update_status
 */
export async function fetchOrders(role = 'farmer', userId = 'farmer-1') {
  /* PRODUCTION DJANGO FETCH PATTERN:
  const response = await fetch(`${API_CONFIG.BASE_URL}/orders/?role=${role}&user_id=${userId}`);
  return await response.json();
  */
  await sleep(API_CONFIG.SIMULATED_NETWORK_DELAY_MS);
  const orders = getStorage('orders', INITIAL_ORDERS);
  if (role === 'farmer') {
    return orders.filter(o => o.farmerId === userId || !o.farmerId);
  } else {
    return orders.filter(o => o.buyerId === userId || !o.buyerId);
  }
}

export async function placeOrder(orderPayload) {
  /* PRODUCTION DJANGO FETCH PATTERN:
  const response = await fetch(`${API_CONFIG.BASE_URL}/orders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  return await response.json();
  */
  await sleep(API_CONFIG.SIMULATED_NETWORK_DELAY_MS);
  const orders = getStorage('orders', INITIAL_ORDERS);
  
  const newOrderId = `KC-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
  
  const createdOrder = {
    id: newOrderId,
    date: nowStr,
    buyerId: orderPayload.buyerId || 'buyer-1',
    buyerName: orderPayload.buyerName || 'Ananya Sharma',
    buyerPhone: orderPayload.buyerPhone || '+91 98201 44521',
    deliveryCity: orderPayload.deliveryCity || 'Pune, Maharashtra',
    deliveryAddress: orderPayload.deliveryAddress || 'Sector 4, Main Road',
    farmerId: orderPayload.farmerId || 'farmer-1',
    farmerName: orderPayload.farmerName || 'Ramesh Patil',
    items: orderPayload.items,
    subtotal: orderPayload.subtotal,
    deliveryFee: orderPayload.deliveryFee,
    total: orderPayload.total,
    status: 'Pending',
    statusHistory: [
      { status: 'Pending', time: nowStr, note: 'Order placed directly via KisanConnect marketplace' }
    ],
    logistics: {
      trackingId: `KL-REG-${Math.floor(10000 + Math.random() * 90000)}`,
      carrier: 'KisanLogistics Rural Cold-Chain Fleet',
      origin: 'Farmer Hub, Nashik District, MH',
      destination: orderPayload.deliveryCity || 'Pune Hub',
      estimatedDelivery: 'Tomorrow afternoon',
      vehicleNumber: 'MH-15-CL-6210',
      driverName: 'Assigned upon dispatch'
    }
  };

  orders.unshift(createdOrder);
  setStorage('orders', orders);

  // Automatically decrement quantity from produce stock
  const produceList = getStorage('produce', INITIAL_PRODUCE);
  for (const item of orderPayload.items) {
    const p = produceList.find(x => x.id === item.produceId);
    if (p && p.quantityAvailable >= item.qtyKg) {
      p.quantityAvailable -= item.qtyKg;
    }
  }
  setStorage('produce', produceList);

  return createdOrder;
}

export async function updateOrderStatus(orderId, newStatus) {
  /* PRODUCTION DJANGO FETCH PATTERN:
  const response = await fetch(`${API_CONFIG.BASE_URL}/orders/${orderId}/status/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  return await response.json();
  */
  await sleep(150);
  const orders = getStorage('orders', INITIAL_ORDERS);
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    order.statusHistory.push({
      status: newStatus,
      time: nowStr,
      note: `Status updated by farmer to ${newStatus}`
    });
    if (newStatus === 'In Transit' && order.logistics) {
      order.logistics.driverName = 'Sanjay Shinde (+91 94220 11234)';
    }
    setStorage('orders', orders);
  }
  return order;
}

/**
 * 3. AI DEMAND FORECASTING (SIH26033 KEY REQUIREMENT)
 * Corresponding Django Backend:
 * - URL: /api/analytics/forecast/?crop=tomato&days=14
 * - View: DemandForecastAPIView(APIView)
 * - Backing ML Model: ARIMA / Prophet trained on APMC Mandi arrival & urban consumer demand
 */
export async function fetchDemandForecast(crop = 'Tomatoes', durationDays = 14) {
  /* PRODUCTION DJANGO FETCH PATTERN:
  const response = await fetch(`${API_CONFIG.BASE_URL}/analytics/forecast/?crop=${crop}&days=${durationDays}`);
  return await response.json();
  */
  await sleep(200);

  // Generate realistic 7 or 14 day time series dates
  const labels = [];
  const predictedDemandQuintals = [];
  const historicalBaseline = [];
  
  const today = new Date();
  const count = durationDays === 7 ? 7 : 14;

  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(dayStr);

    // Realistic trend curves
    let base = 40;
    if (crop === 'Tomatoes') base = 65 + Math.sin(i / 2) * 15 + (i * 1.8);
    else if (crop === 'Onions') base = 85 + Math.cos(i / 2) * 10 + (i * 0.9);
    else if (crop === 'Wheat') base = 120 + Math.sin(i / 3) * 8;
    else base = 30 + Math.sin(i / 1.5) * 8;

    predictedDemandQuintals.push(Math.round(base));
    historicalBaseline.push(Math.round(base * 0.82)); // 18% lower historical mandi absorption
  }

  const cropInsights = {
    'Tomatoes': {
      changePct: '+18.4%',
      sentiment: 'Bullish Demand Spike',
      recommendation: 'Tomato demand expected to rise 18.4% next week across Pune & Mumbai retail clusters due to festival season. Recommended farm-gate listing price: ₹32 - ₹36/kg.',
      action: 'Increase harvest dispatch by 25 quintals for next Tuesday delivery slot.'
    },
    'Onions': {
      changePct: '+11.2%',
      sentiment: 'Steady Price Appreciation',
      recommendation: 'Wholesale mandi stocks down by 9% in major centers. Direct buyer restaurant demand is strong for medium-to-large pink bulbs.',
      action: 'Hold second lot for 5 days to capture projected +₹3/kg price peak.'
    },
    'Wheat': {
      changePct: '+6.5%',
      sentiment: 'Consistent Bulk Intake',
      recommendation: 'Apartment group buying clubs and flour mills placing recurring 50kg bag pre-orders for Sharbati variety.',
      action: 'Offer 10% tier discount for 500kg+ orders to secure full warehouse clearance.'
    }
  };

  return {
    crop,
    durationDays: count,
    labels,
    predictedDemand: predictedDemandQuintals,
    baselineDemand: historicalBaseline,
    insight: cropInsights[crop] || cropInsights['Tomatoes']
  };
}

/**
 * 4. FARMER EARNINGS & MIDDLEMAN COMPARISON (SIH26033 METRICS)
 * Corresponding Django Backend:
 * - URL: /api/analytics/earnings/?farmer_id=farmer-1
 */
export async function fetchFarmerEarnings(farmerId = 'farmer-1') {
  await sleep(150);
  return {
    totalRevenue: 148500,
    pendingPayments: 12800,
    mandiBenchmarkRevenue: 121300, // what they would get at traditional middleman rates
    extraProfitAmount: 27200,
    extraProfitPct: 22.4, // User earned ~22% more than typical mandi price
    middlemanCommissionSaved: 14200, // typically 8-12% commission absorbed by adatyas
    recentPayouts: [
      { id: "PAY-801", date: "2026-09-06", amount: 24500, method: "UPI (Bank of Baroda ****4921)", status: "Completed" },
      { id: "PAY-792", date: "2026-08-31", amount: 48200, method: "NEFT Direct Transfer", status: "Completed" },
      { id: "PAY-780", date: "2026-08-25", amount: 31000, method: "UPI (Bank of Baroda ****4921)", status: "Completed" }
    ]
  };
}

/**
 * 5. AUTHENTICATION & USER SESSIONS
 * Corresponding Django Backend:
 * - URL: /api/auth/login/ & /api/auth/register/
 * - Uses Django REST Framework TokenAuth or SimpleJWT
 */
export async function loginUser(email, password, role) {
  /* PRODUCTION DJANGO FETCH PATTERN:
  const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password, role })
  });
  return await response.json();
  */
  await sleep(200);

  // Return realistic mock session
  if (role === 'farmer') {
    return {
      success: true,
      token: "demo-farmer-token-sih26033",
      user: {
        id: "farmer-1",
        name: "Ramesh Patil",
        email: email || "ramesh.patil@kisanconnect.in",
        phone: "+91 98220 54321",
        role: "farmer",
        location: "Lasalgaon, Nashik District, Maharashtra",
        fpo: "Sahyadri Agro Farmers Co-op",
        farmSizeAcres: 8.5
      }
    };
  } else {
    return {
      success: true,
      token: "demo-buyer-token-sih26033",
      user: {
        id: "buyer-1",
        name: "Ananya Sharma",
        email: email || "ananya.sharma@gmail.com",
        phone: "+91 98201 44521",
        role: "buyer",
        city: "Pune, Maharashtra",
        address: "Flat 402, Green Meadows, Baner, Pune - 411045",
        buyerType: "Household & Community Buyer"
      }
    };
  }
}

export async function registerUser(userData) {
  await sleep(250);
  return {
    success: true,
    message: "Registration successful! Welcome to KisanConnect.",
    token: "demo-new-user-token",
    user: {
      id: `${userData.role}-${Date.now().toString().slice(-4)}`,
      ...userData
    }
  };
}

/**
 * SIMULATED LOGISTICS & ROUTE OPTIMIZATION (Google OR-Tools VRP)
 * Provides real-time fleet telematics, milestone status, and multi-stop route plans.
 */
export async function getLogisticsData() {
  await sleep(200);

  // Return realistic mock data representing a live rural cold-chain vehicle
  return {
    orderId: "ORD-BULK-2026-8841",
    consignmentName: "Bulk Fresh Harvest (Tomatoes & Onions)",
    volumeKg: 650,
    truckId: "MH-12-TR-4599",
    vehicleType: "Tata 407 Cold-Chain Reefer (4-Ton)",
    driverName: "Vikram Gaikwad",
    driverPhone: "+91 98223 88102",
    estimatedPickup: "Today, 11:45 AM (in ~35 mins)",
    currentStatus: "Truck En Route", // "Pending Pickup" | "Truck En Route" | "Picked Up" | "Delivered to Hub"
    currentMilestoneIndex: 1, // 0: Pending Pickup, 1: Truck En Route, 2: Picked Up, 3: Delivered to Hub
    coolingTemp: "4.2°C (Optimal)",
    route: "Hub -> Farm A -> Your Farm -> City Market",
    routePlan: {
      engine: "Google OR-Tools Capacitated Vehicle Routing Problem (CVRP)",
      efficiencyScore: "94.2% Optimal",
      totalDistanceKm: 184,
      co2SavedKg: "42.5 kg CO₂",
      fuelSavingPct: "22%",
      stops: [
        {
          code: "DEPOT",
          title: "Hub (Nashik Central)",
          location: "Ozar Logistics Park, Nashik",
          time: "09:15 AM",
          status: "Completed",
          isFarmerFarm: false
        },
        {
          code: "STOP-1",
          title: "Farm A (Niphad)",
          location: "Shinde Agro FPO, Niphad",
          time: "10:30 AM",
          status: "Completed",
          isFarmerFarm: false
        },
        {
          code: "STOP-2",
          title: "Your Farm (Lasalgaon)",
          location: "Patil Organic Farm Gate, Lasalgaon",
          time: "11:45 AM",
          status: "En Route (Next Stop)",
          isFarmerFarm: true
        },
        {
          code: "DEST",
          title: "City Market (Vashi)",
          location: "Vashi APMC Cold Storage Terminal, Mumbai",
          time: "03:30 PM",
          status: "Scheduled",
          isFarmerFarm: false
        }
      ]
    },
    milestones: [
      {
        id: "step-1",
        label: "Pending Pickup",
        status: "Completed",
        time: "Today, 09:15 AM",
        note: "Produce graded & sealed in ventilated crates",
        isCurrent: false,
        isCompleted: true
      },
      {
        id: "step-2",
        label: "Truck En Route",
        status: "In Progress",
        time: "Departed 10:40 AM (Niphad)",
        note: "Reefer vehicle MH-12-TR-4599 heading towards Lasalgaon",
        isCurrent: true,
        isCompleted: false
      },
      {
        id: "step-3",
        label: "Picked Up",
        status: "Upcoming",
        time: "Est. 11:45 AM",
        note: "Farm gate weighing & digital receipt generation",
        isCurrent: false,
        isCompleted: false
      },
      {
        id: "step-4",
        label: "Delivered to Hub",
        status: "Upcoming",
        time: "Est. 03:30 PM",
        note: "Direct delivery to urban wholesale buyer terminal",
        isCurrent: false,
        isCompleted: false
      }
    ]
  };
}

