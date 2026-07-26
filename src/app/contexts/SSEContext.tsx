'use client';

import React, { createContext, useContext, useEffect } from 'react';

type SSEListener = (data: any) => void;

interface SSEContextType {
  subscribe: (eventType: string, callback: SSEListener) => () => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const listenersMap = React.useRef<Map<string, Set<SSEListener>>>(new Map());

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    let hadConnectedBefore = false;

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, data } = parsed;
        const listeners = listenersMap.current.get(type);
        if (listeners) {
          listeners.forEach((cb) => cb(data));
        }
      } catch (err) {
        console.error('Lỗi phân tích cú pháp SSE:', err);
      }
    };

    // Trình duyệt tự retry kết nối EventSource, nhưng bất kỳ sự kiện nào server bắn ra trong
    // lúc mất kết nối đều bị bỏ lỡ vĩnh viễn (không có cơ chế phát lại). onopen bắn lại mỗi lần
    // kết nối/kết nối lại thành công — dùng làm tín hiệu "SSE_RECONNECTED" để các Context (đơn
    // hàng, ...) tự tải lại dữ liệu mới nhất, tránh phải F5 mới thấy đơn/tin nhắn bị lỡ.
    eventSource.onopen = () => {
      if (hadConnectedBefore) {
        const listeners = listenersMap.current.get('SSE_RECONNECTED');
        if (listeners) listeners.forEach((cb) => cb(null));
      }
      hadConnectedBefore = true;
    };

    eventSource.onerror = (err) => {
      console.error('Lỗi kết nối SSE, đang thử kết nối lại...', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const subscribe = (eventType: string, callback: SSEListener) => {
    if (!listenersMap.current.has(eventType)) {
      listenersMap.current.set(eventType, new Set());
    }
    listenersMap.current.get(eventType)!.add(callback);

    return () => {
      const listeners = listenersMap.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersMap.current.delete(eventType);
        }
      }
    };
  };

  return (
    <SSEContext.Provider value={{ subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE phải được sử dụng bên trong SSEProvider');
  }
  return context;
}
