# Test Note - Various TODO Formats

This note contains various formats of TODO items for testing the Query TODO plugin.

## Metalist Style TODOs (Main Supported Format)

### Open TODOs with Category
- [ ] @work Task 1: Review pull requests
- [ ] @personal Task 2: Buy groceries  
- [ ] @study Task 3: Read TypeScript documentation

### Open TODOs with Tags
- [ ] +urgent Task 4: Fix critical bug
- [ ] +important +review Task 5: Code review for feature X
- [ ] +low-priority Task 6: Update documentation

### Open TODOs with Due Dates
- [ ] //2026-02-15 Task 7: Submit monthly report
- [ ] //2026-02-20 Task 8: Attend team meeting
- [ ] //2026-03-01 Task 9: Q1 planning session

### Open TODOs with Combinations
- [ ] @work +urgent //2026-02-12 Task 10: Deploy hotfix to production
- [ ] @personal +important //2026-02-14 Task 11: Birthday gift shopping
- [ ] @study +review //2026-02-25 Task 12: Prepare for exam

### Completed TODOs
- [x] @work Task 13: Morning standup (completed)
- [x] @personal +urgent //2026-02-10 Task 14: Pay electricity bill (completed)
- [x] @study +review Task 15: Watch tutorial video (completed)

### TODOs without Category/Tags/Date (Unassigned)
- [ ] Task 16: General task without metadata
- [ ] Task 17: Another simple task
- [x] Task 18: Completed simple task

## Link Style TODOs (Alternative Format)

[TODO](work) Task 19: Review architecture design
[TODO](personal) Task 20: Call dentist for appointment
[DONE](work) Task 21: Submit weekly report (completed)
[TODO](study) Task 22: Practice coding challenges

## Plain List Style TODOs (Basic Format)

- [ ] Task 23: Basic checkbox task
- [ ] Task 24: Another checkbox task
- [x] Task 25: Completed checkbox task

## Mixed Content

Some regular text here.

- [ ] @project-alpha +critical //2026-02-11 Task 26: Critical bug in login flow
- Regular list item (not a TODO)
- [ ] @project-beta +enhancement Task 27: Add dark mode support

More regular text.

- [x] @meeting //2026-02-09 Task 28: Team retrospective (completed yesterday)

## Edge Cases

### Multiple Tags
- [ ] +tag1 +tag2 +tag3 +tag4 Task 29: Task with many tags

### Long Content
- [ ] @documentation +writing //2026-02-28 Task 30: Write comprehensive guide for new developers covering installation, setup, architecture overview, coding standards, testing procedures, and deployment process

### Special Characters
- [ ] @work Task 31: Fix issue #123 - Handle special chars like @, +, //
- [ ] @personal Task 32: Buy items: eggs, milk & bread

### Unicode and Emoji
- [ ] @fun +weekend Task 33: Plan 🎉 party for team 🎊
- [ ] @work Task 34: 审核中文文档 (Review Chinese documentation)

### Nested Lists (Description)
- [ ] @project +feature //2026-02-18 Task 35: Implement user authentication
  - Sub-item 1: Design database schema
  - Sub-item 2: Create API endpoints
  - Sub-item 3: Add frontend forms

## Summary

This test note contains **35 TODO items** in various formats:
- Metalist style (main format): ~28 items
- Link style: 4 items  
- Plain list style: 3 items

Status breakdown:
- Open TODOs: ~28 items
- Completed TODOs: ~7 items

Categories: work, personal, study, project-alpha, project-beta, meeting, documentation, fun
Tags: urgent, important, review, low-priority, critical, enhancement, tag1-4, weekend, feature
