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
    <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade"><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">SHARED DATA</p><h1>Lexicon maintenance</h1><p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">Curate canonical shared lexical data. Learner-private content is not exposed here.</p></section>
    <form className="panel admin-filter-bar uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex uv-gap-f73364d9bf items-end flex-wrap uv-margin-bottom-19feeb881c uv-vcf5ce320fa:uv-min-height-e005337472 uv-vfc0df1ac56:uv-min-height-e005337472 rounded-uv-r6d27d54c6c" method="get">
      <input name="q" defaultValue={q.q} placeholder="Lemma, canonical form, or alias"/>
      <select name="review" defaultValue={q.review ?? ""}><option value="">All review states</option>{Object.values(LexemeReviewState).map((x)=><option key={x}>{x}</option>)}</select>
      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">Filter</button>
    </form>

    <section className="admin-two-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-dd0b1a1848 uv-max900:uv-grid-template-columns-6a5c4d4d49">
      <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Probable canonical duplicates</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{duplicates.map((x)=><div key={x.language+x.normalized+x.partOfSpeech}><strong>{x.normalized}</strong><span>{x.language} · {x.partOfSpeech}</span><b>{Number(x.count)} records</b></div>)}{!duplicates.length?<p className="muted text-uv-text-muted">No canonical duplicate keys detected.</p>:null}</div></article>
      <article className="panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c"><h2>Alias collisions</h2><div className="admin-table-list grid uv-gap-a69a0b3654 uv-margin-top-60ac4cf407 uv-vcbb57f4d35:grid uv-vcbb57f4d35:uv-grid-template-columns-081424101f uv-vcbb57f4d35:uv-gap-60ac4cf407 uv-vcbb57f4d35:items-center uv-vcbb57f4d35:uv-padding-6c472cc4ec uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0fee2d502c:uv-border-top-b6589fc6ab uv-v36c0309a03:text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:font-medium uv-vad81a304ad:text-uv-f6b4e408307 uv-vad81a304ad:text-uv-c7dbd63a13e uv-vad81a304ad:font-medium">{collisions.map((x)=><div key={x.language+x.normalizedSurface}><strong>{x.normalizedSurface}</strong><span>{x.language}</span><b>{Number(x.lexemeCount)} lexemes</b></div>)}{!collisions.length?<p className="muted text-uv-text-muted">No cross-lexeme alias collisions detected.</p>:null}</div></article>
    </section>

    <section className="panel admin-danger-zone uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 border-dashed uv-margin-bottom-19feeb881c rounded-uv-r6d27d54c6c">
      <h2>Merge duplicate lexemes</h2>
      <p className="muted text-uv-text-muted">The source is repointed transactionally into the target before the source record is deleted.</p>
      <form action={mergeLexemeAction} className="admin-inline-form flex uv-gap-f73364d9bf items-end flex-wrap uv-vcf5ce320fa:uv-min-height-e005337472 uv-vfc0df1ac56:uv-min-height-e005337472">
        <input name="sourceLexemeId" placeholder="Source lexeme ID" required/>
        <input name="targetLexemeId" placeholder="Target lexeme ID" required/>
        <ConfirmSubmitButton className="button button-danger w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current border-current uv-min-height-e45618b383" message="Merge the source lexeme into the target? This rewrites dependent records and cannot be undone automatically.">Merge lexemes</ConfirmSubmitButton>
      </form>
    </section>

    <div className="admin-lexeme-list grid uv-gap-19feeb881c">
      {lexemes.map((lexeme)=><article className="panel admin-lexeme-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 overflow-hidden rounded-uv-r6d27d54c6c" key={lexeme.id}>
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft"><div><p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{lexeme.language} · {lexeme.partOfSpeech}</p><h2>{lexeme.article ? lexeme.article+" " : ""}{lexeme.lemma}</h2><span className="muted text-uv-text-muted">{lexeme.id} · {lexeme.normalized} · {lexeme._count.userStates} learners</span></div><div>{lexeme.provenance[0]?.reviewState ?? lexeme.senses[0]?.reviewState ?? "UNREVIEWED"}</div></div>

        <form action={updateLexemeAction} className="admin-grid-form uv-gap-f73364d9bf flex-wrap uv-vcf5ce320fa:uv-min-height-e005337472 uv-vfc0df1ac56:uv-min-height-e005337472 uv-v586b3820a5:grid uv-v586b3820a5:uv-gap-b0633a4dbe uv-v586b3820a5:text-uv-fdbd07cbfaa uv-v586b3820a5:text-uv-c7dbd63a13e grid uv-grid-template-columns-edd6aecd0f items-end uv-margin-c3f2ebc6d1">
          <input type="hidden" name="lexemeId" value={lexeme.id}/>
          <label>Lemma<input name="lemma" defaultValue={lexeme.lemma} required/></label>
          <label>Article<input name="article" defaultValue={lexeme.article ?? ""}/></label>
          <label>Plural<input name="plural" defaultValue={lexeme.plural ?? ""}/></label>
          <label>Gender<input name="gender" defaultValue={lexeme.gender ?? ""}/></label>
          <label>CEFR<input name="cefrLevel" defaultValue={lexeme.cefrLevel ?? ""}/></label>
          <label>Part of speech<select name="partOfSpeech" defaultValue={lexeme.partOfSpeech}>{["NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION","CONJUNCTION","INTERJECTION","PHRASE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
          <ConfirmSubmitButton message="Save canonical lexeme changes?">Save canonical data</ConfirmSubmitButton>
        </form>

        <div className="admin-three-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-563355decf uv-max900:uv-grid-template-columns-6a5c4d4d49">
          <section><h3>Aliases</h3><div className="admin-chip-list flex flex-wrap uv-gap-832075f344 uv-margin-bottom-888e967739">{lexeme.aliases.map((alias)=><form action={removeAliasAction} key={alias.id} className="admin-chip inline-flex items-center uv-gap-c46804a34b uv-padding-cdfcc0742f uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-f5f68d82942"><input type="hidden" name="aliasId" value={alias.id}/><span>{alias.surface} · {alias.kind}</span><ConfirmSubmitButton className="admin-chip-delete border-0 bg-transparent text-inherit cursor-pointer text-uv-f19feeb881c" message={"Remove alias “"+alias.surface+"”?"}>×</ConfirmSubmitButton></form>)}</div><form action={addAliasAction} className="admin-inline-form flex uv-gap-f73364d9bf items-end flex-wrap uv-vcf5ce320fa:uv-min-height-e005337472 uv-vfc0df1ac56:uv-min-height-e005337472"><input type="hidden" name="lexemeId" value={lexeme.id}/><input name="surface" placeholder="New alias" required/><select name="kind" defaultValue="SPELLING_VARIANT">{["USER_INPUT","ARTICLE_VARIANT","SPELLING_VARIANT","INFLECTED_FORM","IMPORTED","GENERATED"].map(x=><option key={x}>{x}</option>)}</select><button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">Add</button></form></section>
          <section><h3>Senses, definitions & translations</h3>{lexeme.senses.map((sense)=><div className="admin-data-block grid uv-gap-12537bffdd uv-padding-415e70f440 uv-border-top-8d7f82f403 text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v982220ddd5:text-uv-c7dbd63a13e" key={sense.id}><strong>{sense.key} · {sense.reviewState}</strong><span>{sense.gloss ?? "No gloss"}</span><small>{[...sense.definitions.map(d=>"definition "+d.language+": "+d.text),...sense.translations.map(t=>t.language+": "+t.text)].join(" · ") || "No semantic data"}</small></div>)}</section>
          <section><h3>Provenance</h3>{lexeme.provenance.map((p)=><div className="admin-data-block grid uv-gap-12537bffdd uv-padding-415e70f440 uv-border-top-8d7f82f403 text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v982220ddd5:text-uv-c7dbd63a13e" key={p.id}><strong>{p.source} · {p.reviewState}</strong><span>{p.provider ?? "—"} / {p.model ?? "—"}</span><small>{p.promptVersion ?? "no prompt version"} · {p.contentVersion ?? "no content version"}</small></div>)}</section>
        </div>

        <div className="admin-two-column grid uv-gap-19feeb881c uv-margin-c3f2ebc6d1 uv-grid-template-columns-dd0b1a1848 uv-max900:uv-grid-template-columns-6a5c4d4d49">
          <section><h3>Patterns</h3>{lexeme.patterns.map(p=><div className="admin-data-block grid uv-gap-12537bffdd uv-padding-415e70f440 uv-border-top-8d7f82f403 text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v982220ddd5:text-uv-c7dbd63a13e" key={p.id}>{p.pattern}</div>)}<h3>Examples</h3>{lexeme.examples.map(e=><div className="admin-data-block grid uv-gap-12537bffdd uv-padding-415e70f440 uv-border-top-8d7f82f403 text-uv-f6b4e408307 uv-v36c0309a03:text-uv-c7dbd63a13e uv-v982220ddd5:text-uv-c7dbd63a13e" key={e.id}><strong>{e.targetText}</strong><span>{e.english ?? e.persian ?? ""}</span></div>)}</section>
          <section><h3>Review state</h3><form action={reviewLexemeAction} className="admin-inline-form flex uv-gap-f73364d9bf items-end flex-wrap uv-vcf5ce320fa:uv-min-height-e005337472 uv-vfc0df1ac56:uv-min-height-e005337472"><input type="hidden" name="lexemeId" value={lexeme.id}/><select name="reviewState" defaultValue={lexeme.provenance[0]?.reviewState ?? "ACCEPTED"}>{Object.values(LexemeReviewState).map(x=><option key={x}>{x}</option>)}</select><ConfirmSubmitButton message="Change curated review state for this lexeme?">Apply state</ConfirmSubmitButton></form><p className="muted text-uv-text-muted">{lexeme._count.encounters} encounters · {lexeme._count.mistakes} linked mistake records</p></section>
        </div>
      </article>)}
    </div>
    <nav className="admin-pagination grid uv-grid-template-columns-e4c3efd568 items-center uv-margin-c3f2ebc6d1 text-uv-c7dbd63a13e uv-v87e7c148d8:text-right"><span>{page>1?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page-1}}}>Previous</Link>:null}</span><span>Page {page} of {pages} · {total} lexemes</span><span>{page<pages?<Link href={{pathname:"/admin/lexicon",query:{...q,page:page+1}}}>Next</Link>:null}</span></nav>
  </main>;
}
