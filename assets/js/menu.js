/* Phone menu.

   The panel sits below the header rather than over the page, so it is not
   a modal: focus moves into it on open and back to the toggle on close,
   Escape closes it, and the page behind it does not scroll. Tab is left
   free to walk out of the panel -- there is nothing to trap it behind.

   No animation anywhere, so there is nothing for prefers-reduced-motion
   to switch off. */

(function () {
  'use strict';

  var toggle = document.querySelector('.menu-toggle');
  var panel = document.getElementById('site-menu');
  if (!toggle || !panel) {
    return;
  }

  var wide = window.matchMedia('(min-width: 900px)');

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  function open() {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    panel.hidden = false;
    document.documentElement.classList.add('menu-open');

    var first = panel.querySelector('a');
    if (first) {
      first.focus();
    }
  }

  function close(returnFocus) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    panel.hidden = true;
    document.documentElement.classList.remove('menu-open');

    if (returnFocus) {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', function () {
    if (isOpen()) {
      close(true);
    } else {
      open();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      close(true);
    }
  });

  /* Above 900px the panel is display:none and the toggle is gone. Leaving
     it "open" across the breakpoint would strand the scroll lock with no
     control left to undo it. */
  function onWidthChange() {
    if (wide.matches && isOpen()) {
      close(false);
    }
  }

  if (wide.addEventListener) {
    wide.addEventListener('change', onWidthChange);
  } else if (wide.addListener) {
    wide.addListener(onWidthChange);
  }
})();
