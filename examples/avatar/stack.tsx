import { AvatarStack } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Stack" }

export default function Stack() {
  return (
    <AvatarStack
      max={4}
      people={[
        { name: "Sarah Chen" },
        { name: "Eli Wong" },
        { name: "Jo Cruz" },
        { name: "Lena Fox" },
        { name: "Mo Ali" },
        { name: "Ana Diaz" },
      ]}
    />
  )
}
