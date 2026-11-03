import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MODULES = ['recetas'];

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { action, module, password } = await req.json().catch(() => ({}));
    if (!MODULES.includes(module)) return Response.json({ error: 'Módulo inválido' }, { status: 400 });

    const db = base44.asServiceRole.entities.ModuleLock;
    const rows = await db.filter({ module });
    const lock = rows[0];

    if (action === 'status') {
      return Response.json({ enabled: !!lock?.password_hash });
    }

    if (action === 'verify') {
      if (!lock?.password_hash) return Response.json({ ok: true });
      if (typeof password !== 'string' || !password) return Response.json({ error: 'Clave requerida' }, { status: 400 });
      return Response.json({ ok: (await sha256(password)) === lock.password_hash });
    }

    if (action === 'set') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (password != null && (typeof password !== 'string' || (password.length > 0 && password.length < 4))) {
        return Response.json({ error: 'La clave debe tener al menos 4 caracteres' }, { status: 400 });
      }
      const data = { module, password_hash: password ? await sha256(password) : '', updated_by: user.email };
      if (lock) await db.update(lock.id, data);
      else await db.create(data);
      return Response.json({ ok: true, enabled: !!password });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}