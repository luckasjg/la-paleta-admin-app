import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const normalizePhone = (phone) => String(phone || '').replace(/[^\d]/g, '');

/**
 * Portal público de clientes del menú móvil.
 *
 * SEGURIDAD: este endpoint es público (el cliente que escanea el QR no tiene sesión),
 * por lo que un teléfono NO es prueba de identidad. Por eso:
 *  - No existe búsqueda de clientes: devolver la ficha de un teléfono ajeno expondría PII.
 *  - Nunca se actualiza una ficha existente: un tercero podría vandalizar los datos.
 *    Si el teléfono ya está registrado, solo se reutiliza su id para vincular el pedido,
 *    sin leer ni modificar sus datos personales.
 *
 * Acción soportada:
 *  - { action: 'save', full_name, phone, address, email } -> { customer: { id } }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const phone = normalizePhone(body?.phone);

    if (action !== 'save') {
      return Response.json({ error: 'Acción no soportada' }, { status: 400 });
    }

    if (!phone || phone.length < 7) {
      return Response.json({ error: 'Teléfono inválido' }, { status: 400 });
    }

    const fullName = String(body?.full_name || '').trim();
    if (!fullName) {
      return Response.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Customer.filter({ phone });
    const found = (existing || [])[0] || null;

    // Ficha ya registrada: solo se vincula el pedido, sin exponer ni sobrescribir sus datos.
    if (found) {
      return Response.json({ customer: { id: found.id } });
    }

    const customer = await base44.asServiceRole.entities.Customer.create({
      full_name: fullName,
      phone,
      address: String(body?.address || '').trim(),
      email: String(body?.email || '').trim(),
      is_registered: true,
    });

    return Response.json({ customer: { id: customer.id } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}