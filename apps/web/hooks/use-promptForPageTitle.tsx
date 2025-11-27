// usePromptForPageTitle.tsx
import { createPortal } from "react-dom";
import { PageTitleModal } from "../components/tailwind/ui/addPageModal";
import { useState } from "react";

export function usePromptForPageTitle() {
  const [modal, setModal] = useState<React.ReactNode | null>(null);

  const prompt = () => {
    return new Promise<{ title: string; emoji: string }>((resolve, reject) => {
      const handleSubmit = (data: { title: string; emoji: string }) => {
        resolve(data);
        setModal(null);
      };

      const handleCancel = () => {
        reject("cancelled");
        setModal(null);
      };

      setModal(<PageTitleModal onSubmit={handleSubmit} onCancel={handleCancel} isLoading={false} />);
    });
  };

  return {
    promptForPageTitle: prompt,
    modal,
  };
}
