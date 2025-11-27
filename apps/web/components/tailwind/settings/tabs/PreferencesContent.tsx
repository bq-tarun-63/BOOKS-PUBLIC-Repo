"use client";

import ToggleSetting from "../components/ToggleSetting";

export default function PreferencesContent() {
  return (
    <div className="space-y-12">
      <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100">
        Preferences
      </div>

      {/* Appearance */}
      <div className="flex items-center justify-between cursor-default">
        <div className="flex flex-col mr-[5%] w-3/4 gap-1.5">
          <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
            <div className="flex flex-row gap-1">Appearance</div>
          </div>
          <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
            Customize how Books by Betaque looks on your device.
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          Light
          <svg
            aria-hidden="true"
            role="graphics-symbol"
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0"
          >
            <path d="m12.76 6.52-4.32 4.32a.62.62 0 0 1-.44.18.62.62 0 0 1-.44-.18L3.24 6.52a.63.63 0 0 1 0-.88c.24-.24.64-.24.88 0L8 9.52l3.88-3.88c.24-.24.64-.24.88 0s.24.64 0 .88" />
          </svg>
        </div>
      </div>

      <div className="pt-12">
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100">
          Language & Time
        </div>

        {/* Language */}
        <div className="flex flex-col items-start w-auto h-auto px-0">
          <div className="flex items-start w-full">
            <div className="flex flex-col gap-1.5 w-full">
              <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
                Language
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
                Change the language used in the user interface.
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              English (US)
              <svg
                aria-hidden="true"
                role="graphics-symbol"
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0"
              >
                <path d="m12.76 6.52-4.32 4.32a.62.62 0 0 1-.44.18.62.62 0 0 1-.44-.18L3.24 6.52a.63.63 0 0 1 0-.88c.24-.24.64-.24.88 0L8 9.52l3.88-3.88c.24-.24.64-.24.88 0s.24.64 0 .88" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center pointer-events-none w-full h-[18px] flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>

        {/* Start week on Monday */}
        <ToggleSetting
          label="Start week on Monday"
          description="This will change how all calendars in your app look."
          checked={false}
        />

        <div className="flex items-center justify-center pointer-events-none w-full h-[18px] flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>

        {/* Set timezone automatically */}
        <ToggleSetting
          label="Set timezone automatically using your location"
          description="Reminders, notifications and emails are delivered based on your time zone."
          checked={true}
        />

        <div className="flex items-center justify-center pointer-events-none w-full h-[18px] flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>

        {/* Timezone */}
        <div className="flex items-center justify-between cursor-not-allowed">
          <div className="flex flex-col mr-[5%] w-3/4 gap-1.5">
            <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
              <div className="flex flex-row gap-1">Timezone</div>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
              Current timezone setting.
            </div>
          </div>
          <div className="rounded-md m-0 cursor-default">
            <div className="flex items-center gap-2 leading-[120%] w-full select-none min-h-7 text-sm px-2 opacity-30">
              <div className="mx-0 min-w-0 flex-shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
                (GMT+05:30) Calcutta
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pointer-events-none w-full h-12 flex-shrink-0">
        <div
          role="separator"
          className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
        />
      </div>

      {/* Desktop app section */}
      <div>
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100">
          Desktop app
        </div>

        <ToggleSetting
          label="Open links in desktop app"
          description={
            <>
              You must have the{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="inline text-current underline select-none cursor-pointer"
              >
                macOS app
              </a>{" "}
              installed.
            </>
          }
          checked={false}
        />

        <div className="flex items-center justify-center pointer-events-none w-full h-[18px] flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>

        <div className="flex items-center justify-between cursor-default">
          <div className="flex flex-col mr-[5%] w-3/4 gap-1.5">
            <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
              <div className="flex flex-row gap-1"></div>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
              If installed, macOS will open links to Books by Betaque  in the desktop app, even if this
              setting is turned off. To disable that behavior, enable "Open Books by Betaque  links in browser"
              in your app.
            </div>
          </div>
          <button
            role="button"
            tabIndex={0}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-8 px-3 rounded-md whitespace-nowrap text-sm justify-center font-medium leading-[1.2] border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Set in app
          </button>
        </div>

        <div className="flex items-center justify-center pointer-events-none w-full h-[18px] flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>

        <div className="flex items-center justify-between cursor-default">
          <div className="flex flex-col mr-[5%] w-3/4 gap-1.5">
            <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
              <div className="flex flex-row gap-1">Open on start</div>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
              Choose what to show when Books by Betaque  starts or when you switch workspaces.
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            Last visited page
            <svg
              aria-hidden="true"
              role="graphics-symbol"
              viewBox="0 0 16 16"
              className="w-3.5 h-3.5 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0"
            >
              <path d="m12.76 6.52-4.32 4.32a.62.62 0 0 1-.44.18.62.62 0 0 1-.44-.18L3.24 6.52a.63.63 0 0 1 0-.88c.24-.24.64-.24.88 0L8 9.52l3.88-3.88c.24-.24.64-.24.88 0s.24.64 0 .88" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pointer-events-none w-full h-12 flex-shrink-0">
        <div
          role="separator"
          className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
        />
      </div>

      {/* Privacy section */}
      <div>
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100">
          Privacy
        </div>

        <div className="flex items-center justify-between cursor-default">
          <div className="flex flex-col mr-[5%] w-3/4 gap-1.5">
            <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
              <div className="flex flex-row gap-1">Cookie settings</div>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
              Customize cookies. See{" "}
              <a
                href="#"
                rel="noopener noreferrer"
                className="inline text-current underline select-none cursor-pointer"
              >
                Cookie Notice
              </a>{" "}
              for details.
            </div>
          </div>
          <div className="inline-flex items-center h-8 px-2 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            Customize
            <svg
              aria-hidden="true"
              role="graphics-symbol"
              viewBox="0 0 30 30"
              className="w-2.5 h-full block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0 ml-1 transition-transform duration-200"
            >
              <polygon points="15,17.4 4.8,7 2,9.8 15,23 28,9.8 25.2,7 " />
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-center pointer-events-none w-full h-[18px] flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>

        <ToggleSetting
          label="Show my view history"
          description={
            <>
              People with edit or full access will be able to see when you've viewed a page.{" "}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline text-current underline select-none cursor-pointer"
              >
                Learn more
              </a>
              .
            </>
          }
          checked={true}
        />

        <div className="flex items-center justify-center pointer-events-none w-full h-[18px] flex-shrink-0">
          <div
            role="separator"
            className="w-full h-px invisible border-b border-zinc-300 dark:border-zinc-600"
          />
        </div>

        <ToggleSetting
          label="Profile discoverability"
          description={
            <>
              Users with your email can see your name and profile picture when inviting you to a
              new workspace.{" "}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline text-current underline select-none cursor-pointer"
              >
                Learn more
              </a>
              .
            </>
          }
          checked={true}
        />
      </div>
    </div>
  );
}

