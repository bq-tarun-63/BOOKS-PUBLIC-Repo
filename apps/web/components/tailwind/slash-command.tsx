import { postWithAuth } from "@/lib/api-helpers";
import type { Editor, Range } from "@tiptap/core";
import {
  CheckSquare,
  Code,
  FilePlus,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  History,
  ImageIcon,
  KanbanIcon,
  List,
  ListOrdered,
  Columns,
  Table,
  Text,
  TextQuote,
  Twitter,
  Youtube,
  Calendar,
  GanttChart,
  Globe,
  Link2,
} from "lucide-react";
import { Command, createSuggestionItems, getUrlFromString, isValidUrl, renderItems } from "novel";
import { uploadFn } from "./image-upload";
import Magic from "./ui/icons/magic";
import { ObjectId } from "bson";
import { openEmbedModal } from "@/lib/embed-modal-helper";
import { buildColumnLayoutNode, clampColumnCount, getDefaultColumnWidths, parseWidthsInput } from "./column-layout-utils";

const insertColumnLayout = (editor: Editor, range: Range, columnCount: number, widths: number[]) => {
  const { from } = range;
  
  // Insert the column layout and get the position where it was inserted
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent(buildColumnLayoutNode(columnCount, widths))
    .run();

  // Move cursor into the first column's first paragraph
  setTimeout(() => {
    const { state } = editor;
    const { doc } = state;
    
    // Find the most recently inserted column layout (closest to insertion point)
    let columnLayoutPos = -1;
    let minDistance = Infinity;
    
    doc.descendants((node, pos) => {
      if (node.type.name === "columnLayout") {
        const distance = Math.abs(pos - from);
        if (distance < minDistance) {
          minDistance = distance;
          columnLayoutPos = pos;
        }
      }
    });

    if (columnLayoutPos !== -1) {
      const layoutNode = doc.nodeAt(columnLayoutPos);
      if (layoutNode && layoutNode.firstChild) {
        // Navigate into the first column item
        // Position calculation: columnLayoutPos + 1 (opening tag) + 1 (first column item opening)
        const firstColumnItemPos = columnLayoutPos + 1;
        const firstColumnNode = layoutNode.firstChild;
        
        // Find the first paragraph inside the first column
        let paragraphPos = -1;
        firstColumnNode.descendants((node, pos) => {
          if (node.type.name === "paragraph" && paragraphPos === -1) {
            // Calculate absolute position: firstColumnItemPos + pos + 1 (for the paragraph opening)
            paragraphPos = firstColumnItemPos + pos + 1;
            return false; // Stop at first paragraph
          }
        });

        if (paragraphPos !== -1) {
          // Set cursor at the start of the first paragraph in the first column
          editor
            .chain()
            .setTextSelection(paragraphPos)
            .focus()
            .run();
        }
      }
    }
  }, 10);
};

export const getSuggestionItems = (
  parentId: string,
  promptForPageTitle: () => Promise<{ title: string; emoji: string }>,
  onNewPageCreated?: (href: string) => void,
  onAskAICommand?: () => void,
  onHistoryCommand?: () => void,
) => {
  return createSuggestionItems([
    // {
    //   title: "Send Feedback",
    //   description: "Let us know how we can improve.",
    //   icon: <MessageSquarePlus size={18} />,
    //   command: ({ editor, range }) => {
    //     editor.chain().focus().deleteRange(range).run();
    //     window.open("/feedback", "_blank");
    //   },
    // },
    {
      title: "Ask AI",
      description: "Get AI assistance with your content",
      searchTerms: ["ask", "ai", "askai"],
      icon: <Magic className="h-5 w-5" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        if (onAskAICommand) {
          onAskAICommand();
        }
      },
    },
    {
      title: "CMS",
      description: "Create/link CMS content block",
      searchTerms: ["cms", "content", "page"],
      icon: <FilePlus size={18} />,
      command: async ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();

        // Generate unique CMS ID
        const generateCmsId = () => {
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substring(2, 9);
          return `cms_${timestamp}_${random}`;
        };

        // Get workspace ID as project ID
        const workspaceId =
          localStorage.getItem("workspaceId") ||
          window.location.pathname.split("/")[2] || // Try to get from URL
          "default_workspace";

        const contentId = generateCmsId();
        const locale = "en-US"; // Default locale

        try {
          // Create CMS content in database
          const res = await fetch(`/api/cms/contents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customId: contentId,
              projectId: workspaceId,
              type: "rich_text",
              fields: { body: "" },
              locale,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || "Failed to create CMS content");

          // Insert CMS block into editor
          editor
            .chain()
            .focus()
            .insertContent([
              { type: "paragraph" },
              {
                type: "cmsBlock",
                attrs: {
                  contentId: data.id,
                  projectId: workspaceId,
                  content: "",
                  lastSavedContent: "",
                  locale,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        } catch (e) {
          console.error("CMS creation error:", e);
          // If API fails, still create local block
          editor
            .chain()
            .focus()
            .insertContent([
              { type: "paragraph" },
              {
                type: "cmsBlock",
                attrs: {
                  contentId,
                  projectId: workspaceId,
                  content: "",
                  lastSavedContent: "",
                  locale,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        }
      },
    },
    {
      title: "Text",
      description: "Just start typing with plain text.",
      searchTerms: ["p", "paragraph"],
      icon: <Text size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
      },
    },
    {
      title: "To-do List",
      description: "Track tasks with a to-do list.",
      searchTerms: ["todo", "task", "list", "check", "checkbox"],
      icon: <CheckSquare size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Heading 1",
      description: "Big section heading.",
      searchTerms: ["title", "big", "large"],
      icon: <Heading1 size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading.",
      searchTerms: ["subtitle", "medium"],
      icon: <Heading2 size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading.",
      searchTerms: ["subtitle", "small"],
      icon: <Heading3 size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a simple bullet list.",
      searchTerms: ["unordered", "point"],
      icon: <List size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create a list with numbering.",
      searchTerms: ["ordered"],
      icon: <ListOrdered size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Quote",
      description: "Capture a quote.",
      searchTerms: ["blockquote"],
      icon: <TextQuote size={18} />,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").toggleBlockquote().run(),
    },
    {
      title: "Callout",
      description: "Create a callout with an icon.",
      searchTerms: ["callout", "note", "highlight"],
      icon: <TextQuote size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent({
          type: "callout",
          attrs: {
            icon: "💡",
          },
          content: [
            {
              type: "paragraph",
            },
          ],
        }).run();
      },
    },
    {
      title: "Code",
      description: "Capture a code snippet.",
      searchTerms: ["codeblock"],
      icon: <Code size={18} />,
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Image",
      description: "Upload an image from your computer.",
      searchTerms: ["photo", "picture", "media"],
      icon: <ImageIcon size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // upload image
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
          if (input.files?.length) {
            const file = input.files[0];
            if (file) {
              const pos = editor.view.state.selection.from;
              uploadFn(file, editor.view, pos);
            }
          }
        };
        input.click();
      },
    },
    {
      title: "Embed",
      description: "Embed external content using an iframe.",
      searchTerms: ["embed", "iframe", "link"],
      icon: <Globe size={18} />,
      command: ({ editor, range }) => {
        // Calculate position for the modal (above the cursor)
        let position: { top: number; left: number } | undefined;
        try {
          const selection = editor.view.state.selection;
          const coords = editor.view.coordsAtPos(selection.from);
          position = {
            top: coords.top,
            left: coords.left,
          };
        } catch (error) {
          // If we can't get coordinates, modal will center
          console.warn("Could not get cursor position for embed modal", error);
        }

        openEmbedModal(editor, range, position);
      },
    },
    {
      title: "Bookmark",
      description: "Create a bookmark card for a web link.",
      searchTerms: ["bookmark", "web bookmark", "link card", "url"],
      icon: <Link2 size={18} />,
      command: ({ editor, range }) => {
        // Calculate position for the modal (above the cursor)
        let position: { top: number; left: number } | undefined;
        try {
          const selection = editor.view.state.selection;
          const coords = editor.view.coordsAtPos(selection.from);
          position = {
            top: coords.top,
            left: coords.left,
          };
        } catch (error) {
          // If we can't get coordinates, modal will center
          console.warn("Could not get cursor position for bookmark modal", error);
        }

        openEmbedModal(editor, range, position);
      },
    },
    {
      title: "Youtube",
      description: "Embed a Youtube video.",
      searchTerms: ["video", "youtube", "embed"],
      icon: <Youtube size={18} />,
      command: ({ editor, range }) => {
        const videoLink = prompt("Please enter Youtube Video Link");
        //From https://regexr.com/3dj5t
        const ytregex = new RegExp(
          /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
        );

        if (videoLink && ytregex.test(videoLink)) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setYoutubeVideo({
              src: videoLink,
            })
            .run();
        } else {
          if (videoLink !== null) {
            alert("Please enter a correct Youtube Video Link");
          }
        }
      },
    },
    {
      title: "Twitter",
      description: "Embed a Tweet.",
      searchTerms: ["twitter", "embed"],
      icon: <Twitter size={18} />,
      command: ({ editor, range }) => {
        const tweetLink = prompt("Please enter Twitter Link");
        const tweetRegex = new RegExp(/^https?:\/\/(www\.)?x\.com\/([a-zA-Z0-9_]{1,15})(\/status\/(\d+))?(\/\S*)?$/);

        if (tweetLink && tweetRegex.test(tweetLink)) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setTweet({
              src: tweetLink,
            })
            .run();
        } else {
          if (tweetLink !== null) {
            alert("Please enter a correct Twitter Link");
          }
        }
      },
    },
    {
      title: "Page",
      description: "Create a new page and link to it.",
      searchTerms: ["page", "new"],
      icon: <FileText size={18} />,
      command: async ({ editor, range }) => {
        try {
          const { title, emoji } = await promptForPageTitle();
          const response = await postWithAuth<any>("/api/note/createNote", {
            title,
            icon: emoji,
            parentId,
          });
          // response may have child.id or id depending on backend
          const newId = (response as any).child?.id || (response as any).id;
          if (newId) {
            // Mark this note as recently created to help with loading
            localStorage.setItem(`note-created-${newId}`, Date.now().toString());

            const href = `/notes/${newId}`;
            editor.chain().focus().deleteRange(range).insertContent(`<a href="${href}">${title}</a> `).run();

            // Navigate to the new Note
            if (onNewPageCreated) {
              onNewPageCreated(href);
            }
          }
        } catch (err) {
          console.error("Failed to create page", err);
        }
      },
    },
    {
      title: "Table",
      description: "Insert a 3x3 table",
      searchTerms: ["table"],
      icon: <Table size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
      },
    },
    {
      title: "Columns",
      description: "Create a custom column layout with flexible widths.",
      searchTerms: ["column", "columns", "layout", "split"],
      icon: <Columns size={18} />,
      command: ({ editor, range }) => {
        let columnCount = 2;
        if (typeof window !== "undefined") {
          const countInput = window.prompt("How many columns do you need? (2-5)", "2");
          if (countInput === null) {
            return;
          }
          const requested = Number(countInput);
          columnCount = Math.max(2, clampColumnCount(Number.isFinite(requested) ? requested : 2));
        }

        const defaults = getDefaultColumnWidths(columnCount);
        const widths = typeof window !== "undefined"
          ? parseWidthsInput(
              window.prompt(
                `Enter ${columnCount} column widths separated by commas (example: ${defaults.join(", ")})`,
                defaults.join(", "),
              ),
              columnCount,
              defaults,
            )
          : defaults;

        insertColumnLayout(editor, range, columnCount, widths);
      },
    },
    {
      title: "2 Columns",
      description: "Split the page into two equal writing areas.",
      searchTerms: ["column", "columns", "layout", "split", "two"],
      icon: <Columns size={18} />,
      command: ({ editor, range }) => {
        insertColumnLayout(editor, range, 2, getDefaultColumnWidths(2));
      },
    },
    {
      title: "3 Columns",
      description: "Split the page into three equal writing areas.",
      searchTerms: ["column", "columns", "layout", "split", "three"],
      icon: <Columns size={18} />,
      command: ({ editor, range }) => {
        insertColumnLayout(editor, range, 3, getDefaultColumnWidths(3));
      },
    },
    {
      title: "4 Columns",
      description: "Split the page into four equal writing areas.",
      searchTerms: ["column", "columns", "layout", "split", "four"],
      icon: <Columns size={18} />,
      command: ({ editor, range }) => {
        insertColumnLayout(editor, range, 4, getDefaultColumnWidths(4));
      },
    },
    {
      title: "5 Columns",
      description: "Split the page into five equal writing areas.",
      searchTerms: ["column", "columns", "layout", "split", "five"],
      icon: <Columns size={18} />,
      command: ({ editor, range }) => {
        insertColumnLayout(editor, range, 5, getDefaultColumnWidths(5));
      },
    },
    
    {
      title: "History",
      description: "View version history",
      searchTerms: ["history", "version", "commit"],
      icon: <History size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        if (onHistoryCommand) {
          onHistoryCommand();
        }
      },
    },
    {
      title: "Board",
      description: "Insert a task management board",
      searchTerms: ["kanban", "tasks", "project"],
      icon: <KanbanIcon />,
      command: async ({ editor, range }) => {
        try {
          console.log("Running /Board Command ");
          const newObjId = new ObjectId();
          const viewId = `${newObjId}`;
          const response = await postWithAuth("/api/database/createView", {
            title: "My Task Board",
            viewsType: [{
              id: viewId,
              viewType: "board",
              title: "Board",
              icon: "",
            }],
            noteId: parentId,
          });

          console.log("Board Creation Response", response);

          const newBoard = response.view;
          const newBoardId = response.view?._id;
          if (!newBoardId) {
            throw new Error("Board creation failed: no ID returned");
          }

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: "paragraph" },
              {
                type: "reactComponentBlock",
                attrs: {
                  component: "board",
                  viewId: newBoardId,
                  initialBoard: newBoard,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        } catch (err) {
          console.error("Failed to insert board", err);
        }
      },
    },
    {
      title: "List",
      description: "Insert a task management list view",
      searchTerms: ["list", "table", "tasks", "rows"],
      icon: <List />,
      command: async ({ editor, range }) => {
        try {
          console.log("Running /List Command ");
          const newObjId = new ObjectId();
          const viewId = `${newObjId}`;
          const response = await postWithAuth("/api/database/createView", {
            title: "My Task Board",
            viewsType: [{
              id: viewId,
              viewType: "list",
              title: "List",
              icon: "",
            }],
            noteId: parentId,
          });

          console.log("List Creation Response", response);

          const newBoard = response.view;
          const newBoardId = response.view?._id;
          if (!newBoardId) {
            throw new Error("List creation failed: no ID returned");
          }

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: "paragraph" },
              {
                type: "reactComponentBlock",
                attrs: {
                  component: "board",
                  viewId: newBoardId,
                  initialBoard: newBoard,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        } catch (err) {
          console.error("Failed to insert list", err);
        }
      },
    },
    {
      title: "Timeline",
      description: "Insert a timeline view for project management",
      searchTerms: ["timeline", "gantt", "project", "schedule"],
      icon: <GanttChart />,
      command: async ({ editor, range }) => {
        try {
          console.log("Running /Timeline Command ");
          const newObjId = new ObjectId();
          const viewId = `${newObjId}`;
          const response = await postWithAuth("/api/database/createView", {
            title: "My Task Board",
            viewsType: [{
              id: viewId,
              viewType: "timeline",
              title: "Timeline",
              icon: "",
            }],
            noteId: parentId,
          });

          console.log("Timeline Creation Response", response);

          const newView = response.view;
          const newViewId = response.view?._id;
          if (!newViewId) {
            throw new Error("Timeline creation failed: no ID returned");
          }

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: "paragraph" },
              {
                type: "reactComponentBlock",
                attrs: {
                  component: "board",
                  viewId: newViewId,
                  initialBoard: newView,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        } catch (err) {
          console.error("Failed to insert timeline", err);
        }
      },
    },
    {
      title: "Calendar",
      description: "Insert a calendar view for date-based organization",
      searchTerms: ["calendar", "date", "schedule", "events"],
      icon: <Calendar />,
      command: async ({ editor, range }) => {
        try {
          console.log("Running /Calendar Command ");
          const newObjId = new ObjectId();
          const viewId = `${newObjId}`;
          const response = await postWithAuth("/api/database/createView", {
            title: "My Task Board",
            viewsType: [{
              id: viewId,
              viewType: "calendar",
              title: "Calendar",
              icon: "", 
            }],
            noteId: parentId,
          });

          console.log("Calendar Creation Response", response);

          const newView = response.view;
          const newViewId = response.view?._id;
          if (!newViewId) {
            throw new Error("Calendar creation failed: no ID returned");
          }

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: "paragraph" },
              {
                type: "reactComponentBlock",
                attrs: {
                  component: "board",
                  viewId: newViewId,
                  initialBoard: newView,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        } catch (err) {
          console.error("Failed to insert calendar", err);
        }
      },
    },
    {
      title: "Sprint Board",
      description: "Insert a sprint Board",
      searchTerms: ["sprint", "task", "planing", "track"],
      icon: <Calendar />,
      command: async ({ editor, range }) => {
        try {
          console.log("Running /sprint Command ");
          const viewId1 = `${new ObjectId()}`;
          const viewId2 = `${new ObjectId()}`;
          const viewId3 = `${new ObjectId()}`;
          const response = await postWithAuth("/api/database/createView", {
            title: "Sprint Board",
            isSprint: true,
            viewsType: [{
              id: viewId1,
              viewType: "board",
              title: "Current sprint",
              icon: "", 
            },
            {
              id: viewId2,
              viewType: "list",
              title: "Sprint planning",
              icon: "", 
            },
            {
              id: viewId3,
              viewType: "list1",
              title: "Backlog",
              icon: "", 
            },
          ],
            noteId: parentId,
          });

          console.log("Sprint board Creation Response", response);

          const newView = response.view;
          const newViewId = response.view?._id;
          if (!newViewId) {
            throw new Error("Sprint Board creation failed: no ID returned");
          }

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: "paragraph" },
              {
                type: "reactComponentBlock",
                attrs: {
                  component: "board",
                  viewId: newViewId,
                  initialBoard: newView,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        } catch (err) {
          console.error("Failed to insert sprint", err);
        }
      },
    },
  ]);
};

export const getSlashCommand = (
  parentId: string,
  promptForPageTitle: () => Promise<{ title: string; emoji: string }>,
  onAskAICommand?: () => void,
  onHistoryCommand?: () => void,
) =>
  Command.configure({
    suggestion: {
      items: () => getSuggestionItems(parentId, promptForPageTitle, onAskAICommand, onHistoryCommand),
      render: renderItems,
    },
  });
