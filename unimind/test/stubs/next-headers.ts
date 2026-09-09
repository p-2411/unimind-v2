// Integration tests construct their own tRPC context and never read request
// cookies/headers; importing the real `next/headers` outside Next is unsupported.
export async function cookies(): Promise<never> {
  throw new Error("next/headers is not available in integration tests");
}

export async function headers(): Promise<never> {
  throw new Error("next/headers is not available in integration tests");
}
