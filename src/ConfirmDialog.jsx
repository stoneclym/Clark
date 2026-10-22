export default function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(20,18,14,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 18, padding: '22px 20px',
          maxWidth: 340, width: '100%', boxShadow: '0 12px 40px rgba(20,18,14,0.25)',
        }}
      >
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
          {title}
        </div>
        {body && (
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 8 }}>
            {body}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              background: 'var(--cardAlt)', color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              background: 'rgba(192,57,43,0.1)', color: '#C0392B',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
