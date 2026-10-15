import { DomainCheckResult } from '../types';

/**
 * Escapes a single CSV value according to RFC 4180 standards.
 */
function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 compliant CSV string from domain check results.
 * Required columns:
 * Domain, Availability Status, Registration Price, Premium Status, Checked At
 */
export function generateCsv(results: DomainCheckResult[]): string {
  const headers = ['Domain', 'Availability Status', 'Registration Price', 'Premium Status', 'Checked At'];
  const rows: string[] = [headers.join(',')];

  for (const item of results) {
    const premiumText = item.premium === true ? 'Yes' : item.premium === false ? 'No' : 'Unknown';
    const priceText = item.price || 'N/A';

    const row = [
      escapeCsvCell(item.domain),
      escapeCsvCell(item.status),
      escapeCsvCell(priceText),
      escapeCsvCell(premiumText),
      escapeCsvCell(item.checkedAt),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}

/**
 * Initiates browser file download for domain results CSV.
 */
export function downloadCsv(results: DomainCheckResult[], filenamePrefix = 'available-domains'): void {
  const csvContent = generateCsv(results);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenamePrefix}-${timestamp}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
