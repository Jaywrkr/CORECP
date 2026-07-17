import packageJson from "../../package.json";

export default function VersionBadge() {
  const version = packageJson.version;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

  return (
    <div
      className="pointer-events-none fixed bottom-2 left-2 z-40 select-none text-[10px]"
      style={{ color: "var(--text-tertiary)" }}
    >
      v{version}
      {commit ? ` · ${commit}` : ""}
    </div>
  );
}
