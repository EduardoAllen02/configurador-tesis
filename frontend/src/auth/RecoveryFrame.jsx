import { LogoMark } from "../components/ui/Icon.jsx";

export default function RecoveryFrame({ title, description, children }) {
  return <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
    <section className="card card-pad stack" aria-labelledby="recovery-heading" style={{ width: 420, maxWidth: "100%" }}>
      <div className="stack" style={{ alignItems: "center", gap: "var(--space-2)", textAlign: "center" }}>
        <LogoMark width={30} height={30} strokeWidth={1.5} />
        <h1 id="recovery-heading" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h1>
        <p className="text-soft" style={{ fontSize: 14 }}>{description}</p>
      </div>
      {children}
    </section>
  </div>;
}
