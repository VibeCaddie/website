/* VibeCaddie — the single source of truth.
 *
 * Every page, plus sitemap.xml, llms.txt and vibecaddie.json, is generated
 * from this file by tools/pages.js. Edit here, then run:
 *
 *   node tools/pages.js
 *
 * `status` below gates every claim on the site. Nothing has shipped: there is
 * no GitHub App listing, no account, no checkout, and no audit has ever run.
 * Flipping these flags and regenerating is the only way a page starts saying
 * otherwise.
 */
window.VC = {

  /* ── what is actually true today ──────────────────────────── */
  status: {
    appListed:   false,  // the GitHub App exists and can be installed
    auditsRun:   false,  // any real audit has ever run
    creditsSold: false,  // credits can be bought
    docsExist:   false,  // there is documentation to link to
    label: 'Pre-launch',
    line:  'The GitHub app is not built yet. Nothing here can be installed or bought.'
  },

  brand: {
    name: 'VibeCaddie',
    domain: 'vibecaddie.com',
    url: 'https://vibecaddie.com',
    email: 'contact@vibecaddie.com',
    github: 'https://github.com/VibeCaddie',
    tagline: 'You take the shot. We read the green.',
    lede: 'VibeCaddie audits the code you did not fully write. Point it at a repository, run it, and get a ranked list of what to fix before it bites you.',
    fzId: 'FZ-005'
  },

  /* ── the problem ──────────────────────────────────────────── */
  problem: {
    heading: 'You built it in an afternoon. Nobody has checked it.',
    paras: [
      'AI tools made it easy to produce working code fast. They did not make it easy to know whether that code is safe to ship. An auth flow can work perfectly and still trust client input, leak a session, or log a secret.',
      'The usual safety net is a second pair of eyes. Most people shipping AI-assisted code do not have one, and the scanners built for teams assume a security engineer is standing by to triage the noise.'
    ],
    punch: 'Bad code usually works. That is the problem.'
  },

  /* ── how it works ─────────────────────────────────────────── */
  steps: [
    { n: '01', title: 'Point it at a repo',
      short: 'Read-only access to the repositories you want watched. Nothing to configure.',
      long: 'VibeCaddie reads your code and nothing else. It needs no write access, opens no pull requests, and changes nothing in your repository. There are no rules to write and no configuration file to maintain, because the thing that decides what to check is the agent, not a config.' },
    { n: '02', title: 'The agent picks its skills',
      short: 'It reads the repo, works out what kind of codebase it is, and loads the review skills that matter for it.',
      long: 'A review skill is a narrow specialist: one that knows how session handling goes wrong, one that knows what an unverified webhook looks like. The agent reads the dependency manifest, the directory shape and the code itself, decides which specialists are relevant, and runs only those. A Stripe integration gets the webhook skill. A CLI with no network surface does not.' },
    { n: '03', title: 'You get a report',
      short: 'Findings ranked by severity, with exact files and lines, a plain explanation, and a suggested fix.',
      long: 'Every finding names the file and the line, says what is wrong in a sentence, says why it matters in terms of what an attacker or an outage would actually do, and shows the change that would fix it. No severity scores without explanation, and no findings you have to research before you can act on them.' }
  ],

  /* ── the sample report ────────────────────────────────────────
   * Illustrative. No audit has ever run, so this is a worked example of
   * the kind of thing the report is for, not a record of anything. The
   * pages that render it say so on the page.
   */
  sample: {
    repo: 'acme/checkout',
    ref: 'main @ 3f9c2e1',
    files: 42,
    skillsUsed: ['auth', 'secrets', 'input-validation', 'data-exposure', 'dependencies', 'error-handling'],
    counts: { critical: 2, warning: 3, note: 4 },
    terminal: [
      ['$', 'cmd',  'vibecaddie audit acme/checkout'],
      ['→', 'dim', 'reading repo … 42 files'],
      ['→', 'dim', 'detected: Next.js 15 · Prisma · Stripe webhooks'],
      ['→', 'dim', 'loading skills: auth, secrets, input-validation,'],
      [' ',      'dim', 'data-exposure, dependencies, error-handling'],
      ['→', 'dim', 'auditing …'],
      ['✓', 'ok',  '2 critical · 3 warnings · 4 notes'],
      ['·', 'dim', 'done in 1m 48s · 12 credits']
    ],
    findings: [
      { sev: 'critical', skill: 'auth', title: 'Session token accepted from query string',
        path: 'src/lib/auth/session.ts:41',
        what: 'getSession falls back to req.query.token when the cookie is missing.',
        why: 'Tokens in URLs end up in browser history, referrer headers and your own access logs. Anyone with log access can replay a session.',
        fix: 'Read the token from the cookie only, and return 401 when it is absent.',
        diff: ["  const cookies = parseCookies(req)",
               "- const token = cookies.get('sid') ?? req.query.token",
               "+ const token = cookies.get('sid')",
               "+ if (!token) return unauthorized()"] },
      { sev: 'critical', skill: 'payments', title: 'Stripe webhook signature not verified',
        path: 'app/api/webhooks/stripe/route.ts:12',
        what: 'The handler parses the event body directly instead of calling stripe.webhooks.constructEvent.',
        why: 'Anyone who finds the endpoint can post a fake checkout.session.completed event and unlock a paid plan.',
        fix: 'Verify the Stripe-Signature header against your webhook secret before trusting the payload.',
        diff: ["- const event = await req.json()",
               "+ const sig = req.headers.get('stripe-signature')",
               "+ const event = stripe.webhooks.constructEvent(",
               "+   await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET)"] },
      { sev: 'warning', skill: 'error-handling', title: 'Raw error object returned to client',
        path: 'app/api/orders/route.ts:88',
        what: 'The catch block sends err.message and err.stack in the 500 response.',
        why: 'Stack traces reveal file paths, dependency versions and sometimes query text.',
        fix: 'Log the error server side and return a generic message with a request id.',
        diff: ["- return json({ error: err.message, stack: err.stack }, 500)",
               "+ log.error({ err, requestId })",
               "+ return json({ error: 'Something went wrong', requestId }, 500)"] },
      { sev: 'warning', skill: 'data-exposure', title: 'User email logged at info level',
        path: 'src/lib/logger.ts:27',
        what: 'Every request log line includes the authenticated user’s email address.',
        why: 'Log retention is usually longer than you think, and shared with more vendors than you think.',
        fix: 'Log the user id instead, or hash the email if you need to correlate.',
        diff: ["- log.info({ path, email: user.email })",
               "+ log.info({ path, userId: user.id })"] },
      { sev: 'warning', skill: 'dependencies', title: 'lodash 4.17.15 has a known prototype pollution issue',
        path: 'package.json:23',
        what: 'lodash is pinned below 4.17.21, which fixes CVE-2021-23337 and CVE-2020-28500.',
        why: 'Your code passes user-supplied objects to _.merge in two places.',
        fix: 'Bump to 4.17.21 or later and run the audit again.',
        diff: ["- \"lodash\": \"4.17.15\"",
               "+ \"lodash\": \"^4.17.21\""] }
    ]
  },

  /* ── the skills ───────────────────────────────────────────── */
  skillsIntro: {
    heading: 'The caddie picks the club.',
    lede: 'You never configure these. The agent reads the repository, works out what it is, and loads the review skills that apply. A Stripe integration gets the webhook skill. A CLI does not.'
  },
  skills: [
    { name: 'Auth & sessions',    looksFor: 'Tokens accepted from the wrong place, sessions that never expire, missing authorization checks between authenticated users.' },
    { name: 'Secrets handling',   looksFor: 'Keys committed to the repo, secrets read into logs, credentials passed through shell interpolation or query strings.' },
    { name: 'Dependency risk',    looksFor: 'Pinned versions with known advisories, and whether your code actually reaches the vulnerable path.' },
    { name: 'Input validation',   looksFor: 'Request bodies trusted without parsing, type coercion at trust boundaries, unbounded input reaching expensive work.' },
    { name: 'Error handling',     looksFor: 'Stack traces returned to clients, errors swallowed silently, failure paths that leave state half-written.' },
    { name: 'Data exposure',      looksFor: 'Personal data in logs, over-broad API responses, internal identifiers leaking into public payloads.' },
    { name: 'Performance',        looksFor: 'Queries inside loops, missing indexes on filtered columns, work done per request that could be done once.' },
    { name: 'Payments & webhooks',looksFor: 'Unverified webhook signatures, non-idempotent handlers, amounts trusted from the client.' },
    { name: 'Rate limiting',      looksFor: 'Endpoints that cost money or send mail with nothing in front of them, and limits keyed on something a caller controls.' },
    { name: 'File uploads',       looksFor: 'Content type trusted from the client, unbounded sizes, user-controlled paths reaching the filesystem.' },
    { name: 'SQL & ORM',          looksFor: 'String-built queries, raw fragments taking user input, and transactions that do not cover what they should.' },
    { name: 'CORS & headers',     looksFor: 'Origins reflected back wholesale, credentials allowed on wildcards, missing headers on responses that need them.' }
  ],
  detected: [
    { name: 'acme/checkout',   stack: 'Next.js · Prisma · Stripe · Postgres', on: [0,1,2,3,4,5,7,8,10] },
    { name: 'dana/ledger-cli', stack: 'Go · Cobra · SQLite',                     on: [1,2,3,4,10] },
    { name: 'studio/media-api',stack: 'Express · S3 · Redis · JWT',          on: [0,1,3,5,6,8,9,11] }
  ],

  /* ── the loop ─────────────────────────────────────────────── */
  loop: {
    heading: 'A loop, not a gate.',
    nodes: ['Audit', 'Fix', 'Re-run', 'Repeat'],
    paras: [
      'Run the audit. Fix what it found. Run it again. Each run costs the same 12 credits, so you always know what the next pass will cost before you start it.',
      'Repeat until the report comes back clean, or until you decide the rest can wait. That call is yours.'
    ],
    caveat: 'Clean means nothing we looked for turned up. It does not mean nothing is there.'
  },

  /* ── pricing ──────────────────────────────────────────────────
   * Planned, not live. status.creditsSold gates every buy affordance.
   */
  pricing: {
    runCost: 12,
    heading: 'Prepaid. One run is 12 credits.',
    lede: 'No subscription. Credits do not expire. The price of a run is on the button before you press it.',
    packs: [
      { name: 'Starter', price: '$15',  credits: 60,   runs: 5,   perRun: '$3.00',
        desc: 'Enough to audit one project, fix it, and run it again a few times.' },
      { name: 'Regular', price: '$60',  credits: 300,  runs: 25,  perRun: '$2.40',
        desc: 'A run before every release for the better part of a year.' },
      { name: 'Heavy',   price: '$180', credits: 1200, runs: 100, perRun: '$1.80',
        desc: 'Several repositories, or a small team running it on every branch.' }
    ]
  },

  /* ── privacy: the question every visitor has ──────────────── */
  privacy: {
    heading: 'It reads your code. Here is exactly what happens to it.',
    lede: 'A tool that reads source code owes you a straight answer about what it keeps. This is ours, written before launch so it is on the record rather than discovered afterwards.',
    table: [
      ['Access requested',      'Read-only. VibeCaddie never needs write access, and will not ask for it.'],
      ['What it reads',         'The contents of the repositories you point it at, at the commit you run against.'],
      ['What is stored',        'The report: findings, file paths, line numbers and the short excerpts quoted in them.'],
      ['What is not stored',    'A copy of your repository. Source is read for the run and discarded when it ends.'],
      ['Training',              'Your code is never used to train a model. Not ours, not a vendor’s.'],
      ['Model providers',       'Audits run through a third-party model API under a zero-retention agreement. The provider is named in the docs before launch.'],
      ['Who can see a report',  'You, and anyone you give access to the repository. Reports are not public and are not shared.'],
      ['Deletion',              'Deleting a report deletes its findings and excerpts. Removing the app ends all access immediately.']
    ],
    note: 'None of the above is live yet, because nothing has shipped. It is a commitment about how the product will behave, published now so it can be held against what launches.'
  },

  /* ── faq ──────────────────────────────────────────────────── */
  faq: [
    { q: 'Is this available yet?',
      a: 'No. The GitHub app is not built and not listed, no audit has ever run, and no credits can be bought. The site and the early-access list are the only things that exist.' },
    { q: 'Is it a replacement for a security review?',
      a: 'No. It is a second pair of eyes for people who do not have one. A clean report means nothing it looked for turned up, which is not the same as nothing being there.' },
    { q: 'Does it write code or open pull requests?',
      a: 'No. It reads, it reports, and it suggests. Every change is yours to make, which is also why read-only access is enough.' },
    { q: 'What does a run cost?',
      a: 'A run is 12 credits, whatever the size of the repository. Credit packs are planned at $15, $60 and $180, which works out between $1.80 and $3.00 a run. Nothing is on sale yet.' },
    { q: 'Why credits instead of a subscription?',
      a: 'Because a review is a thing you do occasionally, not continuously. A subscription would charge you in the months you shipped nothing.' },
    { q: 'Which languages does it cover?',
      a: 'The review skills are written against patterns rather than syntax, so the intent is broad coverage. Exactly what is supported at launch will be listed here before launch, not promised now.' },
    { q: 'Does my code train a model?',
      a: 'No. See the privacy page, which says what is stored, what is not, and what the model provider is allowed to do with it.' }
  ],

  /* ── site structure ───────────────────────────────────────── */
  nav: [
    { href: '/how-it-works/', label: 'How it works' },
    { href: '/skills/',       label: 'Skills' },
    { href: '/pricing/',      label: 'Credits' },
    { href: '/privacy/',      label: 'Privacy' }
  ]
};
