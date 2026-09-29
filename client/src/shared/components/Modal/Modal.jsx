function Modal({ open, title, onClose, children }) {
  if (!open) return null

  return (
    <div>
      <div>
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
      <div>{children}</div>
    </div>
  )
}

export default Modal
