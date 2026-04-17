export function OrgMainInset({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "1rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      {children}
    </div>
  );
}
