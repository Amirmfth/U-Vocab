export type ProductEventName =
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "first_use_guide_seen"
  | "first_use_guide_dismissed";

export type ProductEventProperties = Record<
  string,
  string | number | boolean | null
>;

/**
 * Central integration point for product analytics.
 * #101 can replace this no-op implementation without changing feature code.
 */
export async function recordProductEvent(
  _name: ProductEventName,
  _properties: ProductEventProperties = {},
) {
  return;
}
