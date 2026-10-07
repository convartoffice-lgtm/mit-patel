'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

// Whether the Shopify store is connected (server env vars set). null while loading.
export function useShopifyCheckoutEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/shopify/status')
      .then(res => (res.ok ? res.json() : { enabled: false }))
      .then(data => setEnabled(Boolean(data.enabled)))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

const readJson = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

interface ShopifyCheckoutButtonProps {
  label?: string;
  color?: string;
}

// Sends the pending order to /api/shopify/checkout and redirects to Shopify's secure checkout.
const ShopifyCheckoutButton = ({ label = 'Pay securely online', color = '#00BFBF' }: ShopifyCheckoutButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setError('');
    const pending = readJson('pendingOrderData');
    const checkoutData = readJson('checkoutData');
    const customer = pending?.customerInfo || readJson('customerInfo');
    const items = pending?.items || checkoutData?.items;

    if (!items?.length || !customer) {
      setError('Your order details were not found. Please go back to checkout.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/shopify/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          items,
          customer,
          uploadedImageUrl: localStorage.getItem('uploadedImageUrl'),
          cartSessionId: checkoutData?.sessionId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Could not start checkout. Please try again.');
      }
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err?.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="text-center font-body">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 rounded-xl text-white font-cta font-bold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: color }}
      >
        {loading ? 'Opening secure checkout…' : label}
      </button>
      <p className="text-xs text-gray-500 mt-2">
        Cards, UPI, net banking and EMI · Secure checkout powered by Shopify
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
};

export default ShopifyCheckoutButton;
