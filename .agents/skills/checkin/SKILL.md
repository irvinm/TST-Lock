---
name: checkin
description: "Review modified code changes in the current project, update README.md and AMO.md if applicable, and generate a clean plain-text GitHub checkin title and comment."
---

# GitHub Checkin Generator

Review the modified code changes in the current repository, automatically update documentation (`README.md` and `AMO.md`) if user-facing functionality has changed, and generate clean outputs formatted for a GitHub checkin:
1. The title of the checkin (commit subject line)
2. The checkin comment (extended commit description covering both code and documentation updates)
3. Documentation sync summary (what was updated or verified in `README.md` and `AMO.md`)

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

3. **Documentation Sync (`README.md` & `AMO.md`)**:
   - Evaluate whether the changeset introduces or modifies user-facing functionality (e.g., keyboard shortcuts, mouse modifiers, options/settings UI, permissions, lock behavior, or visual presentation).
   - Review existing documentation in `README.md` and `AMO.md`:
     - **README.md**: Check if feature descriptions, toggle/usage instructions, settings explanations, or the Version History / Changelog section need updating.
     - **AMO.md**: Check if the short description, full description, feature list, or version details need updating to reflect the changes.
   - **Apply Documentation Edits**:
     - If updates are needed, edit `README.md` and/or `AMO.md` directly so the documentation changes are included in the pending checkin.
     - If documentation is already up to date in the diff, or the changes are purely internal (e.g., refactoring, internal tests, build tooling), leave the files as-is.

4. **Analyze All Changes**:
   - Re-check the full scope of changes (including any documentation updates made in step 3).
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
   - Identify the affected scope (e.g., `options`, `background`, `shortcuts`, `ui`).

5. **Strict Output Requirements**:
   - **Sections 1 and 2 must use plain-text Git/GitHub commit formatting**.
   - Do NOT use Markdown formatting syntax in the checkin comment (do NOT use `#`, `##`, `###`, `**bold**`, or `*italic*`), because Git and GitHub render commit bodies as monospace plain text.
   - Do NOT include conversational filler or pleasantries before Section 1.
   - Output must contain precisely the following sections:

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

### 3. Documentation Sync Summary
- **Status**: `[Updated]` | `[Already Up to Date]` | `[N/A - Internal Change]`
- **README.md**: <Brief note on changes applied or verified>
- **AMO.md**: <Brief note on changes applied or verified>

### 3. Documentation Sync Summary
- **Status**: `[Updated]` | `[Already Up to Date]` | `[N/A - Internal Change]`
- **README.md**: <Brief note on changes applied or verified>
- **AMO.md**: <Brief note on changes applied or verified>

