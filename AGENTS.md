---
document: agent_instructions
applies_to: repository
---

# MoltiAI repository instructions

## Objective

Maintain MoltiAI as one multi-tenant Enterprise AI Workspace with an integrated closed-loop Sales OS. Preserve existing Agent Organization and Video Factory functionality. Do not split Sales OS into a new project and do not introduce n8n.

## Architecture constraints

- Frontend: React + Vite in the existing root build.
- Server functions: existing Vercel Functions under `api/` and mirrored application handlers where required.
- Every customer-owned record must carry and be queried by `workspaceId` / `workspace_id`.
- Never trust a client-provided workspace ID in the future server implementation; derive it from the authenticated session.
- Keep external side effects behind human approval.
- Wix remains public marketing and lead entry only.

## Current V1 truth

- The original repository had no Auth provider or database.
- V1 uses browser-scoped session verification and workspace-keyed local storage to validate the workflow.
- Do not claim this is secure server authentication, cross-device persistence, or production tenant isolation.
- Before a production customer launch, implement server Auth, Postgres, membership authorization, and workspace-filtered APIs.

## Required checks

1. Type-check `MoltiAI-/apps/web/tsconfig.json`.
2. Build the root Vite application.
3. Verify sign-in, Sales OS, Agent, and Video Factory navigation.
4. Verify one lead through qualification, research, draft, follow-up, reply intent, proposal, won, and delivery.
5. Confirm no console errors and preserve `/api/agents/run` behavior.

## Data guardrails

AI must not invent company facts, contacts, revenue, replies, meetings, proposal acceptance, or delivery completion. Research output distinguishes facts, assumptions, and missing data. Email sending, booking, quoting, publishing, payment, and legal decisions remain human actions.
