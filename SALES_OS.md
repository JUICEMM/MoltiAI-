---
document: sales_os_spec
version: 1
status: implemented
---

# MoltiAI Sales OS V1

## Modules

1. Prospect intake: company, website, industry, size, source, decision-maker, email, phone, buying signals.
2. Hard filters: opt-out and inactive businesses are excluded; missing contact data is flagged.
3. Multi-score: `content_score`, `ai_transformation_score`, `software_score`, and an operational `overall_score`.
4. Best-offer routing: highest product score selects content growth, enterprise AI, or software licensing.
5. AI qualification: A+/A/B/C tier, hard-filter reason, and next verification step.
6. Company research: a structured research Brief with explicit fact-check requirements.
7. Outreach: editable Gmail draft plus a Gmail compose handoff. Sending remains manual.
8. Follow-up: Day 3, 7, and 14 tasks generated inside the app.
9. Reply intent: `HOT`, `WARM`, `LATER`, `NO`, or `UNCLASSIFIED`.
10. Meeting and proposal: booking link, meeting state, quote amount, and proposal status.
11. Outcomes: won/lost, loss reason, onboarding, project handoff, milestones, and renewal date.
12. Dashboards and audit: pipeline counts, HOT replies, proposal count, won revenue, and immutable-style event records.

## Hard-filter rules

```json
{
  "optOut": {"result": "exclude", "reason": "明確拒絕聯絡 / 退訂"},
  "inactive": {"result": "exclude", "reason": "疑似停止營運"},
  "noContact": {"result": "nurture", "reason": "沒有可驗證聯絡方式"}
}
```

## Tier rules

| overall_score | tier | action |
|---:|---|---|
| 85–100 | A+ | human-grade research and personalized outreach |
| 70–84 | A | prioritized automated draft and Day 3/7/14 tasks |
| 50–69 | B | nurture until a buying signal appears |
| 0–49 | C | retain basic data; do not spend AI tokens |

## Human approvals

- Email is drafted in MoltiAI and opened in Gmail; the user sends it.
- Booking links open externally; the user confirms the meeting state.
- Quote amount and proposal state are human-owned.
- Won/lost is a deliberate user action.
- AI outputs may not invent revenue, contacts, reply intent, or company facts.

## Future server implementation

Replace browser storage with a server repository that enforces `workspace_id` on every query. Recommended order: Auth provider, Postgres schema, row-level authorization, encrypted integrations, background scheduler, Gmail OAuth, Calendar OAuth, then Wix webhook intake.
