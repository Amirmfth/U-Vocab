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
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{session.plannedMinutes}-minute focus</p>
        <h1>{session.status === "COMPLETED" ? "Session complete" : "Your learning plan"}</h1>
      </section>

      <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
        <ol className="history-list flex flex-col">
          {session.items.map((item) => (
            <li className="history-row min-h-10.5 flex items-center justify-between gap-3 uv-padding-d57d0138fc uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-right uv-v0806813012:items-start uv-v0806813012:flex-col uv-v0806813012:gap-0.75" key={item.id}>
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
        <section className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c">
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">Current segment</p>
          <h2>{active.title}</h2>
          <p className="muted text-uv-text-muted">{active.description}</p>
          <div className="hero-actions flex flex-col gap-2.5 uv-margin-66a0389558 uv-min620:flex-row uv-min620:items-center uv-min620:uv-vcded88c612:w-auto">
            <Link className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" href={active.href}>Open activity</Link>
            <form action={completeFocusStep}>
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="itemId" value={active.id} />
              <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="submit">Mark complete</button>
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
        <Link className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" href="/focus">Plan another session</Link>
      )}
    </main>
  );
}
