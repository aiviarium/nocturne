// The dialog that makes an issue: title, project, priority and a description. A form with input does not close on
// a click outside it.
import { Button, Dialog, Select, TextArea, TextField, toast } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { type Issue, PRIORITY_LABEL, type Priority, projects } from "../../data"
import { addIssue } from "./data"

export function NewIssueDialog(props: {
  open: boolean
  project: string
  onClose: () => void
  onCreated: (issue: Issue) => void
}) {
  const [title, setTitle] = createSignal("")
  const [project, setProject] = createSignal<string>()
  const [priority, setPriority] = createSignal<Priority>("medium")
  const [description, setDescription] = createSignal("")
  const [tried, setTried] = createSignal(false)
  let titleInput: HTMLInputElement | undefined

  const reset = () => {
    setTitle("")
    setProject(undefined)
    setPriority("medium")
    setDescription("")
    setTried(false)
  }
  const close = () => {
    reset()
    props.onClose()
  }
  const create = () => {
    setTried(true)
    if (!title().trim()) {
      titleInput?.focus()
      return
    }
    const issue = addIssue({
      project: project() ?? props.project,
      title: title().trim(),
      priority: priority(),
      description: description().trim(),
    })
    toast({
      title: `Created ${issue.key}`,
      description: issue.title,
      tone: "success",
    })
    close()
    props.onCreated(issue)
  }

  return (
    <Dialog
      open={props.open}
      onClose={close}
      title="New issue"
      size="md"
      closeOnBackdrop={false}
      initialFocus={() => titleInput}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create}>
            Create issue
          </Button>
        </>
      }
    >
      <form
        class="dm-col"
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
      >
        <TextField
          label="Title"
          placeholder="What needs doing?"
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          error={tried() && !title().trim() ? "An issue needs a title" : undefined}
          inputRef={(el) => {
            titleInput = el
          }}
        />
        <div class="dm-build-pair">
          <Select
            label="Project"
            options={projects().map((p) => ({ value: p.id, label: p.name }))}
            value={project() ?? props.project}
            onChange={setProject}
          />
          <Select<Priority>
            label="Priority"
            options={(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({
              value: p,
              label: PRIORITY_LABEL[p],
            }))}
            value={priority()}
            onChange={setPriority}
          />
        </div>
        <TextArea
          label="Description"
          rows={4}
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
      </form>
    </Dialog>
  )
}
