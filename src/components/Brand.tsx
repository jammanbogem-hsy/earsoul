interface BrandProps {
  compact?: boolean
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark__orbit brand-mark__orbit--one" />
        <span className="brand-mark__orbit brand-mark__orbit--two" />
        <span className="brand-mark__core">가</span>
      </span>
      <span className="brand-copy">
        <strong>배움별 굴리기</strong>
        {!compact && <small>굴리고, 발견하고, 한 뼘 더 자라요</small>}
      </span>
    </div>
  )
}
