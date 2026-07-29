export const platformNames = ["Preply", "italki", "Cambly", "AmazingTalker", "Verbling", "Private lessons"] as const;
export const platformDisclaimer = "Superclass is an independent product and is not affiliated with, endorsed by or sponsored by the teaching platforms mentioned.";

export function PlatformCompatibility() {
  return <section className="platform-section" aria-labelledby="platform-title">
    <div><span className="section-kicker">FITS YOUR EXISTING TEACHING WORKFLOW</span><h2 id="platform-title">Teach through the platform you already use.</h2><p>Designed for teachers who use online tutoring marketplaces, video calls and private messaging to run personalized classes.</p></div>
    <div className="platform-strip" aria-label="Teaching platform compatibility">{platformNames.map((name) => <span key={name}>{name}</span>)}</div>
    <p className="platform-disclaimer">{platformDisclaimer}</p>
  </section>;
}
