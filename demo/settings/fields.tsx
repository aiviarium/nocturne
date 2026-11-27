// Settings › Issue fields: the custom fields every issue has, and how a value of each reads in a list.
import {
  type DataColumn,
  DataTable,
  FieldEmpty,
  type FieldSpec,
  FieldValue,
  type ShellViewProps,
  toast,
} from "@aiviarium/nocturne"
import { ISSUE_FIELDS } from "./data"
import { SettingsPage } from "./page"

type Row = (typeof ISSUE_FIELDS)[number]

const KIND: Partial<Record<FieldSpec["kind"], string>> = {
  enum: "Choice",
  text: "Text",
  currency: "Money",
  date: "Date",
  boolean: "Yes or no",
  tags: "Tags",
  number: "Number",
}

const COLUMNS: DataColumn<Row>[] = [
  { id: "title", header: "Field", accessor: (r) => r.spec.title },
  { id: "kind", header: "Kind", accessor: (r) => KIND[r.spec.kind] ?? r.spec.kind, width: "120px" },
  { id: "required", header: "Required", accessor: (r) => (r.spec.required ? "Required" : ""), width: "96px" },
  {
    id: "sample",
    header: "On WEB-142",
    accessor: (r) => String(r.sample ?? ""),
    cell: (r) =>
      r.sample === undefined ? <FieldEmpty /> : <FieldValue spec={r.spec} value={r.sample} compact />,
  },
]

export function FieldsView(_: ShellViewProps) {
  return (
    <SettingsPage
      id="fields"
      actions={[
        {
          id: "new",
          label: "New field",
          icon: "plus",
          onClick: () => toast({ title: "The demo's fields are fixed" }),
        },
      ]}
    >
      <DataTable label="Issue fields" rows={ISSUE_FIELDS} columns={COLUMNS} getRowId={(r) => r.spec.name} />
    </SettingsPage>
  )
}
