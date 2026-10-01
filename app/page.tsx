import { Header } from "@/app/components/header";
import { PromptsProvider } from "@/app/components/prompts-provider";
import { PromptVault } from "@/app/components/prompt-vault";
import { ToastProvider } from "@/app/components/toast";

export default function Home() {
  return (
    <ToastProvider>
      <PromptsProvider>
        <div className="mx-auto max-w-[1180px] px-8 pt-14 pb-24">
          <Header />
          <PromptVault />
        </div>
      </PromptsProvider>
    </ToastProvider>
  );
}
