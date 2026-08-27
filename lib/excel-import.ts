import * as XLSX from 'xlsx';

export interface ImportedStudent {
  name: string;
  grade: string;
  parentPhone: string;
}

export interface ImportedGroup {
  groupName: string;
  students: ImportedStudent[];
}

export interface ImportError {
  sheet: string;
  row: number;
  reason: string;
}

export interface ImportResult {
  groups: ImportedGroup[];
  errors: ImportError[];
}

// Accepts a handful of common header spellings so the sheet doesn't have to match exactly.
const NAME_HEADERS = ['اسم الطالب', 'الاسم', 'اسم الطالبة', 'name', 'student name'];
const GRADE_HEADERS = ['المرحلة الدراسية', 'المرحلة', 'الصف', 'grade'];
const PHONE_HEADERS = ['رقم واتس ولي الأمر', 'رقم ولي الأمر', 'رقم واتساب ولي الأمر', 'واتساب ولي الأمر', 'رقم الهاتف', 'phone', 'whatsapp'];
const GROUP_HEADERS = ['اختيار المجموعة', 'اسم المجموعة', 'المجموعة', 'group', 'group name'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function findColumn(headerRow: string[], candidates: string[]): number {
  const normalizedCandidates = candidates.map(normalizeHeader);
  return headerRow.findIndex(h => normalizedCandidates.includes(normalizeHeader(h || '')));
}

/**
 * Parses an .xlsx workbook (as an ArrayBuffer) into groups of students.
 * Supports two layouts, and can mix them across sheets:
 *  - One sheet per group: the sheet name becomes the group name.
 *  - One sheet with a "group" column: each row is bucketed by that column's value.
 * If a sheet has both multiple rows AND a group column, the column wins per-row
 * (falls back to the sheet name for rows where the group column is empty).
 */
export function parseExcelWorkbook(buffer: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const groupsByName = new Map<string, ImportedStudent[]>();
  const errors: ImportError[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length === 0) return;

    const headerRow = (rows[0] || []).map((h: any) => String(h ?? ''));
    const nameCol = findColumn(headerRow, NAME_HEADERS);
    const gradeCol = findColumn(headerRow, GRADE_HEADERS);
    const phoneCol = findColumn(headerRow, PHONE_HEADERS);
    const groupCol = findColumn(headerRow, GROUP_HEADERS);

    if (nameCol === -1) {
      errors.push({ sheet: sheetName, row: 1, reason: 'لم يتم العثور على عمود "اسم الطالب" في هذا الشيت' });
      return;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => String(cell ?? '').trim() === '')) continue; // skip blank rows

      const name = String(row[nameCol] ?? '').trim();
      if (!name) {
        errors.push({ sheet: sheetName, row: i + 1, reason: 'اسم الطالب فارغ — تم تخطي الصف' });
        continue;
      }

      const grade = gradeCol !== -1 ? String(row[gradeCol] ?? '').trim() : '';
      const parentPhone = phoneCol !== -1 ? String(row[phoneCol] ?? '').trim() : '';
      const groupFromColumn = groupCol !== -1 ? String(row[groupCol] ?? '').trim() : '';
      const groupName = groupFromColumn || sheetName;

      if (!groupsByName.has(groupName)) groupsByName.set(groupName, []);
      groupsByName.get(groupName)!.push({ name, grade, parentPhone });
    }
  });

  const groups: ImportedGroup[] = Array.from(groupsByName.entries()).map(([groupName, students]) => ({
    groupName,
    students,
  }));

  return { groups, errors };
}
