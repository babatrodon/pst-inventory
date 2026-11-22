"use client";
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card max-w-md mx-auto mt-10">
      <div className="card-b text-center grid gap-3 py-8">
        <h2 className="text-lg">Something went wrong</h2>
        <p className="hint">The action did not complete. Nothing was lost.</p>
        <button className="btn btn-p justify-self-center" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
