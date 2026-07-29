export function MarketingSections({ onCreate }: { onCreate: () => void }) {
  return (
    <>
      <section className="marketing-section" id="how-it-works">
        <span className="section-kicker">HOW IT WORKS</span>
        <h2>From rough idea to teaching flow</h2>
        <div className="step-grid">
          <article><b>01</b><h3>Give it context</h3><p>Start with an idea, source text, transcript or video—then add what this student actually needs.</p></article>
          <article><b>02</b><h3>Get a coherent lesson</h3><p>Superclass adapts structure, language support, timing and practice to the level and goal.</p></article>
          <article><b>03</b><h3>Edit or present</h3><p>Tune any screen, keep private notes, switch to classroom mode, or print teacher and student versions.</p></article>
        </div>
      </section>

      <section className="transformation-section">
        <div>
          <span className="section-kicker">EXAMPLE TRANSFORMATION</span>
          <h2>One sentence in. A complete teaching arc out.</h2>
          <blockquote>“A B1 class about living abroad.”</blockquote>
        </div>
        <div className="arc-list">
          {["Warm-up that activates experience", "Useful language for cultural adaptation", "Source-aware comprehension", "Microgrammar in context", "Longer speaking task", "Review, homework and answer key"].map((item, index) => (
            <div key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</div>
          ))}
        </div>
      </section>

      <section className="difference-section">
        <span className="section-kicker">WHY IT IS DIFFERENT</span>
        <h2>Canva helps you design slides.<br />Superclass helps you teach a class.</h2>
        <div className="compare-grid">
          <article className="compare-muted"><h3>A blank design tool</h3><ul><li>You choose every slide</li><li>You write every activity</li><li>You manage level and timing</li><li>You create answers separately</li></ul></article>
          <article className="compare-bright"><h3>A lesson system</h3><ul><li>Level-specific pedagogy</li><li>Coherent teaching sequence</li><li>Student-aware practice</li><li>Notes and answers built in</li></ul></article>
        </div>
      </section>

      <section className="marketing-section">
        <span className="section-kicker">BUILT FOR REAL TEACHERS</span>
        <h2>The details that save prep time</h2>
        <div className="feature-grid">
          {[
            ["Level intelligence", "A0 scaffolding is materially different from a C1 debate."],
            ["Private teacher mode", "Keep timing, expected answers and correction ideas away from students."],
            ["Source grounding", "Comprehension and evidence stay attached to the material you supplied."],
            ["Classroom mode", "Present with keyboard navigation and reveal answers only when ready."],
            ["Local drafts", "Restore, duplicate and manage recent lessons without an account."],
            ["Print both versions", "Save a teacher copy with notes or a clean student handout."],
          ].map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div><span className="section-kicker">PRICING PREVIEW</span><h2>Pay for finished lessons, not another blank workspace.</h2></div>
        <div className="price-grid">
          <article><small>ONE COMPLETE LESSON</small><strong>$5</strong><p>One ready-to-teach lesson and both print versions.</p></article>
          <article className="popular"><small>FIVE-LESSON PACK</small><strong>$15</strong><p>For teachers preparing several personalized classes.</p></article>
          <article><small>MONTHLY TEACHER PLAN</small><strong>Coming later</strong><p>Accounts, cloud history and reusable student profiles.</p></article>
        </div>
        <p className="pricing-note">Preview only. Payments are not connected in this demo.</p>
      </section>

      <section className="final-cta">
        <span>LESS PREP. BETTER CLASSES.</span>
        <h2>Your next lesson can be ready in minutes.</h2>
        <button className="primary-button" type="button" onClick={onCreate}>Create My Lesson</button>
      </section>
    </>
  );
}
