import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ExportData {
  users: Array<{
    name: string;
    email: string;
    location: string;
    created_at: string;
  }>;
  centers: Array<{
    business_name: string;
    location: string;
    status: string;
    created_at: string;
  }>;
  summary: {
    totalUsers: number;
    totalCenters: number;
    pendingApplications: number;
    approvedCenters: number;
    dateRange: string;
    generatedAt: string;
  };
}

export const useStrategicExport = () => {
  const fetchExportData = async (dateRange: number): Promise<ExportData> => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    // Fetch users from repair_jobs (unique customers)
    const { data: jobsData } = await supabase
      .from('repair_jobs')
      .select('customer_name, customer_email, pickup_address, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Fetch repair center applications
    const { data: centersData } = await supabase
      .from('repair_center_applications')
      .select('business_name, city, state, status, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    const users = (jobsData || []).map(job => ({
      name: job.customer_name,
      email: job.customer_email,
      location: job.pickup_address,
      created_at: format(new Date(job.created_at), 'yyyy-MM-dd HH:mm'),
    }));

    const centers = (centersData || []).map(center => ({
      business_name: center.business_name,
      location: `${center.city}, ${center.state}`,
      status: center.status,
      created_at: format(new Date(center.created_at), 'yyyy-MM-dd HH:mm'),
    }));

    return {
      users,
      centers,
      summary: {
        totalUsers: users.length,
        totalCenters: centers.length,
        pendingApplications: centers.filter(c => c.status === 'pending').length,
        approvedCenters: centers.filter(c => c.status === 'approved').length,
        dateRange: `Last ${dateRange} days`,
        generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      },
    };
  };

  const exportToCSV = async (dateRange: number) => {
    const data = await fetchExportData(dateRange);
    
    // Create CSV content
    let csvContent = "STRATEGIC ANALYTICS REPORT\n";
    csvContent += `Generated: ${data.summary.generatedAt}\n`;
    csvContent += `Date Range: ${data.summary.dateRange}\n\n`;
    
    // Summary section
    csvContent += "=== SUMMARY ===\n";
    csvContent += `Total New Users,${data.summary.totalUsers}\n`;
    csvContent += `Total Repair Center Applications,${data.summary.totalCenters}\n`;
    csvContent += `Pending Applications,${data.summary.pendingApplications}\n`;
    csvContent += `Approved Centers,${data.summary.approvedCenters}\n\n`;
    
    // Users section
    csvContent += "=== NEW USERS ===\n";
    csvContent += "Name,Email,Location,Sign-up Date\n";
    data.users.forEach(user => {
      csvContent += `"${user.name}","${user.email}","${user.location}","${user.created_at}"\n`;
    });
    
    csvContent += "\n=== REPAIR CENTER APPLICATIONS ===\n";
    csvContent += "Business Name,Location,Status,Application Date\n";
    data.centers.forEach(center => {
      csvContent += `"${center.business_name}","${center.location}","${center.status}","${center.created_at}"\n`;
    });

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `strategic-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async (dateRange: number) => {
    const data = await fetchExportData(dateRange);
    
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Strategic Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #3b82f6; margin-top: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
          .summary-card h3 { margin: 0; font-size: 14px; color: #64748b; }
          .summary-card p { margin: 5px 0 0; font-size: 28px; font-weight: bold; color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #3b82f6; color: white; padding: 12px; text-align: left; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .status-pending { color: #f59e0b; font-weight: 500; }
          .status-approved { color: #10b981; font-weight: 500; }
          .status-rejected { color: #ef4444; font-weight: 500; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 Strategic Analytics Report</h1>
        <p class="meta">Generated: ${data.summary.generatedAt} | Period: ${data.summary.dateRange}</p>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total New Users</h3>
            <p>${data.summary.totalUsers}</p>
          </div>
          <div class="summary-card">
            <h3>Repair Center Applications</h3>
            <p>${data.summary.totalCenters}</p>
          </div>
          <div class="summary-card">
            <h3>Pending Applications</h3>
            <p>${data.summary.pendingApplications}</p>
          </div>
          <div class="summary-card">
            <h3>Approved Centers</h3>
            <p>${data.summary.approvedCenters}</p>
          </div>
        </div>

        <h2>👥 New Users</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Location</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.users.slice(0, 50).map(user => `
              <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.location}</td>
                <td>${user.created_at}</td>
              </tr>
            `).join('')}
            ${data.users.length > 50 ? `<tr><td colspan="4" style="text-align:center;color:#64748b;">... and ${data.users.length - 50} more users</td></tr>` : ''}
          </tbody>
        </table>

        <h2>🏢 Repair Center Applications</h2>
        <table>
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.centers.slice(0, 50).map(center => `
              <tr>
                <td>${center.business_name}</td>
                <td>${center.location}</td>
                <td class="status-${center.status}">${center.status.charAt(0).toUpperCase() + center.status.slice(1)}</td>
                <td>${center.created_at}</td>
              </tr>
            `).join('')}
            ${data.centers.length > 50 ? `<tr><td colspan="4" style="text-align:center;color:#64748b;">... and ${data.centers.length - 50} more applications</td></tr>` : ''}
          </tbody>
        </table>

        <div class="footer">
          <p>FixBudi Strategic Planning Dashboard | Confidential Report</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return { exportToCSV, exportToPDF };
};
