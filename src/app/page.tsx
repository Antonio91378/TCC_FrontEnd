import Dashboard from './Dashboard';

export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Dashboard - Controle de Nível</h1>
      <p style={{ marginBottom: 16, opacity: 0.8 }}>Visualização de PV, SP, MV, CV, erro e status</p>
      <Dashboard />
    </main>
  );

}
