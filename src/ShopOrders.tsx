import { useState } from 'react';
import { money, type ShopOrder } from './commerce';
import { storeRequest } from './store-api';

const nextStatus: Partial<Record<ShopOrder['fulfilment_status'], ShopOrder['fulfilment_status']>> = {
  payment_review: 'processing', processing: 'ready_for_dispatch', ready_for_dispatch: 'dispatched', dispatched: 'delivered',
};

function addressText(address: Record<string, string>) {
  return [address.line1, address.line2, address.town, address.province, address.postal_code].filter(Boolean).join(', ');
}

export function ShopOrders({ orders, refresh }: { orders: ShopOrder[]; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const move = async (order: ShopOrder, status: ShopOrder['fulfilment_status']) => {
    if (status === 'refunded' && !window.confirm('Confirm that you have already completed the refund in PayFast. This only records the completed refund in the store.')) return;
    setBusy(order.id); setMessage('');
    try {
      await storeRequest('/rest/v1/rpc/corporate_update_shop_fulfilment', {
        method: 'POST', body: JSON.stringify({ p_order_id: order.id, p_next_status: status, p_expected_updated_at: order.updated_at }),
      });
      await refresh(); setMessage(`Order ${order.id.slice(0, 8)} updated to ${status.replace(/_/g, ' ')}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Order could not be updated. Refresh and try again.');
    } finally { setBusy(''); }
  };

  return <section className="shop-orders-admin" aria-labelledby="shop-orders-title">
    <div className="admin-section-heading"><div><p className="admin-eyebrow">PAID STORE ORDERS</p><h2 id="shop-orders-title">Online shop orders</h2></div><span>{orders.length} recent</span></div>
    <p>Only verified PayFast notifications mark orders paid. Check payment review items and complete refunds in PayFast before recording them here.</p>
    {message && <p role="status" className="admin-notice">{message}</p>}
    {!orders.length && <div className="store-panel"><h3>No online shop orders yet</h3><p>Orders will appear here after a customer pays through PayFast.</p></div>}
    <div className="shop-order-list">{orders.map(order => {
      const action = nextStatus[order.fulfilment_status];
      return <article className="shop-order-card" key={order.id}>
        <header><div><strong>#{order.id.slice(0, 8)}</strong><small>{new Date(order.created_at).toLocaleString('en-ZA')}</small></div><div className="shop-order-badges"><span>{order.payment_status.replace(/_/g, ' ')}</span><span>{order.fulfilment_status.replace(/_/g, ' ')}</span></div></header>
        <div className="shop-order-summary"><div><strong>{order.customer_name}</strong><a href={`mailto:${order.email}`}>{order.email}</a><a href={`tel:${order.phone}`}>{order.phone}</a></div><div><strong>{money(order.total_cents)}</strong><small>{order.fulfilment_method === 'collection' ? 'Collection' : 'Courier delivery'}{order.fulfilment_cents ? ` · ${money(order.fulfilment_cents)}` : ''}</small></div></div>
        {order.fulfilment_method === 'delivery' && <p><strong>Delivery:</strong> {addressText(order.delivery_address)}</p>}
        <ul className="shop-order-items">{order.items.map((item,index)=><li key={`${item.sku}-${index}`}><span>{item.quantity} × {item.title}{item.options ? ` · ${item.options}` : ''}</span><strong>{money(item.unit_price_cents * item.quantity)}</strong></li>)}</ul>
        {order.payfast_payment_id && <p className="shop-payment-reference"><strong>PayFast reference:</strong> {order.payfast_payment_id}</p>}
        {order.payment_events.length > 0 && <details><summary>Payment events ({order.payment_events.length})</summary><ul>{order.payment_events.map((event,index)=><li key={`${event.event_type}-${index}`}><strong>{event.event_type.replace(/_/g,' ')}</strong> · {new Date(event.created_at).toLocaleString('en-ZA')}{event.provider_payment_id?` · ${event.provider_payment_id}`:''}{event.details.received_amount_cents?` · received ${money(Number(event.details.received_amount_cents))}`:''}</li>)}</ul></details>}
        <footer>{action && order.payment_status === 'paid' && <button className="button secondary" disabled={!!busy} onClick={()=>void move(order,action)}>{busy===order.id?'Saving…':order.fulfilment_status==='payment_review'?'Resolve review and process':'Mark '+action.replace(/_/g,' ')}</button>}
          {order.payment_status==='paid'&&order.fulfilment_status!=='refunded'&&<button className="button secondary" disabled={!!busy} onClick={()=>void move(order,'refunded')}>Record completed refund</button>}</footer>
      </article>;
    })}</div>
    <p>Showing up to 100 recent orders. Refresh data to check for new payments.</p>
  </section>;
}
