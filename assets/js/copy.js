/* Copy buttons on fenced code blocks.

   The button is created here rather than in the render hook so that a
   reader without script, or on a browser with no clipboard API, is never
   shown a control that cannot do anything. Legacy blocks -- raw <pre> and
   the Vim exports in .codebg -- have no header bar and so get no button.

   See layouts/_markup/render-codeblock.html and assets/css/code.css. */
(function () {
  "use strict";

  if (!navigator.clipboard) {
    return;
  }

  var blocks = document.querySelectorAll(".codeblock");

  Array.prototype.forEach.call(blocks, function (block) {
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
