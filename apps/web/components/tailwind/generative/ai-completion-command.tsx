import { Check, TextQuote, TrashIcon } from "lucide-react";
import { useEditor } from "novel";
import { toast } from "sonner";
import { CommandGroup, CommandItem, CommandSeparator } from "../ui/command";

const AICompletionCommands = ({
  completion,
  onDiscard,
}: {
  completion: string;
  onDiscard: () => void;
}) => {
  const { editor } = useEditor();

  if (!editor) {
    return null;
  }

  return (
    <>
      <CommandGroup>
        <CommandItem
          className="gap-2 px-4"
          value="replace"
          onSelect={() => {
            const selection = editor.view.state.selection;

            editor
              .chain()
              .focus()
              .insertContentAt(
                {
                  from: selection.from,
                  to: selection.to,
                },
                completion,
              )
              .run();

            toast.success("Content inserted successfully");
            onDiscard(); // Close the AI selector after accepting
          }}
        >
          <Check className="h-4 w-4 text-green-500" />
          Accept and Replace Selection
        </CommandItem>
        <CommandItem
          className="gap-2 px-4"
          value="insert"
          onSelect={() => {
            const selection = editor.view.state.selection;
            editor
              .chain()
              .focus()
              .insertContentAt(selection.to + 1, completion)
              .run();

            toast.success("Content inserted successfully");
            onDiscard(); // Close the AI selector after accepting
          }}
        >
          <TextQuote className="h-4 w-4 text-blue-500" />
          Accept and Insert Below
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />

      <CommandGroup>
        <CommandItem onSelect={onDiscard} value="thrash" className="gap-2 px-4">
          <TrashIcon className="h-4 w-4 text-red-500" />
          Discard and Close
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AICompletionCommands;
