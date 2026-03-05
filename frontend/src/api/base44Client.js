// Stub client — this app is fully local (no backend, no auth).
// Kept for compatibility with any legacy imports.
export const base44 = {
  auth: {
    me: () => Promise.reject(new Error("No auth backend")),
    logout: () => Promise.resolve(),
  },
  entities: {},
};
