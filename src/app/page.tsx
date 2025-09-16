import Dashboard from './Dashboard';
import styles from './home.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.wrapper}>
        <h1 className={styles.title}>Dashboard - Controle de Nível</h1>
        <p className={styles.subtitle}>Visualização de PV, SP, MV, CV, erro e status</p>
        <Dashboard />
      </main>
    </div>
  );

}
