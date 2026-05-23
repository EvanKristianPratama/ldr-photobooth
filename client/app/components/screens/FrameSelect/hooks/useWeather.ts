import { useState, useEffect } from 'react';

export interface WeatherData {
  temp: number;
  label: string;
  emoji: string;
  city: string;
}

const WEATHER_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Cerah', emoji: '☀️' },
  1: { label: 'Cerah Berawan', emoji: '🌤️' },
  2: { label: 'Berawan', emoji: '⛅' },
  3: { label: 'Mendung', emoji: '☁️' },
  45: { label: 'Kabut', emoji: '🌫️' },
  48: { label: 'Kabut Rime', emoji: '🌫️' },
  51: { label: 'Gerimis Ringan', emoji: '🌦️' },
  53: { label: 'Gerimis Sedang', emoji: '🌦️' },
  55: { label: 'Gerimis Lebat', emoji: '🌧️' },
  61: { label: 'Hujan Ringan', emoji: '🌧️' },
  63: { label: 'Hujan Sedang', emoji: '🌧️' },
  65: { label: 'Hujan Lebat', emoji: '🌧️' },
  80: { label: 'Hujan Shower Ringan', emoji: '🌦️' },
  81: { label: 'Hujan Shower Sedang', emoji: '🌧️' },
  82: { label: 'Hujan Shower Deras', emoji: '⛈️' },
  95: { label: 'Badai Guntur', emoji: '⛈️' },
  96: { label: 'Badai dengan Hujan Es', emoji: '⛈️' },
  99: { label: 'Badai Guntur Hebat', emoji: '⛈️' },
};

export function useWeather(participants: any[] = [], locationsById: any = {}, setWeatherText: (text: string) => void) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeather = () => {
    setLoading(true);
    setError('');

    const handleSuccess = async (lat: number, lon: number, cityName = '') => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (!res.ok) throw new Error('Gagal mengambil data cuaca');
        const data = await res.json();
        const current = data.current_weather;
        if (current) {
          const wInfo = WEATHER_CODES[current.weathercode] || { label: 'Berawan', emoji: '⛅' };
          const roundedTemp = Math.round(current.temperature);
          setWeather({
            temp: roundedTemp,
            label: wInfo.label,
            emoji: wInfo.emoji,
            city: cityName || 'Lokasi Anda'
          });
          setWeatherText(`${wInfo.emoji} ${roundedTemp}°C`);
        }
      } catch (err: any) {
        setError('Gagal memuat cuaca');
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let city = '';
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              city = geoData.address.city || geoData.address.town || geoData.address.municipality || geoData.address.state || '';
            }
          } catch (e) {
            console.log('Reverse geocoding failed, falling back.');
          }
          if (!city && participants[0]?.id && locationsById[participants[0].id]) {
            city = locationsById[participants[0].id].city;
          }
          handleSuccess(latitude, longitude, city);
        },
        () => {
          const pLoc = participants[0]?.id ? locationsById[participants[0].id] : null;
          if (pLoc && pLoc.latitude && pLoc.longitude) {
            handleSuccess(pLoc.latitude, pLoc.longitude, pLoc.city);
          } else {
            handleSuccess(-6.9175, 107.6191, 'Bandung');
          }
        }
      );
    } else {
      const pLoc = participants[0]?.id ? locationsById[participants[0].id] : null;
      if (pLoc && pLoc.latitude && pLoc.longitude) {
        handleSuccess(pLoc.latitude, pLoc.longitude, pLoc.city);
      } else {
        handleSuccess(-6.9175, 107.6191, 'Bandung');
      }
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return { weather, loading, error, fetchWeather };
}
