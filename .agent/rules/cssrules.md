---
trigger: always_on
---

**Do not add any `:hover` pseudo-class** styles anywhere in the mobile version of this repo. **Do not use `cursor: pointer`** or any `cursor` CSS property anywhere on the mobile version of this repo, you can use them on desktop versio. 

**Typography**: Never set `font-size`, `font-weight`, `line-height`, `letter-spacing`, or `font-family` in `.module.css` files. Always apply typography classes in JSX instead: `.typography-title-*`, `.typography-body-*`, `.typography-label-*` (mobile) or `.typography-desktop-*` (desktop). 