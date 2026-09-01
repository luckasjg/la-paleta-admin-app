import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const normalizePhone = (phone) => String(phone || '').replace(/[^\d]/g, '');

/**
 * Portal público de clientes del menú móvil.
 * Permite buscar los datos de un cliente por su teléfono exacto y registrar/actualizar
 * su ficha, sin exponer la lista completa de clientes al público.
 *
 * Acciones:
 *  - { action: 'lookup', phone }  -> { customer: {id, full_name, phone, address} | null }
 *  - { action: 'save', full_name, phone, address, email } -> { customer }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const phone = normalizePhone(body?.phone);

    if (!phone || phone.length < 7) {
      return Response.json({ error: 'Teléfono inválido' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Customer.filter({ phone });
    const found = (existing || [])[0] || null;

    if (action === 'lookup') {
      return Response.json({
        customer: found
          ? {
              id: found.id,
              full_name: found.full_name,
              phone: found.phone,
              address: found.address || '',
            }
          : null,
      });
    }

    if (action === 'save') {
      const fullName = String(body?.full_name || '').trim();
      if (!fullName) {
        return Response.json({ error: 'Nombre requerido' }, { status: 400 });
      }
      const payload = {
        full_name: fullName,
        phone,
        address: String(body?.address || '').trim(),
        email: String(body?.email || '').trim(),
        is_registered: true,
      };
      const customer = found
        ? await base44.asServiceRole.entities.Customer.update(found.id, payload)
        : await base44.asServiceRole.entities.Customer.create(payload);
      return Response.json({
        customer: {
          id: customer.id,
          full_name: customer.full_name,
          phone: customer.phone,
          address: customer.address || '',
        },
      });
    }

    return Response.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}