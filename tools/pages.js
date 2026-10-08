#!/usr/bin/env node
/* VibeCaddie — generates every page from assets/vc-data.js.
 *
 * Content lives in the data file, chrome lives here, and the output is plain
 * static HTML so that search engines, answer engines and people with no
 * JavaScript all read the same words.
 *
 *   node tools/pages.js
 *
 * Writes: index.html, <page>/index.html, 404.html, sitemap.xml, llms.txt,
 * vibecaddie.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* Load the browser data file without a bundler. */
const win = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'assets', 'vc-data.js'), 'utf8'))(win);
const D = win.VC;
const B = D.brand;
const S = D.status;

/* ── helpers ─────────────────────────────────────────────────── */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Typographic apostrophes for body copy. */
const tx = s => esc(s).replace(/'/g, '’');

const svg = name => fs.readFileSync(path.join(ROOT, 'assets', name), 'utf8').trim();

const TODAY = new Date().toISOString().slice(0, 10);

const PAGES = [
  { slug: '', file: 'index.html', nav: null, prio: '1.0', freq: 'weekly',
    title: `${B.name} — a code review agent for the code you did not write`,
    desc: 'VibeCaddie audits AI-assisted code. It reads a repository, loads only the review skills that apply, and returns findings ranked by severity with the file, the line and a suggested fix. Pre-launch.' },
  { slug: 'how-it-works', file: 'how-it-works/index.html', nav: 'How it works', prio: '0.8', freq: 'monthly',
    title: `How it works — ${B.name}`,
    desc: 'Point VibeCaddie at a repository with read-only access, the agent works out what the codebase is and loads the review skills that apply, and you get a report ranked by severity.' },
  { slug: 'skills', file: 'skills/index.html', nav: 'Skills', prio: '0.8', freq: 'monthly',
    title: `Review skills — ${B.name}`,
    desc: 'The twelve review skills VibeCaddie can load, what each one looks for, and how the agent decides which apply to your codebase. You never configure them.' },
  { slug: 'pricing', file: 'pricing/index.html', nav: 'Credits', prio: '0.8', freq: 'monthly',
    title: `Credits — ${B.name}`,
    desc: 'Prepaid credits rather than a subscription. One run is 12 credits, so the price of a pass is known before it starts. Planned pricing; nothing is on sale yet.' },
  { slug: 'privacy', file: 'privacy/index.html', nav: 'Privacy', prio: '0.7', freq: 'monthly',
    title: `Privacy — ${B.name}`,
    desc: 'What VibeCaddie reads, what it stores, and what it never does. Read-only access, no copy of your repository kept, and your code is never used to train a model.' }
];

/* ── chrome ──────────────────────────────────────────────────── */
const statusBar = () => `
<div class="status-bar">
  <div class="wrap"><b>${esc(S.label)}.</b> <span>${tx(S.line)}</span></div>
</div>`;

const nav = current => `
<nav class="nav" data-open="false">
  <div class="wrap">
    <a class="wordmark" href="/"><span class="mark" aria-hidden="true"></span>${esc(B.name)}</a>
    <button class="nav-toggle" type="button" aria-controls="nav-links">Menu</button>
    <div class="nav-links" id="nav-links">
      ${D.nav.map(n => `<a href="${esc(n.href)}"${n.label === current ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('\n      ')}
      <a class="btn btn-primary btn-sm" href="/#early-access">Get early access</a>
    </div>
  </div>
</nav>`;

const fzCredit = () => `<span class="fz-credit"><a href="https://factory0.ventures" rel="noopener"><svg class="fz-ring" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.1" fill="none" stroke="#FF5A36" stroke-width="1.9" stroke-dasharray="28.7 9.6"/></svg><span>${esc(B.fzId)} &middot; a Factory Zero venture</span></a></span>`;

const footer = () => `
<footer class="foot">
  <div class="wrap">
    <span>&copy; <span data-year>2026</span> ${esc(B.name)}</span>
    <nav class="foot-nav" aria-label="Footer">
      <a href="/">Home</a>
      <a href="/how-it-works/">How it works</a>
      <a href="/skills/">Skills</a>
      <a href="/pricing/">Credits</a>
      <a href="/privacy/">Privacy</a>
      <a href="${esc(B.github)}" rel="noopener">GitHub</a>
      <a href="mailto:${esc(B.email)}">Contact</a>
    </nav>
    ${fzCredit()}
  </div>
  <div class="wrap foot-built">
    <!-- built-with:start --><!-- built-with:end -->
  </div>
</footer>`;

/* The early-access form. The design mocked an "Install on GitHub" button that
 * linked to a listing which does not exist; this is the honest replacement. */
const earlyAccess = (id = 'early-access') => `
<form class="ea" id="${id}" data-early-access data-fallback="${esc(B.email)}" method="post" action="/api/early-access" novalidate>
  <div class="ea-row">
    <input type="email" name="email" required autocomplete="email" placeholder="you@example.com" aria-label="Your email address" aria-describedby="${id}-msg">
    <input type="text" name="repo" placeholder="github.com/you/project (optional)" aria-label="A repository you would point it at">
    <button class="btn btn-primary" type="submit"><span class="ea-spin" aria-hidden="true"></span><span data-label>Get early access</span></button>
  </div>
  <label class="hp" aria-hidden="true">Company <input type="text" name="company" tabindex="-1" autocomplete="off"></label>
  <p class="ea-msg err" id="${id}-msg" role="alert" hidden></p>
</form>
<div class="ea-done" data-ea-done role="status" aria-live="polite" tabindex="-1" hidden>
  <p class="ea-done-h">You&rsquo;re on the list</p>
  <p>We&rsquo;ll write to <strong data-done-email></strong> when there is something to try.</p>
  <p class="ea-done-s">Signed up before? You&rsquo;re still on it &mdash; nothing more to do. <button type="button" class="ea-again" data-again>Use a different email</button></p>
</div>`;

/* ── structured data ─────────────────────────────────────────── */
function jsonLd(page) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': B.url + '/#org',
      name: B.name,
      url: B.url,
      email: B.email,
      sameAs: [B.github, 'https://factory0.ventures'],
      parentOrganization: { '@type': 'Organization', name: 'Factory Zero', url: 'https://factory0.ventures' }
    },
    {
      '@type': 'WebSite',
      '@id': B.url + '/#site',
      url: B.url,
      name: B.name,
      description: B.lede,
      publisher: { '@id': B.url + '/#org' }
    },
    {
      '@type': 'SoftwareApplication',
      '@id': B.url + '/#app',
      name: B.name,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      description: B.lede,
      /* No aggregateRating and no review: nothing has shipped, so there is
         nothing to rate. */
      offers: D.pricing.packs.map(p => ({
        '@type': 'Offer',
        name: `${p.name} — ${p.credits} credits`,
        price: p.price.replace('$', ''),
        priceCurrency: 'USD',
        availability: S.creditsSold
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
        description: p.desc
      }))
    }
  ];

  if (page.slug === '' || page.slug === 'pricing') {
    graph.push({
      '@type': 'FAQPage',
      '@id': B.url + '/#faq',
      mainEntity: D.faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    });
  }

  if (page.slug !== '') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: B.url + '/' },
        { '@type': 'ListItem', position: 2, name: page.nav || page.title, item: `${B.url}/${page.slug}/` }
      ]
    });
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

/* ── document ────────────────────────────────────────────────── */
function doc(page, body) {
  const url = page.slug ? `${B.url}/${page.slug}/` : `${B.url}/`;
  const og = page.slug ? `/assets/og-${page.slug}.png` : '/assets/og.png';
  return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.desc)}">
<link rel="canonical" href="${esc(url)}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(B.name)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(B.url + og)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.desc)}">
<meta name="twitter:image" content="${esc(B.url + og)}">

<meta name="theme-color" content="#0a0c0b">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

<link rel="alternate" type="text/plain" href="/llms.txt" title="Plain-text brief for language models">
<link rel="alternate" type="application/json" href="/vibecaddie.json" title="${esc(B.name)} as JSON">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/vc.css">

<script type="application/ld+json">${jsonLd(page)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${statusBar()}
${nav(page.nav)}
<main id="main">
${body}
</main>
${footer()}
<script src="/assets/vc-data.js"></script>
<script src="/assets/vc-common.js"></script>
</body>
</html>
`;
}

/* ── shared blocks ───────────────────────────────────────────── */
const mascot = (file, cls, extra = '') =>
  `<div class="mascot mascot--${cls}" aria-hidden="true"${extra}><div class="float">${svg(file)}</div></div>`;

function terminal() {
  const s = D.sample;
  const kind = k => k === 'cmd' ? ' is-cmd' : (k === 'ok' ? ' is-ok' : '');
  return `
  <div class="term" data-term>
    <div class="term-bar">
      <i></i><i></i><i></i><span>vibecaddie &middot; ${esc(s.repo)}</span>
    </div>
    <div class="term-body">
      ${s.terminal.map(l => `<div class="term-line${kind(l[1])}"><span class="pre">${esc(l[0])}</span><span class="txt">${esc(l[2])}</span></div>`).join('\n      ')}
      <span class="caret" hidden></span>
    </div>
  </div>`;
}

function reportBlock() {
  const s = D.sample;
  const list = s.findings.map((f, i) => `
        <button type="button" class="finding" role="tab" data-for="f${i}" aria-selected="${i === 0}">
          <span class="dot ${esc(f.sev)}"></span>
          <span style="min-width:0">
            <span class="t">${tx(f.title)}</span>
            <span class="p">${esc(f.path)}</span>
          </span>
        </button>`).join('');

  const details = s.findings.map((f, i) => `
        <div class="detail" data-detail="f${i}"${i === 0 ? '' : ' hidden'}>
          <div class="detail-meta">
            <span class="sev ${esc(f.sev)}">${esc(f.sev)}</span>
            <span class="dim">${esc(f.skill)}</span>
          </div>
          <h3>${tx(f.title)}</h3>
          <div class="detail-path">${esc(f.path)}</div>
          <div class="detail-grid">
            <div><span class="label">What is wrong</span>${tx(f.what)}</div>
            <div><span class="label">Why it matters</span>${tx(f.why)}</div>
            <div><span class="label">Suggested fix</span>${tx(f.fix)}</div>
          </div>
          <div class="diff">
            ${f.diff.map(d => {
              const c = d[0] === '+' ? ' class="add"' : (d[0] === '-' ? ' class="del"' : '');
              return `<div${c}>${esc(d)}</div>`;
            }).join('\n            ')}
          </div>
        </div>`).join('');

  return `
    <div style="position:relative">
      ${mascot('caddie-clipboard.svg', 'report')}
      <div class="report" data-report>
        <div class="report-head">
          <div><b>Sample audit</b> <span class="repo">${esc(s.repo)} &middot; ${esc(s.ref)}</span></div>
          <div class="chips">
            <span class="chip critical">${s.counts.critical} critical</span>
            <span class="chip warning">${s.counts.warning} warnings</span>
            <span class="chip note">${s.counts.note} notes</span>
          </div>
        </div>
        <div class="report-scope">Reviewed ${s.files} files across ${s.skillsUsed.length} skills: ${esc(s.skillsUsed.join(', '))}. Findings are limited to what those skills look for.</div>
        <div class="report-body">
          <div class="finding-list" role="tablist" aria-label="Sample findings">${list}
            <div class="finding-more">+ ${s.counts.note} notes &middot; collapsed</div>
          </div>
          <div>${details}</div>
        </div>
      </div>
    </div>`;
}

function skillCloud() {
  const on = D.detected[0].on;
  return `
      <div class="skill-cloud" data-skills="${esc(JSON.stringify(D.detected))}">
        ${mascot('caddie-flag.svg', 'skills')}
        ${D.skills.map((s, i) => `<span class="skill-tag${on.indexOf(i) !== -1 ? ' on' : ''}"><span class="dot"></span>${esc(s.name)}<span class="loaded">loaded</span></span>`).join('\n        ')}
      </div>`;
}

function loopFig() {
  const pts = D.loop.nodes.map((label, i) => {
    const ang = -Math.PI / 2 + i * Math.PI / 2;
    return { label, x: Math.round(210 + 150 * Math.cos(ang)), y: Math.round(210 + 150 * Math.sin(ang)) };
  });
  return `
    <div class="loop-fig" data-loop>
      <svg viewBox="0 0 420 420" width="380" height="380" role="img" aria-label="The audit loop: ${esc(D.loop.nodes.join(', then '))}, repeating">
        <circle cx="210" cy="210" r="150" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2"/>
        <circle class="loop-ring" cx="210" cy="210" r="150" fill="none" stroke="#4ade80" stroke-width="2"/>
        <g class="loop-orbit"><circle cx="210" cy="60" r="7" fill="#4ade80"/></g>
        ${pts.map((p, i) => `<g class="loop-node${i === 0 ? ' on' : ''}">
          <circle cx="${p.x}" cy="${p.y}" r="34"/>
          <text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central">${esc(p.label)}</text>
        </g>`).join('\n        ')}
        <text x="210" y="200" text-anchor="middle" fill="#6b746e" font-family="IBM Plex Mono,monospace" font-size="12">run</text>
        <text x="210" y="228" text-anchor="middle" fill="#e6eae7" font-family="IBM Plex Mono,monospace" font-size="26" font-weight="500" data-run-no>#1</text>
      </svg>
    </div>`;
}

function packs() {
  return `
    <div class="packs">
      ${D.pricing.packs.map(p => `<div class="pack">
        <div class="pack-name">${esc(p.name)}</div>
        <div class="pack-price"><b>${esc(p.price)}</b><span>once</span></div>
        <div class="pack-rows">
          <div><span>credits</span><b>${p.credits}</b></div>
          <div><span>runs</span><b>${p.runs}</b></div>
          <div><span>per run</span><span class="per">${esc(p.perRun)}</span></div>
        </div>
        <p class="pack-desc">${tx(p.desc)}</p>
        <div class="pack-cta">${S.creditsSold ? 'Buy ' + p.credits + ' credits' : 'Not on sale yet'}</div>
      </div>`).join('\n      ')}
    </div>`;
}

function faqBlock() {
  return `
    <div class="faq">
      ${D.faq.map(f => `<div class="faq-item">
        <h3>${tx(f.q)}</h3>
        <p>${tx(f.a)}</p>
      </div>`).join('\n      ')}
    </div>`;
}

const ctaSection = () => `
<section class="section wrap" id="early-access" style="text-align:center" data-reveal>
  <h2>Did you run it through a caddie?</h2>
  <p class="lede" style="margin:18px auto 0;max-width:560px">${tx(S.line)} Leave an address and we will write when there is something to try.</p>
  <div style="display:flex;justify-content:center;margin-top:26px">${earlyAccess('early-access-form')}</div>
</section>`;

/* ── page: home ──────────────────────────────────────────────── */
function home() {
  const p = D.problem;
  return `
<section class="hero">
  <div class="hero-grid" aria-hidden="true"></div>
  <div class="wrap">
    <div class="hero-col">
      <span class="pill"><span class="dot"></span>GitHub app &middot; audits AI-assisted code</span>
      <h1 style="margin:24px 0 0">You take the shot.<br><span class="accent">We read the green.</span></h1>
      <p class="lede" style="margin:24px 0 0;max-width:520px">${tx(B.lede)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#early-access">Get early access</a>
        <span class="hero-note">${D.pricing.runCost} credits per run &middot; no subscription</span>
      </div>
    </div>
    <div class="hero-col">
      ${mascot('caddie-club.svg', 'hero')}
      ${terminal()}
    </div>
  </div>
</section>

<section class="section wrap" data-reveal style="border-top:1px solid var(--line-2)">
  <div class="two-col">
    <h2>${tx(p.heading)}</h2>
    <div class="stack">
      ${p.paras.map(t => `<p class="body">${tx(t)}</p>`).join('\n      ')}
      <p class="body strong-line">${tx(p.punch)}</p>
    </div>
  </div>
</section>

<section class="section-tight wrap" id="how" data-reveal>
  <p class="kicker">How it works</p>
  <div class="cards" style="margin-top:26px">
    ${D.steps.map(s => `<div class="card">
      <div class="n">${esc(s.n)}</div>
      <h3>${tx(s.title)}</h3>
      <p>${tx(s.short)}</p>
    </div>`).join('\n    ')}
  </div>
  <p class="body" style="margin-top:24px"><a href="/how-it-works/" style="color:var(--green)">Read how a run actually works &rarr;</a></p>
</section>

<section class="band" id="report">
  <div class="section wrap">
    <div class="two-col center" style="margin-bottom:32px" data-reveal>
      <div>
        <p class="kicker">The report</p>
        <h2 style="margin-top:14px">Five real problems beat fifty warnings.</h2>
      </div>
      <div class="stack">
        <p class="body">Every finding says what is wrong, why it matters, and what to do. ${tx(D.loop.caveat)}</p>
        <p><span class="sample-note">Sample &middot; illustrative, no audit has run</span></p>
      </div>
    </div>
    <div data-reveal>${reportBlock()}</div>
  </div>
</section>

<section class="section wrap" data-reveal>
  <div class="two-col center">
    <div>
      <p class="kicker">Skills</p>
      <h2 style="margin-top:14px">${tx(D.skillsIntro.heading)}</h2>
      <p class="body" style="margin-top:18px">${tx(D.skillsIntro.lede)}</p>
      <div class="detect-row">
        <span class="dim">Detected:</span>
        <span class="detect-name" data-detect-name>${esc(D.detected[0].name)}</span>
      </div>
      <div class="mono dim" style="margin-top:10px;font-size:12px" data-detect-stack>${esc(D.detected[0].stack)}</div>
      <p class="body" style="margin-top:20px"><a href="/skills/" style="color:var(--green)">All twelve skills &rarr;</a></p>
    </div>
    <div style="position:relative">${skillCloud()}</div>
  </div>
</section>

<section class="band">
  <div class="section wrap two-col center" data-reveal>
    ${loopFig()}
    <div>
      <p class="kicker">The loop</p>
      <h2 style="margin-top:14px">${tx(D.loop.heading)}</h2>
      ${D.loop.paras.map(t => `<p class="body" style="margin-top:16px">${tx(t)}</p>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section wrap" id="pricing" data-reveal style="position:relative">
  <div style="text-align:center;max-width:640px;margin:0 auto">
    <p class="kicker">Credits</p>
    <h2 style="margin-top:14px">${tx(D.pricing.heading)}</h2>
    <p class="lede" style="margin-top:16px">${tx(D.pricing.lede)}</p>
    <p style="margin-top:14px"><span class="sample-note">Planned pricing &middot; nothing is on sale yet</span></p>
  </div>
  <div style="margin-top:44px">${packs()}</div>
  ${mascot('caddie-thumb.svg', 'price')}
</section>

<section class="section wrap" id="faq" data-reveal>
  <p class="kicker">Questions</p>
  <h2 style="margin:14px 0 26px">The short answers.</h2>
  ${faqBlock()}
</section>

${ctaSection()}`;
}

/* ── page: how it works ──────────────────────────────────────── */
function howItWorks() {
  return `
<section class="section wrap" data-reveal>
  <p class="kicker">How it works</p>
  <h1 style="margin:16px 0 0;font-size:clamp(34px,5vw,60px)">Three steps, and none of them is configuration.</h1>
  <p class="lede" style="margin:22px 0 0;max-width:640px">${tx(B.lede)}</p>
</section>

<section class="section-tight wrap" data-reveal>
  ${D.steps.map(s => `<div class="two-col" style="padding-block:28px;border-top:1px solid var(--line-2)">
    <div>
      <div class="mono" style="color:var(--green);font-size:13px">${esc(s.n)}</div>
      <h2 style="margin-top:10px;font-size:clamp(24px,3vw,34px)">${tx(s.title)}</h2>
    </div>
    <div class="stack">
      <p class="body strong-line">${tx(s.short)}</p>
      <p class="body">${tx(s.long)}</p>
    </div>
  </div>`).join('\n  ')}
</section>

<section class="band">
  <div class="section wrap" data-reveal>
    <div class="two-col center" style="margin-bottom:30px">
      <div>
        <p class="kicker">A run, in order</p>
        <h2 style="margin-top:14px">What the agent does between install and report.</h2>
      </div>
      <p class="body">${tx(D.loop.caveat)} The run below is the sample from the home page, shown as the sequence it actually follows.</p>
    </div>
    <div class="two-col" data-reveal>
      ${terminal()}
      <div class="stack">
        <p class="body"><b class="strong-line">Read.</b> The agent walks the repository at the commit you ran against, reading source, the dependency manifest and configuration. It does not clone a permanent copy.</p>
        <p class="body"><b class="strong-line">Detect.</b> From what it read it works out the shape of the codebase: framework, data layer, whether money moves through it, whether it takes uploads.</p>
        <p class="body"><b class="strong-line">Select.</b> It loads the review skills that match. This is the step you would otherwise be doing by hand, badly, in a config file.</p>
        <p class="body"><b class="strong-line">Audit.</b> Each skill reviews the code it is responsible for, and findings that survive review are ranked by severity.</p>
        <p class="body"><b class="strong-line">Report.</b> You get the file, the line, the reason and the fix. Then you decide what is worth doing.</p>
      </div>
    </div>
  </div>
</section>

<section class="section wrap two-col center" data-reveal>
  ${loopFig()}
  <div>
    <p class="kicker">The loop</p>
    <h2 style="margin-top:14px">${tx(D.loop.heading)}</h2>
    ${D.loop.paras.map(t => `<p class="body" style="margin-top:16px">${tx(t)}</p>`).join('\n    ')}
  </div>
</section>

${ctaSection()}`;
}

/* ── page: skills ────────────────────────────────────────────── */
function skillsPage() {
  return `
<section class="section wrap" data-reveal>
  <p class="kicker">Skills</p>
  <h1 style="margin:16px 0 0;font-size:clamp(34px,5vw,60px)">${tx(D.skillsIntro.heading)}</h1>
  <p class="lede" style="margin:22px 0 0;max-width:640px">${tx(D.skillsIntro.lede)}</p>
</section>

<section class="section-tight wrap" data-reveal>
  <div class="two-col center">
    <div>
      <h2 style="font-size:clamp(22px,2.6vw,30px)">Selection is the product.</h2>
      <p class="body" style="margin-top:16px">A scanner that runs every rule against every repository is how you get four hundred findings and no signal. The agent reads the codebase first and runs only what applies, which is why the list below lights up differently per project.</p>
      <div class="detect-row">
        <span class="dim">Detected:</span>
        <span class="detect-name" data-detect-name>${esc(D.detected[0].name)}</span>
      </div>
      <div class="mono dim" style="margin-top:10px;font-size:12px" data-detect-stack>${esc(D.detected[0].stack)}</div>
    </div>
    <div style="position:relative">${skillCloud()}</div>
  </div>
</section>

<section class="section-tight wrap" data-reveal>
  <div class="skill-table">
    ${D.skills.map(s => `<div class="skill-row">
      <h3>${tx(s.name)}</h3>
      <p>${tx(s.looksFor)}</p>
    </div>`).join('\n    ')}
  </div>
  <p class="body" style="margin-top:22px">${tx(D.loop.caveat)}</p>
</section>

${ctaSection()}`;
}

/* ── page: pricing ───────────────────────────────────────────── */
function pricingPage() {
  return `
<section class="section wrap" data-reveal style="position:relative">
  <div style="text-align:center;max-width:640px;margin:0 auto">
    <p class="kicker">Credits</p>
    <h1 style="margin:16px 0 0;font-size:clamp(34px,5vw,60px)">${tx(D.pricing.heading)}</h1>
    <p class="lede" style="margin:18px 0 0">${tx(D.pricing.lede)}</p>
    <p style="margin-top:16px"><span class="sample-note">Planned pricing &middot; nothing is on sale yet</span></p>
  </div>
  <div style="margin-top:44px">${packs()}</div>
  ${mascot('caddie-thumb.svg', 'price')}
</section>

<section class="band">
  <div class="section wrap two-col" data-reveal>
    <h2>Why credits and not a subscription.</h2>
    <div class="stack">
      <p class="body">A review is something you do when you are about to ship, not continuously. A subscription would charge you for the months you shipped nothing, and would make the honest advice ("you do not need to run this again yet") cost us money.</p>
      <p class="body">A run is a flat ${D.pricing.runCost} credits whatever the size of the repository, so the next pass never costs more than the last one. Credits do not expire.</p>
      <p class="body strong-line">${tx(D.loop.caveat)}</p>
    </div>
  </div>
</section>

<section class="section wrap" data-reveal>
  <p class="kicker">Questions</p>
  <h2 style="margin:14px 0 26px">Billing, and what is real today.</h2>
  ${faqBlock()}
</section>

${ctaSection()}`;
}

/* ── page: privacy ───────────────────────────────────────────── */
function privacyPage() {
  const p = D.privacy;
  return `
<section class="section wrap" data-reveal>
  <p class="kicker">Privacy</p>
  <h1 style="margin:16px 0 0;font-size:clamp(32px,4.6vw,56px)">${tx(p.heading)}</h1>
  <p class="lede" style="margin:22px 0 0;max-width:660px">${tx(p.lede)}</p>
</section>

<section class="section-tight wrap" data-reveal>
  <table class="facts">
    <tbody>
      ${p.table.map(r => `<tr><th scope="row">${tx(r[0])}</th><td>${tx(r[1])}</td></tr>`).join('\n      ')}
    </tbody>
  </table>
  <p class="body" style="margin-top:26px">${tx(p.note)}</p>
</section>

<section class="section-tight wrap" data-reveal>
  <h2 style="margin:0;font-size:clamp(22px,2.6vw,30px)">Who processes data for this site</h2>
  <p class="body" style="margin-top:14px;max-width:660px">The services this site runs on today, and the ones planned, from the <a href="https://factory0.ventures/stack.json" style="color:var(--green)">Factory Zero registry</a>. Planned ones are not in use yet. The early-access form delivers through Resend once it is connected; it is not connected yet, so it sends nothing and says so.</p>
  <!-- subprocessors:start --><!-- subprocessors:end -->
</section>

<section class="band">
  <div class="section wrap two-col" data-reveal>
    <h2>Read-only is not a setting. It is the design.</h2>
    <div class="stack">
      <p class="body">VibeCaddie reports; you change the code. That division is why it never needs write access, and why removing it ends its access completely rather than leaving something behind.</p>
      <p class="body">If a future feature genuinely needed write access, it would be a separate, opt-in permission that you grant deliberately. It would not arrive by widening this one.</p>
      <p class="body strong-line">Security contact: <a href="mailto:${esc(B.email)}" style="color:var(--green)">${esc(B.email)}</a>, also published at <a href="/.well-known/security.txt" style="color:var(--green)">/.well-known/security.txt</a>.</p>
    </div>
  </div>
</section>

${ctaSection()}`;
}

/* ── page: 404 ───────────────────────────────────────────────── */
function notFound() {
  return `
<section class="section wrap" style="text-align:center;padding-block:clamp(80px,14vw,180px)">
  <p class="kicker">404</p>
  <h1 style="margin:16px 0 0;font-size:clamp(34px,5vw,60px)">That one is off the fairway.</h1>
  <p class="lede" style="margin:20px auto 0;max-width:460px">The page you asked for does not exist. The ones that do are below.</p>
  <p style="margin-top:30px"><a class="btn btn-primary" href="/">Back to the home page</a></p>
</section>`;
}

/* ── generated text assets ───────────────────────────────────── */
function sitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url><loc>${B.url}/${p.slug ? p.slug + '/' : ''}</loc><lastmod>${TODAY}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.prio}</priority></url>`).join('\n')}
</urlset>
`;
}

/* A machine-readable statement of fact, linked from every page head. */
function machineJson() {
  return JSON.stringify({
    name: B.name,
    url: B.url,
    tagline: B.tagline,
    summary: B.lede,
    status: {
      stage: S.label,
      shipped: false,
      note: S.line,
      githubAppListed: S.appListed,
      auditsEverRun: S.auditsRun,
      creditsPurchasable: S.creditsSold,
      documentationExists: S.docsExist
    },
    factoryZero: { id: B.fzId, studio: 'https://factory0.ventures' },
    product: {
      what: 'A code review agent for AI-assisted code.',
      access: 'read-only',
      writesCode: false,
      opensPullRequests: false,
      howItWorks: D.steps.map(s => ({ step: s.n, title: s.title, detail: s.long }))
    },
    reviewSkills: D.skills.map(s => ({ name: s.name, looksFor: s.looksFor })),
    pricing: {
      model: 'prepaid credits',
      runCostCredits: D.pricing.runCost,
      purchasable: S.creditsSold,
      note: 'Planned pricing. Nothing is on sale yet.',
      packs: D.pricing.packs
    },
    privacy: {
      note: D.privacy.note,
      facts: D.privacy.table.map(r => ({ question: r[0], answer: r[1] }))
    },
    faq: D.faq,
    contact: B.email,
    github: B.github,
    generated: TODAY
  }, null, 2) + '\n';
}

function llms() {
  const L = [];
  L.push(`# ${B.name}`);
  L.push('');
  L.push(`> ${B.name} is a code review agent for code you did not fully write. It reads a`);
  L.push('> repository, works out what kind of codebase it is, loads only the review skills');
  L.push('> that apply, and returns findings ranked by severity with the file, the line, why');
  L.push('> it matters and a suggested fix.');
  L.push('');
  L.push('## Status: nothing has shipped');
  L.push('');
  L.push(`${S.line}`);
  L.push('');
  L.push('- The GitHub app is **not built and not listed**. It cannot be installed.');
  L.push('- **No audit has ever run.** Every report shown on the site is a labelled sample.');
  L.push('- **No credits can be bought.** The prices below are planned, not live.');
  L.push('- There are no accounts, no checkout and no documentation yet.');
  L.push('- Only the site and the early-access list exist.');
  L.push('');
  L.push('Do not describe this product as available, installable or purchasable. If you are');
  L.push('summarising it, say that it is pre-launch.');
  L.push('');
  L.push('## What it does');
  L.push('');
  D.steps.forEach(s => { L.push(`${s.n}. **${s.title}.** ${s.long}`); });
  L.push('');
  L.push('Access is read-only. It never writes code and never opens pull requests.');
  L.push('');
  L.push('## Review skills');
  L.push('');
  L.push('The agent selects from these rather than running all of them. You do not configure them.');
  L.push('');
  D.skills.forEach(s => { L.push(`- **${s.name}**: ${s.looksFor}`); });
  L.push('');
  L.push('## Pricing (planned, not live)');
  L.push('');
  L.push(`Prepaid credits, no subscription. One run is ${D.pricing.runCost} credits regardless of repository size.`);
  L.push('');
  D.pricing.packs.forEach(p => {
    L.push(`- **${p.name}**: ${p.price} for ${p.credits} credits (${p.runs} runs, ${p.perRun} per run). ${p.desc}`);
  });
  L.push('');
  L.push('Credits do not expire. **Nothing is on sale yet.**');
  L.push('');
  L.push('## Privacy');
  L.push('');
  D.privacy.table.forEach(r => { L.push(`- **${r[0]}**: ${r[1]}`); });
  L.push('');
  L.push(D.privacy.note);
  L.push('');
  L.push('## Built with');
  L.push('');
  // from tools/built-with.json, the vendored registry entry; planned is not in use
  const BW = JSON.parse(fs.readFileSync(path.join(__dirname, 'built-with.json'), 'utf8'));
  BW.uses.forEach(u => { L.push(`- ${u.phrase} ${u.name} (${u.status === 'live' ? 'in use today' : 'planned, not in use yet'}): ${u.url}`); });
  L.push('');
  L.push(`Source: the Factory Zero registry, ${BW.source}`);
  L.push('');
  L.push('## FAQ');
  L.push('');
  D.faq.forEach(f => { L.push(`**${f.q}**`); L.push(f.a); L.push(''); });
  L.push('## Notes for machine readers');
  L.push('');
  L.push('- The sample audit (`acme/checkout`, "Audit #14", "42 files", "1m 48s") is an');
  L.push('  illustration written by hand. It is not a record of a real run, and the');
  L.push('  repository does not exist. The page labels it Sample.');
  L.push('- The findings in that sample are real classes of bug used as teaching examples,');
  L.push('  not defects discovered in anyone’s code.');
  L.push('- No usage, customer or revenue figures appear anywhere on this site, because');
  L.push('  there are none. If you find a number, it is a price or a fact about the product.');
  L.push('');
  L.push('## Pages');
  L.push('');
  PAGES.forEach(p => {
    L.push(`- [${p.nav || 'Home'}](${B.url}/${p.slug ? p.slug + '/' : ''}): ${p.desc}`);
  });
  L.push('');
  L.push('## About');
  L.push('');
  L.push(`${B.name} is ${B.fzId}, a venture of Factory Zero (https://factory0.ventures).`);
  L.push('');
  L.push('## Contact');
  L.push('');
  L.push(B.email);
  L.push('');
  return L.join('\n');
}

/* ── write ───────────────────────────────────────────────────── */
const out = (rel, content) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  console.log('  ' + rel + '  (' + content.length + ' bytes)');
};

const BODIES = {
  '': home,
  'how-it-works': howItWorks,
  'skills': skillsPage,
  'pricing': pricingPage,
  'privacy': privacyPage
};

console.log('generating:');
PAGES.forEach(p => out(p.file, doc(p, BODIES[p.slug]())));
out('404.html', doc({ slug: '404', file: '404.html', nav: null,
  title: `Not found — ${B.name}`,
  desc: 'That page does not exist.' }, notFound()));
out('sitemap.xml', sitemap());
out('llms.txt', llms());
out('vibecaddie.json', machineJson());

// The footer's "Built with" line and the privacy page's processor list, from
// tools/built-with.json (a vendored copy of this venture's entry in the Factory
// Zero registry's stack.json). The pages above carry empty markers; this fills them.
const bw = require('child_process').spawnSync('python3', [path.join(__dirname, 'built-with.py')], { stdio: 'inherit' });
if (bw.status !== 0) throw new Error('tools/built-with.py failed');
console.log('done.');
