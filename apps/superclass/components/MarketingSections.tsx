export function MarketingSections({ onCreate }: { onCreate: () => void }) {
  return (
    <>
      <section className="marketing-section audience-section">
        <div><span className="section-kicker">WHO IT IS FOR</span><h2>Built for the way tutors and teachers actually teach</h2><p>Useful whether you teach privately, independently, through an online tutoring marketplace or in an online language school.</p></div>
        <div className="feature-grid">
          {[
            ["Independent tutors", "Personalized one-to-one classes without rebuilding every resource."],
            ["Preply tutors", "Fits tutors who teach through Preply and message students after class. No platform affiliation."],
            ["italki teachers", "Fits teachers who use italki alongside their own lesson workspace. No platform affiliation."],
            ["Language schools", "Consistent tutor and teacher packs with student-ready materials."],
            ["Conversation tutors and teachers", "Interactive prompts, speaking challenges and correction continuity."],
            ["Exam and professional-language educators", "Structured practice, evidence, answer keys and focused follow-up."],
          ].map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>
      <section className="marketing-section" id="how-it-works">
        <span className="section-kicker">HOW IT WORKS</span>
        <h2>From rough idea to teaching flow</h2>
        <div className="step-grid">
          <article><b>01</b><h3>Give it context</h3><p>Start with an idea, source text, transcript or video—then add what this student actually needs.</p></article>
          <article><b>02</b><h3>Get a coherent lesson</h3><p>Superclass adapts structure, language support, timing and practice to the level and goal.</p></article>
          <article><b>03</b><h3>Open it and teach</h3><p>Present immediately, open compact Teacher tools only when needed, or print tutor/teacher and student versions.</p></article>
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
        <h2>Traditional preparation uses separate files.<br />Superclass keeps the teaching flow together.</h2>
        <div className="compare-grid">
          <article className="compare-muted"><h3>Traditional preparation</h3><ul><li>Blank Canva file</li><li>Separate lesson plan and worksheet</li><li>Separate homework and answer key</li><li>Repeated materials and manual continuity</li></ul></article>
          <article className="compare-bright"><h3>Superclass</h3><ul><li>Student-aware interactive class</li><li>Private teacher notes</li><li>Student and teacher PDFs</li><li>Homework and next-class continuity</li></ul></article>
        </div>
      </section>

      <section className="marketing-section">
        <span className="section-kicker">BUILT FOR TUTORS AND TEACHERS</span>
        <h2>The details that save prep time</h2>
        <div className="feature-grid">
          {[
            ["Level intelligence", "A0 scaffolding is materially different from a C1 debate."],
            ["Teacher tools on demand", "Keep timing, useful models and optional correction away from students until needed."],
            ["Source grounding", "Comprehension and evidence stay attached to the material you supplied."],
            ["Lesson Player", "Teach through interactive activities with keyboard navigation and private guidance."],
            ["Local student profiles", "Carry goals, corrections and recent lesson continuity without an account."],
            ["Two PDF packs", "Download a student workbook and a complete private teacher pack."],
          ].map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div><span className="section-kicker">PRICING PREVIEW</span><h2>Pay for finished lessons, not another blank workspace.</h2></div>
        <div className="price-grid">
          <article><small>ONE COMPLETE LESSON</small><strong>$5</strong><p>One ready-to-teach lesson and both print versions.</p></article>
          <article className="popular"><small>FIVE-LESSON PACK</small><strong>$15</strong><p>For tutors and teachers preparing several personalized classes.</p></article>
          <article><small>MONTHLY TEACHER PLAN</small><strong>Coming later</strong><p>Accounts, cloud history and reusable student profiles.</p></article>
        </div>
        <p className="pricing-note">Preview only. Payments are not connected in this demo.</p>
      </section>

      <section className="final-cta">
        <span>LESS PREP. BETTER CLASSES.</span>
        <h2>Your next lesson can be ready in minutes.</h2>
        <button className="primary-button" type="button" onClick={onCreate}>Create My Next Class</button>
      </section>
    </>
  );
}
