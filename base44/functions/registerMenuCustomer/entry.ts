import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Identificación/registro público de clientes del menú móvil (sin contraseña).
 * - Si llega una cédula que coincide con un cliente, devuelve solo su id
 *   (nunca sus datos) para vincular el pedido y sumar puntos.
 * - Si no coincide y el cliente pidió registrarse, hace upsert por teléfono.
 * - Si no coincide y no pidió registro, el pedido sigue como invitado.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const phone = String(body?.phone || '').replace(/[^\d]/g, '').slice(0, 20);
    const cedula = String(body?.cedula || '').replace(/[^\d]/g, '').slice(0, 12);
    const fullName = String(body?.full_name || '').trim().slice(0, 80);
    const address = String(body?.address || '').trim().slice(0, 240);
    const wantsRegister = body?.register !== false;

    if (!fullName) return Response.json({ error: 'Nombre requerido' }, { status: 400 });
    if (phone.length < 7) return Response.json({ error: 'Teléfono inválido' }, { status: 400 });

    const db = base44.asServiceRole.entities.Customer;
    let customer = null;

    if (cedula.length >= 5) {
      const byCedula = await db.filter({ cedula });
      customer = (byCedula || [])[0] || null;
    }

    if (!customer && wantsRegister) {
      const byPhone = await db.filter({ phone });
      customer = (byPhone || [])[0] || null;
      if (customer && cedula.length >= 5 && !customer.cedula) {
        await db.update(customer.id, { cedula });
      }
      if (!customer) {
        customer = await db.create({
          full_name: fullName,
          phone,
          address,
          ...(cedula.length >= 5 ? { cedula } : {}),
          is_registered: true,
        });
      }
    }

    if (!customer) return Response.json({ customer_id: null });

    return Response.json({
      customer_id: customer.id,
      full_name: fullName,
      phone,
      address,
      cedula,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}