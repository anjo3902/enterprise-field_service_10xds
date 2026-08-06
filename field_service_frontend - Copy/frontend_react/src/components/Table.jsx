import { memo, useCallback, useMemo, useRef } from 'react'
import { List } from 'react-window'

const ROW_HEIGHT = 48
const VIRTUALIZE_THRESHOLD = 50

function Table({ columns = [], rows = [], emptyText = 'No data found' }) {
  const containerRef = useRef(null)

  const renderCell = useCallback(
    (col, row) => (col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'),
    []
  )

  const getColumnClassName = useCallback((col, baseClassName = '') => {
    const isActionsCol = String(col.key || '').toLowerCase() === 'actions'
    return `${baseClassName} ${isActionsCol ? 'min-w-[220px] w-[220px] whitespace-nowrap' : 'break-words'}`.trim()
  }, [])

  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD

  // Memoize the virtualised row renderer to prevent re-creation on each render
  const VirtualRow = useMemo(
    () =>
      function VRow({ index, style }) {
        const row = rows[index]
        return (
          <div
            style={style}
            role='row'
            className={`flex items-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                role='cell'
                className={getColumnClassName(col, 'min-w-0 px-4 py-3 align-top text-primary text-sm flex-1 truncate')}
              >
                {renderCell(col, row)}
              </div>
            ))}
          </div>
        )
      },
    [rows, columns, getColumnClassName, renderCell]
  )

  return (
    <div className='w-full max-w-full rounded-lg border border-gray-200 bg-white'>
      {/* Desktop view */}
      <div className='hidden overflow-x-auto md:block'>
        <div className={shouldVirtualize ? '' : 'max-h-[70vh] overflow-auto'}>
          {shouldVirtualize ? (
            // Virtualised: header + react-window list
            <div ref={containerRef} className='min-w-[960px]' role='table' aria-label='Data table'>
              {/* Sticky header */}
              <div className='flex border-b border-gray-200 bg-gray-50' role='row'>
                {columns.map((col) => (
                  <div
                    key={col.key}
                    role='columnheader'
                    className={getColumnClassName(
                      col,
                      'px-4 py-3 font-semibold text-primary text-sm flex-1'
                    )}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
              <List
                height={Math.min(rows.length * ROW_HEIGHT, 560)}
                itemCount={rows.length}
                itemSize={ROW_HEIGHT}
                width='100%'
                overscanCount={5}
              >
                {VirtualRow}
              </List>
            </div>
          ) : (
            // Standard table for small datasets
            <table className='w-full min-w-[960px] table-auto text-sm'>
              <thead className='text-left'>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={getColumnClassName(
                        col,
                        'sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 align-top font-semibold text-primary'
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {rows.length === 0 ? (
                  <tr>
                    <td className='px-4 py-6 text-secondary' colSpan={Math.max(columns.length, 1)}>
                      {emptyText}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.id || idx}>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={getColumnClassName(col, 'min-w-0 px-4 py-3 align-top text-primary')}
                        >
                          {renderCell(col, row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mobile card view (never virtualised — card layout not suited for fixed-height rows) */}
      <div className='md:hidden'>
        {rows.length === 0 ? (
          <div className='px-4 py-6 text-secondary text-sm'>{emptyText}</div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {rows.map((row, idx) => (
              <article key={row.id || idx} className='p-4 bg-white'>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {columns.map((col) => (
                    <div key={col.key} className='min-w-0'>
                      <p className='text-xs font-medium leading-snug text-secondary'>
                        {col.label}
                      </p>
                      <div className='mt-1.5 min-w-0 break-words text-[0.95rem] text-primary'>
                        {renderCell(col, row)}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(Table)
