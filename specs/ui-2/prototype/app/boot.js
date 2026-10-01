/* app/boot.js: Built-in screens and boot. */

(function () {
  'use strict';

  const App = window.App;
  const { stamp, onNavigate, render } = App._;

  /* ---------------- built-in screens ---------------- */

  /* #/employer : Employer check (VALUE.md section 3). Two public facts about
     the student's own employer, each with its source and date, never a
     verdict. Reached from the STEM OPT step "Check that Northwind Systems
     uses E-Verify" and from Your profile's Job section (C.employerRow).
     The H-1B years open as a plain list. */
  const BUILTIN = {
    employer: {
      title: 'Employer check',
      render(d) {
        const emp = d.employer;
        const back = { label: 'Your profile', href: '#/case' };
        if (!emp) {
          return C.pageHeader({ title: 'Employer check', back: back }) +
            C.empty({ text: 'Add your job to see this.', action: C.button({ label: 'Add your job', href: '#/case/jobs' }) });
        }
        return C.pageHeader({
          eyebrow: emp.title, title: emp.name, info: emp.info, back: back,
          subline: emp.role + ', since ' + emp.since,
        }) +
          C.employerCheck(emp, { next: true }) +
          (emp.offer ? '<p class="employer-offer">' + C.unknown(emp.offer) + '</p>' : '') +
          C.footer(emp.footer);
      },
    },
  };
  App.BUILTIN = BUILTIN;

  /* ---------------- boot ---------------- */
  window.addEventListener('hashchange', onNavigate);
  window.addEventListener('DOMContentLoaded', () => {
    Object.keys(BUILTIN).forEach((k) => { if (!window.SCREENS[k]) window.SCREENS[k] = BUILTIN[k]; });
    if (!location.hash) history.replaceState(null, '', '#/home');
    stamp(true);
    render('launch');
    App.booted = true;
  });

})();
