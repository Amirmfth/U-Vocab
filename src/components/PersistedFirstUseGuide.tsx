import { FirstUseGuide } from "@/components/FirstUseGuide";
import { shouldShowGuide } from "@/lib/guide-visibility";
import type { FirstUseGuide as GuideDefinition } from "@/lib/first-use-guidance";

export async function PersistedFirstUseGuide({
  userId,
  guide,
  title,
  description,
  items,
  dismissLabel,
}: {
  userId: string;
  guide: GuideDefinition;
  title: string;
  description: string;
  items?: string[];
  dismissLabel: string;
}) {
  const visible = await shouldShowGuide(userId, guide.id, guide.version);
  if (!visible) return null;

  return (
    <FirstUseGuide
      guideId={guide.id}
      version={guide.version}
      title={title}
      description={description}
      items={items}
      dismissLabel={dismissLabel}
    />
  );
}
