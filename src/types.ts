export interface Category {
  categoryId: number;
  categoryName: string;
  isActive?: boolean;  // Not in backend entity — treat as optional
  createdBy?: number;
  createdAt?: string;
  updatedBy?: number;
  updatedAt?: string;
}

export interface MenuImage {
  imageId: number;
  imageUrl: string;
  publicId: string;
  isPrimary: boolean;
  menuItemId?: number;
  createdAt?: string;
}

export interface MenuItem {
  itemId: number;
  categoryId: number;
  foodName: string;
  description?: string;
  price: number;
  approxTime?: string;
  weight?: string;
  isVeg: boolean;
  isDinner: boolean;
  soldOut: boolean;
  isPopular: boolean;
  isNewItem: boolean;
  isChefsChoice: boolean;
  createdAt: string;
  images: MenuImage[];
}

export interface Table {
  tableId: number;
  tableNumber: string;
  tableName?: string;
  location?: string;
  capacity: number;
  isActive: boolean;
  qrUrl: string;
  /** Opaque token used in QR code URLs instead of the raw tableId */
  qrToken: string;
  tableStatus: 'Empty' | 'Occupied' | 'Pending' | string;
  activeOrderId?: number;
  createdAt: string;
}

export interface OrderItem {
  orderItemId: number;
  menuItemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  orderId: number;
  orderNumber: string;
  tableId?: number;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled' | string;
  totalAmount: number;
  notes?: string;
  isPaid: boolean;
  paymentMode?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
  /** Returned only on PlaceOrder — the customer must store this and send it back on EditOrder */
  editToken?: string;
}

export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  tablesOccupied: number;
  totalTables: number;
  avgOrderValue: number;
  totalMenuItems: number;
}

export interface RestaurantInfo {
  restaurantName: string;
  description?: string;
  cuisineTypes: string[];
  phoneNumber?: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  openingHours?: string;
}

export interface UserProfile {
  username: string;
  email: string;
  role: 'Owner' | 'Waiter' | string;
}

export interface Waiter {
  waiterId: number;
  username: string;
  email: string;
  role: string;
  createdBy: number;
  createdAt: string;
}

export interface CreateWaiterResponse {
  waiterId: number;
  username: string;
  email: string;
  role: string;
  temporaryPassword: string;
  token: string;
  tokenExpiresAt: string;
}
