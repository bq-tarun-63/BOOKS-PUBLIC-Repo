import { Column } from "@/components/tailwind/board/boardView/boardView";
import { BoardProperty, BoardPropertyOption, Note, ViewCollection } from "@/types/board";
// Add a new card to a column
export const addCard = (columns: Column[], columnId: string, cardTitle: string): Column[] => {
  return columns.map(col => {
    if (col.id === columnId) {
      const newCard : Note = {
        _id: `temp_${Date.now()}`,
        title: cardTitle,
        content: "",
        description: "", 
        noteType : "", 
        databaseProperties : {}, 
        contentPath: "",
        commitSha: "",
        comments: []
      };
      return {
        ...col,
        cards: [...col.cards, newCard],
        count: col.count + 1
      };
    }
    return col;
  });
};

// Replace temp card ID with real one
export const replaceTempCardId = (
  columns: Column[],
  columnId: string,
  tempId: string,
  realId: string
): Column[] => {
  return columns.map((col) =>
    col.id === columnId
      ? {
          ...col,
          cards: col.cards.map((c) =>
            c._id === tempId ? { ...c, id: realId } : c
          ),
        }
      : col
  );
};

// Rollback failed optimistic add
export const rollbackTempCard = (
  columns: Column[],
  columnId: string,
  tempId: string
): Column[] => {
  return columns.map((col) =>
    col.id === columnId
      ? {
          ...col,
          cards: col.cards.filter((c) => c._id !== tempId),
          count: col.count - 1,
        }
      : col
  );
};



// Edit an existing card
export const editCard = (columns: Column[], columnId: string, cardId: string, newTitle: string): Column[] => {
  return columns.map(col => {
    if (col.id === columnId) {
      return {
        ...col,
        cards: col.cards.map(card =>
          card._id === cardId ? { ...card, title: newTitle } : card
        )
      };
    }
    return col;
  });
};

// Delete a card
export const deleteCard = (columns: Column[], columnId: string, cardId: string): Column[] => {
  return columns.map(col => {
    if (col.id === columnId) {
      return {
        ...col,
        cards: col.cards.filter(card => card._id !== cardId),
        count: col.count - 1
      };
    }
    return col;
  });
};


// Set priority for a card
export const setCardPriority = (
  columns: Column[],
  columnId: string,
  cardId: string,
  priority?: "Low" | "Medium" | "High"
): Column[] => {
  return columns.map((col) => {
    if (col.id === columnId) {
      return {
        ...col,
        cards: col.cards.map((card) =>
          card._id === cardId
            ? { ...card, priority: priority || "Low" } // default to Low
            : card
        ),
      };
    }
    return col;
  });
};


export const getPropertyValue = (
  card: Note,
  board: ViewCollection,
  propertyName: string
): string | number | boolean | null => {
  if (!board?.properties) return null;

  // 1. Find the propId for the given property name
  const propId = Object.keys(board.properties).find(
    (id) => board.properties[id]?.name?.toLowerCase() === propertyName.toLowerCase()
  );

  if (!propId) return null;

  // 2. Get raw value from card
  const rawValue = card.databaseProperties?.[propId];
  if (rawValue === undefined || rawValue === null) return null;

  // 3. Match with options if they exist (for select, status, priority, etc.)
  const propSchema = board.properties[propId];
  if (propSchema?.options) {
    const option = propSchema.options.find(
      (opt: BoardPropertyOption) =>
        opt.name.toLowerCase() === String(rawValue).toLowerCase() ||
        opt.id.toLowerCase() === String(rawValue).toLowerCase()
    );
    return option ? option.name : String(rawValue);
  }

  return rawValue;
};

export const getVisibleProperties =  (properties: Record<string,BoardProperty>) => {

  if(!properties) return [];

  return Object.entries(properties)
  .filter(([_ , prop]) =>  prop.showProperty)
  .map(([id , prop]) =>id )
} 