import { permanentRedirect } from "next/navigation";

export default async function StoryRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect("/reading/" + id);
}
