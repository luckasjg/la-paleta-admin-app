import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'gerente'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { coupon_id } = await req.json().catch(() => ({}));
    if (!coupon_id) return Response.json({ error: 'coupon_id is required' }, { status: 400 });

    const coupon = await base44.entities.CustomerCoupon.get(coupon_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!coupon) return Response.json({ error: 'Not found' }, { status: 404 });
    const customer = await base44.entities.Customer.get(coupon.customer_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    const email = (customer?.email || '').trim();
    if (!email) return Response.json({ sent: false, reason: 'no_email' });

    const res = await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      template_name: 'CouponAssigned',
      variables: {
        customer_name: customer.full_name || '',
        title: coupon.title || '',
        benefit: coupon.benefit || '',
        description: coupon.description || '',
        expires_text: coupon.expires_at ? `Válido hasta el ${coupon.expires_at}` : '',
      },
    }).catch((e) => ({ success: false, message: e.message }));
    if (res?.success === false) return Response.json({ sent: false, reason: res.reason || 'error', message: res.message });
    return Response.json({ sent: true, email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}