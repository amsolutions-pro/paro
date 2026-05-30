/** Placeholder temporaire pour les sections étoffées aux étapes 3 et 4. */
export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-3xl font-bold">{title}</h1>
      <p className="text-encre-soft max-w-2xl">{note}</p>
      <p className="border-grege-300 bg-grege-50 text-encre-soft mt-2 inline-block w-fit rounded-md border px-3 py-1.5 text-sm">
        Section en cours de construction.
      </p>
    </div>
  );
}
