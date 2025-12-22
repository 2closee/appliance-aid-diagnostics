// FixBudi Brand Email Template System
// Consistent styling across all email communications

// Logo URL - hosted in Supabase storage (repair-center-branding bucket)
export const LOGO_URL = 'https://esbqtuljvejvrzawsqgk.supabase.co/storage/v1/object/public/repair-center-branding/fixbudi-logo.svg';

export const BRAND_COLORS = {
  primary: '#1a1a1a',           // Dark/black (main brand color)
  primaryLight: '#e8e4df',      // Milky cream (accent)
  success: '#22c55e',           // Green
  successLight: '#dcfce7',      // Light green background
  warning: '#f59e0b',           // Amber
  warningLight: '#fef3c7',      // Light amber background
  destructive: '#ef4444',       // Red
  destructiveLight: '#fef2f2',  // Light red background
  info: '#3b82f6',              // Blue
  infoLight: '#dbeafe',         // Light blue background
  background: '#ffffff',        // White
  muted: '#f8fafc',             // Light gray
  text: '#374151',              // Body text
  textLight: '#6b7280',         // Secondary text
  textMuted: '#9ca3af',         // Muted text
  border: '#e5e7eb',            // Borders
};

export const EMAIL_STYLES = {
  container: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.primary}; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;`,
  wrapper: `background-color: ${BRAND_COLORS.background}; border: 1px solid ${BRAND_COLORS.primary}; border-radius: 0; overflow: hidden; margin: 20px;`,
  header: `background-color: ${BRAND_COLORS.background}; padding: 35px 30px; text-align: center; border-bottom: 1px solid ${BRAND_COLORS.primary};`,
  headerLogo: `color: ${BRAND_COLORS.primary}; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;`,
  headerTagline: `color: ${BRAND_COLORS.primary}; margin: 8px 0 0 0; font-size: 14px;`,
  content: `padding: 35px 30px;`,
  footer: `background-color: ${BRAND_COLORS.muted}; padding: 25px 30px; text-align: center; border-top: 1px solid ${BRAND_COLORS.border};`,
  footerText: `color: ${BRAND_COLORS.textLight}; margin: 0 0 8px 0; font-size: 14px;`,
  footerLink: `color: ${BRAND_COLORS.primary}; text-decoration: none; font-weight: 500;`,
  footerCopyright: `color: ${BRAND_COLORS.textMuted}; font-size: 12px; margin-top: 15px;`,
  
  // Typography
  h1: `color: ${BRAND_COLORS.primary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;`,
  h2: `color: ${BRAND_COLORS.primary}; margin: 25px 0 15px 0; font-size: 20px; font-weight: 600;`,
  h3: `color: ${BRAND_COLORS.primary}; margin: 20px 0 12px 0; font-size: 16px; font-weight: 600;`,
  paragraph: `color: ${BRAND_COLORS.text}; margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;`,
  
  // Buttons
  primaryButton: `display: inline-block; background-color: ${BRAND_COLORS.primary}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;`,
  secondaryButton: `display: inline-block; background-color: ${BRAND_COLORS.muted}; color: ${BRAND_COLORS.primary}; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; border: 1px solid ${BRAND_COLORS.border};`,
  
  // Boxes
  infoBox: `background-color: ${BRAND_COLORS.muted}; padding: 20px; border-radius: 8px; margin: 20px 0;`,
  successBox: `background-color: ${BRAND_COLORS.successLight}; border-left: 4px solid ${BRAND_COLORS.success}; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;`,
  warningBox: `background-color: ${BRAND_COLORS.warningLight}; border-left: 4px solid ${BRAND_COLORS.warning}; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;`,
  errorBox: `background-color: ${BRAND_COLORS.destructiveLight}; border-left: 4px solid ${BRAND_COLORS.destructive}; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;`,
  highlightBox: `background-color: ${BRAND_COLORS.infoLight}; border-left: 4px solid ${BRAND_COLORS.info}; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;`,
  
  // Lists
  list: `margin: 0; padding-left: 20px; color: ${BRAND_COLORS.text};`,
  listItem: `margin-bottom: 10px;`,
  
  // Divider
  divider: `border: none; border-top: 1px solid ${BRAND_COLORS.border}; margin: 25px 0;`,
  
  // Table
  table: `width: 100%; border-collapse: collapse;`,
  tableRow: `border-bottom: 1px solid ${BRAND_COLORS.border};`,
  tableLabel: `padding: 12px 0; color: ${BRAND_COLORS.textLight}; width: 40%; font-size: 14px;`,
  tableValue: `padding: 12px 0; font-weight: 500; font-size: 14px;`,
  
  // Status badges
  badgePending: `display: inline-block; background: ${BRAND_COLORS.warningLight}; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;`,
  badgeSuccess: `display: inline-block; background: ${BRAND_COLORS.successLight}; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;`,
  badgeError: `display: inline-block; background: ${BRAND_COLORS.destructiveLight}; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;`,
};

// Base email wrapper with header and footer
export function wrapEmailTemplate(content: string, options?: { showFooter?: boolean }): string {
  const showFooter = options?.showFooter !== false;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FixBudi</title>
    </head>
    <body style="${EMAIL_STYLES.container}">
      <div style="${EMAIL_STYLES.wrapper}">
        <!-- Header -->
        <div style="${EMAIL_STYLES.header}">
          <img src="${LOGO_URL}" alt="FixBudi Logo" style="height: 60px; width: auto; margin-bottom: 10px;" onerror="this.style.display='none'">
          <h1 style="${EMAIL_STYLES.headerLogo}">FixBudi</h1>
          <p style="${EMAIL_STYLES.headerTagline}">Appliance Repair Network</p>
        </div>
        
        <!-- Content -->
        <div style="${EMAIL_STYLES.content}">
          ${content}
        </div>
        
        ${showFooter ? `
        <!-- Footer -->
        <div style="${EMAIL_STYLES.footer}">
          <p style="${EMAIL_STYLES.footerText}">Questions? Contact us at</p>
          <a href="mailto:support@fixbudi.com" style="${EMAIL_STYLES.footerLink}">support@fixbudi.com</a>
          <p style="${EMAIL_STYLES.footerCopyright}">
            © ${new Date().getFullYear()} FixBudi. All rights reserved.<br>
            Port Harcourt, Rivers State, Nigeria
          </p>
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

// Helper to create a primary button
export function createButton(text: string, url: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const style = variant === 'primary' ? EMAIL_STYLES.primaryButton : EMAIL_STYLES.secondaryButton;
  return `<a href="${url}" style="${style}">${text}</a>`;
}

// Helper to create an info/status box
export function createBox(content: string, type: 'info' | 'success' | 'warning' | 'error' | 'highlight' = 'info'): string {
  const styleMap = {
    info: EMAIL_STYLES.infoBox,
    success: EMAIL_STYLES.successBox,
    warning: EMAIL_STYLES.warningBox,
    error: EMAIL_STYLES.errorBox,
    highlight: EMAIL_STYLES.highlightBox,
  };
  return `<div style="${styleMap[type]}">${content}</div>`;
}

// Helper to create a status badge
export function createBadge(text: string, type: 'pending' | 'success' | 'error' = 'pending'): string {
  const styleMap = {
    pending: EMAIL_STYLES.badgePending,
    success: EMAIL_STYLES.badgeSuccess,
    error: EMAIL_STYLES.badgeError,
  };
  return `<span style="${styleMap[type]}">${text}</span>`;
}

// Helper to create a table row
export function createTableRow(label: string, value: string): string {
  return `
    <tr style="${EMAIL_STYLES.tableRow}">
      <td style="${EMAIL_STYLES.tableLabel}">${label}</td>
      <td style="${EMAIL_STYLES.tableValue}">${value}</td>
    </tr>
  `;
}

// Helper to create a details table
export function createDetailsTable(rows: Array<{ label: string; value: string }>): string {
  return `
    <table style="${EMAIL_STYLES.table}">
      ${rows.map(row => createTableRow(row.label, row.value)).join('')}
    </table>
  `;
}
