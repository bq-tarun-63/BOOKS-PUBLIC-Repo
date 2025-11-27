"use client";

import clsx from "clsx";
import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WidgetFrame } from "@/components/home/widget-frame";
import { Button } from "@/components/tailwind/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tailwind/ui/popover";

const TIMEZONE_OPTIONS: string[] = getTimeZoneOptions();

interface TimeWidgetProps {
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
}

export function TimeWidget({ timeZone, onTimeZoneChange }: TimeWidgetProps) {
  const [now, setNow] = useState(() => new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const displayName = useMemo(() => formatTimeZoneDisplay(timeZone), [timeZone]);
  const timeString = useMemo(() => formatTimeInZone(now, timeZone), [now, timeZone]);
  const dateString = useMemo(() => formatDateInZone(now, timeZone), [now, timeZone]);
  const offsetLabel = useMemo(() => formatOffsetLabel(now, timeZone), [now, timeZone]);

  const filteredTimeZones = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return TIMEZONE_OPTIONS.slice(0, 12);
    }
    return TIMEZONE_OPTIONS.filter((option) => option.toLowerCase().includes(normalized)).slice(0, 12);
  }, [searchTerm]);

  const handleSelectTimeZone = (zone: string) => {
    onTimeZoneChange(zone);
    setIsPickerOpen(false);
    setSearchTerm("");
  };

  return (
    <WidgetFrame
      title="Current time"
      description={`${displayName} • ${offsetLabel}`}
      icon={<CalendarClock className="h-4 w-4" />}
      className="time-widget"
      contentClassName="time-widget-content"
      actions={
        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="time-widget-change">
              Change
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="time-widget-popover">
            <div className="time-widget-search">
              <label className="sr-only" htmlFor="timezone-search">
                Search timezones
              </label>
              <input
                id="timezone-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search city or timezone"
              />
            </div>
            <div className="time-widget-options">
              {filteredTimeZones.length === 0 ? (
                <div className="time-widget-empty-result">No matches found</div>
              ) : (
                filteredTimeZones.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    className={clsx("time-widget-option", zone === timeZone && "time-widget-option--active")}
                    onClick={() => handleSelectTimeZone(zone)}
                  >
                    <span>{formatTimeZoneDisplay(zone)}</span>
                    <span>{formatOffsetLabel(now, zone)}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      }
    >
      <div className="time-widget-body">
        <div className="time-widget-meta">
          <span>{displayName}</span>
          <span>{offsetLabel}</span>
        </div>
        <div className="time-widget-time">{timeString}</div>
        <div className="time-widget-date">{dateString}</div>
      </div>
    </WidgetFrame>
  );
}

function getTimeZoneOptions(): string[] {
  type IntlWithSupportedValuesOf = typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  const intlWithValues = Intl as IntlWithSupportedValuesOf;
  if (typeof intlWithValues.supportedValuesOf === "function") {
    try {
      return intlWithValues.supportedValuesOf("timeZone") ?? [];
    } catch {
      // fall through to fallback
    }
  }
  return [
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
  ];
}

function formatTimeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatOffsetLabel(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: "short",
      hour: "numeric",
    }).formatToParts(date);
    const zonePart = parts.find((part) => part.type === "timeZoneName")?.value;
    return zonePart ?? timeZone;
  } catch {
    return timeZone;
  }
}

function formatTimeZoneDisplay(timeZone: string) {
  return timeZone.replace(/_/g, " ").replace(/\//g, " • ");
}
