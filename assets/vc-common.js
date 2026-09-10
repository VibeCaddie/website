/* VibeCaddie — nav, reveal, the animated demos, and the early-access form.
 *
 * Everything this file does is an enhancement. Every word is already in the
 * served HTML, the report opens on its first finding, the skill cloud is
 * rendered with the first repository's skills lit, and the form posts as a
 * normal submit if this never runs.
 */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── nav ─────────────────────────────────────────────────── */
  var nav = document.querySelector('.nav');
  var toggle = nav && nav.querySelector('.nav-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }

  /* ── reveal on scroll ────────────────────────────────────── */
  var revealables = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (!('IntersectionObserver' in window) || reduced) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ── terminal ────────────────────────────────────────────── */
  var term = document.querySelector('[data-term]');
  if (term && !reduced) {
    var lines = [].slice.call(term.querySelectorAll('.term-line'));
    var caret = term.querySelector('.caret');
    var i = 0;
    lines.forEach(function (l) { l.style.display = 'none'; });
    (function step() {
      if (i < lines.length) {
        lines[i].style.display = '';
        i++;
        setTimeout(step, 650);
      } else {
        setTimeout(function () {
          i = 0;
          lines.forEach(function (l) { l.style.display = 'none'; });
          step();
        }, 3800);
      }
    })();
    if (caret) caret.hidden = false;
  }

  /* ── report: pick a finding ──────────────────────────────── */
  var report = document.querySelector('[data-report]');
  if (report) {
    var buttons = [].slice.call(report.querySelectorAll('.finding'));
    var panels = [].slice.call(report.querySelectorAll('[data-detail]'));
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-for');
        buttons.forEach(function (b) {
          b.setAttribute('aria-selected', String(b === btn));
        });
        panels.forEach(function (p) {
          p.hidden = p.getAttribute('data-detail') !== id;
        });
      });
    });
  }

  /* ── skills: cycle the detected repository ───────────────── */
  var cloud = document.querySelector('[data-skills]');
  if (cloud) {
    var repos = JSON.parse(cloud.getAttribute('data-skills'));
    var tags = [].slice.call(cloud.querySelectorAll('.skill-tag'));
    var nameEl = document.querySelector('[data-detect-name]');
    var stackEl = document.querySelector('[data-detect-stack]');
    var r = 0;

    function paint(idx) {
      var repo = repos[idx];
      tags.forEach(function (t, n) {
        t.classList.toggle('on', repo.on.indexOf(n) !== -1);
      });
      if (nameEl) nameEl.textContent = repo.name;
      if (stackEl) stackEl.textContent = repo.stack;
    }
    paint(0);
    if (!reduced && repos.length > 1) {
      setInterval(function () { r = (r + 1) % repos.length; paint(r); }, 3200);
    }
  }

  /* ── loop diagram ────────────────────────────────────────── */
  var loop = document.querySelector('[data-loop]');
  if (loop) {
    var nodes = [].slice.call(loop.querySelectorAll('.loop-node'));
    var runEl = loop.querySelector('[data-run-no]');
    var ring = loop.querySelector('.loop-ring');
    var k = 0, run = 1;

    function lit(idx) {
      nodes.forEach(function (n, x) { n.classList.toggle('on', x === idx); });
    }
    lit(0);
    if (ring) ring.classList.add('in');
    if (!reduced) {
      setInterval(function () {
        k = (k + 1) % nodes.length;
        if (k === 0) { run++; if (runEl) runEl.textContent = '#' + run; }
        lit(k);
      }, 2000);
    }
  }

  /* ── early access form ───────────────────────────────────── */
  var form = document.querySelector('[data-early-access]');
  if (form) {
    var msg = form.querySelector('.ea-msg');
    var submit = form.querySelector('button[type="submit"]');
    var fallback = form.getAttribute('data-fallback') || 'contact@vibecaddie.com';

    function say(text, kind) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = 'ea-msg' + (kind ? ' ' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        email:   (form.elements.email && form.elements.email.value || '').trim(),
        repo:    (form.elements.repo && form.elements.repo.value || '').trim(),
        company: (form.elements.company && form.elements.company.value || '')
      };
      if (!data.email) { say('An email address, please.', 'err'); return; }

      if (submit) { submit.disabled = true; }
      say('Sending …');

      fetch('/api/early-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
      }).then(function (r) {
        if (r.ok && r.body.ok) {
          form.reset();
          say('On the list. We will write when there is something to try.', 'ok');
          return;
        }
        /* Never claim a message was delivered that was not. */
        if (r.body.error === 'not_configured') {
          say('Not wired up yet. Write to ' + fallback + ' and we will add you by hand.', 'err');
        } else if (r.body.error === 'email_invalid') {
          say('That address does not look right.', 'err');
        } else {
          say('That did not send. Write to ' + fallback + ' instead.', 'err');
        }
      }).catch(function () {
        say('That did not send. Write to ' + fallback + ' instead.', 'err');
      }).then(function () {
        if (submit) { submit.disabled = false; }
      });
    });
  }

  /* ── footer year ─────────────────────────────────────────── */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
