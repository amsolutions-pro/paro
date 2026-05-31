export function BuildInfo() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  return (
    <span className="font-mono text-[10px] text-encre-soft/50 select-none" title="Version déployée">
      v{version}
    </span>
  );
}
