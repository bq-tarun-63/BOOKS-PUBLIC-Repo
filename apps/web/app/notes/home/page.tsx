"use client";

import "./home.css";

import clsx from "clsx";
import { CalendarClock, Clock, Edit3, GripVertical, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { RecentNotesWidget } from "@/components/home/recent-notes-widget";
import { TimeWidget } from "@/components/home/time-widget";
import { Button } from "@/components/tailwind/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tailwind/ui/popover";
import { Skeleton } from "@/components/tailwind/ui/skeleton";
import { useRecentlyVisited } from "@/hooks/use-recentlyVisited";

type WidgetType = "time" | "recent-notes";

interface TimeWidgetSettings {
  timeZone?: string;
  label?: string;
}

interface WidgetInstance {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  settings?: TimeWidgetSettings;
}

interface WidgetDefinition {
  type: WidgetType;
  label: string;
  description: string;
  icon: ReactNode;
  defaultSize: {
    width: number;
    height: number;
  };
  createDefaultSettings?: () => TimeWidgetSettings | undefined;
  render: (args: { widget: WidgetInstance }) => ReactNode;
}

const MIN_WIDGET_WIDTH = 240;
const MIN_WIDGET_HEIGHT = 200;
const MIN_CANVAS_HEIGHT = 520;
const CANVAS_PADDING = 24;
const FALLBACK_CONTENT_WIDTH = 960;
const DEFAULT_TIME_ZONE = getDefaultTimeZone();

const INITIAL_WIDGETS: WidgetInstance[] = [
  {
    id: "recent-notes-1",
    type: "recent-notes",
    x: 0,
    y: 0,
    width: 640,
    height: 280,
  },
  {
    id: "time-1",
    type: "time",
    x: 0,
    y: 320,
    width: 360,
    height: 240,
    settings: {
      timeZone: DEFAULT_TIME_ZONE,
    },
  },
];

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  if (max < min) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function getDefaultTimeZone() {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved || "UTC";
  } catch {
    return "UTC";
  }
}

export default function HomePage() {
  const { recentNotes, isLoading, error, refreshRecentNotes, formatTime } = useRecentlyVisited();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const editModeFromUrl = searchParams.get("mode") === "edit";
  const [isEditing, setIsEditing] = useState(editModeFromUrl);
  const [widgets, setWidgets] = useState<WidgetInstance[]>(() => INITIAL_WIDGETS.map((widget) => ({ ...widget })));
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const contentWidthRef = useRef(0);
  const [canvasWidth, setCanvasWidth] = useState(0);

  useEffect(() => {
    setIsEditing(editModeFromUrl);
  }, [editModeFromUrl]);

  useLayoutEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const contentWidth = Math.max(0, canvasWidth - CANVAS_PADDING * 2);
  useEffect(() => {
    contentWidthRef.current = contentWidth;
  }, [contentWidth]);

  const maxBottom = widgets.reduce((acc, widget) => Math.max(acc, widget.y + widget.height), 0);
  const canvasHeight = Math.max(MIN_CANVAS_HEIGHT, maxBottom) + CANVAS_PADDING * 2;

  const updateUrlForEditing = (nextEditing: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextEditing) {
      params.set("mode", "edit");
    } else {
      params.delete("mode");
    }
    const nextQuery = params.toString();
    router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
  };

  const setInteractionLock = (locked: boolean) => {
    if (typeof document === "undefined") {
      return;
    }
    document.body.style.userSelect = locked ? "none" : "";
    document.body.style.cursor = locked ? "grabbing" : "";
  };

  const startPointerTracking = (
    event: ReactPointerEvent<HTMLElement>,
    onMove: (nativeEvent: PointerEvent) => void,
    onEnd?: () => void,
  ) => {
    const pointerId = event.pointerId;
    const target = event.currentTarget;

    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Ignore if the element cannot capture the pointer (e.g. Safari when target is disabled)
    }

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId === pointerId) {
        onMove(moveEvent);
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // Ignore release errors
      }
      onEnd?.();
    };

    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === pointerId) {
        cleanup();
      }
    };

    const handleCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) {
        cleanup();
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  };

  const handleEditToggle = () => {
    const nextEditing = !isEditing;
    setIsEditing(nextEditing);
    updateUrlForEditing(nextEditing);
  };

  const handleWidgetPointerDown = (event: ReactPointerEvent<HTMLDivElement>, widgetId: string) => {
    if (!isEditing) {
      return;
    }

    if ((event.target as HTMLElement)?.closest("[data-widget-control]")) {
      return;
    }

    const widget = widgets.find((item) => item.id === widgetId);
    if (!widget) {
      return;
    }

    event.preventDefault();
    setActiveWidgetId(widgetId);
    setInteractionLock(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = widget.x;
    const initialY = widget.y;
    const widgetWidth = widget.width;

    startPointerTracking(
      event,
      (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const effectiveWidth = contentWidthRef.current > 0 ? contentWidthRef.current : FALLBACK_CONTENT_WIDTH;
        const maxLeft = Math.max(0, effectiveWidth - widgetWidth);

        const nextX = clamp(initialX + dx, 0, maxLeft);
        const nextY = Math.max(0, initialY + dy);

        setWidgets((prev) =>
          prev.map((item) => {
            if (item.id !== widgetId) {
              return item;
            }
            if (item.x === nextX && item.y === nextY) {
              return item;
            }
            return { ...item, x: nextX, y: nextY };
          }),
        );
      },
      () => {
        setActiveWidgetId(null);
        setInteractionLock(false);
      },
    );
  };

  const handleWidgetResizeStart = (event: ReactPointerEvent<HTMLDivElement>, widgetId: string) => {
    if (!isEditing) {
      return;
    }

    const widget = widgets.find((item) => item.id === widgetId);
    if (!widget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setActiveWidgetId(widgetId);
    setInteractionLock(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = widget.width;
    const startHeight = widget.height;
    const startXPosition = widget.x;

    startPointerTracking(
      event,
      (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const effectiveWidth = contentWidthRef.current > 0 ? contentWidthRef.current : FALLBACK_CONTENT_WIDTH;
        const maxWidth = Math.max(MIN_WIDGET_WIDTH, effectiveWidth - startXPosition);

        const nextWidth = clamp(startWidth + dx, MIN_WIDGET_WIDTH, maxWidth);
        const nextHeight = Math.max(MIN_WIDGET_HEIGHT, startHeight + dy);

        setWidgets((prev) =>
          prev.map((item) => {
            if (item.id !== widgetId) {
              return item;
            }
            if (item.width === nextWidth && item.height === nextHeight) {
              return item;
            }
            return { ...item, width: nextWidth, height: nextHeight };
          }),
        );
      },
      () => {
        setActiveWidgetId(null);
        setInteractionLock(false);
      },
    );
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId));
    if (activeWidgetId === widgetId) {
      setActiveWidgetId(null);
    }
  };

  const handleUpdateWidgetSettings = useCallback((widgetId: string, newSettings: Partial<TimeWidgetSettings>) => {
    setWidgets((prev) =>
      prev.map((widget) => {
        if (widget.id !== widgetId) {
          return widget;
        }
        return {
          ...widget,
          settings: { ...widget.settings, ...newSettings },
        };
      }),
    );
  }, []);

  const widgetDefinitions = useMemo<Record<WidgetType, WidgetDefinition>>(
    () => ({
      time: {
        type: "time",
        label: "Current time",
        description: "Live clock with your selected timezone.",
        icon: <CalendarClock className="h-4 w-4" />,
        defaultSize: {
          width: 360,
          height: 240,
        },
        createDefaultSettings: () => ({
          timeZone: DEFAULT_TIME_ZONE,
        }),
        render: ({ widget }) => (
          <TimeWidget
            timeZone={widget.settings?.timeZone ?? DEFAULT_TIME_ZONE}
            onTimeZoneChange={(timeZone) => handleUpdateWidgetSettings(widget.id, { timeZone })}
          />
        ),
      },
      "recent-notes": {
        type: "recent-notes",
        label: "Recent activity",
        description: "Jump back into your latest notes.",
        icon: <Clock className="h-4 w-4" />,
        defaultSize: {
          width: 640,
          height: 280,
        },
        render: ({ widget: _ }) => (
          <RecentNotesWidget
            notes={recentNotes}
            isLoading={isLoading}
            error={error}
            onRefresh={refreshRecentNotes}
            formatTime={formatTime}
            onNoteClick={(noteId) => router.push(`/notes/${noteId}`)}
          />
        ),
      },
    }),
    [recentNotes, isLoading, error, refreshRecentNotes, formatTime, router, handleUpdateWidgetSettings],
  );

  const handleAddWidget = (type: WidgetType) => {
    const definition = widgetDefinitions[type];
    if (!definition) {
      return;
    }

    const availableWidth = contentWidthRef.current > 0 ? contentWidthRef.current : FALLBACK_CONTENT_WIDTH;
    const width = clamp(definition.defaultSize.width, MIN_WIDGET_WIDTH, Math.max(MIN_WIDGET_WIDTH, availableWidth));
    const height = Math.max(MIN_WIDGET_HEIGHT, definition.defaultSize.height);
    const bottom = widgets.reduce((acc, widget) => Math.max(acc, widget.y + widget.height), 0);

    const newWidget: WidgetInstance = {
      id: `${type}-${uuidv4()}`,
      type,
      x: 0,
      y: bottom === 0 ? 0 : bottom + 32,
      width,
      height,
      settings: definition.createDefaultSettings ? definition.createDefaultSettings() : undefined,
    };

    setWidgets((prev) => [...prev, newWidget]);
    setActiveWidgetId(newWidget.id);
    setIsAddMenuOpen(false);

    if (!isEditing) {
      setIsEditing(true);
      updateUrlForEditing(true);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Show skeleton loading while data is being fetched
  if (isLoading) {
    return (
      <div className="layout layout-home">
        <div className="home-surface home-surface--full">
          <div className="home-hero-block">
            <div className="home-hero-primary">
              <div className="home-hero-primary-inner">
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
            <div className="home-hero-secondary">
              <div className="home-hero-secondary-inner">
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
          </div>

          <div className="home-content">
            <div className="home-toolbar">
              <div className="home-toolbar-left"></div>
              <div className="home-toolbar-actions flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>

            <div className="home-canvas" style={{ height: "600px" }}>
              <div className="absolute" style={{ top: "20px", left: "20px", width: "300px", height: "200px" }}>
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
              <div className="absolute" style={{ top: "20px", left: "340px", width: "400px", height: "300px" }}>
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout layout-home">
      <div className="home-surface home-surface--full">
        <div className="home-hero-block">
          <div className="home-hero-primary">
            <div className="home-hero-primary-inner">
              <span>{greeting}</span>
            </div>
          </div>
          <div className="home-hero-secondary">
            <div className="home-hero-secondary-inner">Welcome home</div>
          </div>
        </div>

        <div className="home-content">
          <div className="home-toolbar">
            <div className="home-toolbar-left">
        
             
            </div>
            <div className="home-toolbar-actions">
              <Button
                type="button"
                size="sm"
                variant={isEditing ? "default" : "outline"}
                onClick={handleEditToggle}
                aria-pressed={isEditing}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                {isEditing ? "Done" : "Edit page"}
              </Button>
              <Popover open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant={isEditing ? "default" : "outline"}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add widget
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-80 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
                >
                  <div className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Available widgets</div>
                  <div className="flex flex-col gap-2">
                    {Object.values(widgetDefinitions).map((definition) => (
                      <button
                        key={definition.type}
                        type="button"
                        onClick={() => handleAddWidget(definition.type)}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/85 px-3 py-3 text-left transition-colors hover:border-slate-500 hover:bg-slate-100/80 dark:border-slate-700 dark:bg-slate-900/85 dark:hover:border-slate-500/70 dark:hover:bg-slate-800/70"
                      >
                        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {definition.icon}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {definition.label}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            {definition.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isEditing ? (
            <div className="home-edit-banner">
              Drag widgets anywhere, resize them from the corner handle, delete with the trash icon, and use “Add
              widget” to bring items back.
            </div>
          ) : null}

          <div
            ref={canvasRef}
            className={clsx("home-canvas", isEditing && "home-canvas--editing")}
            style={{ height: canvasHeight }}
          >
            {widgets.length === 0 ? (
              <div className="home-widget-empty pointer-events-none absolute inset-0">
                <strong>No widgets yet.</strong>
                <span className="text-xs opacity-75">Use the “Add widget” button to populate your home page.</span>
              </div>
            ) : null}

            {widgets.map((widget, index) => {
              const definition = widgetDefinitions[widget.type];
              if (!definition) {
                return null;
              }
              const isActive = activeWidgetId === widget.id;
              const baseZIndex = isEditing ? (isActive ? 50 : 30 + index) : 10 + index;

              const widgetStyle: CSSProperties = {
                top: widget.y,
                left: widget.x,
                width: widget.width,
                height: widget.height,
                zIndex: baseZIndex,
              };

              return (
                <div
                  key={widget.id}
                  style={widgetStyle}
                  className={clsx("absolute", isEditing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
                  onPointerDown={(event) => handleWidgetPointerDown(event, widget.id)}
                >
                  <div
                    className={clsx(
                      "h-full w-full",
                      isEditing ? "pointer-events-none select-none" : "pointer-events-auto",
                    )}
                  >
                    {definition.render({ widget })}
                  </div>

                  {isEditing ? (
                    <>
                      <div
                        className={clsx(
                          "pointer-events-none absolute inset-[6px] rounded-[24px] border-2 border-dashed transition-colors",
                          isActive
                            ? "border-neutral-900/70 shadow-[0_0_0_4px_rgba(17,24,39,0.12)]"
                            : "border-neutral-600/40",
                        )}
                      />
                      <div data-widget-control className="home-drag-indicator">
                        <GripVertical className="h-3 w-3" />
                        Drag
                      </div>
                      <button
                        type="button"
                        data-widget-control
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteWidget(widget.id);
                        }}
                        className="home-delete-button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div
                        data-widget-control
                        role="presentation"
                        onPointerDown={(event) => handleWidgetResizeStart(event, widget.id)}
                        className="home-resize-handle"
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
