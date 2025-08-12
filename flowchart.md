# MSK Chatbot Flow

```mermaid
flowchart TD
    %% ====== STYLES ======
    classDef action fill:#e6f7ff,stroke:#0091d5,stroke-width:1px,color:#003a52
    classDef guard fill:#fff1f0,stroke:#d4380d,stroke-width:1px,color:#5a1a00
    classDef decide fill:#fffbe6,stroke:#faad14,stroke-width:1px,color:#614700
    classDef sys fill:#f6ffed,stroke:#389e0d,stroke-width:1px,color:#123b0b
    classDef end fill:#f0f0f0,stroke:#8c8c8c,stroke-width:1px,color:#333

    %% ====== ENTRY & LANGUAGE ======
    A0([User opens chat]):::sys --> A1{Select language}:::decide
    A1 -->|English| A2
    A1 -->|Español| A2
    A1 -->|العربية| A2
    A1 -->|中文| A2
    A1 -->|Other / Not listed| A1b{Supported?}:::decide
    A1b -->|Yes| A2
    A1b -->|No| A1c[Show: Limited support. Continue in English or call now.]:::action --> A2

    %% ====== DISCLAIMER & INPUT ======
    A2[Show disclaimer: no PII, no medical advice; emergency note; pinned CALL button]:::action --> A3{User input}:::decide
    A3 -->|Quick intent chip| B0
    A3 -->|Free text| B1

    %% ====== INTENT LAYER ======
    subgraph INTENT_LAYER [Intent Layer rules + tiny model]
        direction TB
        B1 --> B2[Classify intent]:::sys
        B2 --> B3{confidence ≥ 0.70?}:::decide
        B3 -->|Yes| B4[Select top intent]:::sys
        B3 -->|No| B5[Ask 1 clarifier: show top-3 intents as chips]:::action
        B5 --> B6{User selects?}:::decide
        B6 -->|Yes| B4
        B6 -->|No / Skips| B7[Show main menu chips]:::action --> B4
        B0 --> B4
    end

    %% ====== GUARDRAILS ======
    subgraph GUARDRAILS [Guardrails pre-generation]
        direction TB
        B4 --> C1{Crisis / urgent keywords?}:::decide
        C1 -->|Yes| C1a[Show emergency message + CALL 911 / MSK urgent line → END]:::guard --> E1
        C1 -->|No| C2{PII detected? phone/email/address/IDs}:::decide
        C2 -->|Yes| C2a[Block; remind privacy; offer CALL/SCHEDULE; return to input]:::guard --> A3
        C2 -->|No| C3{Medical advice / diagnosis request?}:::decide
        C3 -->|Yes| C3a[Explain limits; offer clinician CALL + education links; return]:::guard --> A3
        C3 -->|No| D0[SAFE → proceed to intent flow]:::sys
    end

    %% ====== ROUTING ======
    D0 --> D1{Intent}:::decide
    D1 -->|Screening / Start| IA0
    D1 -->|Scheduling / Next Steps| IB0
    D1 -->|Costs & Insurance| IC0
    D1 -->|AYA Support & Community| ID0
    D1 -->|Wayfinding| IF0
    D1 -->|Glossary / Education| IG0
    D1 -->|Unknown / Small talk| Z0[Provide safe, generic response + menu chips]:::action --> A3

    %% ====== INTENT A: SCREENING / START ======
    subgraph A_FLOW [A — Screening / Where do I start?]
        direction TB
        IA0([A]):::sys --> IA1{Stage?}:::decide
        IA1 -->|Just curious| IA2
        IA1 -->|Ready to get screened| IA3
        IA1 -->|Referred by a doctor| IA4
        IA1 -->|Skip| IA5
        IA2 --> IA6{Format?}:::decide
        IA3 --> IA6
        IA4 --> IA6
        IA5 --> IA6
        IA6 -->|Video| IA7[Serve short intro video + See screening steps]:::action
        IA6 -->|Quick read| IA8[Serve brief MSK primer + See screening steps]:::action
        IA6 -->|Skip| IA9[Serve generic primer + See screening steps]:::action
        IA7 --> IA10{When?}:::decide
        IA8 --> IA10
        IA9 --> IA10
        IA10 -->|Today/This week| IA11[Highlight immediate options + CALL/SCHEDULE buttons]:::action --> X1
        IA10 -->|Later/Skip| IA12[Next-steps overview + resources]:::action --> X1
    end

    %% ====== INTENT B: SCHEDULING / NEXT STEPS ======
    subgraph B_FLOW [B — Scheduling / Next Steps]
        direction TB
        IB0([B]):::sys --> IB1{Goal?}:::decide
        IB1 -->|Call now| IB2[Open phone dialer + show hours]:::action --> E1
        IB1 -->|Book online| IB3[Open appointment booking page]:::action --> E1
        IB1 -->|See steps| IB4[Show intake steps + official page]:::action --> IB5{Need checklist?}:::decide
        IB5 -->|Yes| IB6[Show what to bring + how to prepare]:::action --> X1
        IB5 -->|No| X1
        IB1 -->|Checklist| IB6 --> X1
    end

    %% ====== INTENT C: COSTS & INSURANCE ======
    subgraph C_FLOW [C — Costs & Insurance high-level only]
        direction TB
        IC0([C]):::sys --> IC1{Topic?}:::decide
        IC1 -->|Insurance basics| IC2[MSK billing overview + glossary + CALL billing]:::action --> X1
        IC1 -->|Financial assistance| IC3[Assistance programs + eligibility overview + contact]:::action --> X1
        IC1 -->|Estimates| IC4[Explain estimate process + link to estimator page]:::action --> X1
        IC1 -->|Skip| IC5[Generic billing overview + Assistance/CALL buttons]:::action --> X1
    end

    %% ====== INTENT D: AYA SUPPORT & COMMUNITY ======
    subgraph D_FLOW [D — AYA Support & Community]
        direction TB
        ID0([D]):::sys --> ID1{What helps most?}:::decide
        ID1 -->|Talk to someone| ID2[Counseling & support services + CALL]:::action --> X1
        ID1 -->|Find a group| ID3[AYA groups page + how to join]:::action --> X1
        ID1 -->|Hear stories| ID4[Patient stories playlist/page]:::action --> X1
        ID1 -->|Skip| ID5[General support hub + Talk/Groups buttons]:::action --> X1
    end

    %% ====== INTENT F: WAYFINDING ======
    subgraph F_FLOW [F — Wayfinding no address capture]
        direction TB
        IF0([F]):::sys --> IF1{Need?}:::decide
        IF1 -->|Directions| IF2[Open MSK location locator enter address there]:::action --> X1
        IF1 -->|Hours| IF3[Show hours for major sites + link]:::action --> X1
        IF1 -->|Parking| IF4[Parking info + costs + maps]:::action --> X1
        IF1 -->|Shuttle| IF5[Shuttle routes & schedules link]:::action --> X1
        IF1 -->|Skip| IF6[Location hub + choose site]:::action --> X1
    end

    %% ====== INTENT G: GLOSSARY / EDUCATION ======
    subgraph G_FLOW [G — Glossary / Education plain-language]
        direction TB
        IG0([G]):::sys --> IG1{Term detected?}:::decide
        IG1 -->|Yes| IG2[Explain in ~1 min + offer deeper MSK resource]:::action --> X1
        IG1 -->|No| IG3[Offer popular terms chips + glossary link]:::action --> X1
    end

    %% ====== COMMON ANSWER & NEXT ACTIONS ======
    subgraph COMMON [Answer & Next Actions]
        direction TB
        X1[RAG on whitelisted MSK docs → Plain-language answer + source title + 1-2 action buttons]:::action --> X2{User taps action?}:::decide
        X2 -->|Call now| X2a[Open phone dialer]:::action --> E1
        X2 -->|Schedule online| X2b[Open booking page]:::action --> E1
        X2 -->|Open resource| X2c[Open MSK page]:::action --> E1
        X2 -->|No| X3{Ask another question?}:::decide
        X3 -->|Yes| A3
        X3 -->|No / Inactive 60–90s| X4[Offer CALL / Resources buttons]:::action --> E1
    end

    E1([END]):::end
```
