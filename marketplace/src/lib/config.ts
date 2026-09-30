// Brand and platform-wide settings. Times are in `timeZone`.
export const site = {
  name: "Local Legends",
  tagline: "Iconic kosher favorites from local legends, delivered nationwide.",
  supportEmail: "support@example.com",
  timeZone: "America/New_York",
  // Orders placed before this hour count as placed today.
  orderCutoffHour: 14,
  // The site closes at this hour on Erev Shabbat / Erev Yom Tov...
  erevCloseHour: 14,
  // ...and reopens this long after sunset on Motzei Shabbat / Yom Tov.
  reopenMinutesAfterSunset: 60,
  // Sunset is calculated for this city (a @hebcal/core Location name).
  sunsetLocation: "New York",
};

// Local deliveries are made by one shared courier service for every vendor,
// so the fees are set platform-wide and kept by the platform to pay the courier.
export const localDelivery = {
  fee: 999, // cents
  priorityFee: 999, // cents, pre-Yom Tov same-day/guaranteed delivery
  // 3-digit ZIP prefixes the courier covers: Manhattan, Staten Island, Bronx, Brooklyn, Queens.
  zipPrefixes: "100,101,102,103,104,110,111,112,113,114,116",
};
