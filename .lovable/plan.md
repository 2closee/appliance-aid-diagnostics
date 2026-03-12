

## Plan: Create Repair Center Landing Page at `/join`

### New File: `src/pages/JoinRepairCenter.tsx`

A single-page landing page optimized for social media traffic with these sections:

1. **Hero Section** - Bold headline ("Grow Your Repair Business with FixBudi"), subtext about more customers and guaranteed payments, prominent "Apply Now" CTA button linking to `/apply-repair-center`

2. **Benefits Grid** (6 cards) - Guaranteed payments via escrow, steady customer flow, business dashboard & analytics, delivery logistics handled, marketing & visibility, dedicated support

3. **How It Works** (3 steps) - Apply online → Get verified → Start receiving jobs

4. **Testimonials Section** - 3 placeholder testimonials from repair center owners with names, locations, and quotes about business growth

5. **Stats Bar** - Key numbers (e.g., "500+ repairs completed", "98% satisfaction", "₦5,000 referral bonus")

6. **Final CTA Section** - "Ready to Grow Your Business?" with Apply Now button and a note about the referral program

### Modifications

- **`src/App.tsx`** - Add route: `<Route path="/join" element={<JoinRepairCenter />} />`
- Uses existing `Navigation` component for consistency
- Uses existing UI components (Card, Button, Badge) and design patterns from the homepage
- Mobile-responsive layout matching the existing design system
- Open Graph-friendly structure (semantic headings, clear content hierarchy)

