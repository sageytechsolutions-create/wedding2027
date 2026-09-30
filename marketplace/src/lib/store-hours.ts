import { storeStatus, type StoreStatus } from "./jewish-calendar";

export function currentStoreStatus(now = new Date()): StoreStatus {
  // Testing override; never honored on the live site.
  if (process.env.STORE_ALWAYS_OPEN === "true" && process.env.NODE_ENV !== "production") return { open: true, closesToday: null };
  return storeStatus(now);
}
