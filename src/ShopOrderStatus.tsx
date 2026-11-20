import { useCallback, useEffect, useState } from 'react';
import { money } from './commerce';
import { storeRequest } from './store-api';
import { companyEmail } from './contact-details';

type OrderStatus = {
  id: string;
  payment_status: string;
  fulfilment_status: string;
  total_cents: number;
  items: Array<{ title: string; quantity: number; unit_price_cents: number }>;
};

const tokenKey = (orderId: string) => `tech-guard:shop-order:${orderId}`;

export function ShopOrderStatus({ onPaid }: { onPaid: () => void }) {
  const query = new URLSearchParams(window.location.search);
  const orderId = query.get('order') || '';
  const payment = query.get('payment');
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const check = useCallback(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      setMessage('The secure order reference is missing. Contact us if you completed a payment.');
      return;
    }
    let accessToken = '';
    try { accessToken = sessionStorage.getItem(tokenKey(orderId)) || ''; } catch { /* Storage may be disabled. */ }
    if (!/^[a-f0-9]{64}$/i.test(accessToken)) {
      setMessage('This browser does not have the secure order key. Contact us if you completed a payment.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const result = await storeRequest('/functions/v1/payfast-order-status', {
        method: 'POST', body: JSON.stringify({ orderId, accessToken }),
      });
      if (!result || typeof result !== 'object' || !('payment_status' in result)) {
        throw new Error('Order status could not be checked.');
      }
      const status = result as OrderStatus;
      setOrder(status);
      if (status.payment_status === 'paid' || status.payment_status === 'failed' || status.payment_status === 'expired') {
        try { sessionStorage.removeItem(tokenKey(orderId)); } catch { /* Ignore unavailable storage. */ }
      }
      if (status.payment_status === 'paid') onPaid();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Order status could not be checked.');
    } finally {
      setLoading(false);
    }
  }, [onPaid, orderId]);

  useEffect(() => {
    if (payment === 'return' || payment === 'cancelled') void check();
  }, [check, payment]);
  if (!payment) return null;

  const heading = payment === 'cancelled' && order?.payment_status !== 'paid'
    ? 'Payment was cancelled'
    : order?.payment_status === 'paid' ? 'Payment received' : 'Checking your payment';
  let detail = 'PayFast has returned you to the store. We are waiting for its server confirmation.';
  if (order?.payment_status === 'paid') {
    detail = order.fulfilment_status === 'payment_review'
      ? 'Payment is confirmed. We are checking stock and will contact you about the next step.'
      : 'Your payment is confirmed and the order is in our fulfilment queue.';
  } else if (order?.payment_status === 'failed' || payment === 'cancelled') {
    detail = 'No completed payment was reported by PayFast. Your basket is still available if you want to try again.';
  } else if (order?.payment_status === 'expired') {
    detail = 'This payment window expired before we received confirmation. Contact us before trying again.';
  }

  return <section className="container shop-payment-result" aria-labelledby="payment-result-title">
    <p className="showroom-brand">TECH &amp; GUARD STORE</p>
    <h1 id="payment-result-title">{heading}</h1>
    <p role="status">{loading ? 'Checking the verified payment status…' : detail}</p>
    {message && <p role="alert">{message}</p>}
    {order && <>
      <p className="order-reference">Order reference: {order.id}</p>
      <p>Order total: {money(order.total_cents)}</p>
      <ul>{order.items?.map((item, index) => <li key={`${item.title}-${index}`}>
        {item.quantity} × {item.title} — {money(item.unit_price_cents)} each
      </li>)}</ul>
    </>}
    {order?.payment_status !== 'paid' && <button className="button secondary" disabled={loading} onClick={() => void check()}>
      {loading ? 'Checking…' : 'Refresh payment status'}
    </button>}
    <p><a className="text-link" href={`mailto:${companyEmail}?subject=${encodeURIComponent('Tech & Guard order ' + orderId)}`}>
      Contact Tech &amp; GUARD about this order
    </a></p>
  </section>;
}
