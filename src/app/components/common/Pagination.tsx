import { useEffect, useMemo, useState } from 'react';

/** Hook phân trang dùng chung cho mọi danh sách dài trong app.
 * - items: mảng đã lọc/sắp xếp sẵn.
 * - pageSize: số mục mỗi trang.
 * - resetKey: khi giá trị này đổi (vd bộ lọc, từ khóa tìm) → tự về trang đầu.
 * Trả về pageItems để .map, cùng thông tin trang để render <Pager />. */
export function usePagination<T>(items: T[], pageSize = 20, resetKey?: unknown) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [resetKey]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => items.slice(pageSafe * pageSize, pageSafe * pageSize + pageSize),
    [items, pageSafe, pageSize]
  );

  return {
    page: pageSafe,
    setPage,
    pageItems,
    totalPages,
    total,
    from: total === 0 ? 0 : pageSafe * pageSize + 1,
    to: Math.min((pageSafe + 1) * pageSize, total),
  };
}

interface PagerProps {
  page: number;          // trang hiện tại (0-based)
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPage: (updater: (p: number) => number) => void;
  unit?: string;         // đơn vị hiển thị: "đơn", "khách", "phiếu"...
  className?: string;
}

/** Thanh phân trang: "x–y / N đơn" + ‹ Trước / Trang a/b / Sau ›. Chỉ hiện khi có >1 trang. */
export function Pager({ page, totalPages, total, from, to, onPage, unit = 'mục', className = '' }: PagerProps) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between gap-2 flex-wrap py-3 text-sm ${className}`}>
      <span className="text-gray-400">{from}–{to} / {total} {unit}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40 hover:bg-gray-50"
        >
          ‹ Trước
        </button>
        <span className="px-2 text-gray-600">Trang {page + 1}/{totalPages}</span>
        <button
          type="button"
          onClick={() => onPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40 hover:bg-gray-50"
        >
          Sau ›
        </button>
      </div>
    </div>
  );
}
