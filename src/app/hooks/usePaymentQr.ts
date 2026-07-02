import { useEffect, useState } from 'react';
import { useSSE } from '../contexts/SSEContext';
import * as api from '../utils/api';

const SETTING_KEY = 'paymentQrImageUrl';

export function usePaymentQr() {
  const { subscribe } = useSSE();
  const [qrImageUrl, setQrImageUrl] = useState<string>('');

  useEffect(() => {
    api
      .fetchSetting(SETTING_KEY)
      .then((v) => setQrImageUrl(typeof v === 'string' ? v : ''))
      .catch(() => {});

    const unsub = subscribe('SETTING_UPDATED', (data: { key: string; value: unknown }) => {
      if (data?.key === SETTING_KEY) {
        setQrImageUrl(typeof data.value === 'string' ? data.value : '');
      }
    });
    return unsub;
  }, [subscribe]);

  return { qrImageUrl };
}

