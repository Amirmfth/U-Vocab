"use server";

const disabledMessage = "Focus block is currently disabled.";

export async function createFocusSession(_formData: FormData): Promise<never> {
  throw new Error(disabledMessage);
}

export async function completeFocusStep(_formData: FormData): Promise<never> {
  throw new Error(disabledMessage);
}

export async function abandonFocusSession(_formData: FormData): Promise<never> {
  throw new Error(disabledMessage);
}
