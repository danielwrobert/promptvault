export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hl-1";

export const card = "rounded-card bg-surface p-[30px] shadow-card dark:shadow-card-dark";

export const field =
  "block w-full rounded-field border-[1.5px] border-muted/35 bg-page px-[13px] py-[11px] text-ink focus:outline-none focus:border-hl-1 focus:ring-3 focus:ring-hl-1/25";

export const label = "mb-2 block text-[11px] font-extrabold tracking-[.08em] text-muted";

export const pillSmall =
  `rounded-full text-[11.5px] font-extrabold uppercase tracking-[.03em] cursor-pointer ${focusRing}`;

export const ghostButton =
  `flex items-center gap-[7px] rounded-full border border-muted/35 px-4 py-[9px] text-[13px] font-bold uppercase tracking-[.04em] text-ink cursor-pointer transition-colors hover:border-hl-1 hover:text-hl-1 ${focusRing}`;

/** Card top-row buttons (Edit / Delete). Each use site adds its own hover color. */
export const pillOutline =
  `rounded-full border border-muted/45 px-3.5 py-[7px] text-[12px] font-extrabold uppercase tracking-[.04em] text-muted cursor-pointer transition-colors ${focusRing}`;

/** Small accent-outlined pill (Notes "Add"/"Edit", toast action). */
export const pillAccent = `${pillSmall} border border-hl-1 px-3 py-[5px] text-hl-1`;

/** Filled primary pill (Save Note, Save in the editor). */
export const pillFilled = `${pillSmall} px-3.5 py-[7px] border-0 bg-hl-1 text-white dark:text-page`;

/** Neutral outlined pill (Cancel). */
export const pillOutlineMuted = `${pillSmall} px-3.5 py-[7px] border border-muted/35 text-ink`;

/** Destructive outlined pill (Delete Note). */
export const pillDanger = `${pillSmall} px-3.5 py-[7px] border border-hl-2/50 text-hl-2`;

export const linkButton =
  `inline-flex items-center gap-1.5 rounded text-[12.5px] font-bold text-hl-1 cursor-pointer hover:underline ${focusRing}`;
