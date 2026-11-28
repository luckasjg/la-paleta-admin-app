import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Permite al personal del POS corregir solo el nombre y apellido de un cliente existente.
const STAFF_ROLES = ['admin', 'gerente', 'user'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { customer_id, full_name } = await req.json().catch(() => ({}));
    const name = String(full_name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!customer_id || name.length < 2) return Response.json({ error: 'Nombre inválido' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.Customer.get(customer_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!existing) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });

    await base44.asServiceRole.entities.Customer.update(customer_id, { full_name: name });
    return Response.json({ id: customer_id, full_name: name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}