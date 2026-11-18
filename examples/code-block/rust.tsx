import { CodeBlock } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Rust, starting at line 12", surface: "none" }

export default function RustBlock() {
  return (
    <CodeBlock
      title="server.rs"
      language="rust"
      startLine={12}
      code={`pub fn listen(&self) -> Result<()> {\n    let addr = self.config.listen.as_str();\n    let socket = TcpListener::bind(addr)?;\n    Ok(())\n}`}
    />
  )
}
