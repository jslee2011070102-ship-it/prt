import React, { useState } from 'react'
import useStore from '../store'

export default function EditableTable({ products }) {
  const { updateProduct, addNewProduct } = useStore()
  const [editingCell, setEditingCell] = useState(null)

  const handleCellChange = (rowIdx, field, value) => {
    const product = products[rowIdx]
    let parsedValue = value

    // 숫자 필드 파싱
    if (['rank', 'price', 'review_count', 'sales_estimate', 'revenue_estimate'].includes(field)) {
      parsedValue = value === '' ? null : parseInt(value)
    } else if (['rating', 'price_per_100ml'].includes(field)) {
      parsedValue = value === '' ? null : parseFloat(value)
    }

    const updatedProduct = { ...product, [field]: parsedValue }

    // sales_estimate가 변경되면 revenue_estimate 재계산 (판매량 × 판매가 × 2)
    if (field === 'sales_estimate' && updatedProduct.price) {
      updatedProduct.revenue_estimate = parsedValue
        ? Math.round(updatedProduct.price * parsedValue * 2)
        : null
    }

    // price가 변경되면 revenue_estimate 재계산
    if (field === 'price' && updatedProduct.sales_estimate) {
      updatedProduct.revenue_estimate = Math.round(parsedValue * updatedProduct.sales_estimate * 2)
    }

    updateProduct(rowIdx, updatedProduct)
  }

  const renderCell = (product, rowIdx, field) => {
    const value = product[field]
    const isEditing = editingCell === `${rowIdx}-${field}`

    // 단위당 단가: 값과 라벨을 함께 표시 (읽기 전용)
    if (field === 'price_per_100ml') {
      const label = product.unit_price_label || ''
      return (
        <div className="px-2 py-1 text-sm bg-gray-50 text-gray-700 rounded whitespace-nowrap">
          {value ? `${value.toLocaleString()}원${label ? ` (${label})` : ''}` : '-'}
        </div>
      )
    }

    // 추정매출 (읽기 전용)
    if (field === 'revenue_estimate') {
      return (
        <div className="px-2 py-1 text-sm bg-gray-50 text-gray-700 rounded whitespace-nowrap">
          {value ? `${value.toLocaleString()}원` : '-'}
        </div>
      )
    }

    // 일반 입력 필드 (form_type도 자유 텍스트 입력)
    if (isEditing) {
      return (
        <input
          type={['rank', 'price', 'review_count', 'sales_estimate'].includes(field) ? 'number' : 'text'}
          value={value || ''}
          onChange={(e) => handleCellChange(rowIdx, field, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setEditingCell(null)
            if (e.key === 'Escape') setEditingCell(null)
          }}
          autoFocus
          className="w-full px-2 py-1 border border-primary-500 rounded text-sm"
        />
      )
    }

    return (
      <div
        onClick={() => setEditingCell(`${rowIdx}-${field}`)}
        className="px-2 py-1 text-sm cursor-pointer hover:bg-blue-50 rounded"
      >
        {value !== null && value !== undefined
          ? (typeof value === 'number' ? value.toLocaleString() : value)
          : '-'}
      </div>
    )
  }

  const columns = [
    { key: 'rank', label: '순위' },
    { key: 'name', label: '상품명' },
    { key: 'brand', label: '브랜드' },
    { key: 'price', label: '판매가' },
    { key: 'volume_text', label: '용량' },
    { key: 'price_per_100ml', label: '단위당' },
    { key: 'review_count', label: '리뷰수' },
    { key: 'rating', label: '평점' },
    { key: 'sales_text', label: '판매량' },
    { key: 'form_type', label: '형태' },
    { key: 'revenue_estimate', label: '추정매출' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col) => (
                <td key={`${rowIdx}-${col.key}`} className="min-w-max">
                  {renderCell(product, rowIdx, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex gap-2">
        <button onClick={addNewProduct} className="btn-secondary btn-small">
          + 행 추가
        </button>
      </div>
    </div>
  )
}
