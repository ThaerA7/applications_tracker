"use client";

import * as XLSX from "xlsx";
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
 * Generate an Excel file with company statistics
 */
export async function generateCompanyStatsExcel(
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
    // Count as "waiting" if status is "Applied" or not explicitly in another state
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
    company: "TOTAL",
    waiting: data.reduce((sum, row) => sum + row.waiting, 0),
    rejected: data.reduce((sum, row) => sum + row.rejected, 0),
    interviewPhase: data.reduce((sum, row) => sum + row.interviewPhase, 0),
  };

  // Add totals row
  const dataWithTotals = [...data, totals];

  // Create workbook with formatted data
  const worksheet = XLSX.utils.json_to_sheet(dataWithTotals);

  // Define colors and styles
  const colors = {
    headerBg: "2C3E50", // Dark gray-blue
    companyHeader: "3498DB", // Bright blue
    waitingHeader: "F39C12", // Orange
    rejectedHeader: "E74C3C", // Red
    interviewHeader: "27AE60", // Green
    totalRow: "34495E", // Dark gray
    alternateRow1: "ECF0F1", // Light gray
    alternateRow2: "FFFFFF", // White
    waitingCell: "FFF4E6", // Light orange
    rejectedCell: "FDEDEC", // Light red
    interviewCell: "E8F8F5", // Light green
  };
  
  const borderStyle = { style: "thin", color: { rgb: "95A5A6" } };

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  // Format header row with individual column colors
  const headerConfigs = [
    { col: 0, bg: colors.companyHeader, text: "Company" },
    { col: 1, bg: colors.waitingHeader, text: "Waiting" },
    { col: 2, bg: colors.rejectedHeader, text: "Rejected" },
    { col: 3, bg: colors.interviewHeader, text: "Interview Phase" },
  ];

  for (const config of headerConfigs) {
    const cellAddress = XLSX.utils.encode_col(config.col) + "1";
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = {
        font: { 
          bold: true, 
          color: { rgb: "FFFFFF" }, 
          size: 13,
          name: "Calibri"
        },
        fill: { fgColor: { rgb: config.bg } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: borderStyle,
          bottom: { style: "medium", color: { rgb: "2C3E50" } },
          left: borderStyle,
          right: borderStyle,
        },
      };
    }
  }

  // Format data rows with column-specific colors and fonts
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const isTotalRow = row === range.e.r;
    const isAlternate = (row - 1) % 2 === 0;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellAddress]) {
        const cellValue = worksheet[cellAddress].v;
        
        // Determine background color based on column and row type
        let bgColor;
        let fontColor = "2C3E50"; // Default dark gray
        let fontName = "Calibri";
        let fontSize = 11;
        
        if (isTotalRow) {
          bgColor = colors.totalRow;
          fontColor = "FFFFFF";
          fontSize = 12;
          fontName = "Calibri";
        } else {
          // Column-specific colors for data cells
          if (col === 0) {
            // Company column - alternating rows
            bgColor = isAlternate ? colors.alternateRow1 : colors.alternateRow2;
            fontName = "Arial";
            fontSize = 11;
          } else if (col === 1) {
            // Waiting column - orange tint
            bgColor = colors.waitingCell;
            fontColor = "D68910";
            fontName = "Calibri";
          } else if (col === 2) {
            // Rejected column - red tint
            bgColor = colors.rejectedCell;
            fontColor = "C0392B";
            fontName = "Calibri";
          } else if (col === 3) {
            // Interview column - green tint
            bgColor = colors.interviewCell;
            fontColor = "1E8449";
            fontName = "Calibri";
          }
        }

        const isNumericCol = col > 0;
        worksheet[cellAddress].s = {
          font: {
            bold: isTotalRow,
            color: { rgb: fontColor },
            size: fontSize,
            name: fontName,
          },
          fill: { fgColor: { rgb: bgColor } },
          alignment: { 
            horizontal: col === 0 ? "left" : "center", 
            vertical: "center",
            indent: col === 0 && !isTotalRow ? 1 : 0
          },
          border: {
            top: borderStyle,
            bottom: isTotalRow ? { style: "medium", color: { rgb: "2C3E50" } } : borderStyle,
            left: borderStyle,
            right: borderStyle,
          },
          numFmt: isNumericCol && typeof cellValue === "number" ? "#,##0" : undefined,
        };
      }
    }
  }

  // Set column widths
  worksheet["!cols"] = [
    { wch: 35 }, // Company name
    { wch: 14 }, // Waiting
    { wch: 14 }, // Rejected
    { wch: 18 }, // Interview Phase
  ];

  // Set row height for header
  worksheet["!rows"] = [{ hpx: 25 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Company Stats");

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `job-applications-stats-${timestamp}.xlsx`);
}
