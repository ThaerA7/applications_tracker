"use client";

import type { AppliedApplication } from "./applied";
import type { Rejection } from "@/components/cards/RejectedCard";
import type { StoredInterview } from "./interviews";

type CompanyStats = {
  company: string;
  waiting: number;
  rejected: number;
  interviewPhase: number;
};

/**
 * Generate a beautiful HTML report with company statistics
 */
export async function generateCompanyStatsReport(
  applied: AppliedApplication[],
  rejected: Rejection[],
  interviews: StoredInterview[]
): Promise<void> {
  // Group applications by company and count by status
  const companyStats: Record<string, CompanyStats> = {};

  // Count "waiting" (Applied status applications)
  for (const app of applied) {
    const company = app.company || "Unknown";
    if (!companyStats[company]) {
      companyStats[company] = { company, waiting: 0, rejected: 0, interviewPhase: 0 };
    }
    if (!app.status || app.status === "Applied") {
      companyStats[company].waiting++;
    }
  }

  // Count "rejected"
  for (const rej of rejected) {
    const company = rej.company || "Unknown";
    if (!companyStats[company]) {
      companyStats[company] = { company, waiting: 0, rejected: 0, interviewPhase: 0 };
    }
    companyStats[company].rejected++;
  }

  // Count "interview phase"
  for (const interview of interviews) {
    const company = interview.company || "Unknown";
    if (!companyStats[company]) {
      companyStats[company] = { company, waiting: 0, rejected: 0, interviewPhase: 0 };
    }
    companyStats[company].interviewPhase++;
  }

  // Convert to array and sort by company name
  const data = Object.values(companyStats).sort((a, b) =>
    a.company.localeCompare(b.company)
  );

  // Calculate totals
  const totals = {
    waiting: data.reduce((sum, row) => sum + row.waiting, 0),
    rejected: data.reduce((sum, row) => sum + row.rejected, 0),
    interviewPhase: data.reduce((sum, row) => sum + row.interviewPhase, 0),
  };

  const markValue = (value: number) => (value > 0 ? "✓" : "-");

  // Generate table rows
  const tableRows = data.map((row, index) => {
    return `
      <tr class="company-row ${index % 2 === 0 ? 'even' : 'odd'}">
        <td class="company-name" contenteditable="true">${row.company}</td>
        <td class="stat-waiting" contenteditable="true">${markValue(row.waiting)}</td>
        <td class="stat-rejected" contenteditable="true">${markValue(row.rejected)}</td>
        <td class="stat-interview" contenteditable="true">${markValue(row.interviewPhase)}</td>
        <td class="stat-total" contenteditable="true"></td>
      </tr>
    `;
  }).join('');

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Generate beautiful HTML report
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Applications Report - ${currentDate}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
      letter-spacing: -1px;
    }

    .header p {
      font-size: 1.1em;
      opacity: 0.9;
    }

    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
    }

    .stat-card {
      padding: 25px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
    }

    .stat-card.waiting {
      background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%);
      color: white;
    }

    .stat-card.rejected {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
    }

    .stat-card.interview {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
      color: white;
    }

    .stat-card.total {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
    }

    .stat-number {
      font-size: 3em;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 1em;
      opacity: 0.95;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    .table-container {
      padding: 40px;
    }

    .table-title {
      font-size: 1.8em;
      margin-bottom: 25px;
      color: #2c3e50;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    thead {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
    }

    th {
      padding: 18px 15px;
      text-align: left;
      font-weight: 600;
      font-size: 0.95em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    th:not(:first-child) {
      text-align: center;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid #ecf0f1;
    }

    td:not(:first-child) {
      text-align: center;
      font-weight: 600;
      font-size: 1.1em;
    }

    .company-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1.05em;
    }

    .company-row.even {
      background-color: #f8f9fa;
    }

    .company-row.odd {
      background-color: #ffffff;
    }

    .company-row:hover {
      background-color: #e8f4f8;
      transition: background-color 0.2s ease;
    }

    .stat-waiting {
      color: #f39c12;
    }

    .stat-rejected {
      color: #e74c3c;
    }

    .stat-interview {
      color: #27ae60;
    }

    .stat-total {
      color: #3498db;
      font-weight: 700;
    }

    tfoot {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
      color: white;
      font-weight: bold;
    }

    tfoot td {
      padding: 20px 15px;
      font-size: 1.2em;
      border-bottom: none;
    }

    .footer {
      background: #2c3e50;
      color: white;
      text-align: center;
      padding: 20px;
      font-size: 0.9em;
      opacity: 0.8;
    }

    [contenteditable="true"] {
      outline: none;
      border-radius: 6px;
    }

    [contenteditable="true"]:focus {
      box-shadow: inset 0 0 0 2px rgba(52, 152, 219, 0.45);
      background-color: #eef6ff;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
      }
      
      .stat-card:hover,
      .company-row:hover {
        transform: none;
        background-color: inherit;
      }
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8em;
      }

      .stats-summary {
        grid-template-columns: 1fr;
        padding: 20px;
      }

      .table-container {
        padding: 20px;
        overflow-x: auto;
      }

      table {
        font-size: 0.9em;
      }

      .stat-number {
        font-size: 2.5em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Job Applications Report</h1>
      <p>${currentDate}</p>
    </div>

    <div class="stats-summary">
      <div class="stat-card waiting">
        <div class="stat-number" contenteditable="true">${totals.waiting}</div>
        <div class="stat-label">Waiting</div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-number" contenteditable="true">${totals.rejected}</div>
        <div class="stat-label">Rejected</div>
      </div>
      <div class="stat-card interview">
        <div class="stat-number" contenteditable="true">${totals.interviewPhase}</div>
        <div class="stat-label">Interview Phase</div>
      </div>
      <div class="stat-card total">
        <div class="stat-number" contenteditable="true">${totals.waiting + totals.rejected + totals.interviewPhase}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>

    <div class="table-container">
      <h2 class="table-title">Company Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Waiting</th>
            <th>Rejected</th>
            <th>Interview Phase</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td>${totals.waiting}</td>
            <td>${totals.rejected}</td>
            <td>${totals.interviewPhase}</td>
            <td>${totals.waiting + totals.rejected + totals.interviewPhase}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="footer">
      Generated by Job Tracker Application • You can edit any highlighted cell before printing.
    </div>
  </div>
</body>
</html>`;

  // Download the HTML file
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const timestamp = new Date().toISOString().split("T")[0];
  a.download = `job-applications-report-${timestamp}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
