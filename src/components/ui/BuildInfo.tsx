export function BuildInfo() {
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";
  return (
    <span className="font-mono text-[10px] text-encre-soft/50 select-none" title="Version déployée">
      {sha}
    </span>
  );
}
