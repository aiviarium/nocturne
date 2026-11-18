import { DiffView, Tabs } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "From a unified patch", surface: "none" }

const PATCH = `diff --git a/src/server.rs b/src/server.rs
--- a/src/server.rs
+++ b/src/server.rs
@@ -12,7 +12,8 @@ impl Server {
     pub fn listen(&self) -> Result<()> {
-        let addr = "0.0.0.0:4790";
+        let addr = self.config.listen.as_str();
+        tracing::info!(%addr, "listening");
         let socket = TcpListener::bind(addr)?;
         for stream in socket.incoming() {
             self.handle(stream?)?;
         }
@@ -40,3 +41,3 @@ impl Server {
     fn handle(&self, stream: TcpStream) -> Result<()> {
-        Ok(())
+        self.router.serve(stream)
     }
`

export default function PatchDiff() {
  const [mode, setMode] = createSignal<"split" | "unified">("split")
  return (
    <div class="ex-col">
      <Tabs
        label="Diff mode"
        items={[
          { id: "split", label: "Split" },
          { id: "unified", label: "Unified" },
        ]}
        value={mode()}
        onChange={(id) => setMode(id as "split" | "unified")}
      />
      <DiffView patch={PATCH} mode={mode()} />
    </div>
  )
}
