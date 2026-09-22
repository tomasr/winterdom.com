/* Code blocks: the copy button, and keyboard access to the legacy ones.

   The button is created here rather than in the render hook so that a
   reader without script, or on a browser with no clipboard API, is never
   shown a control that cannot do anything.

   Legacy blocks -- raw <pre> and the Vim exports in .codebg -- have no
   header bar and so get no button. They do scroll sideways, though, and a
   scrollable box that cannot take focus cannot be scrolled from the
   keyboard. Chroma gives its own <pre> a tabindex; twenty years of
   committed HTML does not, so it is added here.

   See layouts/_markup/render-codeblock.html and assets/css/code.css. */
(function () {
  "use strict";

  var each = function (list, fn) {
    Array.prototype.forEach.call(list, fn);
  };

  /* Keyboard access to anything that scrolls sideways. */
  each(
    document.querySelectorAll(".article-body pre, .article-body .codebg"),
    function (box) {
      if (!box.hasAttribute("tabindex") && box.scrollWidth > box.clientWidth) {
        box.setAttribute("tabindex", "0");
      }
    }
  );

  if (!navigator.clipboard) {
    return;
  }

  each(document.querySelectorAll(".codeblock"), function (block) {
    var bar = block.querySelector(".codeblock__bar");
    var pre = block.querySelector("pre");

    if (!bar || !pre) {
      return;
    }

    var button = document.createElement("button");
    var reset;

    button.type = "button";
    button.className = "codeblock__copy";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code to clipboard");
    /* The label changes to say what happened; without this the change is
       silent to a screen reader sitting on the button. */
    button.setAttribute("aria-live", "polite");

    button.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.innerText).then(
        function () {
          button.textContent = "Copied";
          window.clearTimeout(reset);
          reset = window.setTimeout(function () {
            button.textContent = "Copy";
          }, 2000);
        },
        function () {
          button.textContent = "Failed";
        }
      );
    });

    bar.appendChild(button);
  });
})();
