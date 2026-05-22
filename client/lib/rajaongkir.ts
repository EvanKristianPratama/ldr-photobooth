// TypeScript interfaces for RajaOngkir API Responses

export interface RajaOngkirProvince {
  province_id: string;
  province: string;
}

export interface RajaOngkirCity {
  city_id: string;
  province_id: string;
  province: string;
  type: 'Kota' | 'Kabupaten';
  city_name: string;
  postal_code: string;
}

export interface RajaOngkirCostDetail {
  value: number;
  etd: string;
  note: string;
}

export interface RajaOngkirCostOption {
  service: string;
  description: string;
  cost: RajaOngkirCostDetail[];
}

export interface RajaOngkirCourierResult {
  code: string;
  name: string;
  costs: RajaOngkirCostOption[];
}

export interface RajaOngkirResponse<T> {
  rajaongkir: {
    query: any;
    status: {
      code: number;
      description: string;
    };
    results: T;
  };
}

const API_KEY = process.env.RAJAONGKIR_API_KEY || '';
const BASE_URL = 'https://api.rajaongkir.com/starter';

// Premium Mock Data for fallback
export const MOCK_PROVINCES: RajaOngkirProvince[] = [
  { province_id: '6', province: 'DKI Jakarta' },
  { province_id: '9', province: 'Jawa Barat' },
  { province_id: '10', province: 'Jawa Tengah' },
  { province_id: '11', province: 'Jawa Timur' },
  { province_id: '3', province: 'Banten' },
  { province_id: '5', province: 'DI Yogyakarta' },
  { province_id: '1', province: 'Bali' },
];

export const MOCK_CITIES: Record<string, RajaOngkirCity[]> = {
  '6': [
    { city_id: '152', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Pusat', postal_code: '10110' },
    { city_id: '153', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Selatan', postal_code: '12190' },
    { city_id: '151', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Barat', postal_code: '11210' },
    { city_id: '154', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Utara', postal_code: '14110' },
    { city_id: '155', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Timur', postal_code: '13110' },
  ],
  '9': [
    { city_id: '23', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Bandung', postal_code: '40111' },
    { city_id: '78', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Bogor', postal_code: '16111' },
    { city_id: '115', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Depok', postal_code: '16411' },
    { city_id: '55', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Bekasi', postal_code: '17111' },
  ],
  '10': [
    { city_id: '399', province_id: '10', province: 'Jawa Tengah', type: 'Kota', city_name: 'Semarang', postal_code: '50111' },
    { city_id: '427', province_id: '10', province: 'Jawa Tengah', type: 'Kota', city_name: 'Surakarta (Solo)', postal_code: '57111' },
  ],
  '11': [
    { city_id: '444', province_id: '11', province: 'Jawa Timur', type: 'Kota', city_name: 'Surabaya', postal_code: '60111' },
    { city_id: '255', province_id: '11', province: 'Jawa Timur', type: 'Kota', city_name: 'Malang', postal_code: '65111' },
  ],
  '3': [
    { city_id: '457', province_id: '3', province: 'Banten', type: 'Kota', city_name: 'Tangerang', postal_code: '15111' },
    { city_id: '455', province_id: '3', province: 'Banten', type: 'Kota', city_name: 'Tangerang Selatan', postal_code: '15310' },
  ],
  '5': [
    { city_id: '501', province_id: '5', province: 'DI Yogyakarta', type: 'Kota', city_name: 'Yogyakarta', postal_code: '55111' },
  ],
  '1': [
    { city_id: '114', province_id: '1', province: 'Bali', type: 'Kota', city_name: 'Denpasar', postal_code: '80111' },
    { city_id: '1', province_id: '1', province: 'Bali', type: 'Kabupaten', city_name: 'Badung', postal_code: '80351' },
  ],
};

// Estimate shipping cost mock logic
function calculateMockCost(destinationCityId: string): number {
  const destId = parseInt(destinationCityId, 10);
  if (destId === 23 || destId === 275) return 9000; // Same city (Bandung / Cimahi)
  if (['78', '115', '55', '182', '272', '457', '455', '88'].includes(destinationCityId)) return 11000; // West Java & Banten
  if (['152', '151', '153', '154', '155'].includes(destinationCityId)) return 15000; // Jakarta / Jabodetabek
  if (['399', '427', '177', '501', '113', '27'].includes(destinationCityId)) return 22000; // Central Java & DIY
  if (['444', '255', '294'].includes(destinationCityId)) return 28000; // East Java
  if (['114', '1'].includes(destinationCityId)) return 38000; // Bali
  if (['318', '404', '456'].includes(destinationCityId)) return 48000; // Sumatra / Sulawesi / Outer Islands
  
  // Default fallback cost
  return 25000;
}

export async function getProvinces(): Promise<RajaOngkirProvince[]> {
  if (!API_KEY) {
    console.log('RajaOngkir API Key is missing. Using premium mock fallback.');
    return MOCK_PROVINCES;
  }

  try {
    const res = await fetch(`${BASE_URL}/province`, {
      headers: { key: API_KEY },
      next: { revalidate: 86400 } // Cache for 24h
    });
    
    if (!res.ok) throw new Error(`RajaOngkir returned status ${res.status}`);
    
    const data = (await res.json()) as RajaOngkirResponse<RajaOngkirProvince[]>;
    return data.rajaongkir.results;
  } catch (error) {
    console.error('Failed fetching provinces from RajaOngkir, using mock fallback:', error);
    return MOCK_PROVINCES;
  }
}

export async function getCities(provinceId: string): Promise<RajaOngkirCity[]> {
  if (!API_KEY) {
    return MOCK_CITIES[provinceId] || [];
  }

  try {
    const res = await fetch(`${BASE_URL}/city?province=${provinceId}`, {
      headers: { key: API_KEY },
      next: { revalidate: 86400 } // Cache for 24h
    });

    if (!res.ok) throw new Error(`RajaOngkir returned status ${res.status}`);

    const data = (await res.json()) as RajaOngkirResponse<RajaOngkirCity[]>;
    return data.rajaongkir.results;
  } catch (error) {
    console.error(`Failed fetching cities for province ${provinceId}, using mock fallback:`, error);
    return MOCK_CITIES[provinceId] || [];
  }
}

export async function calculateShippingCost(
  destinationCityId: string,
  weightGrams = 1000,
  courier = 'jne'
): Promise<number> {
  const originCityId = '23'; // Workshop Bandung (Bandung)

  if (!API_KEY) {
    // Delay slightly to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 600));
    return calculateMockCost(destinationCityId);
  }

  try {
    const res = await fetch(`${BASE_URL}/cost`, {
      method: 'POST',
      headers: {
        key: API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        origin: originCityId,
        destination: destinationCityId,
        weight: weightGrams.toString(),
        courier,
      }),
    });

    if (!res.ok) throw new Error(`RajaOngkir returned status ${res.status}`);

    const data = (await res.json()) as RajaOngkirResponse<RajaOngkirCourierResult[]>;
    const courierResult = data.rajaongkir.results[0];
    
    if (!courierResult || !courierResult.costs || courierResult.costs.length === 0) {
      throw new Error('No shipping service option returned from RajaOngkir');
    }

    // Return the cost of the first available shipping option (usually REG)
    const cheapestService = courierResult.costs[0];
    return cheapestService.cost[0].value;
  } catch (error) {
    console.error(`Failed to calculate cost for city ${destinationCityId}, using mock fallback:`, error);
    return calculateMockCost(destinationCityId);
  }
}
