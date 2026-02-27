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

  const waitingMark = (value: number) => (value > 0 ? "⏳" : "-");
  const rejectedMark = (value: number) => (value > 0 ? "✗" : "-");
  const interviewMark = (value: number) => (value > 0 ? "✓" : "-");

  // Generate table rows
  const tableRows = data.map((row, index) => {
    const rowTotal = row.waiting + row.rejected + row.interviewPhase;
    return `
      <tr
        class="company-row ${index % 2 === 0 ? 'even' : 'odd'}"
        data-waiting="${row.waiting}"
        data-rejected="${row.rejected}"
        data-interview="${row.interviewPhase}"
        data-total="${rowTotal}"
      >
        <td class="company-name" contenteditable="true">${row.company}</td>
        <td class="stat-waiting" contenteditable="true">${waitingMark(row.waiting)}</td>
        <td class="stat-rejected" contenteditable="true">${rejectedMark(row.rejected)}</td>
        <td class="stat-interview" contenteditable="true">${interviewMark(row.interviewPhase)}</td>
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
      padding: 30px 40px 16px;
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
      padding: 16px 40px 40px;
    }

    .table-title {
      font-size: 1.8em;
      margin-bottom: 18px;
      color: #2c3e50;
      font-weight: 600;
    }

    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
      justify-content: space-between;
      align-items: center;
    }

    .filter-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .report-controls {
      display: flex;
      gap: 10px;
    }

    .lang-btn,
    .print-btn {
      border: none;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 0.82em;
      font-weight: 700;
      cursor: pointer;
      color: #2c3e50;
      background: #eef2f7;
      transition: all 0.2s ease;
    }

    .lang-btn:hover,
    .print-btn:hover {
      background: #dfe8f3;
    }

    .lang-btn.active {
      color: #ffffff;
      background: #2c3e50;
      box-shadow: 0 4px 12px rgba(44, 62, 80, 0.24);
    }

    .print-btn {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.24);
    }

    .print-btn:hover {
      background: linear-gradient(135deg, #2980b9 0%, #1f6596 100%);
    }

    .table-title {
      font-size: 1.8em;
      margin-bottom: 25px;
      color: #2c3e50;
      font-weight: 600;
    }

    .filter-btn {
      border: none;
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 0.9em;
      font-weight: 600;
      cursor: pointer;
      color: #2c3e50;
      background: #eef2f7;
      transition: all 0.2s ease;
    }

    .filter-btn:hover {
      transform: translateY(-1px);
      background: #dfe8f3;
    }

    .filter-btn.active {
      color: #ffffff;
      background: #34495e;
      box-shadow: 0 4px 12px rgba(52, 73, 94, 0.28);
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

      .filter-controls {
        display: none;
      }

      .report-controls {
        display: none;
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
        <div class="stat-label" data-i18n="waiting">Waiting</div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-number" contenteditable="true">${totals.rejected}</div>
        <div class="stat-label" data-i18n="rejected">Rejected</div>
      </div>
      <div class="stat-card interview">
        <div class="stat-number" contenteditable="true">${totals.interviewPhase}</div>
        <div class="stat-label" data-i18n="interviewPhase">Interview Phase</div>
      </div>
    </div>

    <div class="table-container">
      <h2 class="table-title" data-i18n="companyBreakdown">Company Breakdown</h2>
      <div class="filter-controls" id="filter-controls">
        <div class="filter-buttons">
          <button type="button" class="filter-btn active" data-filter="all" data-i18n="all">All</button>
          <button type="button" class="filter-btn" data-filter="waiting" data-i18n="waiting">Waiting</button>
          <button type="button" class="filter-btn" data-filter="rejected" data-i18n="rejected">Rejected</button>
          <button type="button" class="filter-btn" data-filter="interview" data-i18n="interview">Interview</button>
        </div>
        <div class="report-controls" id="report-controls">
          <button type="button" class="print-btn" id="print-btn" data-i18n="print">🖨️ Print</button>
          <button type="button" class="lang-btn active" data-lang="en">EN</button>
          <button type="button" class="lang-btn" data-lang="de">DE</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th data-i18n="company">Company</th>
            <th data-i18n="waiting">Waiting</th>
            <th data-i18n="rejected">Rejected</th>
            <th data-i18n="interviewPhase">Interview Phase</th>
            <th data-i18n="total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td data-i18n="totalUpper">TOTAL</td>
            <td>${totals.waiting}</td>
            <td>${totals.rejected}</td>
            <td>${totals.interviewPhase}</td>
            <td>${totals.waiting + totals.rejected + totals.interviewPhase}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="footer">
      <span data-i18n="footer">Generated by Job Tracker Application • You can edit any highlighted cell before printing.</span>
    </div>
  </div>
  <script>
    (function () {
      const filterButtons = document.querySelectorAll('.filter-btn');
      const langButtons = document.querySelectorAll('.lang-btn');
      const rows = document.querySelectorAll('tbody .company-row');

      const translations = {
        en: {
          waiting: 'Waiting',
          rejected: 'Rejected',
          interview: 'Interview',
          interviewPhase: 'Interview Phase',
          all: 'All',
          total: 'Total',
          totalUpper: 'TOTAL',
          company: 'Company',
          companyBreakdown: 'Company Breakdown',
          print: '🖨️ Print',
          footer: 'Generated by Job Tracker Application • You can edit any highlighted cell before printing.'
        },
        de: {
          waiting: 'Warten',
          rejected: 'Abgelehnt',
          interview: 'Interview',
          interviewPhase: 'Interviewphase',
          all: 'Alle',
          total: 'Gesamt',
          totalUpper: 'GESAMT',
          company: 'Firma',
          companyBreakdown: 'Firmenübersicht',
          print: '🖨️ Drucken',
          footer: 'Erstellt von Job Tracker • Du kannst markierte Zellen vor dem Drucken bearbeiten.'
        }
      };

      function setLanguage(lang) {
        const dict = translations[lang] || translations.en;
        document.querySelectorAll('[data-i18n]').forEach(function (node) {
          const key = node.getAttribute('data-i18n');
          if (key && dict[key]) {
            node.textContent = dict[key];
          }
        });

        langButtons.forEach(function (button) {
          button.classList.toggle('active', button.getAttribute('data-lang') === lang);
        });
      }

      function showRows(filter) {
        rows.forEach(function (row) {
          if (filter === 'all') {
            row.style.display = '';
            return;
          }

          const value = Number(row.getAttribute('data-' + filter) || '0');
          row.style.display = value > 0 ? '' : 'none';
        });
      }

      filterButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          filterButtons.forEach(function (b) {
            b.classList.remove('active');
          });

          button.classList.add('active');
          const filter = button.getAttribute('data-filter') || 'all';
          showRows(filter);
        });
      });

      langButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          const lang = button.getAttribute('data-lang') || 'en';
          setLanguage(lang);
        });
      });

      const printBtn = document.getElementById('print-btn');
      if (printBtn) {
        printBtn.addEventListener('click', function () {
          // Get the table element
          const table = document.querySelector('table');
          if (!table) return;

          // Create a new window for printing
          const printWindow = window.open('', '_blank', 'width=800,height=600');
          if (!printWindow) return;

          // Write a minimal HTML document with just the table
          printWindow.document.write('<!DOCTYPE html>');
          printWindow.document.write('<html><head><title>Print Table</title>');
          printWindow.document.write('<style>');
          printWindow.document.write('body { font-family: "Segoe UI", Arial, sans-serif; margin: 20px; }');
          printWindow.document.write('table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }');
          printWindow.document.write('thead { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; }');
          printWindow.document.write('th { padding: 18px 15px; text-align: left; font-weight: 600; font-size: 0.95em; text-transform: uppercase; letter-spacing: 1px; }');
          printWindow.document.write('th:not(:first-child) { text-align: center; }');
          printWindow.document.write('td { padding: 15px; border-bottom: 1px solid #ecf0f1; }');
          printWindow.document.write('td:not(:first-child) { text-align: center; font-weight: 600; font-size: 1.1em; }');
          printWindow.document.write('.company-name { font-weight: 600; color: #2c3e50; font-size: 1.05em; }');
          printWindow.document.write('tbody tr:nth-child(even) { background-color: #f8f9fa; }');
          printWindow.document.write('tbody tr:nth-child(odd) { background-color: #ffffff; }');
          printWindow.document.write('.stat-waiting { color: #f39c12; }');
          printWindow.document.write('.stat-rejected { color: #e74c3c; }');
          printWindow.document.write('.stat-interview { color: #27ae60; }');
          printWindow.document.write('.stat-total { color: #3498db; font-weight: 700; }');
          printWindow.document.write('tfoot { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); color: white; font-weight: bold; }');
          printWindow.document.write('tfoot td { padding: 20px 15px; font-size: 1.2em; border-bottom: none; }');
          printWindow.document.write('</style>');
          printWindow.document.write('</head><body>');
          printWindow.document.write(table.outerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();

          // Wait a bit for the content to load, then print
          setTimeout(function () {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
          }, 250);
        });
      }
    })();
  </script>
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
