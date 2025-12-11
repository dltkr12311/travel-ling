import { CheckSquare, Loader2, Sunrise, Thermometer, Wind } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  generatePackingList,
  getSokchoWeatherAndSunrise,
} from '../services/geminiService';
import { WeatherInfo } from '../types';

const SunriseView: React.FC = () => {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [packingList, setPackingList] = useState<string[]>([]);
  const [loadingPacking, setLoadingPacking] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await getSokchoWeatherAndSunrise();
      setWeather(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const loadPackingList = async () => {
    setLoadingPacking(true);
    const list = await generatePackingList();
    setPackingList(list);
    setLoadingPacking(false);
  };

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-96 gap-4'>
        <Loader2 className='animate-spin text-orange-500' size={48} />
        <p className='text-slate-500 text-sm animate-pulse'>
          Consulting meteorological AI for Dec 13, 2025...
        </p>
      </div>
    );
  }

  return (
    <div className='p-4 max-w-2xl mx-auto pb-24'>
      {/* Hero Section */}
      <div className='relative rounded-3xl overflow-hidden shadow-2xl mb-8 h-80'>
        <div className='absolute inset-0 bg-gradient-to-b from-orange-400 via-orange-300 to-blue-300 opacity-90 z-0'></div>
        {/* Decorative Sun */}
        <div className='absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-orange-100 rounded-full blur-3xl z-0'></div>

        <div className='relative z-10 flex flex-col items-center justify-center h-full text-center p-6 text-white'>
          <div className='flex items-center gap-2 mb-2 text-orange-900/70 font-bold uppercase text-sm tracking-wider'>
            <Sunrise size={16} />
            <span>Target: 청대산 일출</span>
          </div>
          <h1 className='text-5xl font-bold text-white mb-2 drop-shadow-lg font-mono'>
            {weather?.sunriseTime}
          </h1>
          <p className='text-white/90 font-medium text-lg'>December 13, 2025</p>
          <div className='mt-6 flex gap-6'>
            <div className='bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl flex flex-col items-center'>
              <Thermometer size={20} className='mb-1' />
              <span className='text-sm font-bold'>
                {weather?.tempLow}°C / {weather?.tempHigh}°C
              </span>
            </div>
            <div className='bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl flex flex-col items-center'>
              <Wind size={20} className='mb-1' />
              <span className='text-sm font-bold'>{weather?.windSpeed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Advice Card */}
      <div className='bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6'>
        <h3 className='font-bold text-slate-800 mb-3 flex items-center gap-2'>
          <div className='w-2 h-6 bg-orange-500 rounded-full'></div>
          Hiker's Advisory
        </h3>
        <p className='text-slate-600 text-sm leading-relaxed'>
          {weather?.hikingAdvice}
        </p>
      </div>

      {/* Packing List Generator */}
      <div className='bg-slate-800 rounded-xl p-6 text-white shadow-lg'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='font-bold flex items-center gap-2'>
            <CheckSquare size={18} className='text-green-400' />
            Smart Packing List
          </h3>
          <button
            onClick={loadPackingList}
            disabled={loadingPacking || packingList.length > 0}
            className='text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors disabled:opacity-50'
          >
            {loadingPacking
              ? 'Generating...'
              : packingList.length > 0
              ? 'Generated'
              : 'Generate with AI'}
          </button>
        </div>

        {packingList.length === 0 && !loadingPacking && (
          <p className='text-slate-400 text-xs italic'>
            Tap to generate a list based on the weather forecast.
          </p>
        )}

        <div className='grid grid-cols-2 gap-3'>
          {packingList.map((item, idx) => (
            <div
              key={idx}
              className='flex items-center gap-2 text-sm text-slate-200'
            >
              <div className='w-1.5 h-1.5 rounded-full bg-green-400'></div>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SunriseView;
