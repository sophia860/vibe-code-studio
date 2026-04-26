export const STRIPE_PAYMENT_LINK =
  (import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined)?.trim() ?? "";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildStripeCheckoutUrl(paymentLink: string, email: string): string {
  const url = new URL(paymentLink);

  if (email) {
    url.searchParams.set("prefilled_email", email);
  }

  url.searchParams.set("client_reference_id", `claw-${Date.now()}`);
  return url.toString();
}
