/**
 * Download full game results as a multi-sheet Excel (.xlsx) file.
 *
 * Sheet layout:
 *   Sheet "Final Leaderboard"  – cumulative rankings
 *   Sheet "Round 1", "Round 2" … – per-round answers + points
 *
 * Requires: xlsx (SheetJS)
 */
import * as XLSX from 'xlsx';

/**
 * @param {Array}  leaderboard  – [{ rank, playerName, totalScore, totalUnique }]
 * @param {Array}  roundHistory – [{ roundNumber, letter, answers, scores }, …]
 * @param {string} roomId
 */
export function downloadFullResults(leaderboard, roundHistory, roomId) {
  const wb = XLSX.utils.book_new();

  // ── 1. Final Leaderboard sheet ──────────────────────────────────────────
  const lbRows = [
    ['Rank', 'Player', 'Total Score', 'Unique Words'],
    ...leaderboard.map((p) => [p.rank, p.playerName, p.totalScore, p.totalUnique]),
  ];
  const lbSheet = XLSX.utils.aoa_to_sheet(lbRows);
  _styleHeaderRow(lbSheet, lbRows[0].length);
  _autoWidth(lbSheet, lbRows);
  XLSX.utils.book_append_sheet(wb, lbSheet, 'Final Leaderboard');

  // ── 2. One sheet per round ───────────────────────────────────────────────
  const sortedRounds = [...roundHistory].sort((a, b) => a.roundNumber - b.roundNumber);

  for (const round of sortedRounds) {
    const { roundNumber, letter, answers, scores } = round;

    // Sort players by round total desc
    const sortedIds = Object.keys(scores).sort(
      (a, b) => (scores[b].total ?? 0) - (scores[a].total ?? 0)
    );

    const header = [
      'Rank',
      'Player',
      `Person Name (${letter})`,
      'Name Pts',
      `Place (${letter})`,
      'Place Pts',
      `Animal (${letter})`,
      'Animal Pts',
      `Object / Thing (${letter})`,
      'Thing Pts',
      'Round Total',
    ];

    const dataRows = sortedIds.map((pid, idx) => {
      const s = scores[pid];
      const a = answers[pid] || {};
      return [
        idx + 1,
        s.playerName || pid,
        a.name  || '',
        s.breakdown?.name  ?? 0,
        a.place || '',
        s.breakdown?.place ?? 0,
        a.animal || '',
        s.breakdown?.animal ?? 0,
        a.thing || '',
        s.breakdown?.thing ?? 0,
        s.total ?? 0,
      ];
    });

    const sheetRows = [header, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    _styleHeaderRow(ws, header.length);
    _autoWidth(ws, sheetRows);

    // Sheet name max 31 chars (Excel limit)
    const sheetName = `Round ${roundNumber} (${letter})`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // ── 3. Trigger download ──────────────────────────────────────────────────
  const filename = `WordWar_Room${roomId}_FullResults.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Bold the first row of a sheet */
function _styleHeaderRow(ws, colCount) {
  for (let c = 0; c < colCount; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: '1E293B' } },
    };
  }
}

/** Set column widths based on the longest value in each column */
function _autoWidth(ws, rows) {
  const colWidths = rows[0].map((_, colIdx) =>
    Math.min(
      40,
      Math.max(10, ...rows.map((row) => String(row[colIdx] ?? '').length + 2))
    )
  );
  ws['!cols'] = colWidths.map((w) => ({ wch: w }));
}
