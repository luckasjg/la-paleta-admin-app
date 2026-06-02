import { supabase } from '@/api/supabaseClient';
import { appParams } from '@/lib/app-params';

const handleError = (error) => {
  if (error) {
    throw error;
  }
};

const listEntity = async (table, { orderBy = null, limit = null, offset = null, filter = null } = {}) => {
  let query = supabase.from(table).select('*');

  if (filter && typeof filter === 'object') {
    Object.entries(filter).forEach(([column, value]) => {
      if (value === null) {
        query = query.is(column, null);
      } else {
        query = query.eq(column, value);
      }
    });
  }

  if (orderBy) {
    let column = orderBy;
    let ascending = true;
    if (typeof orderBy === 'string' && orderBy.startsWith('-')) {
      ascending = false;
      column = orderBy.substring(1);
    }
    query = query.order(column, { ascending });
  }

  if (offset != null && Number.isInteger(offset)) {
    const start = offset;
    const end = Number.isFinite(limit) ? offset + limit - 1 : offset + 9999;
    query = query.range(start, end);
  } else if (limit != null) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  handleError(error);
  return data ?? [];
};

const createEntity = async (table, payload) => {
  const { data, error } = await supabase.from(table).insert(payload).select();
  handleError(error);
  return Array.isArray(data) ? data[0] : data;
};

const updateEntity = async (table, id, payload) => {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select();
  handleError(error);
  return Array.isArray(data) ? data[0] : data;
};

const deleteEntity = async (table, id) => {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select();
  handleError(error);
  return data;
};

const bulkCreateEntity = async (table, payload) => {
  const { data, error } = await supabase.from(table).insert(payload).select();
  handleError(error);
  return data ?? [];
};

const buildEntity = (entityName) => ({
  list: (orderBy, limit, offset) => listEntity(entityName, { orderBy, limit, offset }),
  filter: (filter) => listEntity(entityName, { filter }),
  create: (payload) => createEntity(entityName, payload),
  update: (id, payload) => updateEntity(entityName, id, payload),
  delete: (id) => deleteEntity(entityName, id),
  bulkCreate: (records) => bulkCreateEntity(entityName, records),
});

const base44 = {
  auth: {
    me: async () => {
      const { data, error } = await supabase.auth.getUser();
      handleError(error);
      if (!data?.user) {
        throw new Error('Not authenticated');
      }
      return {
        ...data.user,
        role: data.user.user_metadata?.role || 'user',
      };
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      handleError(error);
      return true;
    },
    redirectToLogin: (redirectUrl) => {
      window.location.href = appParams.loginUrl || '/login';
    },
  },
  entities: new Proxy({}, {
    get(target, entityName) {
      if (typeof entityName !== 'string') return undefined;
      if (!target[entityName]) {
        target[entityName] = buildEntity(entityName);
      }
      return target[entityName];
    },
  }),
  functions: {
    invoke: async (name, payload = {}) => {
      if (!name) {
        throw new Error('Function name required');
      }
      const response = await fetch(`/api/functions/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Function ${name} failed: ${response.statusText}`);
      }
      return response.json();
    },
  },
  connectors: {
    connectAppUser: async () => {
      throw new Error('Connectors are not implemented in this Supabase migration');
    },
    disconnectAppUser: async () => {
      throw new Error('Connectors are not implemented in this Supabase migration');
    },
  },
};

export { base44 };