// Sample data shared by several examples. The examples import it so each file stays about one part.
import type { ComposerItem, MenuEntry } from "@aiviarium/nocturne"

export const ISSUE_MENU: MenuEntry[] = [
  { id: "assign", label: "Assign to…", icon: "user", shortcut: "A" },
  { id: "label", label: "Add label", icon: "tag", shortcut: "L" },
  { id: "due", label: "Set due date", icon: "calendar", shortcut: "D" },
  { id: "link", label: "Copy link", icon: "link", shortcut: "Ctrl L" },
  { type: "separator" },
  { id: "archive", label: "Archive", icon: "archive", shortcut: "E" },
  { id: "delete", label: "Delete", icon: "trash", shortcut: "⌫", danger: true },
]

export const COMMANDS: ComposerItem[] = [
  {
    id: "review",
    label: "review",
    description: "Review the current changes",
    icon: "branch",
    meta: "Ctrl R",
    group: "Workspace",
  },
  {
    id: "refactor",
    label: "refactor",
    description: "Restructure the selected code",
    icon: "layers",
    group: "Workspace",
  },
  {
    id: "reproduce",
    label: "reproduce",
    description: "Write a failing test for a bug",
    icon: "bolt",
    group: "Workspace",
  },
  {
    id: "research",
    label: "research",
    description: "Research a question across sources",
    icon: "search",
    group: "Workspace",
  },
  {
    id: "reset",
    label: "reset",
    description: "Clear the conversation",
    icon: "trash",
    meta: "Built-in",
    group: "Built-in",
  },
]

export const MENTIONS: ComposerItem[] = [
  {
    id: "f1",
    label: "useTasks.ts",
    description: "app/src/hooks",
    icon: "file",
    meta: "File",
    kind: "file",
    group: "Files",
  },
  {
    id: "f2",
    label: "useTasks.test.ts",
    description: "app/src/hooks",
    icon: "file",
    meta: "File",
    kind: "file",
    group: "Files",
  },
  {
    id: "f3",
    label: "users",
    description: "app/src/features",
    icon: "folder",
    meta: "Folder",
    kind: "folder",
    group: "Files",
  },
  {
    id: "d1",
    label: "User research notes",
    description: "Edited yesterday",
    icon: "file",
    meta: "Doc",
    kind: "doc",
    group: "Docs",
  },
  {
    id: "p1",
    label: "Sarah Chen",
    description: "sarah · Design",
    meta: "Person",
    kind: "person",
    group: "People",
  },
]

export const SKILLS: ComposerItem[] = [
  {
    id: "s1",
    label: "release-notes",
    description: "Turn merged changes into notes",
    icon: "list",
    meta: "Team",
    group: "Team",
  },
  {
    id: "s2",
    label: "report-weekly",
    description: "Weekly metrics summary",
    icon: "chart",
    meta: "Team",
    group: "Team",
  },
  {
    id: "s3",
    label: "review-style",
    description: "Check copy against the style guide",
    icon: "file",
    meta: "Personal",
    group: "Personal",
  },
]

export const MODELS = [
  { id: "fable", label: "Fable 5.2", description: "Most capable, slower" },
  { id: "sonnet", label: "Sonnet 5.5", description: "Fast and balanced" },
  { id: "haiku", label: "Haiku 5.5", description: "Quickest, lowest cost" },
]

export const MODES = [
  { id: "ask", label: "Ask" },
  { id: "plan", label: "Plan" },
  { id: "edit", label: "Edit" },
]

/** Agent sessions, as an agents view lists them. */
export const SESSIONS = [
  {
    id: "s1",
    title: "Fix the sign-in redirect loop behind a proxy",
    where: "Coding agent · local",
    when: "4m",
    state: "warn" as const,
    word: "Needs you",
  },
  {
    id: "s2",
    title: "Add a test for the task list",
    where: "Coding agent · build-01",
    when: "12m",
    state: "ai" as const,
    word: "Working",
  },
  {
    id: "s3",
    title: "Profile the activity page",
    where: "Review agent · local",
    when: "1h",
    state: "ok" as const,
    word: "Done",
  },
]

/** Many jobs, for long lists. */
export const JOBS = Array.from({ length: 400 }, (_, i) => ({
  id: `job-${i}`,
  title: `Sync a repository #${400 - i}`,
  when: `${i + 1}m`,
}))

/** Notifications of the phone inbox. */
export const MAIL = [
  { id: "1", who: "Bo", text: "Bo mentioned you in Launch plan", kind: "Mention" },
  { id: "2", who: "Coding agent", text: "Create or overwrite src/callback.js", kind: "Approval" },
  { id: "3", who: "Ann", text: "Ann assigned you WEB-41", kind: "Assignment" },
  { id: "4", who: "Jobs", text: "Nightly backup failed", kind: "Job failed" },
]

/** Open issues per day over the last three weeks, for sparklines. */
export const OPEN_ISSUES = [
  61, 58, 60, 57, 55, 56, 53, 54, 52, 50, 51, 49, 48, 50, 47, 46, 45, 47, 44, 43, 42,
]

/** Requests per minute over the last hour, for sparklines. */
export const REQUESTS = [
  18, 22, 20, 28, 31, 26, 35, 40, 38, 44, 41, 52, 49, 58, 54, 63, 60, 68, 72, 66, 74, 80, 77, 85, 88, 82, 90,
  94, 91, 100,
]
