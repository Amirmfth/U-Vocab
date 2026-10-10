import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { abandonFocusSession, completeFocusStep } from "../actions";

export default async function FocusSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user, course] = await Promise.all([
    params,
    getCurrentUser(),
    getCurrentCourse(),
  ]);

  const session = await db.learningSession.findFirst({
    where: { id, userId: user.id, userCourseId: course.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!session) notFound();

  const active =
    session.items.find((item) => !item.completedAt) ??
    session.items.at(-1) ??
    null;

  return (
    <main className="page focus-page flex flex-col w-full max-w-uv-5dbc91eac8 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{session.plannedMinutes}-minute focus</p>
        <h1>{session.status === "COMPLETED" ? "Session complete" : "Your learning plan"}</h1>
      </section>

      <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
        <ol className="history-list flex flex-col">
          {session.items.map((item) => (
            <li className="history-row min-h-10.5 flex items-center justify-between gap-3 padding-8px-0 border-1px-solid-border last:border-0-3 in-span:text-uv-text-soft in-span:capitalize in-small:text-uv-text-muted in-small:text-right in-stacked:items-start in-stacked:flex-col in-stacked:gap-0.75" key={item.id}>
              <span>
                <strong>{item.title}</strong>
                {item.description ? <small>{item.description}</small> : null}
              </span>
              <small>{item.plannedMinutes} min {item.completedAt ? "· done" : ""}</small>
            </li>
          ))}
        </ol>
      </section>

      {session.status === "ACTIVE" && active ? (
        <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">Current segment</p>
          <h2>{active.title}</h2>
          <p className="muted text-uv-text-muted">{active.description}</p>
          <div className="hero-actions flex flex-col gap-2.5 margin-6px-0-0 uv-min620:flex-row uv-min620:items-center uv-min620:in-button-2:w-auto">
            <Link className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" href={active.href}>Open activity</Link>
            <form action={completeFocusStep}>
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="itemId" value={active.id} />
              <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="submit">Mark complete</button>
            </form>
          </div>
        </section>
      ) : null}

      {session.status === "ACTIVE" ? (
        <form action={abandonFocusSession}>
          <input type="hidden" name="sessionId" value={session.id} />
          <button className="text-button min-h-9.5 inline-flex items-center gap-1.5 border-0 bg-transparent text-uv-text-muted cursor-pointer" type="submit">End session</button>
        </form>
      ) : (
        <Link className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" href="/focus">Plan another session</Link>
      )}
    </main>
  );
}
