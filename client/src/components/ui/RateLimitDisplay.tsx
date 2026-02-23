// src/components/RateLimitDisplay.tsx
interface RateLimitDisplayProps {
  current: number;
  limit: number;
  resetTime?: Date;
}

export default function RateLimitDisplay({ current, limit, resetTime }: RateLimitDisplayProps) {
  const remaining = limit - current;
  const isLow = remaining <= 1;

  return (
    <div className="border-4 border-black p-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="font-sans text-sm font-bold uppercase tracking-widest">
          Daily Remaining: {remaining} / {limit}
        </span>
        {resetTime && (
          <span className="font-mono text-xs text-gray-600">
            Resets at {resetTime.toLocaleTimeString()}
          </span>
        )}
      </div>
      {isLow && (
        <p className="mt-2 font-sans text-sm text-red-600 font-bold">
          ⚠️ Low quota. You have {remaining} fix{remaining !== 1 ? 'es' : ''} left today.
        </p>
      )}
    </div>
  );
}
