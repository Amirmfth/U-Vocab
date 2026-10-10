import Link from "next/link";
import { LexemeReviewState, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { ConfirmSubmitButton } from "../ConfirmSubmitButton";
import {
  addAliasAction,
  mergeLexemeAction,
  removeAliasAction,
  reviewLexemeAction,
  updateLexemeAction,
} from "../actions";

const PAGE_SIZE = 12;

export default async function AdminLexiconPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; review?: string; page?: string }>;
}) {
  await requireAdmin();
  const q = await searchParams;
  const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
  const search = q.q?.trim();
  const review = Object.values(LexemeReviewState).includes(q.review as LexemeReviewState)
    ? (q.review as LexemeReviewState)
    : null;
  const where: Prisma.LexemeWhereInput = {
    ...(search ? {
      OR: [
        { lemma: { contains: search, mode: "insensitive" } },
        { normalized: { contains: search, mode: "insensitive" } },
        { aliases: { some: { normalizedSurface: { contains: search, mode: "insensitive" } } } },
      ],
    } : {}),
    ...(review ? { OR: [{ provenance: { some: { reviewState: review } } }, { senses: { some: { reviewState: review } } }] } : {}),
  };

  const [total, lexemes, duplicates, collisions] = await Promise.all([
    db.lexeme.count({ where }),
    db.lexeme.findMany({
      where,
      include: {
        aliases: { orderBy: { createdAt: "asc" }, take: 20 },
        senses: { orderBy: { createdAt: "asc" }, take: 12, include: { translations: { take: 12 }, definitions: { take: 12 } } },
        provenance: { orderBy: { createdAt: "desc" }, take: 8 },
        translations: { take: 12 },
        examples: { take: 4 },
        patterns: { take: 6 },
        _count: { select: { userStates: true, encounters: true, mistakes: true } },
      },
      orderBy: [{ canonicalUpdatedAt: "desc" }, { lemma: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.$queryRaw<Array<{ language: string; normalized: string; partOfSpeech: string; count: bigint }>>`
      SELECT "language", lower(trim("normalized")) AS normalized, "partOfSpeech"::text AS "partOfSpeech", COUNT(*)::bigint AS count
      FROM "Lexeme"
      GROUP BY "language", lower(trim("normalized")), "partOfSpeech"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `,
    db.$queryRaw<Array<{ language: string; normalizedSurface: string; lexemeCount: bigint }>>`
      SELECT "language", "normalizedSurface", COUNT(DISTINCT "lexemeId")::bigint AS "lexemeCount"
      FROM "LexemeAlias"
      GROUP BY "language", "normalizedSurface"
      HAVING COUNT(DISTINCT "lexemeId") > 1
      ORDER BY "lexemeCount" DESC
      LIMIT 20
    `,
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <main className="page admin-page flex flex-col max-w-uv-fe3c59b9c7 gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
    <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem"><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">SHARED DATA</p><h1>Lexicon maintenance</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">Curate canonical shared lexical data. Learner-private content is not exposed here.</p></section>
    <form className="panel admin-filter-bar border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex gap-p7rem items-end flex-wrap margin-bottom-1rem in-input:min-height-2p55rem in-select:min-height-2p55rem rounded-exact-18px" method="get">
      <input name="q" defaultValue={q.q} placeholder="Lemma, canonical form, or alias"/>
      <select name="review" defaultValue={q.review ?? ""}><option value="">All review states</option>{Object.values(LexemeReviewState).map((x)=><option key={x}>{x}</option>)}</select>
      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">Filter</button>
    </form>

    <section className="admin-two-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max900:grid-template-columns-1fr">
      <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>Probable canonical duplicates</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">{duplicates.map((x)=><div key={x.language+x.normalized+x.partOfSpeech}><strong>{x.normalized}</strong><span>{x.language} · {x.partOfSpeech}</span><b>{Number(x.count)} records</b></div>)}{!duplicates.length?<p className="muted text-uv-text-muted">No canonical duplicate keys detected.</p>:null}</div></article>
      <article className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-exact-18px"><h2>Alias collisions</h2><div className="admin-table-list grid gap-p55rem margin-top-p75rem in-div:grid in-div:grid-template-columns-minmax-0-1p3fr-minmax-0-1fr-auto in-div:gap-p75rem in-div:items-center in-div:padding-p7rem-0 in-div:border-1px-solid-border-3 in-div-first-child:border-0 in-span:text-exact-p84rem in-span:text-uv-c7dbd63a13e in-span:font-medium in-b:text-exact-p84rem in-b:text-uv-c7dbd63a13e in-b:font-medium">{collisions.map((x)=><div key={x.language+x.normalizedSurface}><strong>{x.normalizedSurface}</strong><span>{x.language}</span><b>{Number(x.lexemeCount)} lexemes</b></div>)}{!collisions.length?<p className="muted text-uv-text-muted">No cross-lexeme alias collisions detected.</p>:null}</div></article>
    </section>

    <section className="panel admin-danger-zone border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 border-dashed margin-bottom-1rem rounded-exact-18px">
      <h2>Merge duplicate lexemes</h2>
      <p className="muted text-uv-text-muted">The source is repointed transactionally into the target before the source record is deleted.</p>
      <form action={mergeLexemeAction} className="admin-inline-form flex gap-p7rem items-end flex-wrap in-input:min-height-2p55rem in-select:min-height-2p55rem">
        <input name="sourceLexemeId" placeholder="Source lexeme ID" required/>
        <input name="targetLexemeId" placeholder="Target lexeme ID" required/>
        <ConfirmSubmitButton className="button button-danger w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger bg-uv-danger in-button-danger:text-uv-cb667f4b109 text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current border-current min-height-tap-target" message="Merge the source lexeme into the target? This rewrites dependent records and cannot be undone automatically.">Merge lexemes</ConfirmSubmitButton>
      </form>
    </section>

    <div className="admin-lexeme-list grid gap-1rem">
      {lexemes.map((lexeme)=><article className="panel admin-lexeme-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 overflow-hidden rounded-exact-18px" key={lexeme.id}>
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-exact-1p1rem in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{lexeme.language} · {lexeme.partOfSpeech}</p><h2>{lexeme.article ? lexeme.article+" " : ""}{lexeme.lemma}</h2><span className="muted text-uv-text-muted">{lexeme.id} · {lexeme.normalized} · {lexeme._count.userStates} learners</span></div><div>{lexeme.provenance[0]?.reviewState ?? lexeme.senses[0]?.reviewState ?? "UNREVIEWED"}</div></div>

        <form action={updateLexemeAction} className="admin-grid-form gap-p7rem flex-wrap in-input:min-height-2p55rem in-select:min-height-2p55rem in-label:grid in-label:gap-p3rem in-label:text-exact-p8rem in-label:text-uv-c7dbd63a13e grid grid-template-columns-repeat-auto-fit-minmax-145px-1fr items-end margin-1rem-0">
          <input type="hidden" name="lexemeId" value={lexeme.id}/>
          <label>Lemma<input name="lemma" defaultValue={lexeme.lemma} required/></label>
          <label>Article<input name="article" defaultValue={lexeme.article ?? ""}/></label>
          <label>Plural<input name="plural" defaultValue={lexeme.plural ?? ""}/></label>
          <label>Gender<input name="gender" defaultValue={lexeme.gender ?? ""}/></label>
          <label>CEFR<input name="cefrLevel" defaultValue={lexeme.cefrLevel ?? ""}/></label>
          <label>Part of speech<select name="partOfSpeech" defaultValue={lexeme.partOfSpeech}>{["NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION","CONJUNCTION","INTERJECTION","PHRASE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
          <ConfirmSubmitButton message="Save canonical lexeme changes?">Save canonical data</ConfirmSubmitButton>
        </form>

        <div className="admin-three-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-3-minmax-0-1fr uv-max900:grid-template-columns-1fr">
          <section><h3>Aliases</h3><div className="admin-chip-list flex flex-wrap gap-p4rem margin-bottom-p65rem">{lexeme.aliases.map((alias)=><form action={removeAliasAction} key={alias.id} className="admin-chip inline-flex items-center gap-p35rem padding-p28rem-p45rem-p28rem-p6rem border-1px-solid-border-2 rounded-exact-999px text-exact-p78rem"><input type="hidden" name="aliasId" value={alias.id}/><span>{alias.surface} · {alias.kind}</span><ConfirmSubmitButton className="admin-chip-delete border-0 bg-transparent text-inherit cursor-pointer text-exact-1rem" message={"Remove alias “"+alias.surface+"”?"}>×</ConfirmSubmitButton></form>)}</div><form action={addAliasAction} className="admin-inline-form flex gap-p7rem items-end flex-wrap in-input:min-height-2p55rem in-select:min-height-2p55rem"><input type="hidden" name="lexemeId" value={lexeme.id}/><input name="surface" placeholder="New alias" required/><select name="kind" defaultValue="SPELLING_VARIANT">{["USER_INPUT","ARTICLE_VARIANT","SPELLING_VARIANT","INFLECTED_FORM","IMPORTED","GENERATED"].map(x=><option key={x}>{x}</option>)}</select><button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">Add</button></form></section>
          <section><h3>Senses, definitions & translations</h3>{lexeme.senses.map((sense)=><div className="admin-data-block grid gap-p2rem padding-p55rem-0 border-1px-solid-border-3 text-exact-p84rem in-span:text-uv-c7dbd63a13e in-small:text-uv-c7dbd63a13e" key={sense.id}><strong>{sense.key} · {sense.reviewState}</strong><span>{sense.gloss ?? "No gloss"}</span><small>{[...sense.definitions.map(d=>"definition "+d.language+": "+d.text),...sense.translations.map(t=>t.language+": "+t.text)].join(" · ") || "No semantic data"}</small></div>)}</section>
          <section><h3>Provenance</h3>{lexeme.provenance.map((p)=><div className="admin-data-block grid gap-p2rem padding-p55rem-0 border-1px-solid-border-3 text-exact-p84rem in-span:text-uv-c7dbd63a13e in-small:text-uv-c7dbd63a13e" key={p.id}><strong>{p.source} · {p.reviewState}</strong><span>{p.provider ?? "—"} / {p.model ?? "—"}</span><small>{p.promptVersion ?? "no prompt version"} · {p.contentVersion ?? "no content version"}</small></div>)}</section>
        </div>

        <div className="admin-two-column grid gap-1rem margin-1rem-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max900:grid-template-columns-1fr">
          <section><h3>Patterns</h3>{lexeme.patterns.map(p=><div className="admin-data-block grid gap-p2rem padding-p55rem-0 border-1px-solid-border-3 text-exact-p84rem in-span:text-uv-c7dbd63a13e in-small:text-uv-c7dbd63a13e" key={p.id}>{p.pattern}</div>)}<h3>Examples</h3>{lexeme.examples.map(e=><div className="admin-data-block grid gap-p2rem padding-p55rem-0 border-1px-solid-border-3 text-exact-p84rem in-span:text-uv-c7dbd63a13e in-small:text-uv-c7dbd63a13e" key={e.id}><strong>{e.targetText}</strong><span>{e.english ?? e.persian ?? ""}</span></div>)}</section>
          <section><h3>Review state</h3><form action={reviewLexemeAction} className="admin-inline-form flex gap-p7rem items-end flex-wrap in-input:min-height-2p55rem in-select:min-height-2p55rem"><input type="hidden" name="lexemeId" value={lexeme.id}/><select name="reviewState" defaultValue={lexeme.provenance[0]?.reviewState ?? "ACCEPTED"}>{Object.values(LexemeReviewState).map(x=><option key={x}>{x}</option>)}</select><ConfirmSubmitButton message="Change curated review state for this lexeme?">Apply state</ConfirmSubmitButton></form><p className="muted text-uv-text-muted">{lexeme._count.encounters} encounters · {lexeme._count.mistakes} linked mistake records</p></section>
        </div>
      </article>)}
    </div>
    <nav className="admin-pagination grid grid-template-columns-1fr-auto-1fr items-center margin-1rem-0 text-uv-c7dbd63a13e in-last-child:text-right"><span>{page>1?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page-1}}}>Previous</Link>:null}</span><span>Page {page} of {pages} · {total} lexemes</span><span>{page<pages?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page+1}}}>Next</Link>:null}</span></nav>
  </main>;
}
