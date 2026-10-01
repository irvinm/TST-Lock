---
name: checkin
description: "Review modified code changes in the current project and generate a clean plain-text GitHub checkin title and comment."
---

# GitHub Checkin Generator

Review the modified code changes in the current repository and generate two plain-text outputs strictly formatted for a GitHub checkin:
1. The title of the checkin (commit subject line)
2. The checkin comment (extended commit description covering all changes made)

## Procedure

1. **Inspect Repository Changes**:
   Run the following commands to inspect the full scope of changes:
   - Check status: `git status -s`
   - Check staged diff: `git diff --cached`
   - Check unstaged diff: `git diff`
   - If there are newly added or untracked files relevant to the current feature/fix, inspect their contents.

2. **Validate Changes**:
   - If there are no modified or staged changes, output:
     `No modified changes detected in the current repository.`
     and conclude immediately.

3. **Analyze Changes**:
   - Identify the primary intent and impact of the changes.
   - Choose the appropriate Conventional Commit type:
     - `feat`: A new feature or enhancement
     - `fix`: A bug fix
     - `refactor`: Code restructuring without behavior changes
     - `perf`: Performance improvements
     - `style`: Formatting, CSS, or UI presentation updates
     - `test`: Adding or updating test suites
     - `docs`: Documentation updates
     - `chore`: Build scripts, dependencies, or configuration updates
   - Identify the affected scope (e.g., `options`, `background`, `theme`, `ui`).

4. **Strict Output Requirements**:
   - **Only plain-text Git/GitHub commit formatting is allowed**.
   - Do NOT use Markdown formatting syntax in the checkin comment (do NOT use `#`, `##`, `###`, `**bold**`, or `*italic*`), because Git and GitHub render commit bodies as monospace plain text.
   - Do NOT include conversational filler, introductory pleasantries (e.g., "Here is your commit message"), or follow-up commentary.
   - Output must contain precisely the two sections formatted as follows:

### 1. Checkin Title
```text
<type>(<scope>): <concise imperative summary, max 72 characters, no trailing period>
```

### 2. Checkin Comment
```text
<High-level summary paragraph describing the purpose, context, and impact of the changes, wrapped at ~72 characters.>

Summary of Changes:
- <file or component>:
  - <Clear description of specific modification>
  - <Clear description of specific modification>
- <file or component>:
  - <Clear description of specific modification>

Details:
- <Additional context, rationale, or bug/issue references like Refs #123>
```
