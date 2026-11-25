# OPTIMAX WEBSITE — FINAL DESIGN SYSTEM, BRANDING & UX CONSISTENCY OVERHAUL

**Project:** Optimax Corporate Website  
**Phase:** Final Website Improvement & UX Optimization  
**Objective:** Establish a unified, premium enterprise design language across every page, eliminate inconsistent branding and layouts, and deliver a cohesive, intuitive, responsive website.

---

# 1. PROJECT VISION

Transform the existing Optimax website into a polished enterprise technology platform with a consistent visual identity, predictable navigation, refined user experience, and reusable design architecture.

The website should communicate:

- Enterprise credibility.
- Technological innovation.
- Operational efficiency.
- Business scalability.
- Professional software engineering.
- Connected business management.

The website must feel like one unified product ecosystem, not a collection of independently designed pages.

**Core brand message:**

"One platform. Your entire business, connected."

**Supporting brand positioning:**

"Engineering digital solutions that scale."

# 2. PHASE ONE — COMPLETE WEBSITE AUDIT

IMPORTANT: Do not start redesigning individual pages immediately.

First, inspect the entire existing codebase and identify every publicly accessible page.

Create a page inventory containing:

- Page name and route.
- Page purpose.
- Target audience.
- Existing layout structure.
- Header and footer implementation.
- Typography and color usage.
- Button and CTA styles.
- Image and illustration styles.
- Spacing and alignment.
- Responsive behavior.
- Existing interactions.
- Missing or inconsistent elements.

Identify pages that have:

1. Different header heights or navigation styles.
2. Inconsistent logo positioning and sizing.
3. Different typography systems.
4. Inconsistent heading sizes.
5. Different button shapes and treatments.
6. Unpredictable section spacing.
7. Different content container widths.
8. Inconsistent footer structures.
9. Different card designs.
10. Inconsistent icon styles.
11. Poor mobile navigation.
12. Unnecessary decorative elements.
13. Broken or inconsistent responsive layouts.
14. Inconsistent branding and color application.
15. Weak or confusing navigation hierarchy.

Produce an audit report before implementation.

Do not remove existing content, features, routes, or working integrations during the redesign.

# 3. ESTABLISH A UNIFIED BRAND IDENTITY

All pages must follow one centrally managed Optimax design system.

## Brand direction

**Design personality:**
- Professional.
- Modern.
- Intelligent.
- Enterprise-focused.
- Minimalist.
- Trustworthy.
- Technologically advanced.

**Visual direction:** Trusted Enterprise Slate — Light Mode.

The website should take inspiration from the content clarity of Stripe, the information hierarchy of Linear, and the professional presentation of leading enterprise software platforms.

Do not copy their interfaces.

## Color system

Establish global design tokens.

| Token | Intended use |
|---|---|
| Primary Navy | — primary brand identity |
| White |  — primary page background |
| Teal | Existing approved Optimax  — interactive accent |
| Brand Accent | Approved logo accent — selective emphasis |
| Slate 900 | Primary headings |
| Slate 700 | Body text |
| Slate 500 | Supporting text |
| Slate 200 | Borders and dividers |
| Slate 50 | Subtle section backgrounds |

Rules:

- Navy must establish brand recognition.
- White should remain the dominant background.
- Teal should communicate interaction and important actions.
- Any orange or secondary logo color must be used selectively and only where consistent with the approved brand assets.
- Avoid introducing new colors on individual pages.
- No random gradients.
- No excessive colored backgrounds.
- No unnecessary shadows.

## Typography

Implement one global typography system.

Use a modern professional sans-serif family consistent with the existing Optimax brand.

Define reusable typography tokens:

- Display heading.
- H1.
- H2.
- H3.
- H4.
- Body large.
- Body regular.
- Body small.
- Caption.
- Navigation.
- Button text.

Establish consistent font weights, line heights, letter spacing, and responsive scaling.

Headings must have a clear visual hierarchy.

Avoid oversized headings that overwhelm the content.

# 4. GLOBAL WEBSITE STRUCTURE

Every public-facing page must follow a consistent structural foundation.

## Global header

Create one shared responsive header component.

Requirements:

- Consistent logo size and positioning.
- Consistent header height.
- Identical navigation typography.
- Consistent spacing between navigation items.
- Consistent dropdown behavior.
- One primary CTA style.
- Mobile navigation with accessible interactions.

The navigation should communicate the Optimax ecosystem clearly.

Maintain the existing navigation routes and organize them logically into categories such as:

- Products.
- Solutions.
- Industries.
- Projects.
- Company.
- Resources.

Do not introduce unnecessary navigation categories or remove existing destinations.

## Dropdown menus

All dropdown menus must share one visual system.

Requirements:

- White background.
- Consistent width and spacing.
- Clear category hierarchy.
- Consistent typography.
- Subtle borders.
- Controlled hover and focus states.
- Smooth opening and closing transitions.
- Keyboard accessibility.

Avoid inconsistent dropdown designs across the website.

## Global footer

Implement one reusable footer component.

Every page must share:

- Identical logo treatment.
- Consistent company description.
- Consistent navigation groups.
- Consistent contact information.
- Social media links.
- Legal links.
- Copyright information.

Only page-specific footer content should vary when genuinely necessary.

# 5. STANDARDIZED PAGE ARCHITECTURE

Every page should follow a recognizable content structure without forcing every page into an identical layout.

Establish reusable page templates.

## Template A — Corporate pages

Recommended structure:

1. Global header.
2. Hero section.
3. Supporting introduction.
4. Main content sections.
5. Supporting visuals.
6. Benefits or capabilities.
7. Relevant CTA.
8. Global footer.

Applicable to About, Company, Contact, and similar pages.

## Template B — Product and ERP module pages

Recommended structure:

1. Global header.
2. Product-specific hero.
3. Product overview.
4. Key capabilities.
5. Feature demonstrations.
6. Business benefits.
7. Related modules.
8. Product-specific CTA.
9. Global footer.

Applicable to Inventory, Sales, Vendor Management, Finance, HR, Commerce, and other ERP modules.

## Template C — Solution and industry pages

Recommended structure:

1. Global header.
2. Solution-focused hero.
3. Industry/business challenge.
4. Optimax solution.
5. Relevant capabilities.
6. Business outcomes.
7. Related products.
8. Conversion CTA.
9. Global footer.

## Template D — Resource and content pages

Recommended structure:

1. Global header.
2. Page introduction.
3. Content navigation or filtering where applicable.
4. Main content.
5. Related resources.
6. CTA.
7. Global footer.

IMPORTANT: Templates are structural guidelines, not rigid restrictions. Preserve unique page experiences where they serve a legitimate purpose.

# 6. OPTIMAX CENTRAL HUB — PRODUCT ECOSYSTEM VISUALIZATION

Establish a recognizable visual experience for presenting the Optimax ERP ecosystem.

The Optimax logo should serve as the central hub, with the different business modules positioned around it in a circular ecosystem.

## Visual composition

- Position the Optimax logo centrally.
- Arrange module representations around the central logo.
- Use a balanced circular radius.
- Each module should have its own relevant image or visual representation.
- Display the module title clearly.
- Maintain consistent image dimensions.
- Use consistent card proportions.
- Ensure the layout remains visually balanced.

## Interaction

Each module should behave as an interactive element.

On hover:
- Subtle elevation or visual emphasis.
- Smooth transition.
- Slight image transformation where appropriate.
- Clear indication that the module is clickable.

On click:
- Navigate to the corresponding module page.

On mobile:
- Replace the desktop circular composition with a responsive, organized grid or alternative radial layout.
- Never allow modules to overlap.
- Maintain clear visual hierarchy and accessible touch targets.

The central logo must remain the primary focal point.

Avoid excessive animation, decorative lines, unnecessary labels, and visual clutter.

# 7. STANDARDIZED COMPONENT DESIGN SYSTEM

Identify and consolidate reusable components across the application.

Create or standardize:

- Header.
- Navigation.
- Dropdown.
- Footer.
- Page container.
- Section heading.
- Hero section.
- Primary button.
- Secondary button.
- Feature card.
- Module card.
- Image showcase.
- Statistics section.
- Testimonial.
- CTA section.
- Breadcrumb.
- Accordion.
- Form fields.
- Loading states.
- Empty states.

Every reusable component must have consistent:

- Typography.
- Spacing.
- Border radius.
- Colors.
- Responsive behavior.
- Hover states.
- Focus states.
- Accessibility.

Avoid duplicating components simply because individual pages were originally developed separately.

Where possible, consolidate shared components without introducing unnecessary architectural complexity.

# 8. SPACING, ALIGNMENT AND LAYOUT

Establish a consistent spacing scale.

Suggested spacing tokens:

- 4px.
- 8px.
- 12px.
- 16px.
- 24px.
- 32px.
- 48px.
- 64px.
- 80px.
- 96px.

Establish consistent:

- Maximum content width.
- Horizontal page padding.
- Section spacing.
- Heading-to-description spacing.
- Card gaps.
- Image alignment.
- Text alignment.

All page sections should align to a shared content grid.

Avoid inconsistent left and right margins between sections.

Use whitespace intentionally to improve readability and establish visual hierarchy.

# 9. IMAGE AND VISUAL ASSET CONSISTENCY

Review every existing image and illustration.

Ensure:

- Images match the section they represent.
- Image aspect ratios are intentional.
- Image quality is professional.
- Module images are visually consistent.
- Product screenshots are presented clearly.
- Image positioning is consistent.
- No stretched or distorted images.
- No broken image assets.
- No irrelevant stock imagery.

Prioritize actual Optimax products, dashboards, software interfaces, and company-related visuals.

Do not replace meaningful existing product screenshots with generic illustrations.

Use consistent image treatments, border radii, and background surfaces.

# 10. UX AND INTERACTION IMPROVEMENTS

Review the entire website from the perspective of a first-time visitor.

The user should always understand:

- Where they are.
- What Optimax offers.
- What each product does.
- Who the product is designed for.
- What action to take next.

Improve:

### Navigation
- Clear hierarchy.
- Predictable dropdown behavior.
- Visible active states.
- Accessible keyboard navigation.
- Logical grouping.

### Conversion
- Clear page-specific CTAs.
- Consistent button styling.
- No competing primary actions.
- Meaningful CTA labels.
- Short, accessible forms.

### Interaction
- Smooth but restrained transitions.
- Consistent hover feedback.
- Clickable areas.
- Loading feedback.
- Form validation.
- Error and success feedback.

### Accessibility
- Semantic HTML.
- Proper heading order.
- Keyboard navigation.
- Visible focus indicators.
- Appropriate color contrast.
- Descriptive image alt text.
- Accessible interactive elements.

# 11. RESPONSIVE DESIGN

The website must be tested across:

- 320px mobile.
- 375px mobile.
- 430px mobile.
- 768px tablet.
- 1024px laptop.
- 1280px desktop.
- 1440px desktop.
- 1920px large display.

Requirements:

- No horizontal overflow.
- No overlapping elements.
- No broken navigation.
- No clipped headings.
- No distorted images.
- Consistent spacing.
- Readable typography.
- Properly sized touch targets.
- Responsive module ecosystem.
- Consistent mobile footer.

Do not simply shrink desktop layouts. Adapt the content structure to each screen size.

# 12. MOTION AND MICRO-INTERACTIONS

Use motion to improve usability and perceived quality.

Approved interaction patterns:

- Subtle hero entrance animations.
- Smooth dropdown transitions.
- Image reveal transitions.
- Section entrance animations.
- Button hover transitions.
- Module card interactions.
- Subtle scroll-based reveals where appropriate.

Motion should be purposeful, lightweight, and consistent.

Requirements:

- Avoid excessive animation.
- Avoid unnecessary parallax.
- Avoid long entrance delays.
- Avoid animation that blocks interaction.
- Respect reduced-motion preferences.
- Maintain performance on lower-powered devices.

# 13. TECHNICAL IMPLEMENTATION

Before modifying the codebase:

1. Inspect the existing framework and dependencies.
2. Understand the current routing structure.
3. Identify existing shared components.
4. Identify duplicate styles and components.
5. Identify existing design tokens.
6. Identify existing animation libraries.
7. Review image asset organization.
8. Identify potential regressions.

Implementation principles:

- Preserve the current framework.
- Preserve existing routes.
- Reuse existing dependencies where possible.
- Establish centralized design tokens.
- Build reusable components.
- Avoid unnecessary packages.
- Avoid rewriting functioning features.
- Maintain clean component boundaries.
- Keep page-specific styling intentional.
- Ensure all navigation and interactive elements work.

If using Angular, centralize shared styles and use reusable standalone components where appropriate. If using React, centralize the design system and shared components using the existing project architecture.

Do not migrate frameworks as part of this task.

# 14. PERFORMANCE AND QUALITY ASSURANCE

The final website must be tested for:

- Broken routes.
- Broken links.
- Missing assets.
- Console errors.
- Failed network requests.
- Navigation failures.
- Responsive layout issues.
- Animation performance.
- Form functionality.
- Accessibility problems.
- Unnecessary layout shifts.
- Image loading performance.

Review:

- Image optimization.
- Lazy loading.
- Font loading.
- Unused CSS.
- Unnecessary JavaScript.
- Component duplication.

Run the existing build and available tests after implementation.

Do not declare the project complete if the production build fails.

# 15. IMPLEMENTATION WORKFLOW

Execute the project in the following order.

**Phase 1 — Audit**
- Inspect all pages.
- Generate page inventory.
- Identify inconsistencies.
- Identify shared components.
- Report the proposed changes.

**Phase 2 — Design System**
- Establish brand tokens.
- Standardize typography.
- Standardize spacing.
- Standardize buttons and cards.
- Define global layout rules.

**Phase 3 — Global Components**
- Update header.
- Update navigation.
- Update dropdowns.
- Update footer.
- Implement reusable components.

**Phase 4 — Page Standardization**
- Update corporate pages.
- Update product pages.
- Update ERP module pages.
- Update solution pages.
- Update resource pages.
- Preserve unique page functionality.

**Phase 5 — Visual Refinement**
- Improve image treatments.
- Standardize section layouts.
- Improve the central Optimax module ecosystem.
- Refine animations.
- Correct alignment and spacing.

**Phase 6 — Responsive Optimization**
- Test mobile.
- Test tablet.
- Test desktop.
- Correct all layout issues.

**Phase 7 — Final QA**
- Test every route.
- Test every CTA.
- Test navigation.
- Run production build.
- Resolve errors.
- Deliver a final audit report.

# 16. DESIGN QUALITY RULES — NON-NEGOTIABLE

1. Consistency takes priority over individual page creativity.
2. Do not introduce new branding without approval.
3. Do not use random gradients.
4. Do not add decorative cards without a functional purpose.
5. Do not introduce unnecessary badges or labels.
6. Do not use inconsistent icon libraries or styles.
7. Do not overcrowd sections.
8. Do not use oversized typography without purpose.
9. Do not introduce inconsistent button styles.
10. Do not create different headers for different pages.
11. Do not duplicate shared components.
12. Do not sacrifice usability for animation.
13. Do not remove existing functionality.
14. Do not use generic imagery where actual Optimax product imagery exists.
15. Do not force every page into the same content layout.

# 17. FINAL ACCEPTANCE CRITERIA

The project is complete only when:

- Every public page follows the approved Optimax brand identity.
- The entire website shares one coherent design system.
- Navigation and footer are consistent.
- Typography and spacing are standardized.
- Buttons and interactive elements behave consistently.
- Product and module pages follow recognizable templates.
- The central Optimax ecosystem is visually balanced and interactive.
- All pages work on mobile, tablet, and desktop.
- All existing routes and functionality are preserved.
- No broken images or navigation links remain.
- No critical console errors remain.
- Production build succeeds.
- Accessibility and performance have been reviewed.

# FINAL INSTRUCTION TO THE IMPLEMENTATION AGENT

Approach this as a senior product designer, UX architect, and frontend engineer working together.

Do not merely make the website prettier.

Improve the underlying design consistency, usability, information architecture, and frontend maintainability.

Start with a comprehensive audit. Identify the root causes of inconsistencies before making changes.

Use the existing Optimax identity and approved visual assets as the source of truth.

Make deliberate design decisions. Avoid unnecessary redesign, feature invention, and visual decoration.

The final result should feel like a unified, premium enterprise technology company with a mature and recognizable digital identity.

**The desired outcome: One Optimax brand. One consistent experience. Every page professionally connected.**