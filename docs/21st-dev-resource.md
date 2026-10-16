# UTC.OS component inspiration: 21st.dev

**Resource:** https://21st.dev/?ref=jack  
**Catalog:** https://21st.dev/  
**First trial:** `labs/21st-mothership-ui-lab.html`  
**Status:** isolated prototype; **not** deployed to the live Cosmic Mothership.

## Goal
Keep 21st.dev available for future Cosmic Mothership, UP2CODE, and Lil Wiznap projects. Explore dimensional cards, purple/blue/gold glow, responsive mobile layouts and simple, accessible interactions. Add selected components to the **existing** project after validating the active source and hosting target. Do not create a replacement Mothership.

## Trial delivered
- Standalone HTML/CSS/JS visualization demo, including tabs for Mission Control, agents, and Music Studio.
- Responsive 3D/glow cards with mouse hover and touch-friendly fallbacks.
- Working module-selection cards, selectable color theme and tilt toggle.
- No external libraries, sign-in, analytics, data writes, real agents, or live API connections.
- Reduced-motion support, semantic tab controls, keyboard tab switching, visible focus rings, and status disclaimers.

## Important integration boundary
`tranglec22/utc-os` describes itself in `README.md` as a **reconstruction shell**, not the live `utc-os-app` or the current Cosmic Mothership Site. It uses static HTML/CSS/JavaScript. 21st.dev distributes most components as React/shadcn-style source. This lab is **original** adaptation of general visual concepts, not a copied 21st.dev marketplace component. No actual 21st component was installed here. Do not treat this GitHub demo as the production app.

## How to evaluate the demo
Open `labs/21st-mothership-ui-lab.html` in a browser or serve this repository with a static web server and visit `/labs/21st-mothership-ui-lab.html`.

On mobile: change tabs, tap module cards and switch the color palette. On desktop: hover cards, test tilt, keyboard tab navigation, and reduced-motion settings.

## Moving into the actual Cosmic Mothership
1. Verify the actual live Site/project's repo, framework, route ownership, and connection states. Back up first.
2. Pick one component on the official 21st.dev website. Confirm author, source URL, dependencies, and **that component's license**. 21st.dev's marketplace terms and individual upstream licenses vary. Keep attribution/source pointers.
3. If the live app uses React, use official 21st.dev Copy Prompt / CLI according to the project's conventions. If static HTML, rebuild the interaction using original compatible source with permission rather than dropping React code into HTML.
4. Apply to one low-risk card or agent panel behind a visual flag. Preserve data, accessibility, navigation, and any real agent backend behavior.
5. Test on phone and Samsung Fold width, keyboard, reduced motion, dark mode, installable PWA if relevant. Only deploy after validation.

## Candidate categories
- Cards: https://21st.dev/community/components/explore/card-react
- Neon/UI effects: https://21st.dev/community/components/explore/neon-themes
- Agent chat ideas: https://21st.dev/community/components/21st.dev/send-button

**Costs:** Browsing and limited daily component copies are free according to 21st.dev documentation; paid access is optional.
