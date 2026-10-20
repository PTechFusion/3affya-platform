# Specialty groups and taxonomy mapping (task 1.5)

<!-- section:seed_specialties -->
## Specialty groups (seed_specialties.py)

Last run: 2026-10-20 12:02 UTC, committed.

| Inserted | Updated | Unchanged | In the database but not among the 104 |
| --- | --- | --- | --- |
| 0 | 0 | 104 | 0 |

Source: `scripts/specialty_groups.py` (the content PDF's specialty directory, pages 21 to 46). Every group is named by its card title, in English and Arabic (decided 20 Oct 2026), the 24 groups the prototype ships included; those 24 keep their slug (the prototype's URLs), search words and body system from `data/sample`, and the last column shows the name `data/sample/specialties.json` gives them where it differs. The other 80 take a slug from the English title. Taxonomy codes: see the mapping section.

### The 104 groups

| # | Slug | Name (en) | Name (ar) | Section | Body system | Slug from | Prototype name (data/sample) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `family-medicine` | Family medicine | طب الأسرة | Whole-person medicine | general | prototype |  |
| 2 | `internal-medicine` | Internal medicine | الطب الباطني | Whole-person medicine | general | prototype |  |
| 3 | `geriatric-medicine` | Geriatric medicine | طب المسنين | Whole-person medicine | (none yet) | card title |  |
| 4 | `preventive-occupational-aerospace-medicine` | Preventive, occupational & aerospace medicine | الطب الوقائي والمهني وطب الطيران | Whole-person medicine | (none yet) | card title |  |
| 5 | `cardiology` | General & preventive cardiology | أمراض القلب والوقاية القلبية | Heart & circulation | heart-chest | prototype | Cardiology / أمراض القلب |
| 6 | `interventional-cardiology` | Interventional cardiology | أمراض القلب التداخلية | Heart & circulation | (none yet) | card title |  |
| 7 | `cardiac-electrophysiology` | Cardiac electrophysiology | كهرباء القلب واضطرابات النظم | Heart & circulation | (none yet) | card title |  |
| 8 | `advanced-heart-failure-adult-congenital-heart-disease` | Advanced heart failure & adult congenital heart disease | قصور القلب المتقدم وعيوب القلب الخلقية لدى البالغين | Heart & circulation | (none yet) | card title |  |
| 9 | `endocrinology` | Endocrinology, diabetes & metabolism | الغدد الصماء والسكري والتمثيل الغذائي | Hormones, digestion & kidneys | hormones-digestion | prototype | Endocrinology / الغدد الصماء |
| 10 | `gastroenterology` | Gastroenterology | الجهاز الهضمي | Hormones, digestion & kidneys | hormones-digestion | prototype |  |
| 11 | `hepatology-transplant-hepatology` | Hepatology & transplant hepatology | أمراض الكبد وكبد زراعة الأعضاء | Hormones, digestion & kidneys | (none yet) | card title |  |
| 12 | `nephrology` | Nephrology | أمراض الكلى | Hormones, digestion & kidneys | hormones-digestion | prototype |  |
| 13 | `pulmonology` | Pulmonary medicine | الأمراض الصدرية | Lungs, immunity & infection | heart-chest | prototype | Pulmonology / أمراض الصدر |
| 14 | `allergy` | Allergy & immunology | الحساسية والمناعة | Lungs, immunity & infection | blood-immunity | prototype | Allergy and immunology / الحساسية والمناعة |
| 15 | `rheumatology` | Rheumatology | أمراض الروماتيزم | Lungs, immunity & infection | bones-joints | prototype | Rheumatology / الروماتيزم |
| 16 | `infectious-disease` | Infectious diseases | الأمراض المعدية | Lungs, immunity & infection | blood-immunity | prototype | Infectious disease / الأمراض المعدية |
| 17 | `oncology` | Medical oncology | طب الأورام | Cancer & blood disorders | blood-immunity | prototype | Oncology / الأورام |
| 18 | `hematology` | Hematology | أمراض الدم | Cancer & blood disorders | blood-immunity | prototype |  |
| 19 | `radiation-oncology` | Radiation oncology | علاج الأورام بالإشعاع | Cancer & blood disorders | (none yet) | card title |  |
| 20 | `surgical-oncology-cellular-transplant-programs` | Surgical oncology & cellular/transplant programs | جراحة الأورام وبرامج العلاج الخلوي والزراعة | Cancer & blood disorders | (none yet) | card title |  |
| 21 | `neurology` | Neurology & vascular neurology | طب الأعصاب والأعصاب الوعائية | Brain, nerves & sleep | brain-mind | prototype | Neurology / طب الأعصاب |
| 22 | `epilepsy-neurophysiology-neuromuscular-medicine` | Epilepsy, neurophysiology & neuromuscular medicine | الصرع والفسيولوجيا العصبية والأمراض العصبية العضلية | Brain, nerves & sleep | (none yet) | card title |  |
| 23 | `sleep-medicine` | Sleep medicine | طب النوم | Brain, nerves & sleep | (none yet) | card title |  |
| 24 | `neurosurgery` | Neurosurgery | جراحة المخ والأعصاب | Brain, nerves & sleep | brain-mind | prototype | Neurosurgery / جراحة الأعصاب |
| 25 | `psychiatry` | Adult psychiatry & consultation-liaison psychiatry | الطب النفسي للبالغين والطب النفسي الاستشاري | Mental health & behavior | brain-mind | prototype | Psychiatry / الطب النفسي |
| 26 | `child-adolescent-geriatric-psychiatry` | Child, adolescent & geriatric psychiatry | الطب النفسي للأطفال والمراهقين والمسنين | Mental health & behavior | (none yet) | card title |  |
| 27 | `addiction-medicine-addiction-psychiatry` | Addiction medicine & addiction psychiatry | طب الإدمان والطب النفسي للإدمان | Mental health & behavior | (none yet) | card title |  |
| 28 | `forensic-psychiatry` | Forensic psychiatry | الطب النفسي الشرعي | Mental health & behavior | (none yet) | card title |  |
| 29 | `pediatrics` | General pediatrics & adolescent medicine | طب الأطفال وطب المراهقين | Children & adolescents | women-children | prototype | Pediatrics / طب الأطفال |
| 30 | `neonatal-developmental-behavioral-pediatrics` | Neonatal, developmental & behavioral pediatrics | طب حديثي الولادة والنمو والسلوك | Children & adolescents | (none yet) | card title |  |
| 31 | `pediatric-organ-system-specialties` | Pediatric organ-system specialties | تخصصات أجهزة الجسم لدى الأطفال | Children & adolescents | (none yet) | card title |  |
| 32 | `pediatric-neurology-acute-complex-care` | Pediatric neurology, acute & complex care | أعصاب الأطفال والرعاية الحادة والمعقدة | Children & adolescents | (none yet) | card title |  |
| 33 | `obgyn` | Obstetrics & gynecology | أمراض النساء والتوليد | Women's health | women-children | prototype | Obstetrics and gynecology / النساء والتوليد |
| 34 | `maternal-fetal-medicine` | Maternal-fetal medicine | طب الأم والجنين | Women's health | (none yet) | card title |  |
| 35 | `reproductive-endocrinology-infertility` | Reproductive endocrinology & infertility | الغدد التناسلية والعقم | Women's health | (none yet) | card title |  |
| 36 | `gynecologic-oncology-pelvic-medicine-family-planning` | Gynecologic oncology, pelvic medicine & family planning | أورام النساء وطب الحوض وتنظيم الأسرة | Women's health | (none yet) | card title |  |
| 37 | `general-surgery` | General surgery | الجراحة العامة | General & abdominal surgery | (none yet) | card title |  |
| 38 | `metabolic-bariatric-surgery` | Metabolic & bariatric surgery | جراحة السمنة والتمثيل الغذائي | General & abdominal surgery | (none yet) | card title |  |
| 39 | `colon-rectal-surgery` | Colon & rectal surgery | جراحة القولون والمستقيم | General & abdominal surgery | (none yet) | card title |  |
| 40 | `transplant-hepatobiliary-endocrine-breast-surgery` | Transplant, hepatobiliary, endocrine & breast surgery | جراحة الزراعة والكبد والغدد والثدي | General & abdominal surgery | (none yet) | card title |  |
| 41 | `orthopedics` | Orthopedic surgery | جراحة العظام | Bones, joints & movement | bones-joints | prototype |  |
| 42 | `sports-medicine` | Sports, joint reconstruction & orthopedic trauma | الطب الرياضي وترميم المفاصل وإصابات العظام | Bones, joints & movement | bones-joints | prototype | Sports medicine / الطب الرياضي |
| 43 | `hand-spine-foot-ankle-pediatric-orthopedics` | Hand, spine, foot/ankle & pediatric orthopedics | جراحة اليد والعمود الفقري والقدم وعظام الأطفال | Bones, joints & movement | (none yet) | card title |  |
| 44 | `physical-medicine-rehabilitation` | Physical medicine & rehabilitation | الطب الطبيعي وإعادة التأهيل | Bones, joints & movement | (none yet) | card title |  |
| 45 | `cardiothoracic-congenital-cardiac-surgery` | Cardiothoracic & congenital cardiac surgery | جراحة القلب والصدر وعيوب القلب الخلقية | Specialist surgery | (none yet) | card title |  |
| 46 | `vascular-surgery` | Vascular surgery | جراحة الأوعية الدموية | Specialist surgery | (none yet) | card title |  |
| 47 | `plastic-reconstructive-surgery` | Plastic & reconstructive surgery | جراحة التجميل والترميم | Specialist surgery | (none yet) | card title |  |
| 48 | `urology` | Urology & pediatric urology | المسالك البولية ومسالك الأطفال | Specialist surgery | hormones-digestion | prototype | Urology / المسالك البولية |
| 49 | `dermatology` | Dermatology & pediatric dermatology | الأمراض الجلدية وجلدية الأطفال | Skin, eyes, ears & head/neck | skin-senses | prototype | Dermatology / الأمراض الجلدية |
| 50 | `dermatologic-surgery-dermatopathology` | Dermatologic surgery & dermatopathology | جراحة الجلد وباثولوجيا الجلد | Skin, eyes, ears & head/neck | (none yet) | card title |  |
| 51 | `ophthalmology` | Ophthalmology | طب وجراحة العيون | Skin, eyes, ears & head/neck | skin-senses | prototype | Ophthalmology / طب العيون |
| 52 | `ent` | Otolaryngology & neurotology | الأنف والأذن والحنجرة وأعصاب الأذن | Skin, eyes, ears & head/neck | skin-senses | prototype | Ear, nose and throat / الأنف والأذن والحنجرة |
| 53 | `anesthesiology` | Anesthesiology | التخدير | Acute care, comfort & function | (none yet) | card title |  |
| 54 | `critical-care-neurocritical-care-surgical-critical-care` | Critical care, neurocritical care & surgical critical care | العناية المركزة والعصبية والجراحية | Acute care, comfort & function | (none yet) | card title |  |
| 55 | `emergency-medicine-ems-toxicology-hyperbaric-medicine` | Emergency medicine, EMS, toxicology & hyperbaric medicine | طب الطوارئ والإسعاف والسموم والضغط العالي | Acute care, comfort & function | (none yet) | card title |  |
| 56 | `pain` | Pain, palliative & hospice medicine | طب الألم والرعاية التلطيفية ورعاية نهاية الحياة | Acute care, comfort & function | brain-mind | prototype | Pain medicine / طب الألم |
| 57 | `diagnostic-radiology-subspecialty-imaging` | Diagnostic radiology & subspecialty imaging | الأشعة التشخيصية والتصوير التخصصي | Diagnostics & precision medicine | (none yet) | card title |  |
| 58 | `interventional-radiology-nuclear-medicine` | Interventional radiology & nuclear medicine | الأشعة التداخلية والطب النووي | Diagnostics & precision medicine | (none yet) | card title |  |
| 59 | `pathology-laboratory-medicine` | Pathology & laboratory medicine | علم الأمراض وطب المختبرات | Diagnostics & precision medicine | (none yet) | card title |  |
| 60 | `medical-genetics-genomics` | Medical genetics & genomics | الوراثة الطبية وعلم الجينوم | Diagnostics & precision medicine | (none yet) | card title |  |
| 61 | `obesity-medicine-lifestyle-focused-care` | Obesity medicine & lifestyle-focused care | طب السمنة والرعاية المرتبطة بنمط الحياة | Additional clinical practice areas | (none yet) | card title |  |
| 62 | `osteopathic-neuromusculoskeletal-medicine` | Osteopathic neuromusculoskeletal medicine | الطب العصبي العضلي الهيكلي التقويمي | Additional clinical practice areas | (none yet) | card title |  |
| 63 | `clinical-informatics-medical-leadership` | Clinical informatics & medical leadership | المعلوماتية السريرية والقيادة الطبية | Additional clinical practice areas | (none yet) | card title |  |
| 64 | `podiatric-medicine-surgery` | Podiatric medicine & surgery | طب وجراحة القدم | Additional clinical practice areas | (none yet) | card title |  |
| 65 | `general-dentistry` | General dentistry | طب الأسنان العام | Dentistry & oral health I | (none yet) | card title |  |
| 66 | `orthodontics-dentofacial-orthopedics` | Orthodontics & dentofacial orthopedics | تقويم الأسنان والفكين | Dentistry & oral health I | (none yet) | card title |  |
| 67 | `endodontics` | Endodontics | علاج جذور الأسنان | Dentistry & oral health I | (none yet) | card title |  |
| 68 | `periodontics` | Periodontics | أمراض اللثة والأنسجة الداعمة | Dentistry & oral health I | (none yet) | card title |  |
| 69 | `prosthodontics` | Prosthodontics | الاستعاضة السنية والتركيبات | Dentistry & oral health II | (none yet) | card title |  |
| 70 | `pediatric-dentistry` | Pediatric dentistry | طب أسنان الأطفال | Dentistry & oral health II | (none yet) | card title |  |
| 71 | `oral-maxillofacial-surgery` | Oral & maxillofacial surgery | جراحة الفم والوجه والفكين | Dentistry & oral health II | (none yet) | card title |  |
| 72 | `oral-medicine-orofacial-pain` | Oral medicine & orofacial pain | طب الفم وآلام الوجه والفم | Dentistry & oral health II | (none yet) | card title |  |
| 73 | `oral-maxillofacial-pathology` | Oral & maxillofacial pathology | باثولوجيا الفم والوجه والفكين | Dentistry & oral health III | (none yet) | card title |  |
| 74 | `oral-maxillofacial-radiology` | Oral & maxillofacial radiology | أشعة الفم والوجه والفكين | Dentistry & oral health III | (none yet) | card title |  |
| 75 | `dental-anesthesiology` | Dental anesthesiology | تخدير الأسنان | Dentistry & oral health III | (none yet) | card title |  |
| 76 | `dental-public-health-dental-hygiene` | Dental public health & dental hygiene | الصحة العامة للأسنان وصحة الفم الوقائية | Dentistry & oral health III | (none yet) | card title |  |
| 77 | `registered-nursing-specialist-nursing` | Registered nursing & specialist nursing | التمريض المسجل والتمريض التخصصي | Nursing & advanced practice | (none yet) | card title |  |
| 78 | `nurse-practitioners-clinical-nurse-specialists` | Nurse practitioners & clinical nurse specialists | ممارسو التمريض وأخصائيو التمريض السريري | Nursing & advanced practice | (none yet) | card title |  |
| 79 | `nurse-midwifery-nurse-anesthesia` | Nurse midwifery & nurse anesthesia | القبالة التمريضية وتمريض التخدير | Nursing & advanced practice | (none yet) | card title |  |
| 80 | `physician-assistants-associates` | Physician assistants / associates | مساعدو الأطباء | Nursing & advanced practice | (none yet) | card title |  |
| 81 | `physical-therapy` | Physical therapy | العلاج الطبيعي | Rehabilitation & communication | (none yet) | card title |  |
| 82 | `occupational-therapy` | Occupational therapy | العلاج الوظيفي | Rehabilitation & communication | (none yet) | card title |  |
| 83 | `speech-language-pathology-swallowing-care` | Speech-language pathology & swallowing care | علاج النطق واللغة والبلع | Rehabilitation & communication | (none yet) | card title |  |
| 84 | `audiology-vestibular-rehabilitation` | Audiology & vestibular rehabilitation | السمعيات وتأهيل التوازن | Rehabilitation & communication | (none yet) | card title |  |
| 85 | `clinical-counseling-health-psychology` | Clinical, counseling & health psychology | علم النفس السريري والإرشادي والصحي | Psychology & supportive care | (none yet) | card title |  |
| 86 | `clinical-neuropsychology` | Clinical neuropsychology | علم النفس العصبي السريري | Psychology & supportive care | (none yet) | card title |  |
| 87 | `clinical-social-work-counseling-family-therapy` | Clinical social work, counseling & family therapy | الخدمة الاجتماعية السريرية والإرشاد والعلاج الأسري | Psychology & supportive care | (none yet) | card title |  |
| 88 | `behavior-analysis-developmental-support` | Behavior analysis & developmental support | تحليل السلوك ودعم النمو | Psychology & supportive care | (none yet) | card title |  |
| 89 | `registered-dietitian-nutritionists` | Registered dietitian nutritionists | اختصاصيو التغذية المسجلون | Nutrition, pharmacy & genetics | (none yet) | card title |  |
| 90 | `clinical-pharmacy-pharmacy-specialties` | Clinical pharmacy & pharmacy specialties | الصيدلة السريرية وتخصصات الصيدلة | Nutrition, pharmacy & genetics | (none yet) | card title |  |
| 91 | `genetic-counseling` | Genetic counseling | الإرشاد الوراثي | Nutrition, pharmacy & genetics | (none yet) | card title |  |
| 92 | `diabetes-education-lactation-support` | Diabetes education & lactation support | تثقيف السكري ودعم الرضاعة | Nutrition, pharmacy & genetics | (none yet) | card title |  |
| 93 | `respiratory-therapy-sleep-technology` | Respiratory therapy & sleep technology | العلاج التنفسي وتقنيات النوم | Allied clinical & technical services | (none yet) | card title |  |
| 94 | `optometry-orthoptics-low-vision-care` | Optometry, orthoptics & low-vision care | قياس البصر وتقويم الحول وضعف البصر | Allied clinical & technical services | (none yet) | card title |  |
| 95 | `prosthetics-orthotics-assistive-technology` | Prosthetics, orthotics & assistive technology | الأطراف الصناعية والأجهزة التقويمية والتقنيات المساعدة | Allied clinical & technical services | (none yet) | card title |  |
| 96 | `athletic-training-exercise-physiology-rehabilitation-support` | Athletic training, exercise physiology & rehabilitation support | التدريب الرياضي العلاجي وفسيولوجيا التمرين ودعم التأهيل | Allied clinical & technical services | (none yet) | card title |  |
| 97 | `medical-laboratory-science-cytotechnology-histotechnology` | Medical laboratory science, cytotechnology & histotechnology | علوم المختبرات والخلايا وتقنيات الأنسجة | Diagnostic, procedural & community support | (none yet) | card title |  |
| 98 | `radiography-sonography-nuclear-radiation-technology` | Radiography, sonography, nuclear & radiation technology | تقنيات الأشعة والموجات فوق الصوتية والطب النووي والإشعاع | Diagnostic, procedural & community support | (none yet) | card title |  |
| 99 | `perfusion-neurodiagnostics-procedural-support` | Perfusion, neurodiagnostics & procedural support | الإرواء القلبي والتشخيص العصبي والدعم الإجرائي | Diagnostic, procedural & community support | (none yet) | card title |  |
| 100 | `paramedicine-community-health-patient-navigation` | Paramedicine, community health & patient navigation | الإسعاف والصحة المجتمعية وإرشاد المرضى | Diagnostic, procedural & community support | (none yet) | card title |  |
| 101 | `pediatric-surgery` | Pediatric surgery | جراحة الأطفال | Additional specialist services | (none yet) | card title |  |
| 102 | `medical-physics-dosimetry` | Medical physics & dosimetry | الفيزياء الطبية وقياس الجرعات | Additional specialist services | (none yet) | card title |  |
| 103 | `laboratory-genetics-biochemical-genetics` | Laboratory genetics & biochemical genetics | الوراثة المخبرية والوراثة الكيميائية الحيوية | Additional specialist services | (none yet) | card title |  |
| 104 | `forensic-neuropathology-pediatric-pathology` | Forensic, neuropathology & pediatric pathology | الباثولوجيا الشرعية والعصبية وباثولوجيا الأطفال | Additional specialist services | (none yet) | card title |  |

### Groups waiting for a body system (80)

For Dr Ayman: the directory (screen 4) groups specialties under the body systems of `data/sample/body-systems.json`. These groups have none yet: each needs one of those body systems (or a new one). Listed by their section in the content document.

- Whole-person medicine: 3 Geriatric medicine (`geriatric-medicine`), 4 Preventive, occupational & aerospace medicine (`preventive-occupational-aerospace-medicine`)
- Heart & circulation: 6 Interventional cardiology (`interventional-cardiology`), 7 Cardiac electrophysiology (`cardiac-electrophysiology`), 8 Advanced heart failure & adult congenital heart disease (`advanced-heart-failure-adult-congenital-heart-disease`)
- Hormones, digestion & kidneys: 11 Hepatology & transplant hepatology (`hepatology-transplant-hepatology`)
- Cancer & blood disorders: 19 Radiation oncology (`radiation-oncology`), 20 Surgical oncology & cellular/transplant programs (`surgical-oncology-cellular-transplant-programs`)
- Brain, nerves & sleep: 22 Epilepsy, neurophysiology & neuromuscular medicine (`epilepsy-neurophysiology-neuromuscular-medicine`), 23 Sleep medicine (`sleep-medicine`)
- Mental health & behavior: 26 Child, adolescent & geriatric psychiatry (`child-adolescent-geriatric-psychiatry`), 27 Addiction medicine & addiction psychiatry (`addiction-medicine-addiction-psychiatry`), 28 Forensic psychiatry (`forensic-psychiatry`)
- Children & adolescents: 30 Neonatal, developmental & behavioral pediatrics (`neonatal-developmental-behavioral-pediatrics`), 31 Pediatric organ-system specialties (`pediatric-organ-system-specialties`), 32 Pediatric neurology, acute & complex care (`pediatric-neurology-acute-complex-care`)
- Women's health: 34 Maternal-fetal medicine (`maternal-fetal-medicine`), 35 Reproductive endocrinology & infertility (`reproductive-endocrinology-infertility`), 36 Gynecologic oncology, pelvic medicine & family planning (`gynecologic-oncology-pelvic-medicine-family-planning`)
- General & abdominal surgery: 37 General surgery (`general-surgery`), 38 Metabolic & bariatric surgery (`metabolic-bariatric-surgery`), 39 Colon & rectal surgery (`colon-rectal-surgery`), 40 Transplant, hepatobiliary, endocrine & breast surgery (`transplant-hepatobiliary-endocrine-breast-surgery`)
- Bones, joints & movement: 43 Hand, spine, foot/ankle & pediatric orthopedics (`hand-spine-foot-ankle-pediatric-orthopedics`), 44 Physical medicine & rehabilitation (`physical-medicine-rehabilitation`)
- Specialist surgery: 45 Cardiothoracic & congenital cardiac surgery (`cardiothoracic-congenital-cardiac-surgery`), 46 Vascular surgery (`vascular-surgery`), 47 Plastic & reconstructive surgery (`plastic-reconstructive-surgery`)
- Skin, eyes, ears & head/neck: 50 Dermatologic surgery & dermatopathology (`dermatologic-surgery-dermatopathology`)
- Acute care, comfort & function: 53 Anesthesiology (`anesthesiology`), 54 Critical care, neurocritical care & surgical critical care (`critical-care-neurocritical-care-surgical-critical-care`), 55 Emergency medicine, EMS, toxicology & hyperbaric medicine (`emergency-medicine-ems-toxicology-hyperbaric-medicine`)
- Diagnostics & precision medicine: 57 Diagnostic radiology & subspecialty imaging (`diagnostic-radiology-subspecialty-imaging`), 58 Interventional radiology & nuclear medicine (`interventional-radiology-nuclear-medicine`), 59 Pathology & laboratory medicine (`pathology-laboratory-medicine`), 60 Medical genetics & genomics (`medical-genetics-genomics`)
- Additional clinical practice areas: 61 Obesity medicine & lifestyle-focused care (`obesity-medicine-lifestyle-focused-care`), 62 Osteopathic neuromusculoskeletal medicine (`osteopathic-neuromusculoskeletal-medicine`), 63 Clinical informatics & medical leadership (`clinical-informatics-medical-leadership`), 64 Podiatric medicine & surgery (`podiatric-medicine-surgery`)
- Dentistry & oral health I: 65 General dentistry (`general-dentistry`), 66 Orthodontics & dentofacial orthopedics (`orthodontics-dentofacial-orthopedics`), 67 Endodontics (`endodontics`), 68 Periodontics (`periodontics`)
- Dentistry & oral health II: 69 Prosthodontics (`prosthodontics`), 70 Pediatric dentistry (`pediatric-dentistry`), 71 Oral & maxillofacial surgery (`oral-maxillofacial-surgery`), 72 Oral medicine & orofacial pain (`oral-medicine-orofacial-pain`)
- Dentistry & oral health III: 73 Oral & maxillofacial pathology (`oral-maxillofacial-pathology`), 74 Oral & maxillofacial radiology (`oral-maxillofacial-radiology`), 75 Dental anesthesiology (`dental-anesthesiology`), 76 Dental public health & dental hygiene (`dental-public-health-dental-hygiene`)
- Nursing & advanced practice: 77 Registered nursing & specialist nursing (`registered-nursing-specialist-nursing`), 78 Nurse practitioners & clinical nurse specialists (`nurse-practitioners-clinical-nurse-specialists`), 79 Nurse midwifery & nurse anesthesia (`nurse-midwifery-nurse-anesthesia`), 80 Physician assistants / associates (`physician-assistants-associates`)
- Rehabilitation & communication: 81 Physical therapy (`physical-therapy`), 82 Occupational therapy (`occupational-therapy`), 83 Speech-language pathology & swallowing care (`speech-language-pathology-swallowing-care`), 84 Audiology & vestibular rehabilitation (`audiology-vestibular-rehabilitation`)
- Psychology & supportive care: 85 Clinical, counseling & health psychology (`clinical-counseling-health-psychology`), 86 Clinical neuropsychology (`clinical-neuropsychology`), 87 Clinical social work, counseling & family therapy (`clinical-social-work-counseling-family-therapy`), 88 Behavior analysis & developmental support (`behavior-analysis-developmental-support`)
- Nutrition, pharmacy & genetics: 89 Registered dietitian nutritionists (`registered-dietitian-nutritionists`), 90 Clinical pharmacy & pharmacy specialties (`clinical-pharmacy-pharmacy-specialties`), 91 Genetic counseling (`genetic-counseling`), 92 Diabetes education & lactation support (`diabetes-education-lactation-support`)
- Allied clinical & technical services: 93 Respiratory therapy & sleep technology (`respiratory-therapy-sleep-technology`), 94 Optometry, orthoptics & low-vision care (`optometry-orthoptics-low-vision-care`), 95 Prosthetics, orthotics & assistive technology (`prosthetics-orthotics-assistive-technology`), 96 Athletic training, exercise physiology & rehabilitation support (`athletic-training-exercise-physiology-rehabilitation-support`)
- Diagnostic, procedural & community support: 97 Medical laboratory science, cytotechnology & histotechnology (`medical-laboratory-science-cytotechnology-histotechnology`), 98 Radiography, sonography, nuclear & radiation technology (`radiography-sonography-nuclear-radiation-technology`), 99 Perfusion, neurodiagnostics & procedural support (`perfusion-neurodiagnostics-procedural-support`), 100 Paramedicine, community health & patient navigation (`paramedicine-community-health-patient-navigation`)
- Additional specialist services: 101 Pediatric surgery (`pediatric-surgery`), 102 Medical physics & dosimetry (`medical-physics-dosimetry`), 103 Laboratory genetics & biochemical genetics (`laboratory-genetics-biochemical-genetics`), 104 Forensic, neuropathology & pediatric pathology (`forensic-neuropathology-pediatric-pathology`)
<!-- /section:seed_specialties -->

<!-- section:map_taxonomy -->
## Taxonomy mapping (map_taxonomy.py)

Last run: 2026-10-20 12:03 UTC, committed. Input: shortlist `aafia_registry_shortlist_2026-10.xlsx`, NUCC `nucc_261.csv`.

From the shortlist: the rows the registry import takes, i.e. the doctor sheets ("Physicians High", "Physicians Medium", "Dentists"), less 3 row(s) whose Profession and taxonomy code are not a doctor's (Dentist 122400000X: 3). The other professions' codes keep their reasons in `scripts/taxonomy_map.py` UNMAPPED.

|  | Codes | Rows | Share of rows |
| --- | --- | --- | --- |
| Input | 209 | 28584 | 100% |
| Mapped to a group | 209 | 28584 | 100.0% |
| Unmapped (in output/taxonomy_exceptions.csv) | 0 | 0 | 0.0% |
| of which not yet in taxonomy_map.py | 0 | 0 | 0.0% |

Database: 0 group(s) changed; 103 of the 104 groups hold codes; 402 codes in place.

### Top unmapped codes by rows

None: every taxonomy code of the input maps to a group (output/taxonomy_exceptions.csv holds the header only).

### Codes and rows per group

Codes are the group's codes in `scripts/taxonomy_map.py`; rows are registry rows in the input whose code maps to the group (from the shortlist: the doctors the import takes). A group with no codes gets none.

| # | Group | Codes | Rows |
| --- | --- | --- | --- |
| 1 | `family-medicine` | 3 | 1962 |
| 2 | `internal-medicine` | 5 | 4933 |
| 3 | `geriatric-medicine` | 2 | 106 |
| 4 | `preventive-occupational-aerospace-medicine` | 4 | 40 |
| 5 | `cardiology` | 1 | 814 |
| 6 | `interventional-cardiology` | 1 | 432 |
| 7 | `cardiac-electrophysiology` | 1 | 141 |
| 8 | `advanced-heart-failure-adult-congenital-heart-disease` | 2 | 47 |
| 9 | `endocrinology` | 2 | 357 |
| 10 | `gastroenterology` | 1 | 628 |
| 11 | `hepatology-transplant-hepatology` | 2 | 31 |
| 12 | `nephrology` | 1 | 644 |
| 13 | `pulmonology` | 1 | 646 |
| 14 | `allergy` | 7 | 87 |
| 15 | `rheumatology` | 1 | 213 |
| 16 | `infectious-disease` | 1 | 274 |
| 17 | `oncology` | 2 | 640 |
| 18 | `hematology` | 1 | 42 |
| 19 | `radiation-oncology` | 2 | 118 |
| 20 | `surgical-oncology-cellular-transplant-programs` | 1 | 40 |
| 21 | `neurology` | 3 | 621 |
| 22 | `epilepsy-neurophysiology-neuromuscular-medicine` | 5 | 60 |
| 23 | `sleep-medicine` | 5 | 58 |
| 24 | `neurosurgery` | 1 | 240 |
| 25 | `psychiatry` | 2 | 819 |
| 26 | `child-adolescent-geriatric-psychiatry` | 2 | 104 |
| 27 | `addiction-medicine-addiction-psychiatry` | 6 | 48 |
| 28 | `forensic-psychiatry` | 1 | 1 |
| 29 | `pediatrics` | 4 | 1191 |
| 30 | `neonatal-developmental-behavioral-pediatrics` | 3 | 178 |
| 31 | `pediatric-organ-system-specialties` | 8 | 414 |
| 32 | `pediatric-neurology-acute-complex-care` | 3 | 137 |
| 33 | `obgyn` | 3 | 579 |
| 34 | `maternal-fetal-medicine` | 1 | 53 |
| 35 | `reproductive-endocrinology-infertility` | 1 | 28 |
| 36 | `gynecologic-oncology-pelvic-medicine-family-planning` | 3 | 55 |
| 37 | `general-surgery` | 2 | 662 |
| 38 | `metabolic-bariatric-surgery` | 0 | 0 |
| 39 | `colon-rectal-surgery` | 1 | 47 |
| 40 | `transplant-hepatobiliary-endocrine-breast-surgery` | 1 | 0 |
| 41 | `orthopedics` | 1 | 253 |
| 42 | `sports-medicine` | 9 | 99 |
| 43 | `hand-spine-foot-ankle-pediatric-orthopedics` | 6 | 97 |
| 44 | `physical-medicine-rehabilitation` | 3 | 144 |
| 45 | `cardiothoracic-congenital-cardiac-surgery` | 1 | 174 |
| 46 | `vascular-surgery` | 1 | 139 |
| 47 | `plastic-reconstructive-surgery` | 3 | 150 |
| 48 | `urology` | 2 | 275 |
| 49 | `dermatology` | 2 | 161 |
| 50 | `dermatologic-surgery-dermatopathology` | 4 | 38 |
| 51 | `ophthalmology` | 8 | 379 |
| 52 | `ent` | 6 | 222 |
| 53 | `anesthesiology` | 2 | 907 |
| 54 | `critical-care-neurocritical-care-surgical-critical-care` | 4 | 374 |
| 55 | `emergency-medicine-ems-toxicology-hyperbaric-medicine` | 6 | 762 |
| 56 | `pain` | 11 | 305 |
| 57 | `diagnostic-radiology-subspecialty-imaging` | 6 | 760 |
| 58 | `interventional-radiology-nuclear-medicine` | 5 | 145 |
| 59 | `pathology-laboratory-medicine` | 8 | 566 |
| 60 | `medical-genetics-genomics` | 2 | 21 |
| 61 | `obesity-medicine-lifestyle-focused-care` | 4 | 5 |
| 62 | `osteopathic-neuromusculoskeletal-medicine` | 1 | 0 |
| 63 | `clinical-informatics-medical-leadership` | 2 | 2 |
| 64 | `podiatric-medicine-surgery` | 4 | 0 |
| 65 | `general-dentistry` | 2 | 4162 |
| 66 | `orthodontics-dentofacial-orthopedics` | 1 | 189 |
| 67 | `endodontics` | 1 | 103 |
| 68 | `periodontics` | 1 | 150 |
| 69 | `prosthodontics` | 2 | 125 |
| 70 | `pediatric-dentistry` | 1 | 154 |
| 71 | `oral-maxillofacial-surgery` | 2 | 140 |
| 72 | `oral-medicine-orofacial-pain` | 2 | 5 |
| 73 | `oral-maxillofacial-pathology` | 1 | 13 |
| 74 | `oral-maxillofacial-radiology` | 1 | 7 |
| 75 | `dental-anesthesiology` | 1 | 9 |
| 76 | `dental-public-health-dental-hygiene` | 2 | 18 |
| 77 | `registered-nursing-specialist-nursing` | 32 | 0 |
| 78 | `nurse-practitioners-clinical-nurse-specialists` | 25 | 0 |
| 79 | `nurse-midwifery-nurse-anesthesia` | 2 | 0 |
| 80 | `physician-assistants-associates` | 3 | 0 |
| 81 | `physical-therapy` | 7 | 0 |
| 82 | `occupational-therapy` | 7 | 0 |
| 83 | `speech-language-pathology-swallowing-care` | 1 | 0 |
| 84 | `audiology-vestibular-rehabilitation` | 2 | 0 |
| 85 | `clinical-counseling-health-psychology` | 14 | 0 |
| 86 | `clinical-neuropsychology` | 1 | 0 |
| 87 | `clinical-social-work-counseling-family-therapy` | 9 | 0 |
| 88 | `behavior-analysis-developmental-support` | 4 | 0 |
| 89 | `registered-dietitian-nutritionists` | 5 | 0 |
| 90 | `clinical-pharmacy-pharmacy-specialties` | 15 | 0 |
| 91 | `genetic-counseling` | 1 | 0 |
| 92 | `diabetes-education-lactation-support` | 3 | 0 |
| 93 | `respiratory-therapy-sleep-technology` | 7 | 0 |
| 94 | `optometry-orthoptics-low-vision-care` | 6 | 0 |
| 95 | `prosthetics-orthotics-assistive-technology` | 6 | 0 |
| 96 | `athletic-training-exercise-physiology-rehabilitation-support` | 5 | 0 |
| 97 | `medical-laboratory-science-cytotechnology-histotechnology` | 5 | 0 |
| 98 | `radiography-sonography-nuclear-radiation-technology` | 10 | 0 |
| 99 | `perfusion-neurodiagnostics-procedural-support` | 5 | 0 |
| 100 | `paramedicine-community-health-patient-navigation` | 5 | 0 |
| 101 | `pediatric-surgery` | 1 | 24 |
| 102 | `medical-physics-dosimetry` | 1 | 1 |
| 103 | `laboratory-genetics-biochemical-genetics` | 3 | 6 |
| 104 | `forensic-neuropathology-pediatric-pathology` | 3 | 10 |
<!-- /section:map_taxonomy -->
