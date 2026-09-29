import { useMemo, useState } from 'react'

export function usePagination({ totalItems, pageSize = 10, initialPage = 1 }) {
  const [page, setPage] = useState(initialPage)

  const totalPages = useMemo(
    () => Math.ceil(totalItems / pageSize),
    [totalItems, pageSize],
  )

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      totalPages,
      startIndex: (page - 1) * pageSize,
      endIndex: Math.min(page * pageSize, totalItems),
    }),
    [page, pageSize, totalPages, totalItems],
  )

  return { ...pagination, setPage }
}
