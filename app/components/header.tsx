import { SparkleIcon } from "@/app/components/icons";
import { LibraryActions } from "@/app/components/library-actions";
import { ThemeToggle } from "@/app/components/theme-toggle";

export function Header() {
  return (
    <header className="mb-9 flex flex-wrap items-start justify-between gap-5 border-b border-muted/35 pb-7">
      <div className="flex items-center gap-4">
        <div className="flex size-[46px] shrink-0 items-center justify-center rounded-logo bg-hl-1">
          <SparkleIcon className="stroke-white dark:stroke-page" />
        </div>
        <div>
          <h1 className="text-[30px] tracking-[-0.01em]">PromptVault</h1>
          <p className="mt-1.5 text-[14px] text-muted">Your personal library of AI prompts</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3.5">
        <LibraryActions />
        <div aria-hidden="true" className="h-[26px] w-px bg-muted/35" />
        <ThemeToggle />
      </div>
    </header>
  );
}
