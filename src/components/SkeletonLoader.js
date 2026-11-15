// src/components/SkeletonLoader.js
"use client";

export function AppBootSkeleton({ darkMode = true }) {
  const bar = darkMode ? "bg-zinc-800/80" : "bg-zinc-200";
  return (
    <div
      className={`flex h-screen safe-top safe-bottom ${
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
      }`}
    >
      <div
        className={`hidden w-72 flex-col gap-4 border-r p-4 md:flex ${
          darkMode ? "border-zinc-800/80 bg-zinc-900/40" : "border-zinc-200 bg-white"
        }`}
      >
        <div className={`h-9 w-40 animate-pulse rounded-xl ${bar}`} />
        <div className={`h-10 w-full animate-pulse rounded-xl ${bar}`} />
        <div className="space-y-2 pt-2">
          <div className={`h-8 w-full animate-pulse rounded-lg ${bar}`} />
          <div className={`h-8 w-5/6 animate-pulse rounded-lg ${bar}`} />
          <div className={`h-8 w-4/6 animate-pulse rounded-lg ${bar}`} />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div className={`h-10 w-48 animate-pulse rounded-xl ${bar}`} />
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className={`h-12 w-2/3 animate-pulse rounded-2xl ${bar}`} />
          <div className={`ml-auto h-12 w-1/2 animate-pulse rounded-2xl ${bar}`} />
          <div className={`h-20 w-3/4 animate-pulse rounded-2xl ${bar}`} />
        </div>
        <div className={`mx-auto h-14 w-full max-w-3xl animate-pulse rounded-2xl ${bar}`} />
      </div>
    </div>
  );
}

export function MessageSkeleton({ darkMode = true }) {
  const bar = darkMode ? "bg-zinc-800/80" : "bg-zinc-200";
  return (
    <div className="flex max-w-2xl gap-3 animate-fadeIn">
      <div className={`h-8 w-8 shrink-0 animate-pulse rounded-lg ${bar}`} />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className={`h-3 w-28 animate-pulse rounded ${bar}`} />
        <div className={`h-3.5 w-full animate-pulse rounded ${bar}`} />
        <div className={`h-3.5 w-5/6 animate-pulse rounded ${bar}`} />
        <div className={`h-3.5 w-2/3 animate-pulse rounded ${bar}`} />
      </div>
    </div>
  );
}