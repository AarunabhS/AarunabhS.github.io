'use strict';

const printButton = document.getElementById('print-resume');

if (printButton) {
  printButton.addEventListener('click', async () => {
    // Wait briefly for the web fonts so the PDF matches the screen typography.
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise(resolve => window.setTimeout(resolve, 1500))
      ]);
    }
    window.print();
  });
}
