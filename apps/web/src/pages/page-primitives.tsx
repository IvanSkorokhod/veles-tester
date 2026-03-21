import type { PropsWithChildren, ReactNode } from "react";

export interface PageDefinition {
  title: string;
  description: string;
}

export interface MetricCardProps {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
  helper: string;
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface PlaceholderStatusItem {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  helper: string;
}

export function PageLayout({
  title,
  description,
  children,
  actions
}: PropsWithChildren<PageDefinition & { actions?: ReactNode }>) {
  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function SectionCard({
  title,
  description,
  children,
  eyebrow
}: PropsWithChildren<{ title: string; description?: string; eyebrow?: string }>) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          {eyebrow ? <p className="panel__eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ label, value, tone = "default", helper }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      <p className="metric-card__helper">{helper}</p>
    </article>
  );
}

export function TablePlaceholder({
  columns,
  title,
  description
}: {
  columns: TableColumn[];
  title: string;
  description: string;
}) {
  return (
    <div className="table-card">
      <div className="table-card__header">
        <h3>{title}</h3>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="data-table__empty" colSpan={columns.length}>
                <strong>No records yet.</strong>
                <span>{description}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlaceholderStatusList({
  items,
  label,
  title,
  footer
}: {
  items: PlaceholderStatusItem[];
  label: string;
  title: string;
  footer?: string;
}) {
  return (
    <div className="status-card">
      <div className="status-card__header">
        <h3>{title}</h3>
        <span className="status-badge">{label}</span>
      </div>
      <div className="status-list">
        {items.map((item) => (
          <article className="status-list__item" key={item.label}>
            <div>
              <p className="status-list__label">{item.label}</p>
              <p className="status-list__helper">{item.helper}</p>
            </div>
            <span className={`status-chip status-chip--${item.tone ?? "default"}`}>{item.value}</span>
          </article>
        ))}
      </div>
      {footer ? <p className="status-card__footer">{footer}</p> : null}
    </div>
  );
}
