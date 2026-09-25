// apiService.js - Pestify Android Security Lab client
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { fetch as expoFetch } from "expo/fetch";
import { File as ExpoFile } from "expo-file-system";
import { normalizeAppointment } from "./normalizeAppointment";

const {
  isValidAuthenticatedPrincipal
} = require("../security/authResponsePolicy");

const SECURITY_LAB_API_ORIGIN =
  "https://security-lab-security-lab.up.railway.app";

export const API_BASE_URL = `${SECURITY_LAB_API_ORIGIN}/api`;

if (
  API_BASE_URL !== `${SECURITY_LAB_API_ORIGIN}/api` ||
  API_BASE_URL.includes("production")
) {
  throw new Error("Security Lab API configuration refused");
}

const STORAGE_KEYS = Object.freeze({
  authToken: "pestify.security-lab.auth-token.v1",
  mfaDevice: "pestify.security-lab.mfa-device.v1"
});

const LEGACY_AUTH_TOKEN_KEY = "authToken";

async function secureGetItem(key) {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure credential storage is unavailable");
  }

  return SecureStore.getItemAsync(key);
}

async function secureSetItem(key, value) {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure credential storage is unavailable");
  }

  await SecureStore.setItemAsync(key, value, {
    keychainAccessible:
      SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

async function secureDeleteItem(key) {
  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.deleteItemAsync(key);
  }
}

function normalizeAmaNumbers(value) {
  const sourceValues = Array.isArray(value) ? value : [value];

  return [
    ...new Set(
      sourceValues
        .flatMap(item =>
          String(item ?? "").split(/[,\n;]/)
        )
        .map(item => item.trim())
        .filter(Boolean)
    )
  ];
}

function getCustomerAmaNumbers(customer) {
  const arrayValue =
    customer?.amaNumbers ??
    customer?.ama_numbers;

  return normalizeAmaNumbers(
    Array.isArray(arrayValue) && arrayValue.length > 0
      ? arrayValue
      : customer?.ama
  );
}

function normalizeCustomerAma(customer) {
  if (!customer || typeof customer !== "object") {
    return customer;
  }

  const amaNumbers = getCustomerAmaNumbers(customer);

  return {
    ...customer,
    amaNumbers,
    ama: amaNumbers.join(", ")
  };
}

let authToken = null;
const privateImageSessionListeners = new Set();

function subscribePrivateImageSession(listener) {
  privateImageSessionListeners.add(listener);
  return () => privateImageSessionListeners.delete(listener);
}

function notifyPrivateImageSession() {
  for (const listener of privateImageSessionListeners) {
    try {
      listener(authToken);
    } catch {
      // A viewer must never interrupt login or logout.
    }
  }
}
let authStorageInitializationError = null;

async function purgeLegacyAuthToken() {
  await AsyncStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

const authStorageReady = (async () => {
  try {
    await purgeLegacyAuthToken();

    const token = await secureGetItem(STORAGE_KEYS.authToken);
    if (token) {
      authToken = token;
    }
  } catch (error) {
    authToken = null;
    authStorageInitializationError = error;
    console.error("Failed to initialize secure authentication storage");
  }
})();

async function getEnhancedKPIs() {
  try {
    const result = await request("GET", "/statistics/kpis/enhanced");
    return result;
  } catch (error) {
    console.error("❌ Failed to get enhanced KPIs:", error);
    return {
      success: false,
      kpiData: null
    };
  }
}

async function getTopPerformance() {
  try {
    const result = await request("GET", "/statistics/kpis/top-performance");
    return result;
  } catch (error) {
    console.error("❌ Failed to get top performance:", error);
    return {
      success: false,
      performanceData: null
    };
  }
}

async function getRetentionRate(customerId = null) {
  try {
    const endpoint = customerId 
      ? `/statistics/kpis/retention-rate?customerId=${customerId}`
      : `/statistics/kpis/retention-rate`;
    
    const result = await request("GET", endpoint);
    return result;
  } catch (error) {
    console.error("❌ Failed to get retention rate:", error);
    return {
      success: false,
      data: { retention_rate_percentage: 0 }
    };
  }
}

async function getVisitFrequency(customerId = null) {
  try {
    const endpoint = customerId 
      ? `/statistics/kpis/visit-frequency?customerId=${customerId}`
      : `/statistics/kpis/visit-frequency`;
    
    const result = await request("GET", endpoint);
    return result;
  } catch (error) {
    console.error("❌ Failed to get visit frequency:", error);
    return {
      success: false,
      data: { overall_avg_frequency_days: 30 }
    };
  }
}

// Set auth token and persist it
async function setAuthToken(token) {
  await authStorageReady;

  if (authStorageInitializationError) {
    throw new Error("Authentication storage initialization failed");
  }

  try {
    if (token) {
      await secureSetItem(STORAGE_KEYS.authToken, String(token));
    } else {
      await secureDeleteItem(STORAGE_KEYS.authToken);
    }

    authToken = token ? String(token) : null;
    notifyPrivateImageSession();
  } catch (error) {
    authToken = null;
    notifyPrivateImageSession();
    throw new Error("Authentication could not be stored securely");
  }
}

// Clear auth token (for logout)
async function clearAuthToken() {
  await authStorageReady;

  authToken = null;
  notifyPrivateImageSession();
  let clearFailed = false;

  try {
    await secureDeleteItem(STORAGE_KEYS.authToken);
  } catch {
    clearFailed = true;
  }

  try {
    await purgeLegacyAuthToken();
  } catch {
    clearFailed = true;
  }

  if (clearFailed) {
    console.error("Failed to clear all stored authentication tokens");
  }
}

function normalizeMfaDeviceAccount(value) {
  const account = String(value || "").trim().toLowerCase();

  return account.length <= 320 && /^[^\s@]+@[^\s@]+$/.test(account)
    ? account
    : null;
}

function validStoredMfaCredential(credential) {
  const expiresAt = Date.parse(credential?.expiresAt);

  return (
    typeof credential?.token === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(credential.token) &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now()
  );
}

async function getMfaDeviceToken(accountValue) {
  const account = normalizeMfaDeviceAccount(accountValue);

  if (!account) {
    return null;
  }

  try {
    const stored = await secureGetItem(STORAGE_KEYS.mfaDevice);
    const collection = stored ? JSON.parse(stored) : null;
    const credential = collection?.accounts?.[account];

    return collection?.version === 1 &&
      validStoredMfaCredential(credential)
      ? credential.token
      : null;
  } catch {
    return null;
  }
}

async function storeMfaDeviceCredential(result, accountValue) {
  if (!result?.mfaDeviceToken) {
    return;
  }

  const account = normalizeMfaDeviceAccount(accountValue);
  const expiresAt = Date.parse(result.mfaDeviceExpiresAt);

  if (
    !account ||
    !/^[A-Za-z0-9_-]{43}$/.test(result.mfaDeviceToken) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw new Error("Invalid trusted-device credential");
  }

  let accounts = {};

  try {
    const stored = await secureGetItem(STORAGE_KEYS.mfaDevice);
    const parsed = stored ? JSON.parse(stored) : null;

    if (
      parsed?.version === 1 &&
      parsed.accounts &&
      typeof parsed.accounts === "object"
    ) {
      accounts = Object.fromEntries(
        Object.entries(parsed.accounts)
          .filter(([storedAccount, credential]) =>
            normalizeMfaDeviceAccount(storedAccount) &&
            validStoredMfaCredential(credential)
          )
          .slice(-7)
      );
    }
  } catch {
    accounts = {};
  }

  accounts[account] = {
    token: result.mfaDeviceToken,
    expiresAt: new Date(expiresAt).toISOString(),
    storedAt: new Date().toISOString()
  };

  await secureSetItem(
    STORAGE_KEYS.mfaDevice,
    JSON.stringify({ version: 1, accounts })
  );
}

// Get current token (useful for debugging)
function getCurrentToken() {
  return authToken;
}

// Helper function to verify token with backend
async function verifyTokenWithBackend(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    return { success: false, error: error.message };
  }
}

function validAdministratorSession(result) {
  const accessExpiresAt = Date.parse(
    result?.session?.accessTokenExpiresAt
  );
  const absoluteExpiresAt = Date.parse(
    result?.session?.absoluteExpiresAt
  );

  return (
    typeof result?.session?.id === "string" &&
    Number.isFinite(accessExpiresAt) &&
    Number.isFinite(absoluteExpiresAt) &&
    accessExpiresAt > Date.now() &&
    absoluteExpiresAt > Date.now() &&
    accessExpiresAt <= absoluteExpiresAt
  );
}

async function acceptAuthenticationResult(
  result,
  { mfaDeviceAccount = null } = {}
) {
  if (!result?.success) {
    return result;
  }

  if (!isValidAuthenticatedPrincipal(result)) {
    await clearAuthToken();
    return {
      success: false,
      error: "Invalid authenticated principal response"
    };
  }

  if (result.role === "admin" && !validAdministratorSession(result)) {
    await clearAuthToken();
    return {
      success: false,
      error: "Invalid administrator session response"
    };
  }

  if (result.mfaDeviceToken && result.role !== "admin") {
    await clearAuthToken();
    return {
      success: false,
      error: "Invalid trusted-device authentication response"
    };
  }

  try {
    await setAuthToken(result.token);
  } catch (error) {
    return {
      success: false,
      error: error.message,
      authenticationStorageFailure: true
    };
  }

  let mfaDeviceStored = true;

  if (result.mfaDeviceToken) {
    try {
      await storeMfaDeviceCredential(result, mfaDeviceAccount);
    } catch {
      mfaDeviceStored = false;
    }
  }

  return { ...result, mfaDeviceStored };
}

// Generic request wrapper
async function request(method, endpoint, body = null) {
  await authStorageReady;

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);

    // Get the raw text first
    const text = await res.text();
    
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.warn(`⚠️ Could not parse JSON for ${endpoint}:`, text);
      json = null;
    }

    if (!res.ok) {
      return { 
        success: false, 
        error: json?.error || `Request failed with status ${res.status}`,
        status: res.status,
        data: json
      };
    }

    // Return the parsed JSON directly (not wrapped in {data: ...})
    return json || { success: true };

  } catch (err) {
    console.error(`❌ API Error for ${endpoint}:`, err);
    return { 
      success: false, 
      error: err.message,
      networkError: true 
    };
  }
}

function normalizeNativeMultipartBody(formData) {
  if (!formData || typeof formData.entries !== "function") {
    return formData;
  }

  const normalizedFormData = new FormData();
  let replacedLegacyUriPart = false;

  for (const [fieldName, value] of formData.entries()) {
    const isLegacyReactNativeFile =
      value &&
      typeof value === "object" &&
      typeof value.uri === "string" &&
      typeof value.bytes !== "function";

    if (isLegacyReactNativeFile) {
      // expo/fetch accepts File/Blob values, not React Native's former
      // `{ uri, type, name }` multipart convention.
      normalizedFormData.append(fieldName, new ExpoFile(value.uri));
      replacedLegacyUriPart = true;
    } else {
      normalizedFormData.append(fieldName, value);
    }
  }

  return replacedLegacyUriPart ? normalizedFormData : formData;
}

async function uploadCustomerMap(formData) {
  await authStorageReady;

  if (!authToken) {
    return {
      success: false,
      error: "Authentication required",
      status: 401
    };
  }

  try {
    const response = await expoFetch(`${API_BASE_URL}/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      body: normalizeNativeMultipartBody(formData)
    });
    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      return {
        success: false,
        error: json?.error || `Request failed with status ${response.status}`,
        status: response.status,
        data: json
      };
    }

    return json || { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      networkError: true
    };
  }
}

const apiService = {
  // TOKEN MANAGEMENT
  setAuthToken,
  clearAuthToken,
  getCurrentToken,
  subscribePrivateImageSession,
  verifyTokenWithBackend,
  request,
  uploadCustomerMap,
  getEnhancedKPIs,
  getTopPerformance,
  getRetentionRate,
  getVisitFrequency,
  async getStatisticsDashboard(year = null) {
    const query = year === null || year === undefined
      ? ""
      : `?year=${encodeURIComponent(String(year))}`;

    return request("GET", `/statistics/v2/dashboard${query}`);
  },
  updateRescheduleStatus(appointmentId, payload) {
    return apiService.updateAppointmentRescheduleStatus(appointmentId, payload);
  },

  async getOrganizationUsage() {
    return request("GET", "/admin/usage");
  },

  async getTotalRequestsToday() {
    try {
      // Try the new endpoint for total count
      const result = await request("GET", "/customer-requests/today-total-count");
      
      if (result?.success) {
        return result;
      }
      
      // Fallback to the old endpoint
      const pendingResult = await getTodayCustomerRequestsCount();
      return pendingResult;
      
    } catch (error) {
      console.error("❌ Error getting total requests today:", error);
      return { success: false, count: 0, error: error.message };
    }
  },

  async getTotalRequestsCreatedToday() {
    try {
      // Use the working method instead of direct endpoint
      return await this.getTotalRequestsToday();
    } catch (error) {
      console.error("❌ Error getting total requests today:", error);
      return { success: false, count: 0, error: error.message };
    }
  },

  // Customer Requests
  async submitCustomerRequest(requestData, isMultipart = false) {
    try {
      const headers = {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      };

      const requestFn = isMultipart ? expoFetch : fetch;
      const response = await requestFn(`${API_BASE_URL}/customer-requests`, {
        method: "POST",
        headers: isMultipart
          ? headers // DO NOT set Content-Type for multipart
          : { 
              ...headers,
              "Content-Type": "application/json"
            },
        body: isMultipart
          ? normalizeNativeMultipartBody(requestData)
          : JSON.stringify(requestData)
      });

      const text = await response.text();
      let json;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || `Request failed with status ${response.status}`
        };
      }

      return json || { success: true };

    } catch (error) {
      console.error("❌ Submit customer request error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async getCustomerRequests(status = null) {
    const endpoint = status ? `/customer-requests?status=${status}` : "/customer-requests";
    return request("GET", endpoint);
  },

  async getTodayCustomerRequestsCount() {
    // Add cache-busting parameter
    const timestamp = Date.now();
    const res = await request("GET", `/admin/customer-requests/today-count?t=${timestamp}`);

    if (!res || res.success === false) {
      return { success: false, count: 0 };
    }

    return res;
  },

  async updateCustomerRequestStatus(requestId, status, appointmentId = null, notes = null) {
    return request("PUT", `/customer-requests/${requestId}/status`, {
      status,
      appointmentId,
      notes
    });
  },

  async getCustomerMyRequests() {
    return request("GET", "/customer/my-requests");
  },

  async submitRescheduleRequest(rescheduleData) {
    const result = await request("POST", "/customer/reschedule-request", rescheduleData);
    return result;
  },

  async updateRescheduleStatus(appointmentId, payload) {
    try {
      const result = await request(
        "PUT",
        `/appointments/${appointmentId}/reschedule-status`,
        payload
      );
      return result;
    } catch (error) {
      console.error("❌ Reschedule status update failed:", error);
      return {
        success: false,
        error: error.message || "Failed to update appointment reschedule status"
      };
    }
  },

  // NOTIFICATION ENDPOINTS
  async getCustomerNotifications() {
    try {
      const result = await request("GET", "/customer/notifications");
      return result;
    } catch (error) {
      console.error("❌ Failed to fetch notifications:", error);
      return {
        success: false,
        notifications: [],
        unreadCount: 0
      };
    }
  },

  async markNotificationAsRead(notificationId) {
    return request("PATCH", `/notifications/${notificationId}/read`);
  },

  async markAllNotificationsAsRead() {
    return request("POST", "/notifications/mark-all-read");
  },

  async clearAllNotifications() {
    return request("DELETE", "/notifications/clear");
  },

  async cancelAppointment(appointmentId) {
    return request("PUT", `/appointments/${appointmentId}/cancel`);
  },

  // LOGIN
  async login(email, password) {
    await clearAuthToken();

    const mfaDeviceAccount = normalizeMfaDeviceAccount(email);
    const mfaDeviceToken = await getMfaDeviceToken(mfaDeviceAccount);
    const result = await request("POST", "/login", {
      email,
      password,
      ...(mfaDeviceToken ? { mfaDeviceToken } : {})
    });

    if (!result || !result.success) {
      return result;
    }

    if (result.role === "super_admin") {
      await clearAuthToken();
      return {
        success: false,
        error: "Super admin access is available only in Pestify iOS."
      };
    }

    if (result.token && result.challengeToken) {
      await clearAuthToken();
      return {
        success: false,
        error: "Invalid mixed authentication response"
      };
    }

    if (result.token) {
      return acceptAuthenticationResult(result, {
        mfaDeviceAccount
      });
    }

    if (
      result.role === "admin" &&
      typeof result.challengeToken === "string" &&
      result.challengeToken.length >= 40 &&
      result.challengeToken.length <= 128 &&
      [
        "enrollment_offer",
        "enrollment_challenge",
        "login_challenge"
      ].includes(result.mfaAction)
    ) {
      return result;
    }

    return {
      success: false,
      error: "Incomplete authentication response"
    };
  },

  async startMfaEnrollment(challengeToken) {
    return request("POST", "/auth/mfa/enrollment/start", {
      challengeToken
    });
  },

  async confirmMfaEnrollment(challengeToken, code, mfaDeviceAccount) {
    const result = await request(
      "POST",
      "/auth/mfa/enrollment/confirm",
      { challengeToken, code }
    );

    return result?.token
      ? acceptAuthenticationResult(result, { mfaDeviceAccount })
      : result;
  },

  async declineMfaEnrollment(challengeToken) {
    const result = await request(
      "POST",
      "/auth/mfa/enrollment/decline",
      { challengeToken }
    );

    return result?.token
      ? acceptAuthenticationResult(result)
      : result;
  },

  async verifyMfaLogin(challengeToken, code, mfaDeviceAccount) {
    const result = await request("POST", "/auth/mfa/verify", {
      challengeToken,
      code
    });

    return result?.token
      ? acceptAuthenticationResult(result, { mfaDeviceAccount })
      : result;
  },

  async refreshAdminSession() {
    const result = await request("POST", "/auth/session/refresh");

    if (!result?.token || !validAdministratorSession(result)) {
      return result?.success
        ? {
            success: false,
            error: "Invalid administrator session response",
            invalidSessionResponse: true
          }
        : result;
    }

    try {
      await setAuthToken(result.token);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        authenticationStorageFailure: true
      };
    }
  },

  async logoutAdminSession() {
    if (!authToken) {
      return { success: true };
    }

    return request("POST", "/auth/session/logout");
  },

  async getCustomerStats() {
    const res = await request("GET", "/customers/stats");

    // Handle failure
    if (!res || res.success === false) {
      console.error("❌ Customer stats API error:", res?.error);
      return { stats: [] };
    }

    // Expected format: { success: true, stats: [...] }
    if (res.stats && Array.isArray(res.stats)) {
      return res;
    }

    console.warn("⚠️ Unexpected customer stats response format:", res);
    return { stats: [] };
  },

  // SERVICE LOG SUBMISSION WITH MULTIPART SUPPORT
  async submitServiceLog(formData) {
    try {
      const headers = {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      };
      // Note: Don't set Content-Type header when using FormData
      // The browser will set it automatically with the correct boundary

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await expoFetch(`${API_BASE_URL}/service-logs`, {
        method: "POST",
        headers, // No Content-Type here - let browser set it
        body: normalizeNativeMultipartBody(formData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      
      let json;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || `Request failed with status ${response.status}`
        };
      }

      return json || { success: true };

    } catch (error) {
      console.error("❌ Service log upload error:", error);
      
      // Handle abort/timeout errors
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "Upload timeout - please try again with fewer or smaller images"
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  },

  // CUSTOMERS
  async getCustomers() {
    // Try the generic endpoint
    const res = await request("GET", "/customers");
    
    // If request returns an error object
    if (res && res.success === false) {
      console.error("❌ Customers API error:", res.error);
      return [];
    }
    
    // Handle different response formats
    let customersArray = [];
    
    if (Array.isArray(res)) {
      customersArray = res;
    } else if (res && Array.isArray(res.data)) {
      customersArray = res.data;
    } else if (res && Array.isArray(res.customers)) {
      customersArray = res.customers;
    } else if (res && res.success && res.data && Array.isArray(res.data)) {
      customersArray = res.data;
    }

    // Format customers consistently
    const formattedCustomers = customersArray.map(c => {
  const amaNumbers = getCustomerAmaNumbers(c);

  return {
    customerId: String(
      c.customerId ??
      c.id ??
      c.customer_id ??
      ""
    ),

    customerName:
      c.customerName ??
      c.name ??
      c.customer_name ??
      "Unknown Customer",

    email: c.email ?? "",
    address: c.address ?? "",
    telephone: c.telephone ?? "",

    tin:
      c.tin ??
      c.afm ??
      c.taxIdentificationNumber ??
      "",

    amaNumbers,
    ama: amaNumbers.join(", "),

    complianceValidUntil:
      c.complianceValidUntil ??
      c.compliance_valid_until ??
      null,

    maps: Array.isArray(c.maps) ? c.maps : []
  };
});
    
    return formattedCustomers;
  },
  
  async getCustomerById(id) {
  const result = await request(
    "GET",
    `/customers/${encodeURIComponent(id)}`
  );

  if (!result || result.success === false) {
    return result;
  }

  if (result.data && typeof result.data === "object") {
    return {
      ...result,
      data: normalizeCustomerAma(result.data)
    };
  }

  if (result.customer && typeof result.customer === "object") {
    return {
      ...result,
      customer: normalizeCustomerAma(result.customer)
    };
  }

  return normalizeCustomerAma(result);
},

  async createCustomer(data) {
    return request("POST", "/customers", data);
  },

  async updateCustomer(id, data) {
    return request("PUT", `/customers/${id}`, data);
  },

  async getCustomerDetails(id) {
    const result = await request("GET", `/customers/${id}`);
    return result;
  },

  async getCustomerVisits(customerId) {
    if (!customerId) {
      console.warn("⚠️ getCustomerVisits called without customerId");
      return [];
    }

    const res = await request(
      "GET",
      `/appointments/customer/${customerId}`
    );

    if (!res || res.success !== true) {
      console.warn("⚠️ getCustomerVisits failed:", res);
      return [];
    }

    return Array.isArray(res.visits) ? res.visits : [];
  },

  async deleteCustomer(id) {
    return request("DELETE", `/customers/${id}`);
  },

  async getCustomerWithMaps(id) {
    const result = await request("GET", `/customers/${id}`);
    
    // Handle errors - FIXED: Only return null if result is null or undefined
    if (!result) {
      console.error("❌ No response from API");
      return {
        success: false,
        hasCustomer: false,
        customer: null
      };
    }
    
    // Check if API call failed - but success can be undefined for some endpoints
    if (result.success === false) {
      console.error("❌ API returned explicit failure:", result.error);
      return {
        success: false,
        hasCustomer: false,
        customer: null
      };
    }
    
    // Extract customer data - handle different structures
    let customerData;
    
    // Case 1: Direct structure {success: true, data: {...}}
    if (result.data && typeof result.data === 'object' && result.data.customerId) {
      customerData = result.data;
    }
    // Case 2: Data is nested {data: {data: {...}}}
    else if (result.data && result.data.data && result.data.data.customerId) {
      customerData = result.data.data;
    }
    // Case 3: Response IS the customer data {customerId: ...}
    else if (result.customerId) {
      customerData = result;
    }
    // Case 4: Invalid structure
    else {
      console.error("❌ Invalid customer data structure:", result);
      return {
        success: false,
        hasCustomer: false,
        customer: null
      };
    }

    // Ensure maps is always an array
    let maps = customerData.maps;
    
    if (!Array.isArray(maps)) {
      console.warn("⚠️ Maps is not an array, fixing:", maps);
      
      if (typeof maps === 'string') {
        if (maps.toLowerCase() === 'no maps') {
          maps = [];
        } else {
          try {
            maps = JSON.parse(maps);
          } catch (parseError) {
            console.warn("⚠️ Failed to parse maps string:", parseError);
            maps = [];
          }
        }
      } else if (maps === null || maps === undefined) {
        maps = [];
      } else {
        maps = [];
      }
    }
    
    const fixedCustomer = {
      ...customerData,
      maps: maps
    };
    
    // CRITICAL FIX: Return the correct structure
    return fixedCustomer; // ← Return JUST the customer object, not wrapped
  },

  // TECHNICIANS
  async getTechnicians() {
    const res = await request("GET", "/admin/technicians");
    if (!res) return [];
    
    // Handle different response formats
    if (Array.isArray(res)) {
      return res;
    } else if (res.technicians && Array.isArray(res.technicians)) {
      return res.technicians;
    } else if (res.success && Array.isArray(res.data)) {
      return res.data;
    } else if (res.success === false) {
      console.error("❌ Technicians API returned error:", res.error);
      return [];
    }
    
    console.warn("⚠️ Unexpected technicians response format:", res);
    return [];
  },

  async getTechnicianById(id) {
    return request("GET", `/technicians/${id}`);
  },

  async createTechnician(data) {
    return request("POST", "/technicians", data);
  },

  async updateTechnician(id, data) {
    return request("PUT", `/technicians/${id}`, data);
  },

  async deleteTechnician(id) {
    return request("DELETE", `/technicians/${id}`);
  },

  // TODAY'S VISITS
  async getTodaysVisits() {
    return request("GET", "/today-visits");
  },

  // APPOINTMENT METHODS
  async rescheduleAppointment(appointmentId, rescheduleData) {
    try {
      const updatePayload = {
        date: rescheduleData.requestedDate,
        time: rescheduleData.requestedTime,
        status: 'pending_reschedule',
        rescheduleNotes: rescheduleData.description || '',
        rescheduleRequestedAt: new Date().toISOString()
      };
      
      const result = await request("PUT", `/appointments/${appointmentId}/reschedule`, updatePayload);
      return result;
      
    } catch (error) {
      console.error("❌ Failed to reschedule appointment:", error);
      return { success: false, error: error.message };
    }
  },

  async createAppointment(payload) {
    const appointmentData = {
      technicianId: payload.technicianId,
      customerId: payload.customerId || null,
      legacyCustomerKey: payload.legacyCustomerKey || null,
      date: payload.date || payload.appointmentDate,
      time: payload.time || payload.appointmentTime,
      serviceType: payload.serviceType,
      status: payload.status || "scheduled",
      specialServiceSubtype: payload.specialServiceSubtype || null,
      otherPestName: payload.otherPestName || null,
      appointmentCategory: payload.appointmentCategory || null,
      insecticideDetails: payload.insecticideDetails || null,
      disinfection_details: payload.disinfection_details || null,

      serviceNetPrice: payload.serviceNetPrice ?? null,
      serviceVatPercent: payload.serviceVatPercent ?? 0,
      serviceVatAmount: payload.serviceVatAmount ?? 0,

      service_net_price: payload.serviceNetPrice ?? null,
      service_vat_percent: payload.serviceVatPercent ?? 0,
      service_vat_amount: payload.serviceVatAmount ?? 0
    };

    if (payload.compliance_valid_until) {
      appointmentData.compliance_valid_until = payload.compliance_valid_until;
    }

    // 🚨 CRITICAL: Make sure this is UNCOMMENTED
    if (payload.servicePrice !== undefined) {
      appointmentData.servicePrice = payload.servicePrice;
    } 

    if (payload.insecticideDetails) {
      appointmentData.insecticideDetails = payload.insecticideDetails;
    }
    
    if (payload.disinfection_details) {
      appointmentData.disinfection_details = payload.disinfection_details;
    }
    const result = await request("POST", "/appointments", appointmentData);
    
    return result;
  },

  async getCustomerAppointments() {
    return request("GET", "/customer/appointments");
  },

  async getAppointments(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/appointments?${query}` : `/appointments`;
    const res = await request("GET", endpoint);
    
    let appointmentsArray;
    
    if (Array.isArray(res)) {
      appointmentsArray = res;
    } else if (res && Array.isArray(res.appointments)) {
      appointmentsArray = res.appointments;
    } else if (res && res.success && Array.isArray(res.data)) {
      appointmentsArray = res.data;
    } else {
      console.warn("⚠️ Unexpected appointments response format:", res);
      appointmentsArray = [];
    }
    
    return appointmentsArray.map(normalizeAppointment);
  },

  async getAppointmentsWithPricing(params = {}) {
    const query = new URLSearchParams(params).toString();

    const endpoint = query
      ? `/appointments?${query}`
      : "/appointments";

    const res = await request("GET", endpoint);

    let appointmentsArray;

    if (Array.isArray(res)) {
      appointmentsArray = res;
    } else if (res && Array.isArray(res.appointments)) {
      appointmentsArray = res.appointments;
    } else if (res?.success && Array.isArray(res.data)) {
      appointmentsArray = res.data;
    } else {
      appointmentsArray = [];
    }

    return appointmentsArray.map((appointment) => {
      const normalized = normalizeAppointment(appointment);

      return {
        ...normalized,

        servicePrice:
          appointment.servicePrice ??
          appointment.service_price ??
          normalized.servicePrice ??
          normalized.service_price ??
          null,

        serviceNetPrice:
          appointment.serviceNetPrice ??
          appointment.service_net_price ??
          appointment.netPrice ??
          appointment.net_price ??
          normalized.serviceNetPrice ??
          normalized.service_net_price ??
          normalized.netPrice ??
          normalized.net_price ??
          null,

        serviceVatPercent:
          appointment.serviceVatPercent ??
          appointment.service_vat_percent ??
          appointment.vatPercent ??
          appointment.vat_percent ??
          normalized.serviceVatPercent ??
          normalized.service_vat_percent ??
          normalized.vatPercent ??
          normalized.vat_percent ??
          null,

        serviceVatAmount:
          appointment.serviceVatAmount ??
          appointment.service_vat_amount ??
          appointment.vatAmount ??
          appointment.vat_amount ??
          normalized.serviceVatAmount ??
          normalized.service_vat_amount ??
          normalized.vatAmount ??
          normalized.vat_amount ??
          null,
      };
    });
  },

  async updateAppointment(appointmentData) {
    // Handle both formats: appointmentData can be an object with id property OR separate id and updates
    let appointmentId;
    let payload;
    
    if (typeof appointmentData === 'string') {
      // Old format: updateAppointment(id, updates)
      appointmentId = appointmentData;
      payload = arguments[1] || {};
    } else if (typeof appointmentData === 'object') {
      // New format: updateAppointment({id, status, visitId, etc.})
      appointmentId = appointmentData.id;
      payload = { ...appointmentData };
      delete payload.id; // Remove id from payload
    } else {
      console.error("❌ Invalid appointmentData format:", appointmentData);
      return { success: false, error: "Invalid appointment data format" };
    }

    if (!appointmentId) {
      console.error("❌ No appointment ID provided");
      return { success: false, error: "Appointment ID is required" };
    }

    const result = await request(
      "PUT",
      `/appointments/${appointmentId}`,
      payload
    );
    return result;
  },

  async deleteAppointment(appointmentId) {
    return request("DELETE", `/appointments/${appointmentId}`);
  },

  async getAppointmentsForCustomer(customerId) {
    if (!customerId) {
      console.error("❌ No customerId provided");
      return [];
    }
    
    try {
      const response = await request("GET", `/appointments?customerId=${customerId}`);
      
      if (Array.isArray(response)) {
        return response;
      } else if (response?.appointments) {
        return response.appointments;
      } else if (response?.success && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error("❌ Error getting appointments for customer:", error);
      return [];
    }
  },

  // MATERIALS (bait types + chemicals)
  async getBaitTypes() {
    try {
      const res = await request("GET", "/materials/bait-types");

      // 🚨 FIX: Your backend returns {success: true, baitTypes: [...]}
      if (res?.success === true && Array.isArray(res.baitTypes)) {
        return res.baitTypes; // Return the array directly
      }
      
      // Alternative format: direct array
      if (Array.isArray(res)) {
        return res;
      }
      
      // Alternative format: {baitTypes: [...]} without success
      if (Array.isArray(res?.baitTypes)) {
        return res.baitTypes;
      }
      
      // Alternative format: {success: true, data: [...]}
      if (res?.success === true && Array.isArray(res.data)) {
        return res.data;
      }
      
      // Alternative format: {success: true, types: [...]}
      if (res?.success === true && Array.isArray(res.types)) {
        return res.types;
      }
      
      console.warn("⚠️ Unexpected bait types response format:", res);
      return [];
      
    } catch (error) {
      console.error("❌ Error in getBaitTypes:", error);
      return [];
    }
  },

  async postBaitTypes(types) {
    return request("POST", "/materials/bait-types", { baitTypes: types });
  },

  async getChemicals() {
    const res = await request("GET", "/materials/chemicals");

    if (!res) return [];
    
    // Handle different response formats
    if (Array.isArray(res)) {
      return res;
    } else if (res.chemicals && Array.isArray(res.chemicals)) {
      return res.chemicals;
    } else if (res.success && Array.isArray(res.data)) {
      return res.data;
    } else if (res.success === false) {
      console.error("❌ Chemicals API returned error:", res.error);
      return [];
    }
    
    console.warn("⚠️ Unexpected chemicals response format:", res);
    return [];
  },

  async postChemicals(chemicals) {
    return request("POST", "/materials/chemicals", { chemicals: chemicals });
  },

  async deleteCustomerMap(customerId, mapId) {
    return request("DELETE", `/customers/${customerId}/maps/${mapId}`);
  },

  // REPORTS
  async getVisitReport(visitId) {
    return request("GET", `/reports/visit/${visitId}`);
  },

  getCertificatePdfUrl(visitId) {
    if (!visitId) {
      throw new Error("Visit ID is required for certificate download");
    }

    return (
      `${API_BASE_URL}/certificates/pdf/` +
      encodeURIComponent(visitId)
    );
  },

  // CUSTOMER ENDPOINTS
  async getCustomerDashboard() {
    try {
      const result = await request("GET", "/customer/dashboard");

      if (result?.success) {
        return result;
      } else {
        console.error("❌ Dashboard API returned unsuccessful:", result);
        return {
          success: false,
          error: result?.error || "Failed to load dashboard",
          customer: null,
          nextAppointment: null,
          upcomingAppointments: []
        };
      }
    } catch (error) {
      console.error("❌ getCustomerDashboard error:", error);
      return {
        success: false,
        error: error.message,
        customer: null,
        nextAppointment: null,
        upcomingAppointments: []
      };
    }
  },

  async validateAppointmentDate(appointment) {
    if (!appointment || !appointment.date) {
      return { valid: false, reason: "No date provided" };
    }
    
    try {
      const appointmentDate = new Date(appointment.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      appointmentDate.setHours(0, 0, 0, 0);
      
      return {
        valid: appointmentDate >= today,
        isToday: appointmentDate.getTime() === today.getTime(),
        formattedDate: appointmentDate.toLocaleDateString('en-US'),
        rawDate: appointment.date
      };
    } catch (error) {
      console.error("❌ Date validation error:", error);
      return { valid: false, reason: "Invalid date format" };
    }
  },

  async createCustomerLogin(customerId, data) {
    return request("POST", `/customers/${customerId}/create-login`, data);
  },

  async changeCustomerPassword(currentPassword, newPassword) {
    try {
      const response = await request("POST", "/customer/change-password", {
        currentPassword,
        newPassword
      });
      return response;
    } catch (error) {
      console.error("❌ Change password API error:", error);
      
      // Don't throw the error - return it in a structured way
      return {
        success: false,
        error: error.message || "Failed to change password"
      };
    }
  },

  async getCustomerActualVisits(customerId) {
    if (!customerId) {
      console.warn("⚠️ getCustomerActualVisits called without customerId");
      return [];
    }
    try {
      const res = await request("GET", `/visits/customer/${customerId}`);
      if (!res || res.success !== true) {
        console.warn("⚠️ getCustomerActualVisits failed:", res?.error);
        return [];
      }

      return Array.isArray(res.visits) ? res.visits : [];
      
    } catch (error) {
      console.error("❌ getCustomerActualVisits error:", error);
      return [];
    }
  },

  // Logging methods
  async logBaitStation(data) {
    const stationData = {
      timestamp: data.timestamp,
      customerId: data.customerId,
      customerName: data.customerName || '',
      stationId: data.stationId,
      stationType: "BS", // Make sure this is always "BS"
      consumption: data.consumption || '',
      baitType: data.baitType || '',
      condition: data.condition || '',
      access: data.access || '',
      technicianId: data.technicianId,
      technicianName: data.technicianName || '',
      appointmentId: data.appointmentId || '',
      visitId: data.visitId,
      isVisitSummary: false
    };
    
    // 🚨 FIX: Use the correct endpoint for saving stations
    // Try multiple endpoints to find the right one
    try {
      // First try /station-logs (most logical)
      const result = await request("POST", "/station-logs", stationData);
      
      if (result?.success) {
        return result;
      }
    } catch (error) {
      console.warn("⚠️ /station-logs failed, trying /log-station...");
    }
    
    try {
      // Try /log-station (alternative)
      const result = await request("POST", "/log-station", stationData);
      if (result?.success) {
        return result;
      }
    } catch (error) {
      console.warn("⚠️ /log-station failed, trying /log...");
    }
    
    // Last resort: try /log with different structure
    try {
      const fallbackData = {
        ...stationData,
        action: 'station-log',
        serviceType: 'myocide'
      };
      const result = await request("POST", "/log", fallbackData);
      return result;
    } catch (error) {
      console.error("❌ All endpoints failed:", error);
      return { 
        success: false, 
        error: "No endpoint available to save station data" 
      };
    }
  },

  async logService(serviceData) {
    const formattedChemicals = serviceData.chemicalsUsed?.map(chem => {
      if (typeof chem === 'string') {
        return { name: chem, concentration: '', volume: '' };
      } else if (chem && typeof chem === 'object') {
        return {
          name: chem.name || chem.chemicalName || '',
          concentration: chem.concentration || chem.concentrationPercent || '',
          volume: chem.volume || chem.volumeMl || ''
        };
      }
      return { name: '', concentration: '', volume: '' };
    }).filter(chem => chem.name) || [];

    const formattedData = {
      ...serviceData,
      chemicalsUsed: formattedChemicals,
      // Ensure these fields are included
      insecticideDetails: serviceData.insecticideDetails || null,
      otherPestName: serviceData.otherPestName || null,
      disinfection_details: serviceData.disinfection_details || null,
      work_type: serviceData.work_type || null
    };

    const result = await request("POST", "/log-service", formattedData);
    
    if (result?.success) {
      return result;
    } else {
      console.error("❌ Failed to log service:", result?.error);
      throw new Error(result?.error || "Failed to save service");
    }
  },

  async getServiceLogByVisitId(visitId) {
    try {
      const response = await fetch(`${API_BASE_URL}/service-logs/${visitId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const text = await response.text();

      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        console.error("❌ Failed to parse response:", e);
        return { success: false, error: "Invalid response format" };
      }
      
      if (!response.ok) {
        return {
          success: false,
          error: data?.error || `HTTP ${response.status}`
        };
      }
      
      // Ensure data has the expected structure
      return {
        success: true,
        log: data.log || data.report || data,
        report: data.report || data.log || data
      };
      
    } catch (error) {
      console.error("❌ Error in getServiceLogByVisitId:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async getCustomerVisitHistory() {
    // Use the correct path with /visits prefix
    const result = await request("GET", "/visits/customer/portal/visits");
    return result;
  },

  async getVisitByAppointmentId(appointmentId) {
    if (!appointmentId) {
      return { success: false, visitId: null };
    }

    return request("GET", `/visits/by-appointment/${appointmentId}`);
  },
  
  async getVisitIdByAppointmentId(appointmentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/visits/by-appointment/${appointmentId}`);
      const data = await response.json();
      
      if (data.success && data.visitId) {
        return data.visitId;
      }
      return null;
    } catch (error) {
      console.error("Error getting visitId by appointment:", error);
      return null;
    }
  },

  async getBaitTypeNames() {
    try {
      const result = await this.getBaitTypes();
      if (result?.success && Array.isArray(result.types)) {
        return result.types.map(item => 
          typeof item === 'string' ? item : (item.name || item)
        );
      }
      return [];
    } catch (error) {
      console.error("Error getting bait type names:", error);
      return [];
    }
  },

  async getChemicalNames() {
    try {
      const result = await this.getChemicals();
      if (result?.success && Array.isArray(result.chemicals)) {
        return result.chemicals.map(item => 
          typeof item === 'string' ? item : (item.name || item)
        );
      }
      return [];
    } catch (error) {
      console.error("Error getting chemical names:", error);
      return [];
    }
  },

  async requestReschedule(appointmentId, data) {
    try {
      const result = await request("PUT", `/appointments/${appointmentId}/reschedule`, data);
      return result;
    } catch (error) {
      console.error("❌ Error requesting reschedule:", error);
      return {
        success: false,
        error: error.message || "Failed to submit reschedule request"
      };
    }
  },
  
  async logVisitSummary(data) {
    const visitData = {
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      customerId: data.customerId,
      customerName: data.customerName,
      technicianId: data.technicianId,
      technicianName: data.technicianName,
      totalStations: data.stationData?.totalStations || 0,
      loggedStations: data.stationData?.loggedStations || 0,
      appointmentId: data.appointmentId || '',
      workType: data.workType || 'Manual Visit',
      visitId: data.visitId,
      isVisitSummary: true
    };
    
    return request("POST", "/log", visitData);
  },

  async saveMapStations(mapId, stations) {
    return request("PUT", `/maps/${mapId}/stations`, { stations });
  },

  async logCompleteVisit(visitSummary, stations) {
    const completeData = {
      visitSummary,
      stations,
      action: 'complete-visit'
    };
    
    try {
      // Try the correct endpoint
      const result = await request("POST", "/visits/log-complete", completeData);

      if (!result) {
        throw new Error("No response from server");
      }
      
      // Check if we got a success response
      if (result.success === true) {
        return result;
      }
      
      // If not successful, check for error
      if (result.success === false) {
        throw new Error(result.error || "Save failed");
      }
      
      // Some endpoints might not have 'success' property
      if (result.visitId) {
        return { success: true, ...result };
      }
      
      throw new Error("Unexpected response format");
      
    } catch (error) {
      console.error("❌ logCompleteVisit error:", error);
      
      // Provide a more helpful error message
      const errorMessage = error.message || "Failed to save visit";
      
      // Check if it's a network error
      if (error.networkError) {
        throw new Error("Network error: Please check your internet connection");
      }
      
      // Check if endpoint doesn't exist
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.warn("⚠️ /visits/log-complete endpoint not found");
        
        // Try alternative: Fallback to old /log endpoint
        try {
          const visitData = {
            ...visitSummary,
            isVisitSummary: true,
            stationData: {
              totalStations: stations.length,
              loggedStations: stations.length
            }
          };
          
          const fallbackResult = await request("POST", "/log", visitData);

          if (fallbackResult?.success) {
            return {
              success: true,
              visitId: fallbackResult.visitId || fallbackResult.logId,
              message: "Visit saved via fallback"
            };
          }
        } catch (fallbackError) {
          console.error("❌ Fallback also failed:", fallbackError);
        }
      }
      
      throw new Error(`Save failed: ${errorMessage}`);
    }
  },

  async debugAppointment(id) {
    const getResult = await request("GET", `/appointments/${id}`);

    try {
      const debugResult = await request("GET", `/api/debug/appointment/${id}`);
      return debugResult;
    } catch (error) {
      console.log("ℹ️ No debug endpoint available");
    }
    
    return getResult;
  },

  async changeAdminPassword(currentPassword, newPassword) {
  return request("POST", "/admin/change-password", {
    currentPassword,
    newPassword
  });
},

async changeAdminPassword(
  currentPassword,
  newPassword
) {
  return request(
    "POST",
    "/admin/change-password",
    {
      currentPassword,
      newPassword
    }
  );
},

async submitPasswordRecovery(email) {
  return request(
    "POST",
    "/customer-requests/password-recovery",
    {
      email: email.trim().toLowerCase()
    }
  );
},

  async resetCustomerPassword(requestId, newPassword) {
    return request("POST", "/admin/reset-customer-password", {
      requestId,
      newPassword
    });
  },

  async getRevenueByCustomer(customerId) {
    if (!customerId) return { total_revenue: 0, appointment_count: 0 };

    const res = await request(
      "GET",
      `/statistics/revenue/customer/${customerId}`
    );

    if (!res || res.success === false) {
      console.warn("⚠️ Customer revenue fetch failed:", res?.error);
      return { total_revenue: 0, appointment_count: 0 };
    }

    return res.data || { total_revenue: 0, appointment_count: 0 };
  },

  async softDeleteCustomer(id) {
    const result = await request("DELETE", `/customers/${id}`);
    return result;
  },

  // RESTORE customer
  async restoreCustomer(id) {
    return request("POST", `/customers/${id}/restore`);
  },

  // GET deleted customers
  async getDeletedCustomers() {
    return request("GET", "/customers/deleted");
  },

  // PERMANENTLY DELETE customer
  async permanentDeleteCustomer(id) {
    const result = await request("DELETE", `/customers/${id}/permanent`);
    return result;
  },
};

export default {
  API_BASE_URL,
  ...apiService
};
