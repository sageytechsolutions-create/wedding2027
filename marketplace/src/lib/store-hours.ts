import { localNow } from "./fulfillment";
import { storeStatus } from "./jewish-calendar";

export function currentStoreStatus(now = new Date()) {
  if (process.env.STORE_ALWAYS_OPEN === "true") return { open: true as const, closesToday: null };
  const { day, hour } = localNow(now);
  return storeStatus(day, hour);
}
