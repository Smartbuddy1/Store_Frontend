export default function RequiredMark() {
  return <span className="required-mark" aria-hidden="true">*</span>;
}

export function RequiredField({ children, style }) {
  return (
    <div className="required-field" style={style}>
      {children}
      <RequiredMark />
    </div>
  );
}
