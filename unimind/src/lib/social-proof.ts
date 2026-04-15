// Social-proof threshold: only show user-count messaging once we're above this.
export const SOCIAL_PROOF_THRESHOLD = 300;

// Hardcoded for now so the UI can be previewed.
// To switch to live data:
//   const { data } = api.user.count.useQuery();   // client
//   const { count } = await api.user.count();     // server
//   const users = data?.count ?? 0;
export const HARDCODED_USER_COUNT = 320;

export function formatUserCount(n: number) {
  return n.toLocaleString("en-US");
}
