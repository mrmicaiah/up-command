# Handoff System

The Handoff system enables a dual-chat workflow for AI-assisted task execution.

## Concept

**Manager Chat:** Plans work, creates tasks, reviews results  
**Worker Chat:** Claims tasks, executes work, reports completion

This separation allows:
- Clear task definitions
- Autonomous execution
- Detailed output tracking
- Quality control

## Workflow

### 1. Manager Creates Task

```
handoff_create_task
  instruction: "Create landing page for Proverbs Library"
  context: "Use Tailwind CSS, include hero section, email signup form"
  project_name: "Proverbs Library Launch"
  priority: high
  estimated_complexity: moderate
```

### 2. Worker Claims Task

```
handoff_get_next_task
```

Automatically claims highest-priority pending task.

### 3. Worker Executes

Worker does the actual work:
- Creates files
- Saves to GitHub or Drive
- Tests and validates

### 4. Worker Reports Completion

```
handoff_complete_task
  task_id: TASK-abc123
  output_summary: "Created responsive landing page with hero, signup form, quiz preview"
  output_location: github
  files_created: ["index.html", "styles.css"]
  github_repo: "mrmicaiah/proverbs-library"
  github_paths: ["landing/index.html", "landing/styles.css"]
  worker_notes: "Used Tailwind CDN. Form submits to Courier API."
```

### 5. Manager Reviews

```
handoff_get_results
  project_name: "Proverbs Library Launch"
```

Manager sees completed work and can create follow-up tasks.

## Task States

| Status | Description |
|--------|-------------|
| `pending` | Created, awaiting claim |
| `claimed` | Worker has taken task |
| `in_progress` | Work actively happening |
| `complete` | Finished with outputs |
| `blocked` | Can't proceed, needs input |

## Manager Tools

- `handoff_create_task` - Create new task
- `handoff_view_queue` - See all tasks
- `handoff_get_results` - Review completed work
- `handoff_project_status` - Project overview
- `handoff_update_task` - Modify task details

## Worker Tools

- `handoff_get_next_task` - Claim next task
- `handoff_get_task` - Get specific task
- `handoff_complete_task` - Report completion
- `handoff_block_task` - Mark as blocked
- `handoff_update_progress` - Status update
- `handoff_my_tasks` - View claimed tasks

## Best Practices

### For Managers
- Write clear, actionable instructions
- Include all necessary context
- Set appropriate priority
- Review results promptly

### For Workers
- Claim one task at a time
- Update progress on long tasks
- Block early if missing info
- Document thoroughly

## Output Locations

| Location | Use For |
|----------|--------|
| `github` | Code, configs, documentation |
| `drive` | Documents, designs, media |
| `both` | Mixed outputs |
| `local` | Temporary/testing only |