---
document: business_context
product: MoltiAI Enterprise AI Workspace
owner: 瞬影科技 MoltiAI
status: v1
updated: 2026-08-13
---

# Business context

MoltiAI is a closed-loop B2B sales and delivery workspace for Taiwan enterprises. It combines customer development, enterprise AI consulting, training, software licensing, content strategy, and AI video workflows in one workspace.

## Product boundaries

- `moltiai.com` (Wix) is the public marketing, content, course, and lead-entry surface.
- `molti-ai-drab.vercel.app` is the authenticated operating workspace.
- The application must not become a second public marketing website.
- External email sending, financial transactions, discounts, formal quotes, legal conclusions, and publication always require human approval.
- n8n is not part of the architecture.

## Commercial offers

| offer_id | offer | primary evidence |
|---|---|---|
| content_growth | AI 內容成長系統 | active content, weak video/CTA, multiple locations/brands, expansion |
| ai_transformation | 企業 AI 導入 | 20–300 employees, AI/digital-transformation signal, hiring, document/process load |
| software | Wondershare 企業授權 | education/IT/procurement context, multiple seats, existing customer |

## Funnel

`Wix lead → workspace intake → hard filter → multi-score → AI qualification → research → contact → reply → meeting → proposal → won/lost → onboarding → delivery → renewal`

## V1 success criteria

- A user can enter a workspace and only load records with the same `workspaceId`.
- A lead can complete the full funnel without leaving the Sales OS, except for approved external actions such as Gmail compose or booking.
- Every material state change creates an audit event.
- Existing Agent and Video Factory modules continue to work.

## Current limitation

V1 authentication and persistence are browser-scoped because the existing project had no Auth or database. This is suitable for validating workflow and UI, not for production security or cross-device collaboration. The storage contract is deliberately workspace-scoped so it can be replaced by server Auth + Postgres without changing the business model.

## Wix handoff

Use this CTA/form destination in Wix:

`https://molti-ai-drab.vercel.app/?source=wix&intake=1`

After sign-in, this opens Lead & Sales and the prospect-intake form. Do not embed private Sales OS records in Wix.
