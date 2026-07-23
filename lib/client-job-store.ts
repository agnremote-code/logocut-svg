import {
  ClientJobRecord,
  CutType,
  JobStatus,
  OneTimeProductType,
  PaymentStatus,
} from "@/lib/job-types";

const DB_NAME = "logocut-svg";
const STORE_NAME = "jobs";
const DB_VERSION = 1;
const ACTIVE_CONVERSION_KEY = "logocut_active_conversion";

export type ActiveConversionRecord = {
  jobId: string;
  cutType: CutType;
  productType: OneTimeProductType;
  previewMode: CutType;
  previewStatus: "not_started" | "ready" | "failed";
  paymentStatus: PaymentStatus;
  svgReady?: boolean;
  updatedAt: string;
};

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

export function saveActiveConversion(
  record: Omit<ActiveConversionRecord, "updatedAt">,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ACTIVE_CONVERSION_KEY,
    JSON.stringify({ ...record, updatedAt: new Date().toISOString() }),
  );
}

export function getActiveConversion(): ActiveConversionRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ACTIVE_CONVERSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ActiveConversionRecord>;

    if (
      typeof parsed.jobId !== "string" ||
      (parsed.cutType !== "single" && parsed.cutType !== "multi") ||
      (parsed.previewMode !== "single" && parsed.previewMode !== "multi") ||
      (parsed.paymentStatus !== "unpaid" && parsed.paymentStatus !== "paid")
    ) {
      return null;
    }

    return parsed as ActiveConversionRecord;
  } catch {
    return null;
  }
}

export function clearActiveConversion() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_CONVERSION_KEY);
}
