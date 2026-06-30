import { ClientJobRecord, JobStatus } from "@/lib/job-types";

const DB_NAME = "logocut-svg";
const STORE_NAME = "jobs";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

function runJobTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = callback(store);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      }),
  );
}

export function saveClientJob(job: ClientJobRecord): Promise<IDBValidKey> {
  return runJobTransaction("readwrite", (store) => store.put(job));
}

export function getClientJob(id: string): Promise<ClientJobRecord | null> {
  return runJobTransaction("readonly", (store) => store.get(id)).then(
    (record) => (record ? (record as ClientJobRecord) : null),
  );
}

export async function updateClientJobStatus(
  id: string,
  status: JobStatus,
): Promise<void> {
  const job = await getClientJob(id);

  if (!job) {
    return;
  }

  await saveClientJob({ ...job, status });
}
