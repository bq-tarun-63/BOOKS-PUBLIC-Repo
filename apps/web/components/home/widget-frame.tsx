"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface WidgetFrameProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function WidgetFrame({
  title,
  description,
  icon,
  actions,
  children,
  className,
  contentClassName,
}: WidgetFrameProps) {
  return (
    <section className={cn("home-widget", className)}>
      <header>
        <div className="home-widget-title">
          {icon ? <div className="icon-wrapper">{icon}</div> : null}
          <div>
            <h2>{title}</h2>
            {description ? <p className="text-sm opacity-70">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="home-widget-actions">{actions}</div> : null}
      </header>
      <div className={cn("flex flex-1 flex-col", contentClassName)}>{children}</div>
    </section>
  );
}
