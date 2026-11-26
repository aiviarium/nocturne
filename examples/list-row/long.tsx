import { ListRow, RowList, reorderItems } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { JOBS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Long lists",
  note: "400 rows: RowList renders only what is in view once a list passes 150 rows; give it a height. It still reorders: drag a row to the list's edge and it scrolls; the arrow keys, Page and Home and End move through every row.",
}

export default function LongList() {
  const [jobs, setJobs] = createSignal(JOBS)
  return (
    <div style={{ height: "240px", display: "flex" }}>
      <RowList
        label="Jobs"
        items={jobs()}
        getKey={(j) => j.id}
        onReorder={(from, to) => setJobs(reorderItems(jobs(), from, to))}
      >
        {(j) => <ListRow icon="activity" title={j.title} meta={j.when} onClick={() => {}} />}
      </RowList>
    </div>
  )
}
