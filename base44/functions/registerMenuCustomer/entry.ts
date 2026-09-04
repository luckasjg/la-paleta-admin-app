import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Registro público de clientes del menú móvil (sin contraseña).
 * Hace upsert del Customer por teléfono. Es público a propósito: el menú
 * lo usan visitantes sin sesión, igual que la creación de pedidos.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const phone = String(body?.phone || '').replace(/[^\d]/g, '').slice(0, 20);
    const fullName = String(body?.full_name || '').trim().slice(0, 80);
    const address = String(body?.address || '').trim().slice(0, 240);

    if (!fullName) return Response.json({ error: 'Nombre requerido' }, { status: 400 });
    if (phone.length < 7) return Response.json({ error: 'Teléfono inválido' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.Customer.filter({ phone });
    const current = (existing || [])[0];

    let customer;
    if (current) {
      customer = await base44.asServiceRole.entities.Customer.update(current.id, {
        full_name: fullName,
        address: address || current.address || '',
        is_registered: true,
      });
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        full_name: fullName,
        phone,
        address,
        is_registered: true,
      });
    }

    return Response.json({
      customer_id: customer?.id || current?.id,
      full_name: fullName,
      phone,
      address: address || customer?.address || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}