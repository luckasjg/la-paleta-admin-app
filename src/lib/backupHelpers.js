import { base44 } from '@/api/base44Client';

// Entidades incluidas en el backup completo del sistema.
// Mantenemos un listado explícito para que la restauración sea predecible.
export const BACKUP_ENTITIES = [
  'Product',
  'Supply',
  'Recipe',
  'Preparation',
  'Tray',
  'Expense',
  'Sale',
  'CashRegister',
  'InventoryAdjustment',
  'IceCreamAudit',
  'Wallet',
  'WalletTransaction',
];

// Disparador de descarga genérico desde un Blob.
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// Convierte un array de objetos a CSV.
function arrayToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach(k => set.add(k));
      return set;
    }, new Set())
  );
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
    const s = String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = headers.join(',');
  const body = rows.map(r => headers.map(h => escape(r?.[h])).join(',')).join('\n');
  return `${head}\n${body}`;
}

// Genera CSVs separados (Inventario + Recetas) y los empaqueta en un único
// archivo de texto con secciones. Útil para revisión manual en Excel.
export async function exportManagementCSV() {
  const [supplies, recipes] = await Promise.all([
    base44.entities.Supply.list(),
    base44.entities.Recipe.list(),
  ]);

  const flatRecipes = recipes.map(r => ({
    ...r,
    ingredients: JSON.stringify(r.ingredients ?? []),
  }));

  const sections = [
    '=== INVENTARIO (Supply) ===',
    arrayToCSV(supplies),
    '',
    '=== RECETAS (Recipe) ===',
    arrayToCSV(flatRecipes),
  ].join('\n');

  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([sections], { type: 'text/csv;charset=utf-8' }),
    `gestion_inventario_recetas_${today}.csv`
  );
}

// Exporta un JSON completo con todas las entidades vivas.
export async function exportFullJSON() {
  const data = {};
  for (const entity of BACKUP_ENTITIES) {
    try {
      data[entity] = await base44.entities[entity].list();
    } catch (e) {
      console.error(`No se pudo exportar ${entity}:`, e);
      data[entity] = [];
    }
  }

  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    entities: data,
  };

  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `backup_sistema_${today}.json`
  );
}

// Valida la estructura básica del archivo de backup.
export function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'El archivo no es un objeto JSON válido.' };
  }
  if (!parsed.entities || typeof parsed.entities !== 'object') {
    return { ok: false, error: 'Falta el campo "entities" en el respaldo.' };
  }
  const present = Object.keys(parsed.entities);
  const known = present.filter(k => BACKUP_ENTITIES.includes(k));
  if (known.length === 0) {
    return { ok: false, error: 'El respaldo no contiene ninguna entidad reconocida.' };
  }
  for (const k of known) {
    if (!Array.isArray(parsed.entities[k])) {
      return { ok: false, error: `La entidad "${k}" no es un array.` };
    }
  }
  const counts = {};
  known.forEach(k => { counts[k] = parsed.entities[k].length; });
  return { ok: true, counts, exported_at: parsed.exported_at };
}

// Campos del sistema que no deben re-enviarse al crear registros.
const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id'];

function stripSystemFields(record) {
  const copy = { ...record };
  SYSTEM_FIELDS.forEach(f => delete copy[f]);
  return copy;
}

// Borra todos los registros de las entidades del backup y luego inyecta los del archivo.
export async function restoreFromBackup(parsed, onProgress = () => {}) {
  const validation = validateBackup(parsed);
  if (!validation.ok) throw new Error(validation.error);

  const present = Object.keys(parsed.entities).filter(k => BACKUP_ENTITIES.includes(k));

  // 1) Borrado
  for (const entity of present) {
    onProgress(`Borrando ${entity}...`);
    try {
      const existing = await base44.entities[entity].list();
      for (const rec of existing) {
        try {
          await base44.entities[entity].delete(rec.id);
        } catch (e) {
          console.error(`Error borrando ${entity}/${rec.id}:`, e);
        }
      }
    } catch (e) {
      console.error(`Error listando ${entity}:`, e);
    }
  }

  // 2) Inyección
  for (const entity of present) {
    const rows = parsed.entities[entity];
    onProgress(`Restaurando ${entity} (${rows.length})...`);
    for (const rec of rows) {
      try {
        await base44.entities[entity].create(stripSystemFields(rec));
      } catch (e) {
        console.error(`Error creando ${entity}:`, e, rec);
      }
    }
  }

  onProgress('Restauración completada.');
}