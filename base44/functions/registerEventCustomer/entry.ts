import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Registro público desde la landing del evento (visitantes sin sesión).
 * Si el teléfono ya existe se vincula al cliente: sólo se marcan los campos
 * del evento (y el Instagram si no tenía), sin sobrescribir sus datos.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone || '').replace(/[^\d]/g, '').slice(0, 20);
    const fullName = String(body?.full_name || '').trim().slice(0, 80);
    const instagram = String(body?.instagram || '').trim().replace(/^@/, '').replace(/[^\w.]/g, '').slice(0, 40);

    if (!fullName) return Response.json({ error: 'Nombre requerido' }, { status: 400 });
    if (phone.length < 7) return Response.json({ error: 'Teléfono inválido' }, { status: 400 });

    const db = base44.asServiceRole.entities.Customer;
    const current = ((await db.filter({ phone })) || [])[0];
    const now = new Date().toISOString();

    if (current) {
      if (current.category === 'Evento') return Response.json({ ok: true, already: true });
      await db.update(current.id, {
        category: 'Evento', event_status: 'pendiente', event_registered_at: now,
        ...(current.instagram ? {} : { instagram }),
      });
    } else {
      await db.create({
        full_name: fullName, phone, instagram, is_registered: true,
        category: 'Evento', event_status: 'pendiente', event_registered_at: now,
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}