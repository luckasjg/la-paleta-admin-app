import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MODULES = ['recetas'];
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const ITERATIONS = 150000;

const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256(text) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function pbkdf2(text, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(text), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return toHex(bits);
}

async function hashNew(password) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { password_hash: await pbkdf2(password, salt), password_salt: salt };
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
      if (lock.locked_until && new Date(lock.locked_until) > new Date()) {
        return Response.json({ ok: false, error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
      }
      const ok = lock.password_salt
        ? (await pbkdf2(password, lock.password_salt)) === lock.password_hash
        : (await sha256(password)) === lock.password_hash;
      if (ok) {
        // Migra hashes legados a PBKDF2 con sal y reinicia el contador.
        const upgrade = lock.password_salt ? {} : await hashNew(password);
        await db.update(lock.id, { ...upgrade, failed_attempts: 0, locked_until: null });
        return Response.json({ ok: true });
      }
      const attempts = (lock.failed_attempts || 0) + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await db.update(lock.id, {
        failed_attempts: locked ? 0 : attempts,
        locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      });
      return Response.json({ ok: false });
    }

    if (action === 'set') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (password != null && (typeof password !== 'string' || (password.length > 0 && password.length < 4))) {
        return Response.json({ error: 'La clave debe tener al menos 4 caracteres' }, { status: 400 });
      }
      const hashed = password ? await hashNew(password) : { password_hash: '', password_salt: '' };
      const data = { module, ...hashed, failed_attempts: 0, locked_until: null, updated_by: user.email };
      if (lock) await db.update(lock.id, data);
      else await db.create(data);
      return Response.json({ ok: true, enabled: !!password });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}