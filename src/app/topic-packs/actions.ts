"use server";

export type TopicPackState = {
  status: "idle" | "success" | "error";
  message?: string;
  packId?: string;
};

export type PackMutationState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const disabledMessage = "Topic packs are currently disabled.";

export async function createTopicPack(
  _previous: TopicPackState,
  _formData: FormData,
): Promise<TopicPackState> {
  return { status: "error", message: disabledMessage };
}

export async function removePackItem(
  _previous: PackMutationState,
  _formData: FormData,
): Promise<PackMutationState> {
  return { status: "error", message: disabledMessage };
}

export async function addPackToVocabulary(
  _previous: PackMutationState,
  _formData: FormData,
): Promise<PackMutationState> {
  return { status: "error", message: disabledMessage };
}

export async function launchPackSession(_formData: FormData): Promise<never> {
  throw new Error(disabledMessage);
}
