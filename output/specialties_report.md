# Specialty groups and taxonomy mapping (task 1.5)

<!-- section:seed_specialties -->
## Specialty groups (seed_specialties.py)

Last run: 2026-10-20 10:35 UTC, committed.

| Inserted | Updated | Unchanged | In the database but not among the 104 |
| --- | --- | --- | --- |
| 0 | 0 | 104 | 0 |

Source: `scripts/specialty_groups.py` (the content PDF's specialty directory, pages 21 to 46). The 24 groups the prototype ships keep their slug, names, search words and body system from `data/sample`; the other 80 take their names from the PDF and a slug from the English title. Taxonomy codes: see the mapping section.

### The 104 groups

| # | Slug | Name (en) | Name (ar) | Card in the content document | Section | Body system | Name from |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `family-medicine` | Family medicine | طب الأسرة |  | Whole-person medicine | general | sample |
| 2 | `internal-medicine` | Internal medicine | الطب الباطني |  | Whole-person medicine | general | sample |
| 3 | `geriatric-medicine` | Geriatric medicine | طب المسنين |  | Whole-person medicine | (none yet) | content PDF |
| 4 | `preventive-occupational-aerospace-medicine` | Preventive, occupational & aerospace medicine | الطب الوقائي والمهني وطب الطيران |  | Whole-person medicine | (none yet) | content PDF |
| 5 | `cardiology` | Cardiology | أمراض القلب | General & preventive cardiology | Heart & circulation | heart-chest | sample |
| 6 | `interventional-cardiology` | Interventional cardiology | أمراض القلب التداخلية |  | Heart & circulation | (none yet) | content PDF |
| 7 | `cardiac-electrophysiology` | Cardiac electrophysiology | كهرباء القلب واضطرابات النظم |  | Heart & circulation | (none yet) | content PDF |
| 8 | `advanced-heart-failure-adult-congenital-heart-disease` | Advanced heart failure & adult congenital heart disease | قصور القلب المتقدم وعيوب القلب الخلقية لدى البالغين |  | Heart & circulation | (none yet) | content PDF |
| 9 | `endocrinology` | Endocrinology | الغدد الصماء | Endocrinology, diabetes & metabolism | Hormones, digestion & kidneys | hormones-digestion | sample |
| 10 | `gastroenterology` | Gastroenterology | الجهاز الهضمي |  | Hormones, digestion & kidneys | hormones-digestion | sample |
| 11 | `hepatology-transplant-hepatology` | Hepatology & transplant hepatology | أمراض الكبد وكبد زراعة الأعضاء |  | Hormones, digestion & kidneys | (none yet) | content PDF |
| 12 | `nephrology` | Nephrology | أمراض الكلى |  | Hormones, digestion & kidneys | hormones-digestion | sample |
| 13 | `pulmonology` | Pulmonology | أمراض الصدر | Pulmonary medicine | Lungs, immunity & infection | heart-chest | sample |
| 14 | `allergy` | Allergy and immunology | الحساسية والمناعة | Allergy & immunology | Lungs, immunity & infection | blood-immunity | sample |
| 15 | `rheumatology` | Rheumatology | الروماتيزم |  | Lungs, immunity & infection | bones-joints | sample |
| 16 | `infectious-disease` | Infectious disease | الأمراض المعدية | Infectious diseases | Lungs, immunity & infection | blood-immunity | sample |
| 17 | `oncology` | Oncology | الأورام | Medical oncology | Cancer & blood disorders | blood-immunity | sample |
| 18 | `hematology` | Hematology | أمراض الدم |  | Cancer & blood disorders | blood-immunity | sample |
| 19 | `radiation-oncology` | Radiation oncology | علاج الأورام بالإشعاع |  | Cancer & blood disorders | (none yet) | content PDF |
| 20 | `surgical-oncology-cellular-transplant-programs` | Surgical oncology & cellular/transplant programs | جراحة الأورام وبرامج العلاج الخلوي والزراعة |  | Cancer & blood disorders | (none yet) | content PDF |
| 21 | `neurology` | Neurology | طب الأعصاب | Neurology & vascular neurology | Brain, nerves & sleep | brain-mind | sample |
| 22 | `epilepsy-neurophysiology-neuromuscular-medicine` | Epilepsy, neurophysiology & neuromuscular medicine | الصرع والفسيولوجيا العصبية والأمراض العصبية العضلية |  | Brain, nerves & sleep | (none yet) | content PDF |
| 23 | `sleep-medicine` | Sleep medicine | طب النوم |  | Brain, nerves & sleep | (none yet) | content PDF |
| 24 | `neurosurgery` | Neurosurgery | جراحة الأعصاب |  | Brain, nerves & sleep | brain-mind | sample |
| 25 | `psychiatry` | Psychiatry | الطب النفسي | Adult psychiatry & consultation-liaison psychiatry | Mental health & behavior | brain-mind | sample |
| 26 | `child-adolescent-geriatric-psychiatry` | Child, adolescent & geriatric psychiatry | الطب النفسي للأطفال والمراهقين والمسنين |  | Mental health & behavior | (none yet) | content PDF |
| 27 | `addiction-medicine-addiction-psychiatry` | Addiction medicine & addiction psychiatry | طب الإدمان والطب النفسي للإدمان |  | Mental health & behavior | (none yet) | content PDF |
| 28 | `forensic-psychiatry` | Forensic psychiatry | الطب النفسي الشرعي |  | Mental health & behavior | (none yet) | content PDF |
| 29 | `pediatrics` | Pediatrics | طب الأطفال | General pediatrics & adolescent medicine | Children & adolescents | women-children | sample |
| 30 | `neonatal-developmental-behavioral-pediatrics` | Neonatal, developmental & behavioral pediatrics | طب حديثي الولادة والنمو والسلوك |  | Children & adolescents | (none yet) | content PDF |
| 31 | `pediatric-organ-system-specialties` | Pediatric organ-system specialties | تخصصات أجهزة الجسم لدى الأطفال |  | Children & adolescents | (none yet) | content PDF |
| 32 | `pediatric-neurology-acute-complex-care` | Pediatric neurology, acute & complex care | أعصاب الأطفال والرعاية الحادة والمعقدة |  | Children & adolescents | (none yet) | content PDF |
| 33 | `obgyn` | Obstetrics and gynecology | النساء والتوليد | Obstetrics & gynecology | Women's health | women-children | sample |
| 34 | `maternal-fetal-medicine` | Maternal-fetal medicine | طب الأم والجنين |  | Women's health | (none yet) | content PDF |
| 35 | `reproductive-endocrinology-infertility` | Reproductive endocrinology & infertility | الغدد التناسلية والعقم |  | Women's health | (none yet) | content PDF |
| 36 | `gynecologic-oncology-pelvic-medicine-family-planning` | Gynecologic oncology, pelvic medicine & family planning | أورام النساء وطب الحوض وتنظيم الأسرة |  | Women's health | (none yet) | content PDF |
| 37 | `general-surgery` | General surgery | الجراحة العامة |  | General & abdominal surgery | (none yet) | content PDF |
| 38 | `metabolic-bariatric-surgery` | Metabolic & bariatric surgery | جراحة السمنة والتمثيل الغذائي |  | General & abdominal surgery | (none yet) | content PDF |
| 39 | `colon-rectal-surgery` | Colon & rectal surgery | جراحة القولون والمستقيم |  | General & abdominal surgery | (none yet) | content PDF |
| 40 | `transplant-hepatobiliary-endocrine-breast-surgery` | Transplant, hepatobiliary, endocrine & breast surgery | جراحة الزراعة والكبد والغدد والثدي |  | General & abdominal surgery | (none yet) | content PDF |
| 41 | `orthopedics` | Orthopedic surgery | جراحة العظام |  | Bones, joints & movement | bones-joints | sample |
| 42 | `sports-medicine` | Sports medicine | الطب الرياضي | Sports, joint reconstruction & orthopedic trauma | Bones, joints & movement | bones-joints | sample |
| 43 | `hand-spine-foot-ankle-pediatric-orthopedics` | Hand, spine, foot/ankle & pediatric orthopedics | جراحة اليد والعمود الفقري والقدم وعظام الأطفال |  | Bones, joints & movement | (none yet) | content PDF |
| 44 | `physical-medicine-rehabilitation` | Physical medicine & rehabilitation | الطب الطبيعي وإعادة التأهيل |  | Bones, joints & movement | (none yet) | content PDF |
| 45 | `cardiothoracic-congenital-cardiac-surgery` | Cardiothoracic & congenital cardiac surgery | جراحة القلب والصدر وعيوب القلب الخلقية |  | Specialist surgery | (none yet) | content PDF |
| 46 | `vascular-surgery` | Vascular surgery | جراحة الأوعية الدموية |  | Specialist surgery | (none yet) | content PDF |
| 47 | `plastic-reconstructive-surgery` | Plastic & reconstructive surgery | جراحة التجميل والترميم |  | Specialist surgery | (none yet) | content PDF |
| 48 | `urology` | Urology | المسالك البولية | Urology & pediatric urology | Specialist surgery | hormones-digestion | sample |
| 49 | `dermatology` | Dermatology | الأمراض الجلدية | Dermatology & pediatric dermatology | Skin, eyes, ears & head/neck | skin-senses | sample |
| 50 | `dermatologic-surgery-dermatopathology` | Dermatologic surgery & dermatopathology | جراحة الجلد وباثولوجيا الجلد |  | Skin, eyes, ears & head/neck | (none yet) | content PDF |
| 51 | `ophthalmology` | Ophthalmology | طب العيون |  | Skin, eyes, ears & head/neck | skin-senses | sample |
| 52 | `ent` | Ear, nose and throat | الأنف والأذن والحنجرة | Otolaryngology & neurotology | Skin, eyes, ears & head/neck | skin-senses | sample |
| 53 | `anesthesiology` | Anesthesiology | التخدير |  | Acute care, comfort & function | (none yet) | content PDF |
| 54 | `critical-care-neurocritical-care-surgical-critical-care` | Critical care, neurocritical care & surgical critical care | العناية المركزة والعصبية والجراحية |  | Acute care, comfort & function | (none yet) | content PDF |
| 55 | `emergency-medicine-ems-toxicology-hyperbaric-medicine` | Emergency medicine, EMS, toxicology & hyperbaric medicine | طب الطوارئ والإسعاف والسموم والضغط العالي |  | Acute care, comfort & function | (none yet) | content PDF |
| 56 | `pain` | Pain medicine | طب الألم | Pain, palliative & hospice medicine | Acute care, comfort & function | brain-mind | sample |
| 57 | `diagnostic-radiology-subspecialty-imaging` | Diagnostic radiology & subspecialty imaging | الأشعة التشخيصية والتصوير التخصصي |  | Diagnostics & precision medicine | (none yet) | content PDF |
| 58 | `interventional-radiology-nuclear-medicine` | Interventional radiology & nuclear medicine | الأشعة التداخلية والطب النووي |  | Diagnostics & precision medicine | (none yet) | content PDF |
| 59 | `pathology-laboratory-medicine` | Pathology & laboratory medicine | علم الأمراض وطب المختبرات |  | Diagnostics & precision medicine | (none yet) | content PDF |
| 60 | `medical-genetics-genomics` | Medical genetics & genomics | الوراثة الطبية وعلم الجينوم |  | Diagnostics & precision medicine | (none yet) | content PDF |
| 61 | `obesity-medicine-lifestyle-focused-care` | Obesity medicine & lifestyle-focused care | طب السمنة والرعاية المرتبطة بنمط الحياة |  | Additional clinical practice areas | (none yet) | content PDF |
| 62 | `osteopathic-neuromusculoskeletal-medicine` | Osteopathic neuromusculoskeletal medicine | الطب العصبي العضلي الهيكلي التقويمي |  | Additional clinical practice areas | (none yet) | content PDF |
| 63 | `clinical-informatics-medical-leadership` | Clinical informatics & medical leadership | المعلوماتية السريرية والقيادة الطبية |  | Additional clinical practice areas | (none yet) | content PDF |
| 64 | `podiatric-medicine-surgery` | Podiatric medicine & surgery | طب وجراحة القدم |  | Additional clinical practice areas | (none yet) | content PDF |
| 65 | `general-dentistry` | General dentistry | طب الأسنان العام |  | Dentistry & oral health I | (none yet) | content PDF |
| 66 | `orthodontics-dentofacial-orthopedics` | Orthodontics & dentofacial orthopedics | تقويم الأسنان والفكين |  | Dentistry & oral health I | (none yet) | content PDF |
| 67 | `endodontics` | Endodontics | علاج جذور الأسنان |  | Dentistry & oral health I | (none yet) | content PDF |
| 68 | `periodontics` | Periodontics | أمراض اللثة والأنسجة الداعمة |  | Dentistry & oral health I | (none yet) | content PDF |
| 69 | `prosthodontics` | Prosthodontics | الاستعاضة السنية والتركيبات |  | Dentistry & oral health II | (none yet) | content PDF |
| 70 | `pediatric-dentistry` | Pediatric dentistry | طب أسنان الأطفال |  | Dentistry & oral health II | (none yet) | content PDF |
| 71 | `oral-maxillofacial-surgery` | Oral & maxillofacial surgery | جراحة الفم والوجه والفكين |  | Dentistry & oral health II | (none yet) | content PDF |
| 72 | `oral-medicine-orofacial-pain` | Oral medicine & orofacial pain | طب الفم وآلام الوجه والفم |  | Dentistry & oral health II | (none yet) | content PDF |
| 73 | `oral-maxillofacial-pathology` | Oral & maxillofacial pathology | باثولوجيا الفم والوجه والفكين |  | Dentistry & oral health III | (none yet) | content PDF |
| 74 | `oral-maxillofacial-radiology` | Oral & maxillofacial radiology | أشعة الفم والوجه والفكين |  | Dentistry & oral health III | (none yet) | content PDF |
| 75 | `dental-anesthesiology` | Dental anesthesiology | تخدير الأسنان |  | Dentistry & oral health III | (none yet) | content PDF |
| 76 | `dental-public-health-dental-hygiene` | Dental public health & dental hygiene | الصحة العامة للأسنان وصحة الفم الوقائية |  | Dentistry & oral health III | (none yet) | content PDF |
| 77 | `registered-nursing-specialist-nursing` | Registered nursing & specialist nursing | التمريض المسجل والتمريض التخصصي |  | Nursing & advanced practice | (none yet) | content PDF |
| 78 | `nurse-practitioners-clinical-nurse-specialists` | Nurse practitioners & clinical nurse specialists | ممارسو التمريض وأخصائيو التمريض السريري |  | Nursing & advanced practice | (none yet) | content PDF |
| 79 | `nurse-midwifery-nurse-anesthesia` | Nurse midwifery & nurse anesthesia | القبالة التمريضية وتمريض التخدير |  | Nursing & advanced practice | (none yet) | content PDF |
| 80 | `physician-assistants-associates` | Physician assistants / associates | مساعدو الأطباء |  | Nursing & advanced practice | (none yet) | content PDF |
| 81 | `physical-therapy` | Physical therapy | العلاج الطبيعي |  | Rehabilitation & communication | (none yet) | content PDF |
| 82 | `occupational-therapy` | Occupational therapy | العلاج الوظيفي |  | Rehabilitation & communication | (none yet) | content PDF |
| 83 | `speech-language-pathology-swallowing-care` | Speech-language pathology & swallowing care | علاج النطق واللغة والبلع |  | Rehabilitation & communication | (none yet) | content PDF |
| 84 | `audiology-vestibular-rehabilitation` | Audiology & vestibular rehabilitation | السمعيات وتأهيل التوازن |  | Rehabilitation & communication | (none yet) | content PDF |
| 85 | `clinical-counseling-health-psychology` | Clinical, counseling & health psychology | علم النفس السريري والإرشادي والصحي |  | Psychology & supportive care | (none yet) | content PDF |
| 86 | `clinical-neuropsychology` | Clinical neuropsychology | علم النفس العصبي السريري |  | Psychology & supportive care | (none yet) | content PDF |
| 87 | `clinical-social-work-counseling-family-therapy` | Clinical social work, counseling & family therapy | الخدمة الاجتماعية السريرية والإرشاد والعلاج الأسري |  | Psychology & supportive care | (none yet) | content PDF |
| 88 | `behavior-analysis-developmental-support` | Behavior analysis & developmental support | تحليل السلوك ودعم النمو |  | Psychology & supportive care | (none yet) | content PDF |
| 89 | `registered-dietitian-nutritionists` | Registered dietitian nutritionists | اختصاصيو التغذية المسجلون |  | Nutrition, pharmacy & genetics | (none yet) | content PDF |
| 90 | `clinical-pharmacy-pharmacy-specialties` | Clinical pharmacy & pharmacy specialties | الصيدلة السريرية وتخصصات الصيدلة |  | Nutrition, pharmacy & genetics | (none yet) | content PDF |
| 91 | `genetic-counseling` | Genetic counseling | الإرشاد الوراثي |  | Nutrition, pharmacy & genetics | (none yet) | content PDF |
| 92 | `diabetes-education-lactation-support` | Diabetes education & lactation support | تثقيف السكري ودعم الرضاعة |  | Nutrition, pharmacy & genetics | (none yet) | content PDF |
| 93 | `respiratory-therapy-sleep-technology` | Respiratory therapy & sleep technology | العلاج التنفسي وتقنيات النوم |  | Allied clinical & technical services | (none yet) | content PDF |
| 94 | `optometry-orthoptics-low-vision-care` | Optometry, orthoptics & low-vision care | قياس البصر وتقويم الحول وضعف البصر |  | Allied clinical & technical services | (none yet) | content PDF |
| 95 | `prosthetics-orthotics-assistive-technology` | Prosthetics, orthotics & assistive technology | الأطراف الصناعية والأجهزة التقويمية والتقنيات المساعدة |  | Allied clinical & technical services | (none yet) | content PDF |
| 96 | `athletic-training-exercise-physiology-rehabilitation-support` | Athletic training, exercise physiology & rehabilitation support | التدريب الرياضي العلاجي وفسيولوجيا التمرين ودعم التأهيل |  | Allied clinical & technical services | (none yet) | content PDF |
| 97 | `medical-laboratory-science-cytotechnology-histotechnology` | Medical laboratory science, cytotechnology & histotechnology | علوم المختبرات والخلايا وتقنيات الأنسجة |  | Diagnostic, procedural & community support | (none yet) | content PDF |
| 98 | `radiography-sonography-nuclear-radiation-technology` | Radiography, sonography, nuclear & radiation technology | تقنيات الأشعة والموجات فوق الصوتية والطب النووي والإشعاع |  | Diagnostic, procedural & community support | (none yet) | content PDF |
| 99 | `perfusion-neurodiagnostics-procedural-support` | Perfusion, neurodiagnostics & procedural support | الإرواء القلبي والتشخيص العصبي والدعم الإجرائي |  | Diagnostic, procedural & community support | (none yet) | content PDF |
| 100 | `paramedicine-community-health-patient-navigation` | Paramedicine, community health & patient navigation | الإسعاف والصحة المجتمعية وإرشاد المرضى |  | Diagnostic, procedural & community support | (none yet) | content PDF |
| 101 | `pediatric-surgery` | Pediatric surgery | جراحة الأطفال |  | Additional specialist services | (none yet) | content PDF |
| 102 | `medical-physics-dosimetry` | Medical physics & dosimetry | الفيزياء الطبية وقياس الجرعات |  | Additional specialist services | (none yet) | content PDF |
| 103 | `laboratory-genetics-biochemical-genetics` | Laboratory genetics & biochemical genetics | الوراثة المخبرية والوراثة الكيميائية الحيوية |  | Additional specialist services | (none yet) | content PDF |
| 104 | `forensic-neuropathology-pediatric-pathology` | Forensic, neuropathology & pediatric pathology | الباثولوجيا الشرعية والعصبية وباثولوجيا الأطفال |  | Additional specialist services | (none yet) | content PDF |

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

Last run: 2026-10-20 10:36 UTC, committed. Input: shortlist `aafia_registry_shortlist_2026-10.xlsx`, NUCC `nucc_261.csv`.

|  | Codes | Rows | Share of rows |
| --- | --- | --- | --- |
| Input | 589 | 65985 | 100% |
| Mapped to a group | 386 | 41119 | 62.3% |
| Unmapped (in output/taxonomy_exceptions.csv) | 203 | 24866 | 37.7% |
| of which not yet in taxonomy_map.py | 0 | 0 | 0.0% |

Database: 0 group(s) changed; 103 of the 104 groups hold codes; 386 codes in place.

### Top unmapped codes by rows

| Code | Rows | Profession | NUCC classification | Reason |
| --- | --- | --- | --- | --- |
| 390200000X | 7593 | Student | Student in an Organized Health Care Education/Training Program | student in a training programme, not a practising professional |
| 183500000X | 5677 | Pharmacist | Pharmacist | pharmacist without a specialisation (NUCC codes Clinical Pharmacy Specialist separately, 1835P0018X); card 90 names clinical pharmacy and the specialties, with advanced training |
| 106S00000X | 4815 | Behavioral Health | Behavior Technician | behaviour technician: implements plans under close supervision and does not assess or design them (NUCC); card 88 describes assessment and goal-setting and, unlike card 96, names no assistants |
| 208M00000X | 919 | Physician | Hospitalist | hospital medicine is a care setting with no board; hospitalists train in internal medicine, family medicine or paediatrics and the code does not say which card (sample correction: the sample had it on internal medicine) |
| 207RH0003X | 477 | Physician | Internal Medicine / Hematology & Oncology | combined haematology and oncology: card 17 (medical oncology) and card 18 (haematology, which names blood cancers) each cover half; one group per code (sample correction: the sample had it on oncology) |
| 104100000X | 451 | Social Worker | Social Worker | social worker without the clinical specialisation (NUCC codes it separately, 1041C0700X); card 87 names clinical social work |
| 174400000X | 426 | Other | Specialist | generic classification that does not say which profession; no single card |
| 3747P1801X | 393 | Other | Technician / Personal Care Attendant | personal care, home support or companion role; no card covers it |
| 111N00000X | 370 | Chiropractor | Chiropractor | chiropractic: no card covers chiropractors |
| 374U00000X | 346 | Other | Home Health Aide | personal care, home support or companion role; no card covers it |
| 343900000X | 322 | Other | Non-emergency Medical Transport (VAN) | transport service, not a clinical profession |
| 172A00000X | 192 | Other | Driver | transport service, not a clinical profession |
| 208D00000X | 184 | Physician | General Practice | general practice: its own NUCC classification with no residency or board; card 1 describes U.S. family-medicine training |
| 171R00000X | 146 | Other | Interpreter | interpreter: language service, not a clinical profession |
| 164W00000X | 135 | Nurse (LPN) | Licensed Practical Nurse | licensed practical nurse; card 77 names registered and specialist nursing |
| 225700000X | 116 | Other | Massage Therapist | massage therapy: no card covers it |
| 171100000X | 99 | Other | Acupuncturist | complementary or alternative therapy: no card covers it |
| 374J00000X | 97 | Other | Doula | doula: non-clinical birth support; no card covers it |
| 251E00000X | 94 | Other | Home Health | facility, agency, unit or organisation code, not an individual professional |
| 372500000X | 90 | Other | Chore Provider | personal care, home support or companion role; no card covers it |

### Codes and rows per group

Rows are registry rows in the input whose code maps to the group; a group with no codes gets none.

| # | Group | Codes | Rows |
| --- | --- | --- | --- |
| 1 | `family-medicine` | 2 | 1778 |
| 2 | `internal-medicine` | 1 | 4009 |
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
| 17 | `oncology` | 1 | 163 |
| 18 | `hematology` | 1 | 42 |
| 19 | `radiation-oncology` | 2 | 118 |
| 20 | `surgical-oncology-cellular-transplant-programs` | 1 | 40 |
| 21 | `neurology` | 2 | 614 |
| 22 | `epilepsy-neurophysiology-neuromuscular-medicine` | 5 | 61 |
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
| 40 | `transplant-hepatobiliary-endocrine-breast-surgery` | 1 | 42 |
| 41 | `orthopedics` | 1 | 253 |
| 42 | `sports-medicine` | 9 | 104 |
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
| 62 | `osteopathic-neuromusculoskeletal-medicine` | 1 | 11 |
| 63 | `clinical-informatics-medical-leadership` | 2 | 2 |
| 64 | `podiatric-medicine-surgery` | 4 | 262 |
| 65 | `general-dentistry` | 2 | 4162 |
| 66 | `orthodontics-dentofacial-orthopedics` | 1 | 189 |
| 67 | `endodontics` | 1 | 103 |
| 68 | `periodontics` | 1 | 150 |
| 69 | `prosthodontics` | 1 | 125 |
| 70 | `pediatric-dentistry` | 1 | 154 |
| 71 | `oral-maxillofacial-surgery` | 2 | 165 |
| 72 | `oral-medicine-orofacial-pain` | 2 | 10 |
| 73 | `oral-maxillofacial-pathology` | 1 | 13 |
| 74 | `oral-maxillofacial-radiology` | 1 | 7 |
| 75 | `dental-anesthesiology` | 1 | 9 |
| 76 | `dental-public-health-dental-hygiene` | 2 | 80 |
| 77 | `registered-nursing-specialist-nursing` | 31 | 693 |
| 78 | `nurse-practitioners-clinical-nurse-specialists` | 25 | 1795 |
| 79 | `nurse-midwifery-nurse-anesthesia` | 2 | 219 |
| 80 | `physician-assistants-associates` | 3 | 1225 |
| 81 | `physical-therapy` | 7 | 1492 |
| 82 | `occupational-therapy` | 7 | 409 |
| 83 | `speech-language-pathology-swallowing-care` | 1 | 561 |
| 84 | `audiology-vestibular-rehabilitation` | 2 | 80 |
| 85 | `clinical-counseling-health-psychology` | 14 | 609 |
| 86 | `clinical-neuropsychology` | 1 | 26 |
| 87 | `clinical-social-work-counseling-family-therapy` | 7 | 3309 |
| 88 | `behavior-analysis-developmental-support` | 3 | 755 |
| 89 | `registered-dietitian-nutritionists` | 5 | 357 |
| 90 | `clinical-pharmacy-pharmacy-specialties` | 14 | 453 |
| 91 | `genetic-counseling` | 1 | 22 |
| 92 | `diabetes-education-lactation-support` | 3 | 25 |
| 93 | `respiratory-therapy-sleep-technology` | 7 | 34 |
| 94 | `optometry-orthoptics-low-vision-care` | 6 | 442 |
| 95 | `prosthetics-orthotics-assistive-technology` | 6 | 13 |
| 96 | `athletic-training-exercise-physiology-rehabilitation-support` | 5 | 307 |
| 97 | `medical-laboratory-science-cytotechnology-histotechnology` | 5 | 16 |
| 98 | `radiography-sonography-nuclear-radiation-technology` | 10 | 35 |
| 99 | `perfusion-neurodiagnostics-procedural-support` | 5 | 105 |
| 100 | `paramedicine-community-health-patient-navigation` | 3 | 732 |
| 101 | `pediatric-surgery` | 1 | 24 |
| 102 | `medical-physics-dosimetry` | 1 | 1 |
| 103 | `laboratory-genetics-biochemical-genetics` | 2 | 6 |
| 104 | `forensic-neuropathology-pediatric-pathology` | 3 | 10 |
<!-- /section:map_taxonomy -->
