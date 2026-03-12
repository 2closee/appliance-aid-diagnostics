export interface EmailTemplate {
  id: string;
  label: string;
  category: "announcement" | "update" | "reminder";
  subject: string;
  message: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "referral-launch",
    label: "Referral Program Announcement",
    category: "announcement",
    subject: "Earn ₦5,000 for Every Repair Center You Refer to FixBudi",
    message: `Dear Partner,

We're excited to introduce the FixBudi Referral Program — and as a valued member of our repair network, you're first in line to benefit.

How It Works:
1. Log in to your FixBudi dashboard and navigate to the Referral section.
2. Share your unique referral code or link with other repair businesses.
3. When the business you referred is approved and onboarded, you earn ₦5,000.

There's no limit to the number of referrals you can make. The more quality repair centers you bring to the network, the more you earn.

Why Participate?
• Strengthen the FixBudi network in your area
• Help fellow repair professionals access more customers
• Earn passive income with zero extra effort

Log in to your dashboard today to get started. Your referral code is ready and waiting.

Thank you for being a trusted FixBudi partner.

Warm regards,
The FixBudi Team`,
  },
  {
    id: "platform-update",
    label: "Platform Update / New Feature",
    category: "update",
    subject: "What's New on FixBudi — Platform Update",
    message: `Dear Partner,

We've been working hard to improve your FixBudi experience. Here's what's new:

New Features:
• [Feature 1] — Brief description of how it helps
• [Feature 2] — Brief description of how it helps
• [Feature 3] — Brief description of how it helps

These updates are live now — log in to your dashboard to explore them.

As always, if you have feedback or run into any issues, our support team is here to help at support@fixbudi.com.

Thank you for being part of the FixBudi network.

Best regards,
The FixBudi Team`,
  },
  {
    id: "profile-reminder",
    label: "Complete Your Profile Reminder",
    category: "reminder",
    subject: "Action Required: Complete Your FixBudi Profile",
    message: `Dear Partner,

We noticed your FixBudi profile is not yet complete. A complete profile helps customers find and trust your repair center, which means more repair jobs for you.

Please log in and make sure the following are up to date:
• Business address and operating hours
• Specialties and services offered
• Contact information
• Logo and cover image

Repair centers with complete profiles receive significantly more customer enquiries.

Log in now to update your profile: https://fixbudi.lovable.app/dashboard

Thank you,
The FixBudi Team`,
  },
  {
    id: "payment-setup",
    label: "Bank Account Setup Reminder",
    category: "reminder",
    subject: "Set Up Your Bank Account to Receive Payouts",
    message: `Dear Partner,

To ensure you receive your earnings promptly, please add your bank account details to your FixBudi dashboard.

Steps:
1. Log in to your dashboard
2. Go to Settings → Bank Account
3. Enter your bank name, account number, and account name
4. Save your details

Without a verified bank account, we won't be able to process your payouts. Please complete this as soon as possible.

If you need help, contact us at support@fixbudi.com.

Best regards,
The FixBudi Team`,
  },
  {
    id: "seasonal-greeting",
    label: "Seasonal Greeting / Thank You",
    category: "announcement",
    subject: "Thank You for Being a FixBudi Partner",
    message: `Dear Partner,

We want to take a moment to say thank you. Your dedication to providing quality repair services has been instrumental in building the FixBudi network.

Together, we're making appliance repair more accessible and trustworthy for customers across Nigeria.

Here's to continued growth and success in the months ahead. We're proud to have you as part of the FixBudi family.

Warm regards,
The FixBudi Team`,
  },
  {
    id: "policy-update",
    label: "Policy / Terms Update",
    category: "update",
    subject: "Important: Updated Terms & Policies on FixBudi",
    message: `Dear Partner,

We're writing to inform you about updates to our platform policies that take effect on [DATE].

Key Changes:
• [Change 1] — What changed and why
• [Change 2] — What changed and why

These updates are designed to improve transparency and ensure a fair experience for all partners and customers.

Please review the full updated terms at: https://fixbudi.lovable.app/terms

If you have questions, reach out to support@fixbudi.com.

Thank you,
The FixBudi Team`,
  },
];

export const TEMPLATE_CATEGORIES: Record<string, string> = {
  announcement: "Announcements",
  update: "Updates",
  reminder: "Reminders",
};
