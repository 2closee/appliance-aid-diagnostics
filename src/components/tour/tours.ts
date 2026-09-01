export type TourStep = {
  /** CSS selector of the element to spotlight. Falls back to a centered card when absent/missing. */
  target?: string;
  title: string;
  body: string;
};

export type TourKey = "customer-v1" | "repair_center-v1" | "rider-v1" | "admin-v1";

export const TOURS: Record<TourKey, { label: string; steps: TourStep[] }> = {
  "customer-v1": {
    label: "Getting started with Fixbudi",
    steps: [
      {
        title: "Welcome to Fixbudi",
        body: "A quick 5-step tour of how to get your device fixed — diagnose, get a quote, and have a rider pick it up.",
      },
      {
        target: '[data-tour="nav-/diagnostic"]',
        title: "1. Start with AI Diagnostic",
        body: "Describe the fault (or record a voice note) and our AI narrows down what's wrong before you pay anyone.",
      },
      {
        target: '[data-tour="nav-/self-test"]',
        title: "2. Run the phone Self-Test",
        body: "Test your screen, touch, battery, camera, mic and speaker in the browser. Results are shared with the AI for a sharper diagnosis.",
      },
      {
        target: '[data-tour="nav-/repair-centers"]',
        title: "3. Pick a verified repair center",
        body: "Every center here is CAC-verified and rated by customers. Chat with them before committing.",
      },
      {
        target: '[data-tour="nav-/pickup-selection"]',
        title: "4. Schedule a pickup",
        body: "An Ovapass rider collects your device with condition photos and an OTP handoff, then returns it after repair.",
      },
      {
        target: '[data-tour="nav-/payment-history"]',
        title: "5. Pay only after approval",
        body: "You review the quote first. You can negotiate in chat, and payments plus receipts live here.",
      },
      {
        target: '[data-tour="notifications-link"]',
        title: "Turn on notifications",
        body: "Enable push alerts so you never miss a quote, message or rider arrival — even when the app is closed.",
      },
    ],
  },
  "repair_center-v1": {
    label: "Partner portal walkthrough",
    steps: [
      {
        title: "Welcome, partner",
        body: "Here's how jobs reach you, how to quote, and how you get paid.",
      },
      {
        target: '[data-tour="nav-/dashboard"]',
        title: "Your dashboard",
        body: "New job requests, active repairs and the bulky pickup queue all land here.",
      },
      {
        target: '[data-tour="nav-/repair-jobs"]',
        title: "Quote and update jobs",
        body: "Open a job to send a quote, chat with the customer, and move it through In repair → Ready for return.",
      },
      {
        target: '[data-tour="nav-/center-earnings"]',
        title: "Earnings and payouts",
        body: "Track completed jobs, Fixbudi's 7.5% commission, and request payouts to your bank account.",
      },
      {
        target: '[data-tour="nav-/repair-center-admin"]',
        title: "Center settings",
        body: "Update your branding, staff, specialties and bank details here.",
      },
      {
        target: '[data-tour="notifications-link"]',
        title: "Never miss a job",
        body: "Turn on push notifications so new requests, quotes accepted and customer messages reach you instantly.",
      },
    ],
  },
  "rider-v1": {
    label: "Ovapass rider walkthrough",
    steps: [
      {
        title: "Welcome to Ovapass",
        body: "Here's how pickups reach you and how your earnings work.",
      },
      {
        target: '[data-tour="nav-/rider"]',
        title: "Go online to get offers",
        body: "Toggle yourself online. Offers within range of your vehicle category are sent straight to you with a countdown.",
      },
      {
        target: '[data-tour="nav-/rider/earnings"]',
        title: "Earnings and payouts",
        body: "Every completed trip shows your earning and Fixbudi's cut. Request payouts from here.",
      },
      {
        target: '[data-tour="notifications-link"]',
        title: "Turn on push alerts",
        body: "Trip offers expire fast. Enable push so you hear them even with the app closed.",
      },
    ],
  },
  "admin-v1": {
    label: "Admin walkthrough",
    steps: [
      {
        title: "Admin tools",
        body: "A quick map of the controls available to you.",
      },
      {
        target: '[data-tour="nav-/dashboard"]',
        title: "Operations dashboard",
        body: "Applications, live jobs, repair centers and Ovapass activity in one place.",
      },
      {
        target: '[data-tour="nav-/strategic-analytics"]',
        title: "Strategic planning",
        body: "Signup trends, geography and traffic to decide where to expand next.",
      },
      {
        target: '[data-tour="nav-/payout-management"]',
        title: "Payouts",
        body: "Approve repair center and rider payouts, and review commissions.",
      },
    ],
  },
};

export const tourKeyForRole = (role: string | null | undefined): TourKey => {
  switch (role) {
    case "repair_center":
      return "repair_center-v1";
    case "rider":
      return "rider-v1";
    case "admin":
      return "admin-v1";
    default:
      return "customer-v1";
  }
};

export const START_TOUR_EVENT = "fixbudi:start-tour";

export const startTour = () => window.dispatchEvent(new Event(START_TOUR_EVENT));
