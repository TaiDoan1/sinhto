'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../utils/api';
import { useSSE } from './SSEContext';

export interface Product {
  id: string;
  name: string;
  category: 'smoothies' | 'toppings' | 'combo';
  basePrice: number;
  image: string;
  description?: string;
}

interface MenuContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  saveProduct: (product: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useSSE();

  const refreshProducts = async () => {
    try {
      setLoading(true);
      const data = await api.fetchProducts();
      setProducts(data);
      setError(null);
    } catch (err: any) {
      console.error('Lỗi khi tải sản phẩm:', err);
      setError(err.message || 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProducts();

    // Subscribe to SSE updates
    const unsubscribeCreated = subscribe('PRODUCT_CREATED', (newProd) => {
      setProducts((prev) => {
        if (prev.some((p) => p.id === newProd.id)) return prev;
        return [...prev, newProd];
      });
    });

    const unsubscribeUpdated = subscribe('PRODUCT_UPDATED', (updatedProd) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
      );
    });

    const unsubscribeDeleted = subscribe('PRODUCT_DELETED', ({ id }) => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [subscribe]);

  const saveProduct = async (product: any) => {
    try {
      const saved = await api.saveProduct(product);
      setProducts((prev) => {
        const index = prev.findIndex((p) => p.id === saved.id);
        if (index > -1) {
          return prev.map((p) => (p.id === saved.id ? saved : p));
        } else {
          return [...prev, saved];
        }
      });
    } catch (err: any) {
      throw new Error(err.message || 'Lỗi khi lưu sản phẩm');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Lỗi khi xóa sản phẩm');
    }
  };

  return (
    <MenuContext.Provider
      value={{
        products,
        loading,
        error,
        refreshProducts,
        saveProduct,
        deleteProduct,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu phải được sử dụng bên trong MenuProvider');
  }
  return context;
}
