import { storeStatus, type StoreStatus } from "./jewish-calendar";

export function currentStoreStatus(now = new Date()): StoreStatus {
  if (process.env.STORE_ALWAYS_OPEN === "true") return { open: true, closesToday: null };
  return storeStatus(now);
}
