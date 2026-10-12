import { useState, useRef, useEffect, useMemo } from 'react';
import type { PageSummary } from '../types';
import { formatNumber, shortUrl } from '../lib/format';

interface PageSelectProps {
  pages: PageSummary[];
  selectedUrl: string | undefined;
  onSelect: (url: string | undefined) => void;
  totalClicks?: number;
  disabled?: boolean;
}

export function PageSelect({
  pages,
  selectedUrl,
  onSelect,
  totalClicks,
  disabled = false,
}: PageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearch('');
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedPage = useMemo(
    () => pages.find((p) => p.pageUrl === selectedUrl),
    [pages, selectedUrl]
  );

  const filteredPages = useMemo(() => {
    if (!search.trim()) return pages;
    const query = search.trim().toLowerCase();
    return pages.filter((p) => p.pageUrl.toLowerCase().includes(query));
  }, [pages, search]);

  const totalPageClicks = useMemo(() => {
    if (totalClicks != null) return totalClicks;
    return pages.reduce((acc, p) => acc + (p.clickCount || 0), 0);
  }, [pages, totalClicks]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group flex items-center justify-between gap-2.5 rounded-md border border-hairline bg-surface-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-soft focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          } ${isOpen ? 'border-accent-blue ring-1 ring-accent-blue bg-surface-soft' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {/* Page icon */}
          <svg
            className="h-3.5 w-3.5 shrink-0 text-mute group-hover:text-ink transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>

          {/* Label & Details */}
          <div className="flex items-center gap-2 max-w-[16rem] sm:max-w-xs truncate">
            {selectedUrl ? (
              <>
                <span className="truncate font-medium text-ink" title={selectedUrl}>
                  {shortUrl(selectedUrl, 38)}
                </span>
                {selectedPage && (
                  <span className="shrink-0 rounded bg-surface-soft px-1.5 py-0.2 text-[10px] font-bold text-mute">
                    {formatNumber(selectedPage.clickCount)}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">All pages</span>
                <span className="shrink-0 rounded bg-surface-soft px-1.5 py-0.2 text-[10px] font-bold text-mute">
                  {formatNumber(totalPageClicks)}
                </span>
              </>
            )}
          </div>

          {/* Chevron Icon */}
          <svg
            className={`h-3 w-3 shrink-0 text-mute transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Quick Clear / Reset Button when specific page is active */}
        {selectedUrl && (
          <button
            type="button"
            title="Reset to all pages"
            onClick={() => onSelect(undefined)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-surface-card text-xs font-bold text-mute transition-colors hover:bg-surface-soft hover:text-ink focus:border-accent-blue focus:outline-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-md border border-hairline bg-surface-card shadow-xl overflow-hidden">
          {/* Search Box Header */}
          <div className="border-b border-hairline bg-surface-doc p-2">
            <div className="relative flex items-center">
              <svg
                className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-mute"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by URL or path…"
                className="w-full rounded border border-hairline bg-surface-card py-1.5 pl-8 pr-7 text-xs font-medium text-ink placeholder:text-ash focus:border-accent-blue focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-xs font-bold text-mute hover:text-ink"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <div className="max-h-64 overflow-y-auto p-1 divide-y divide-hairline-soft/40">
            {/* "All pages" Option */}
            {!search && (
              <button
                type="button"
                onClick={() => {
                  onSelect(undefined);
                  closeDropdown();
                }}
                className={`flex w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-xs transition-colors ${
                  !selectedUrl
                    ? 'bg-accent-blue-soft/60 text-link-blue font-bold'
                    : 'text-ink hover:bg-surface-soft font-medium'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      !selectedUrl ? 'bg-link-blue' : 'bg-mute'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="block truncate">All pages</span>
                    <span className="block text-[10px] text-mute font-normal">
                      Aggregate across entire site
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded bg-surface-soft px-1.5 py-0.5 text-[10px] font-bold text-mute">
                    {formatNumber(totalPageClicks)} clicks
                  </span>
                  {!selectedUrl && (
                    <svg
                      className="h-3.5 w-3.5 text-link-blue"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            )}

            {/* Filtered Pages */}
            {filteredPages.map((page) => {
              const isSelected = selectedUrl === page.pageUrl;
              return (
                <button
                  key={page.pageUrl}
                  type="button"
                  onClick={() => {
                    onSelect(page.pageUrl);
                    closeDropdown();
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-accent-blue-soft/60 text-link-blue font-bold'
                      : 'text-ink hover:bg-surface-soft font-medium'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-link-blue' : 'bg-ash'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[11px]" title={page.pageUrl}>
                        {formatUrlDisplay(page.pageUrl)}
                      </span>
                      <span className="block text-[10px] text-mute font-normal truncate">
                        {page.pageUrl}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded bg-surface-soft px-1.5 py-0.5 text-[10px] font-bold text-mute">
                      {formatNumber(page.clickCount)} clicks
                    </span>
                    {isSelected && (
                      <svg
                        className="h-3.5 w-3.5 text-link-blue"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Empty Search State */}
            {filteredPages.length === 0 && (
              <div className="py-6 text-center text-xs text-mute">
                <p>No pages match &ldquo;{search}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-1.5 text-link-blue underline hover:text-ink font-semibold"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Footer with page count summary */}
          <div className="flex items-center justify-between border-t border-hairline bg-surface-doc px-3 py-1.5 text-[10px] text-mute">
            <span>
              {filteredPages.length} of {pages.length} pages
            </span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pretty formats the pathname/URL for easy visual scanning */
function formatUrlDisplay(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname + (parsed.search || '') + (parsed.hash || '') || parsed.hostname;
  } catch {
    return shortUrl(rawUrl, 40);
  }
}
