[+] add a list of tags to select from in the profile — TagPicker component, used in settings (skills) and new project (tags)
[+] make a singular color palette for the website. Applied everywhere — blue #60a5fa, violet #a78bfa, pink #f472b6, green #34d399
[+] make the pages more unique — dashboard welcome banner, profile hero banner, settings color sections, explore styled header
[+] possibly redesign the pages (deeper overhaul if needed after review)
[+] create a desktop application. remove the ability to commit from the web, dedicate a web client for that.
[+] separate api for pixel diff — FastAPI SSIM perceptual diff in overseer-pixeldiff/, Docker port 8001
[+] add the ability to edit profile — Settings page with Identity/Links/Skills sections, profile preview card, tag picker for skills
[+] explore azurite as a possible option for free hosting and everything
[+] make the ui for the desktop page as vibrant as possible
[+] fix profile pictures not loading — added referrerPolicy="no-referrer" to all avatar <img> tags (Google CDN rejects requests with a Referer header)
[+] add GitHub Actions CI — .github/workflows/ci.yml; three parallel jobs: frontend lint+build, backend compile (tests skipped — contextLoads needs live Postgres), pixeldiff install+syntax check

[ ] wire pixel diff into the UI — "Compare versions" button on FileRow in ProjectPage and WorkspacePage; call the FastAPI /diff endpoint, show the SSIM score and diff image in a modal
[+] fix duplicate const path = require('path') in overseer-desktop/src/index.js — will crash Electron in strict mode
[+] fix following state not loaded on mount — added GET /api/users/{username}/follow endpoint; ProfilePage now fetches follow status on mount alongside the profile
[ ] remove file upload from the web client — TODO says commits are desktop-only; the Upload File button still exists in ProjectPage for owners
[ ] render README as markdown — ProjectPage wraps readmeContent in a <pre>; replace with a proper markdown renderer (e.g. marked + DOMPurify)
[ ] image lightbox / preview — clicking a FileRow triggers a download; add a full-screen preview for image files (sets up the pixel diff flow too)
[ ] add information about the project to the README.md file (add diagrams, stack, etc etc)