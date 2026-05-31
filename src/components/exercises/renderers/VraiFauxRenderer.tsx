"use client";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function VraiFauxRenderer({ payload: _payload, onSubmit, disabled }: Props) {
  function pick(v: boolean) {
    if (disabled) return;
    onSubmit({ value: v, justification: "" });
  }

  return (
    <div className="flex gap-3">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => pick(v)}
          disabled={disabled}
          className={`flex-1 rounded-lg border py-3 font-semibold text-sm transition-colors ${
            v
              ? "border-green-400 hover:bg-green-50 text-green-800"
              : "border-red-400 hover:bg-red-50 text-red-800"
          } disabled:opacity-60`}
        >
          {v ? "Vrai" : "Faux"}
        </button>
      ))}
    </div>
  );
}
