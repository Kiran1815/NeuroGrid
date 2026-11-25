// core/storage/IndexedDBAdapter.js
// Store. Retrieve. Sync queue. Nothing else.

const DB_NAME = 'neurogrid';
const DB_VERSION = 1;

const STORES = {
    survivors: { keyPath: 'device_id' },
    messages: { keyPath: 'id', indexes: [['ts', 'ts']] },
    sync_queue: { keyPath: 'id', autoIncrement: true },
};

class IndexedDBAdapter {
    #db = null;

    async open() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                for (const [name, opts] of Object.entries(STORES)) {
                    if (!db.objectStoreNames.contains(name)) {
                        const store = db.createObjectStore(name, {
                            keyPath: opts.keyPath,
                            autoIncrement: opts.autoIncrement ?? false,
                        });
                        opts.indexes?.forEach(([idxName, keyPath]) =>
                            store.createIndex(idxName, keyPath)
                        );
                    }
                }
            };
            req.onsuccess = e => { this.#db = e.target.result; resolve(this); };
            req.onerror = e => reject(e.target.error);
        });
    }

    async upsert(storeName, record) {
        return this.#tx(storeName, 'readwrite', s => s.put(record));
    }

    async getAll(storeName) {
        return this.#tx(storeName, 'readonly', s => s.getAll());
    }

    async delete(storeName, key) {
        return this.#tx(storeName, 'readwrite', s => s.delete(key));
    }

    async queueForSync(data) {
        return this.#tx('sync_queue', 'readwrite', s =>
            s.add({ data, queued_at: Date.now() })
        );
    }

    async flushSyncQueue() {
        return this.getAll('sync_queue');
    }

    async clearSyncQueue() {
        return this.#tx('sync_queue', 'readwrite', s => s.clear());
    }

    #tx(storeName, mode, fn) {
        return new Promise((resolve, reject) => {
            if (!this.#db) { reject(new Error('DB not open')); return; }
            const tx = this.#db.transaction(storeName, mode);
            const req = fn(tx.objectStore(storeName));
            if (req && typeof req.onsuccess !== 'undefined') {
                req.onsuccess = e => resolve(e.target.result);
                req.onerror = e => reject(e.target.error);
            } else {
                tx.oncomplete = () => resolve();
                tx.onerror = e => reject(e.target.error);
            }
        });
    }
}

export const db = new IndexedDBAdapter();
