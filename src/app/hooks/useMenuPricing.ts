import { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { DEFAULT_MENU_PRICE_TABLE } from '../config/menuPricing';

export function useMenuPricing() {
  const { subscribe } = useSSE();
  const [priceTable, setPriceTable] = useState<Record<string, Record<number, number>>>(DEFAULT_MENU_PRICE_TABLE);
  const [comboToppings, setComboToppings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [prices, toppings] = await Promise.allSettled([
        api.fetchSetting('menuPriceTable'),
        api.fetchSetting('menuComboToppings'),
      ]);
      if (prices.status === 'fulfilled' && prices.value) {
        setPriceTable(prices.value);
      }
      if (toppings.status === 'fulfilled' && Array.isArray(toppings.value)) {
        setComboToppings(toppings.value);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = subscribe('SETTING_UPDATED', (data: { key: string; value: unknown }) => {
      if (data.key === 'menuPriceTable' && data.value) setPriceTable(data.value as Record<string, Record<number, number>>);
      if (data.key === 'menuComboToppings' && Array.isArray(data.value)) setComboToppings(data.value);
    });
    return unsub;
  }, [subscribe]);

  return { priceTable, comboToppings, loading, refresh: load };
}
