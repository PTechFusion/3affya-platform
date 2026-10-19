# 8. Intake chat

**Area:** Public · **Purpose:** Suggest a specialty, prefill introduction request · **Build:** M3 · **Task:** 3.12 · **In prototype (23 Oct):** Yes (static)

**Notes:** Light version of agent 12; no medical advice

## States to design

- Consent
- questions
- result
- fallback form
- model error

## Data shown

Concern, age group, language, visit type; 1 to 3 suggested specialties with doctors

## Layout call (phone first)

Full-height sheet over the page on phone, right-side panel on desktop. Bot message with scope, emergency line and Talk to a human pinned at the top. Quick-reply chips under each question; free-text box at the bottom. Result: three specialty cards each with two doctors. Above the fold: first question and chips. Hook: the result cards link straight to filtered search.

## Pointers

- Opening message: AI assistant, not a doctor, not a diagnosis, what it can do, local emergency number, Talk to a human always visible. `[I1 H14 Q6]`
- Quick replies for concern, age group, language, visit type; no date of birth or card in chat; back and I did not understand supported. `[I2 I5]`
- Output is 1 to 3 specialties with doctors, never a diagnosis or triage level; red-flag keywords end intake with emergency guidance. `[I3 I4]`
- Consent line before the first question; typing indicator under 1 s, step text if a reply takes longer. `[T3 L1]`

## Rules referenced

- **H14** (guideline) Show a not-for-emergencies line with the local emergency number for the viewer's country. _Evidence: DHA excludes emergencies from telehealth; HHS: 911 only works in the patient's location._ Source: Kayrouz UAE telehealth; HHS emergency plan <https://telehealth.hhs.gov/providers/preparing-patients-for-telehealth/creating-an-emergency-plan>
- **I1** (research) First message: this is an AI assistant, not a doctor; not a diagnosis; the 3 to 5 things it can do; emergency number for the viewer's country; persistent Talk to a human button. _Evidence: Users adjusted once they knew it was a bot; unclear scope left users stuck; AB 3030 human route; 60% uncomfortable with AI in their care._ Source: NN/g Chatbots; Duane Morris AB 3030; Pew 2023 <https://www.nngroup.com/articles/chatbots/>
- **I2** (research) Tappable quick replies for common answers alongside free text; tolerate typos; keep context across turns; allow going back; say I did not understand instead of guessing. _Evidence: Domino's re-asked an address; No dead-ended a Kia bot; users preferred honest failure._ Source: NN/g, The User Experience of Chatbots <https://www.nngroup.com/articles/chatbots/>
- **I3** (research) Never output a diagnosis or triage level; collect structured history and suggest specialties only; hand off to the doctor. _Evidence: Symptom checker RCT (n=437): top suggestion matched discharge diagnosis in 14%; over-triage 53%._ Source: JMIR 2024 Ada vs Symptoma <https://www.jmir.org/2024/1/e56514>
- **I4** (research) Hard-coded red-flag detection (chest pain, stroke signs, pregnancy bleeding, self-harm) interrupts with emergency guidance and ends intake. _Evidence: Symptom checkers miss life-threatening cases; HHS requires an emergency plan._ Source: JMIR 2024; HHS emergency plan <https://www.jmir.org/2024/1/e56514>
- **I5** (research) Do not collect sensitive data (date of birth, card, full address) in chat; hand off to a form. _Evidence: Participants hesitated to share birthdays, addresses and card numbers in chat._ Source: NN/g Chatbots <https://www.nngroup.com/articles/chatbots/>
- **L1** (research) Response limits: under 1 s no indicator; 1 to 10 s a content-shaped skeleton (onset after about 1 s) or a module spinner; over 10 s a progress bar with estimate and cancel. _Evidence: Nielsen's three limits; frame-only skeletons make users think the page is broken._ Source: NN/g Response Times; Skeleton Screens 101 <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **Q6** (law) California AB 3030 (from 1 Jan 2025): AI-generated patient communications about clinical information must disclose AI generation and how to reach a human, unless a licensed provider reviewed them. Apply to the summary and the intake chat regardless of state. _Evidence: Duane Morris alert._ Source: Duane Morris on AB 3030 <https://www.duanemorris.com/alerts/california_passes_novel_law_governing_generative_ai_healthcare_1224.html>
- **T3** (research) Separate, explicit consent before any uploaded record is processed by AI, distinct from the privacy consent; say where data is stored and processed. _Evidence: 46% want permission asked before AI is used on their records, 38% notification (n=3,000, Jan 2026); UAE law restricts health data leaving the country._ Source: Univ. of Michigan AI consent survey; UAE ICT Health Law <https://medresearch.umich.edu/research-news/ai-healthcare-notification-and-consent-preferences-based-us-national-survey>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
