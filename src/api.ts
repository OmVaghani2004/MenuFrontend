import type { 
  Category, 
  MenuItem, 
  Table, 
  Order, 
  DashboardStats, 
  RestaurantInfo, 
  UserProfile, 
  Waiter,
  CreateWaiterResponse
} from './types';

// Allow dynamic API URL configuration for local dev only.
// In production (VITE_API_URL is set), always use the env URL — localStorage cannot override it.
export const getApiBaseUrl = (): string => {
  const productionUrl = import.meta.env.VITE_API_URL;
  if (productionUrl) return productionUrl; // Production: always use env var
  const savedUrl = localStorage.getItem('api_url');
  if (savedUrl) return savedUrl; // Local dev: allow localStorage override
  return 'https://localhost:44310'; // Local dev fallback
};

export const setApiBaseUrl = (url: string) => {
  localStorage.setItem('api_url', url);
};

// Simple fetch-based wrapper to avoid installing axios and keep it lightweight yet powerful
async function request<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;

  const headers = new Headers(options.headers || {});
  
  // Only set Content-Type to JSON if it's not FormData (which needs browser to set boundary)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.message || errorData?.title || errorMessage;
    } catch {
      try {
        errorMessage = await response.text() || errorMessage;
      } catch {
        // ignore
      }
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses or plain text
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  
  return (await response.text()) as unknown as T;
}

export const api = {
  // Authentication
  auth: {
    login: (dto: any) => 
      request<{ success: boolean; data: { token: string; username: string; role: string } }>('api/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    
    signup: (dto: any) =>
      request<{ success: boolean; message: string }>('api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    forgotPassword: (dto: { email: string }) =>
      request<{ success: boolean; message: string }>('api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    verifyOtp: (dto: { email: string; otpCode: string }) =>
      request<{ success: boolean; message: string; resetToken: string }>('api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    resetPassword: (dto: any) =>
      request<{ success: boolean; message: string }>('api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    getProfile: () =>
      request<{ success: boolean; data: UserProfile }>('api/auth/profile'),
      
    updateProfile: (dto: { username: string; email: string }) =>
      request<{ success: boolean; message: string }>('api/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    createWaiter: (dto: { username: string; email: string }) =>
      request<{ success: boolean; data: CreateWaiterResponse }>('api/auth/create-waiter', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    getWaiters: () =>
      request<{ success: boolean; data: Waiter[] }>('api/auth/waiters'),
  },

  // Restaurant settings & onboarding
  restaurant: {
    setupOnboarding: (dto: any) =>
      request<{ success: boolean; message: string }>('api/restaurant/setup', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    getInfo: () =>
      request<{ success: boolean; data: RestaurantInfo }>('api/restaurant/info'),
      
    updateInfo: (dto: Partial<RestaurantInfo>) =>
      request<{ success: boolean; message: string }>('api/restaurant/info', {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
  },

  // Menu Categories & Items
  menu: {
    getCategories: () =>
      request<{ success: boolean; data: Category[] }>('api/menu/categories'),
      
    addCategory: (category: Partial<Category>) =>
      request<string>('api/menu/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      }),
      
    deleteCategory: (id: number) =>
      request<string>(`api/menu/categories/${id}`, {
        method: 'DELETE',
      }),
      
    getItems: (categoryId: number) =>
      request<{ success: boolean; data: MenuItem[] }>(`api/menu/items?CategoryID=${categoryId}`),
      
    addMenuItem: (dto: any) =>
      request<{ success: boolean; menuItemId: number }>('api/menu/items', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    deleteMenuItem: (id: number) =>
      request<string>(`api/menu/items/${id}`, {
        method: 'DELETE',
      }),
  },

  // Images upload
  images: {
    upload: (formData: FormData) =>
      request<{
        success: boolean;
        message: string;
        count: number;
        images: { imageId: number; imageUrl: string; publicId: string }[];
      }>('api/MenuImage/upload', {
        method: 'POST',
        body: formData,
      }),
      
    delete: (imageId: number) =>
      request<{ success: boolean; message: string }>(`api/MenuImage/delete/${imageId}`, {
        method: 'DELETE',
      }),
  },

  // Tables
  tables: {
    getAll: () =>
      request<{ success: boolean; data: Table[] }>('api/Table'),
      
    createOrUpdate: (dto: any) =>
      request<{ success: boolean; message: string }>('api/Table', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`api/Table/${id}`, {
        method: 'DELETE',
      }),
  },

  // Orders
  orders: {
    place: (dto: any) =>
      request<{ success: boolean; data: Order }>('api/Order', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      
    getStats: () =>
      request<{ success: boolean; data: DashboardStats }>('api/Order/dashboard'),
      
    getActive: () =>
      request<{ success: boolean; data: Order[] }>('api/Order'), // GET api/Order returns active/all orders
      
    getKitchen: () =>
      request<{ success: boolean; data: Order[] }>('api/Order/kitchen'),
      
    getByMonth: (month: string, year?: number) =>
      request<{ success: boolean; data: Order[] }>(`api/Order/by-month?month=${month}${year ? `&year=${year}` : ''}`),
      
    updateStatus: (orderId: number, status: string) =>
      request<string>(`api/Order/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ newStatus: status }),
      }),
      
    markPaid: (orderId: number, paymentMode: string) =>
      request<{ success: boolean; message: string }>(`api/Order/${orderId}/pay`, {
        method: 'PUT',
        body: JSON.stringify({ paymentMode }),
      }),
  },
};
