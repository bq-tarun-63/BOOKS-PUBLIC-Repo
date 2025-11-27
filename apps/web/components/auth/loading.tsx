"use client";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center  bg-background dark:bg-background ">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-4 border-[#e1e1e0] dark:border-[#3a3a3a] border-t-blue-500 rounded-full animate-spin" />
        </div>

        {/* Heading */}
        <h2 className="text-base font-medium text-[#5F5E5B] dark:text-[#9B9B9B]">
          Signing you in...
        </h2>

        {/* Subtext */}
        <p className="text-sm text-muted-foreground">
          Please wait while we verify your credentials
        </p>
      </div>
    </div>
  );
}
