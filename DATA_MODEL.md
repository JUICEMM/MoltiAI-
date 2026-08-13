---
document: data_model
storage_v1: browser_local_storage
target_storage: postgres
tenant_key: workspace_id
---

# Data model

## Tenant rule

Every business record has a non-null `workspace_id`. Reads and writes must derive the workspace from the authenticated session; clients must never be allowed to choose another workspace ID.

## Entities

```yaml
workspace:
  id: string
  name: string
  created_at: datetime
user:
  id: string
  email: string
workspace_membership:
  workspace_id: string
  user_id: string
  role: owner|admin|member|viewer
lead:
  id: string
  workspace_id: string
  company: string
  website: string
  industry: string
  employee_band: string
  source: string
  stage: new|qualified|research|contacted|replied|meeting|proposal|won|lost
  reply_intent: UNCLASSIFIED|HOT|WARM|LATER|NO
  content_score: integer
  ai_transformation_score: integer
  software_score: integer
  overall_score: integer
  best_offer: string
  qualified: boolean
  disqualified_reason: string
contact:
  lead_id: string
  name: string
  title: string
  email: string
  phone: string
research:
  lead_id: string
  summary: text
  qualification: text
outreach_draft:
  lead_id: string
  subject: string
  body: text
  approval_status: draft|approved|sent
follow_up:
  lead_id: string
  day: 3|7|14
  due_at: datetime
  status: pending|done|cancelled
proposal:
  lead_id: string
  amount: decimal
  status: not_started|draft|sent|accepted|declined
milestone:
  lead_id: string
  label: string
  due_at: datetime
  done: boolean
audit_event:
  id: string
  workspace_id: string
  actor_user_id: string
  action: string
  detail: text
  created_at: datetime
```

## V1 browser keys

- Session: `moltiai:workspace-session:v1`
- Local access-code verifier: `moltiai:workspace-verifiers:v1`
- Sales data: `moltiai:sales-os:v1:{workspaceId}`
- Agent runs: `moltiai-agent-runs:{workspaceId}`

The access-code verifier is a local SHA-256 check, not server authentication. It must not be described as enterprise security.
