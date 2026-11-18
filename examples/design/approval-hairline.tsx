import { ApprovalCard } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The state is a dot and a word",
  verdict: "do",
  note: "An approval card keeps the hairline edge of every card.",
}

export default function ApprovalHairline() {
  return (
    <ApprovalCard
      summary="Edit 2 files and delete 1"
      items={["src/hooks/useTasks.ts", "src/hooks/legacy.ts (delete)"]}
      onAllow={() => {}}
      onDeny={() => {}}
    />
  )
}
