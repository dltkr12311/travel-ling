import { useEffect, useState } from 'react';
import { getSokchoWeatherAndSunrise } from '../../../services/geminiService';
import { WeatherInfo } from '../../../types';

export const useWeather = () => {
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  useEffect(() => {
    const loadWeather = async () => {
      setIsLoadingWeather(true);
      const info = await getSokchoWeatherAndSunrise();
      setWeatherInfo(info);
      setIsLoadingWeather(false);
    };
    loadWeather();
  }, []);

  return {
    weatherInfo,
    isLoadingWeather,
  };
};
