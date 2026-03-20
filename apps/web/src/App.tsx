const pillars = [
  "Fastify API and experiment orchestration boundary",
  "BullMQ worker runtime with isolated Veles adapter",
  "Declarative parameter schema contracts in the shared package",
  "Future-ready discovery, parsing, and ranking module paths"
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Veles Tester MVP Scaffold</p>
        <h1>Schema-driven browser backtesting infrastructure</h1>
        <p className="lede">
          The repository is scaffolded for a worker-owned automation model, explicit job contracts, and a staged
          experiment pipeline. Business flows are intentionally left as TODO implementations.
        </p>
      </section>

      <section className="card-grid">
        {pillars.map((pillar) => (
          <article className="card" key={pillar}>
            <h2>{pillar}</h2>
            <p>Placeholder module boundaries are present so implementation can now fill in the actual Veles flow.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
