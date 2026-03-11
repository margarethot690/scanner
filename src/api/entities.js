/**
 * Local entity storage using localStorage.
 * Provides CRUD operations similar to the Base44 entities API.
 * 
 * Each entity type gets its own localStorage key: `dccscan_entity_{name}`
 */

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getEntityStore(entityName) {
  try {
    const raw = localStorage.getItem(`dccscan_entity_${entityName}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntityStore(entityName, records) {
  localStorage.setItem(`dccscan_entity_${entityName}`, JSON.stringify(records));
}

function matchesFilter(record, filter) {
  for (const [key, value] of Object.entries(filter)) {
    if (record[key] !== value) return false;
  }
  return true;
}

function sortRecords(records, sortStr) {
  if (!sortStr) return records;
  const desc = sortStr.startsWith('-');
  const field = desc ? sortStr.slice(1) : sortStr;
  return [...records].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (aVal < bVal) return desc ? 1 : -1;
    if (aVal > bVal) return desc ? -1 : 1;
    return 0;
  });
}

/**
 * Creates an entity accessor for a given entity name.
 */
export function createEntity(entityName) {
  return {
    async list(sort, limit) {
      let records = getEntityStore(entityName);
      if (sort) records = sortRecords(records, sort);
      if (limit) records = records.slice(0, limit);
      return records;
    },

    async filter(query, sort, limit) {
      let records = getEntityStore(entityName);
      if (query) {
        records = records.filter(r => matchesFilter(r, query));
      }
      if (sort) records = sortRecords(records, sort);
      if (limit) records = records.slice(0, limit);
      return records;
    },

    async get(id) {
      const records = getEntityStore(entityName);
      const record = records.find(r => r.id === id);
      if (!record) throw new Error(`${entityName} not found: ${id}`);
      return record;
    },

    async create(data) {
      const records = getEntityStore(entityName);
      const record = {
        ...data,
        id: generateId(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      records.push(record);
      saveEntityStore(entityName, records);
      return record;
    },

    async update(id, data) {
      const records = getEntityStore(entityName);
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) throw new Error(`${entityName} not found: ${id}`);
      records[idx] = {
        ...records[idx],
        ...data,
        updated_date: new Date().toISOString(),
      };
      saveEntityStore(entityName, records);
      return records[idx];
    },

    async delete(id) {
      const records = getEntityStore(entityName);
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) throw new Error(`${entityName} not found: ${id}`);
      records.splice(idx, 1);
      saveEntityStore(entityName, records);
    },
  };
}

// Pre-defined entity accessors for all entities used in the app
export const PageView = createEntity('PageView');
export const AssetLogoRequest = createEntity('AssetLogoRequest');
export const WithdrawalRequest = createEntity('WithdrawalRequest');
export const BlockchainConfig = createEntity('BlockchainConfig');
export const BlockchainSnapshot = createEntity('BlockchainSnapshot');
export const NodeRegistration = createEntity('NodeRegistration');
export const Query = createEntity('Query');