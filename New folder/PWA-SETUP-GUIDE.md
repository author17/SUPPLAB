# SUPPLAB — Installable App (PWA) Setup Guide

Everything below is tested and working locally. Files to upload, and exactly
where the two code snippets go, in case you want to paste them into a
different one of your 7 index files instead of using the ready-edited
`supplab.html` I'm sending.

## 1. Upload these 5 files to the SAME folder as your live index file

- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `ios-install.html`

They must sit next to whichever `index*.html` file is the one people land on
— all the paths inside them are relative (`./`, `manifest.json`, etc.), not
tied to a specific filename, so this works no matter what that file is named.

**Important:** only add the two code snippets below to ONE of your 7 index
files — the one that's the real front door of the site. Adding the manifest
link and service worker to every one of the 7 isn't necessary and can get
confusing (multiple pages each trying to "be" the installed app). If you're
not sure which file that is, tell me the filename and I'll double-check it's
wired correctly.

## 2. Paste this inside `<head>...</head>`, near the top

```html
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SUPPLAB">
```

(If that file already has `<meta name="theme-color" content="#0B0D0E">`, you
don't need to add it again — it's already there in `supplab.html`.)

## 3. Paste this right before `</body>`

```html
<button id="pwaInstallBtn" type="button" aria-label="Install SUPPLAB app" style="display:none;position:fixed;right:18px;bottom:18px;z-index:9999;background:var(--lime,#D4FF00);color:var(--black,#0B0D0E);border:none;border-radius:999px;padding:12px 20px;font-weight:900;font-size:14px;letter-spacing:.02em;font-family:Arial,Helvetica,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);cursor:pointer;">📲 Install SUPPLAB App</button>

<script>
(function(){
  var installBtn = document.getElementById('pwaInstallBtn');
  var deferredPrompt = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').catch(function(err){
        console.warn('SUPPLAB service worker registration failed:', err);
      });
    });
  }

  if (installBtn && !isStandalone) {
    if (isIOS) {
      installBtn.style.display = 'block';
      installBtn.textContent = '📲 Add to Home Screen';
      installBtn.addEventListener('click', function(){
        window.location.href = 'ios-install.html';
      });
    } else {
      window.addEventListener('beforeinstallprompt', function(e){
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
      });
      installBtn.addEventListener('click', function(){
        if (!deferredPrompt) return;
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function(){ deferredPrompt = null; });
      });
      window.addEventListener('appinstalled', function(){
        installBtn.style.display = 'none';
      });
    }
  }

  function handleHashShortcut(){
    if (location.hash === '#deals') {
      var el = document.getElementById('deals');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (location.hash === '#search') {
      var box = document.getElementById('searchBox');
      var input = document.getElementById('searchInput');
      if (box) {
        box.classList.add('mobile-active');
        setTimeout(function(){ input && input.focus(); }, 150);
      }
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(handleHashShortcut, 300);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(handleHashShortcut, 300); });
  }
})();
</script>
```

Note: the `#deals` / `#search` shortcut handling looks for elements with
`id="deals"`, `id="searchBox"` and `id="searchInput"`. Those IDs already
exist in `supplab.html`. If you paste this into a different one of your 7
files that doesn't use those exact IDs, the install button and service
worker will still work fine — only the two shortcuts would do nothing until
those IDs match (harmless either way, never an error).

## 3. Already done for you

`supplab.html` (attached) has both snippets already pasted in, tested, and
verified working — use it directly if it's the file you're deploying as the
main entry point.

## What I tested locally, all passing

- `manifest.json` is valid, and both icons load at the exact sizes it declares
  (192×192, 512×512).
- The service worker registers, takes control of the page, and correctly
  serves a cached copy when the network is offline (verified by actually
  simulating offline mode).
- `#deals` scrolls to the deals section; `#search` opens the search box and
  focuses it — both work, so the manifest shortcuts will actually do
  something once installed.
- The install button stays hidden until the browser is ready to install
  (Chrome/Edge/Android fire `beforeinstallprompt`; iOS instead shows "Add to
  Home Screen" and links to `ios-install.html`).
- Full existing-site regression test (products, search, cart, navigation)
  still passes with zero errors after the edits.

## One thing only you can do

Uploading the 5 new files and the edited HTML to your live host (FTP/cPanel/
hosting panel) — I don't have access to do that part myself. Once it's live
over HTTPS (already the case on supplab.com), the install button will start
working automatically.
