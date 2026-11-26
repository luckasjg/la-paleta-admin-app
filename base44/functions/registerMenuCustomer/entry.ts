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

    // Solo se vincula a un cliente existente si coinciden cédula Y teléfono.
    if (cedula.length >= 5) {
      const match = await db.filter({ cedula, phone });
      customer = (match || [])[0] || null;
    }

    if (!customer && wantsRegister) {
      // Si el teléfono o la cédula ya pertenecen a otro cliente, el pedido sigue
      // como invitado: nunca se modifica ni se entrega un perfil ajeno.
      const byPhone = await db.filter({ phone });
      const byCedula = cedula.length >= 5 ? await db.filter({ cedula }) : [];
      if ((byPhone || []).length === 0 && (byCedula || []).length === 0) {
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