interface BrandProps {
  compact?: boolean
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark__orbit brand-mark__orbit--one" />
        <span className="brand-mark__orbit brand-mark__orbit--two" />
        <span className="brand-mark__core">런</span>
      </span>
      <span className="brand-copy">
        <strong>러닝크루 롤링</strong>
        {!compact && <small>굴리고, 모으고, 콤보를 이어가요</small>}
      </span>
    </div>
  )
}
