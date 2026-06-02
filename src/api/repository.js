// Compat layer: provides the old `listEntity/createEntity/updateEntity/deleteEntity`
// signatures but routes everything through the Base44 SDK.
import { base44 } from '@/api/base44Client';

const entity = (name) => base44.entities[name];

export const listEntity = async (entityName, { orderBy = null, limit = null, offset = null, filter = null } = {}) => {
  const e = entity(entityName);
  if (filter && typeof filter === 'object') {
    return e.filter(filter, orderBy || undefined, limit || undefined);
  }
  return e.list(orderBy || undefined, limit || undefined, offset || undefined);
};

export const getEntity = async (entityName, id) => {
  const e = entity(entityName);
  if (typeof e.get === 'function') return e.get(id);
  // fallback: filter by id
  const rows = await e.filter({ id });
  return Array.isArray(rows) ? rows[0] : rows;
};

export const createEntity = (entityName, payload) => entity(entityName).create(payload);
export const updateEntity = (entityName, id, payload) => entity(entityName).update(id, payload);
export const deleteEntity = (entityName, id) => entity(entityName).delete(id);
export const bulkCreateEntity = (entityName, rows) => entity(entityName).bulkCreate(rows);

export const auth = {
  getUser: () => base44.auth.me(),
  signOut: () => base44.auth.logout(),
  signInWithEmail: async () => {
    // Base44 maneja su propio login — redirigimos
    base44.auth.redirectToLogin();
    return null;
  },
};