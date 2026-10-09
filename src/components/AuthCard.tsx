import Image from "next/image";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="panel">
        <Image className="logo" src="/logo.png" alt="LS Studio, création de contenu pour entreprises" width={480} height={483} priority />
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted small" style={{ marginTop: 4 }}>{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
