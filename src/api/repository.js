import { supabase } from '@/api/supabaseClient';

const handleError = (error) => {
  if (error) {
    throw error;
  }
};

export const auth = {
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    handleError(error);
    return data?.user ?? null;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    handleError(error);
    return true;
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    handleError(error);
    return data;
  },

  signInWithProvider: async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider });
    handleError(error);
    return data;
  },
};

export const listEntity = async (table, { orderBy = null, limit = null, offset = null, filter = null } = {}) => {
  let query = supabase.from(table).select('*');

  if (filter) {
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
    } else if (typeof orderBy === 'string' && orderBy.includes(' ')) {
      const [field, direction] = orderBy.split(' ');
      column = field;
      ascending = direction?.toLowerCase() !== 'desc';
    }

    query = query.order(column, { ascending });
  }

  if (offset != null && Number.isInteger(offset)) {
    const start = offset;
    const end = Number.isFinite(limit) ? offset + limit - 1 : offset + 9999;
    query = query.range(start, end);
  } else if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  handleError(error);
  return data ?? [];
};

export const getEntity = async (table, id) => {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  handleError(error);
  return data;
};

export const createEntity = async (table, payload) => {
  const { data, error } = await supabase.from(table).insert(payload).select();
  handleError(error);
  return Array.isArray(data) ? data[0] : data;
};

export const updateEntity = async (table, id, payload) => {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select();
  handleError(error);
  return Array.isArray(data) ? data[0] : data;
};

export const deleteEntity = async (table, id) => {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select();
  handleError(error);
  return data;
};
