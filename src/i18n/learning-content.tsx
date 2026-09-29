export type LearningContentLanguage = "de" | "en" | "fa";

export function learningContentAttributes(language: LearningContentLanguage) {
  return {
    lang: language,
    dir: language === "fa" ? ("rtl" as const) : ("ltr" as const),
    className: "learning-content",
  };
}

export function LearningText({
  language,
  className = "",
  children,
}: {
  language: LearningContentLanguage;
  className?: string;
  children: React.ReactNode;
}) {
  const attributes = learningContentAttributes(language);
  return (
    <span
      lang={attributes.lang}
      dir={attributes.dir}
      className={(attributes.className + " " + className).trim()}
    >
      {children}
    </span>
  );
}
