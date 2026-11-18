import { CodeBlock } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Shell, no numbers", surface: "none" }

export default function ShellBlock() {
  return (
    <CodeBlock
      title="deploy"
      language="sh"
      lineNumbers={false}
      code={`# build and start the dev stack\ncd deploy\ndocker compose -f compose.dev.yml up -d\nexport APP_LISTEN=127.0.0.1:4790`}
    />
  )
}
