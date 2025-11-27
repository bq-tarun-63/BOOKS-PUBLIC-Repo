import Mention from "@tiptap/extension-mention";
import MentionList, { MentionListRef } from "@/components/tailwind/mention-list"
import tippy, { type Instance, type Props } from "tippy.js"
import { ReactRenderer } from "@tiptap/react"
import { postWithAuth } from "@/lib/api-helpers";
import { Notification } from "@/types/notification";

export const createMentionExtension = (mentionUser: (payload: Notification , noteId: string , noteTitle:string) => void) => {
  return Mention.configure({
    HTMLAttributes: {
      class: "bg-accent text-[color-mix(in_srgb,currentColor_60%,transparent)] rounded text-[16px] dark:text-[#9B9B9B] p-[2px]",
    },
    suggestion: {
      char: "@",
      items: () => [], // items handled inside MentionList via context
      render: () => {
        let component: ReactRenderer;
        let popup: Instance<Props>;

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, {
              props: {
                ...props,
                onMention: async (item, workspaceId) => {
                  try {
                    const response = await postWithAuth("/api/notification/add", {
                      workspaceId,
                      noteId: item.noteId,
                      noteTitle: item.noteTitle,
                      type: "MENTION",
                      sentTo: [
                        {
                          userId: item.userId,
                          userEmail: item.userEmail,
                          userName: item.userName,
                        },
                      ],
                    });

                    if ("error" in response || "message" in response) {
                      return null;
                    }

                    console.log('Printing Mention Notification', response)

                    mentionUser(response.notification, item.noteId, item.noteTitle);
                  } catch (err) {
                    console.error("Failed to send mention notification:", err);
                  }
                },
              },
              editor: props.editor,
            });

            popup = tippy(document.body, {
              getReferenceClientRect: () =>
                props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },

          onUpdate(props) {
            component.updateProps({ ...props });
            popup.setProps({
              getReferenceClientRect: () =>
                props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
            });
          },

          onKeyDown(props) {
            return (component.ref as MentionListRef)?.onKeyDown?.(props) ?? false;
          },

          onExit() {
            popup.destroy();
            component.destroy();
          },
        };
      },
    },
  });
};
