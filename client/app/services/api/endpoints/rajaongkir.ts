import { request } from '../apiClient';

export interface Province {
  province_id: string;
  province: string;
}

export interface City {
  city_id: string;
  city_name: string;
  type: string;
  postal_code: string;
}

export const rajaOngkirApi = {
  getProvinces: () => 
    request<{ provinces: Province[] }>('/api/rajaongkir/provinces'),
    
  getCities: (provinceId: string) => 
    request<{ cities: City[] }>(`/api/rajaongkir/cities?provinceId=${provinceId}`),
};
