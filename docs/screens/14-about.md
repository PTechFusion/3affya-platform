# 14. About

**Area:** Public · **Purpose:** Who 3affya is · **Build:** M2 · **Task:** 1.6 · **In prototype (23 Oct):** Yes

## States to design

- Default

## Data shown

Copy from content document

## Layout call (phone first)

Single column: who 3affya is in two paragraphs, Dr Ayman photo and one-line bio, how verification works, entity and address, contact. Above the fold: the two paragraphs and photo. Hook: the verification explainer link.

## Pointers

- Operating entity, address, contact; real team and doctor photos. `[H9 H4 G2]`
- Last-reviewed date; link to how verification works. `[X4 X3]`

## Rules referenced

- **G2** (research) Real human photos, conservative dress, both genders, some group imagery; nothing that reads as non-local stock. _Evidence: Of 73 top Saudi sites, 90% include humans, 81% conservative imagery, 68% both genders._ Source: Namoun & Alkhodre 2019 <https://thesai.org/Downloads/Volume10No4/Paper_72-Towards_Usability_Guidelines_for_the_Design_of_Effective_Arabic_Websites.pdf>
- **H4** (research) Use real photos of the actual doctors and team; never stock people or decorative hero figures. _Evidence: Users spent 10% more time on real team portraits than on bios taking 316% more space; stock people are ignored as filler._ Source: NN/g, Photos as Web Content <https://www.nngroup.com/articles/photos-as-web-content/>
- **H9** (research) Show a physical address, the operating entity, and an easy contact route on the home page and footer. _Evidence: Stanford credibility guidelines 2 and 5 (4,500+ participants)._ Source: Stanford Web Credibility Guidelines <https://credibility.stanford.edu/guidelines>
- **X3** (research) Make every credential claim verifiable: link to the certifying board or licence registry. _Evidence: Stanford guideline 1: easy third-party verification raises credibility; ABMS Certification Matters is the public lookup._ Source: Stanford guidelines; ABMS Certification Matters <https://www.certificationmatters.org/>
- **X4** (research) Show a last-reviewed date on medical, process, pricing and legal content. _Evidence: Stanford guideline 8: visibly recent content increases credibility._ Source: Stanford Web Credibility Guidelines <https://credibility.stanford.edu/guidelines>

## Done when

- [ ] Renders at /ar and /en with no clipped or mixed-direction text at 390 and 1280 px
- [ ] Every state listed above is reachable (query param or sample data switch)
- [ ] Loading state shows a content-shaped skeleton with real labels; empty state has one action
- [ ] Only shared components and tokens used; `npm run check` passes
- [ ] Screenshot reviewed against the layout call; deviations noted in column N of the inventory
