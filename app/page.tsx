import { Header } from "@/app/components/header";
import { PromptVault } from "@/app/components/prompt-vault";

export default function Home() {
  return (
    <div className="mx-auto max-w-[1180px] px-8 pt-14 pb-24">
      <Header />
      <PromptVault />
    </div>
  );
}
