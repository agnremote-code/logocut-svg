"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ConversionStudio } from "@/components/conversion-studio";
import { SiteFooter } from "@/components/site-footer";
import { openUploader } from "@/components/uploader-trigger";
import { captureAttribution, trackEvent } from "@/lib/analytics";

const steps=[["01","Upload your image","Choose any PNG, JPG or JPEG up to 10 MB."],["02","Judge the preview","Compare the original and SVG in the same studio."],["03","Unlock the clean file","Pay once only when the result looks right."]];
const cases=["Vinyl decals","T-shirts & HTV","Stickers","Tumblers","Business logos","Signs","Cricut projects","Silhouette projects"];
const faqs=[
 ["Will I see the SVG before paying?","Yes. You get a free watermarked preview first, so you can inspect the shape and edges before buying."],
 ["What is the difference between the two outputs?","Single-color is best for silhouettes, decals and simple logos. Layered SVG keeps separate color shapes for multi-layer craft projects."],
 ["Do I need an account or subscription?","No. There is no account and no subscription. Single files and the Complete SVG Pack are one-time purchases."],
 ["Which files can I upload?","PNG, JPG and JPEG images up to 10 MB are supported. Clear images with strong contrast generally convert best."],
 ["Can I use the SVG in Cricut Design Space?","Yes. The downloaded SVG can be imported into Cricut Design Space and other software that supports SVG files."],
];
const start=()=>openUploader("lower_page_cta");

export function HomePage(){useEffect(()=>{captureAttribution();trackEvent("landing_page_view",{source_page:"homepage"});trackEvent("homepage_view",{source_page:"homepage"})},[]);return <main className="premium-page">
 <nav className="premium-nav"><Link href="/" className="brand"><span>LC</span>LogoCut</Link><div className="nav-links"><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div><button className="nav-cta" onClick={start}>Try it free</button></nav>
 <header className="premium-hero"><p className="hero-pill">IMAGE TO SVG, WITHOUT THE GUESSWORK</p><h1>Convert Any Image Into a Clean, Cut-Ready SVG</h1><p>Upload a PNG or JPG, preview the result for free, and pay only when it looks right.</p><span>No account · No subscription · Single-color $5 · Layered $9 · Both for $12</span></header>
 <div className="studio-wrap"><ConversionStudio/></div>
 <section className="trust-strip"><span>Preview first</span><span>One-time pricing</span><span>Secure PayPal checkout</span><span>Instant clean SVG after processing</span></section>
 <section className="premium-section" id="how"><div className="section-intro"><p>HOW IT WORKS</p><h2>From pixels to paths in three clear steps.</h2></div><div className="steps-grid">{steps.map(s=><article key={s[0]}><span>{s[0]}</span><h3>{s[1]}</h3><p>{s[2]}</p></article>)}</div></section>
 <section className="premium-section muted" id="pricing"><div className="section-intro"><p>SIMPLE PRICING</p><h2>Preview for free. Unlock only what you need.</h2></div><div className="pricing-row"><article><span>Best for silhouettes</span><h3>Single-Color SVG</h3><strong>$5 <small>one-time</small></strong><ul><li>Clean SVG without watermark</li><li>Ideal for vinyl and simple cuts</li><li>No subscription</li></ul><button className="secondary-button" onClick={start}>Try free preview</button></article><article><span>Best for color projects</span><h3>Layered SVG</h3><strong>$9 <small>one-time</small></strong><ul><li>Clean layered SVG</li><li>Separate color shapes</li><li>No subscription</li></ul><button className="secondary-button" onClick={start}>Try free preview</button></article><article className="featured"><span>Best one-time value</span><h3>Complete SVG Pack</h3><strong>$12 <small>one-time</small></strong><ul><li>Single-color SVG included</li><li>Layered SVG included</li><li>One upload, one payment</li></ul><button className="primary-button" onClick={start}>Try free preview</button></article></div></section>
 <section className="premium-section"><div className="section-intro"><p>MADE TO MAKE</p><h2>One converter, all kinds of cut projects.</h2></div><div className="case-grid">{cases.map(c=><div key={c}><span>✓</span>{c}</div>)}</div></section>
 <section className="premium-section faq-section" id="faq"><div className="section-intro"><p>FAQ</p><h2>Good to know before you upload.</h2></div><div>{faqs.map(f=><details key={f[0]}><summary>{f[0]}<span>+</span></summary><p>{f[1]}</p></details>)}</div></section>
 <section className="premium-final"><p>YOUR NEXT CUT STARTS HERE</p><h2>See what your image looks like as an SVG.</h2><button className="primary-button" onClick={start}>Generate your free preview</button><span>No account · No subscription · From $5</span></section>
 <SiteFooter/>
 </main>}
