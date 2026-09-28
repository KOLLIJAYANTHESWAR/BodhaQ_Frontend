/**
 * Page header with title and optional subtitle.
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  );
}
