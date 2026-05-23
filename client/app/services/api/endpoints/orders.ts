import { request } from '../apiClient';

export interface OrderPricing {
  qty1: number;
  qty2: number;
  shippingCost1: number;
  shippingCost2: number;
  adminFee: number;
}

export interface OrderCreateResponse {
  success: boolean;
  orderId: string;
  totalPrice: number;
  pricing: OrderPricing;
  snapToken: string;
  snapUrl: string;
  error?: string;
}

export interface OrderCancelResponse {
  success: boolean;
  error?: string;
}

export const ordersApi = {
  createOrder: (formData: FormData) => 
    request<OrderCreateResponse>('/api/orders', {
      method: 'POST',
      body: formData,
    }),
    
  cancelOrder: (orderId: string) => 
    request<OrderCancelResponse>(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' }),
    }),
};
