"""NPPES (NUCC) taxonomy codes mapped to the 104 specialty groups (task 1.5, lane L1): the authored mapping.

TAXONOMY_MAP is {nucc_code: group slug}; UNMAPPED is {nucc_code: reason}. Together they cover every taxonomy code in the
NPPES shortlist (589 codes, checked against the NUCC code set v26.1), each code exactly once. scripts/map_taxonomy.py
writes TAXONOMY_MAP into specialties.taxonomy_codes and lists every other code it meets in
output/taxonomy_exceptions.csv; a code in neither dict is reported as "not yet in taxonomy_map.py" and never defaulted
to a group.

How the codes were mapped, from each code's NUCC grouping, classification, specialization and definition:
- A code maps to a group only when one card of the content document clearly covers it. Where a card names a
  subspecialty (sleep, sports, hospice and palliative care, addiction, obesity, hand surgery, critical care, allergy,
  subspecialty imaging...), that subspecialty's codes go to it whichever base specialty certified them; otherwise a
  code goes to the card of its base specialty. When a paediatric card (29 to 32) and a general card both name a
  field, the paediatric card takes the paediatric code (card 31 takes paediatric cardiology, card 32 paediatric
  critical care).
- A card that names a credential or level (registered nursing, registered dietitians, nurse midwifery, clinical
  social work, clinical pharmacy, paramedicine) does not take a code that does not show it; a supervised support role
  goes to a card only when the card names such roles (card 96 names assistants); a code that spans two cards, or does
  not say which card, is UNMAPPED.
- Students, generic classifications, administrative roles, facilities and suppliers, and professions no card covers
  (chiropractors, massage therapists...) are UNMAPPED with a one-line reason. Nothing goes to a nearest or catch-all
  group.
- The block at the end of TAXONOMY_MAP maps large groups the strict rule left out (decided 20 Oct 2026).
- "Judgement call" marks a mapping Dr Ayman should confirm; "Sample correction" marks where the drafted sample in
  data/sample/specialty-terms.json had a code on the wrong group.
- Card N is position N in scripts/specialty_groups.py. Card 38 (metabolic and bariatric surgery) has no code: NUCC
  has none.

The comment beside or above each code is its NUCC display name.
"""

TAXONOMY_MAP: dict[str, str] = {
    # 1 Family medicine (Whole-person medicine)
    "207Q00000X": "family-medicine",  # Family Medicine Physician
    # Family physicians whose practice is adults only: still family-medicine training.
    "207QA0505X": "family-medicine",  # Adult Medicine Physician
    # 2 Internal medicine (Whole-person medicine)
    # Hospitalists (208M00000X) are mapped here by the decision block at the end of this dict.
    "207R00000X": "internal-medicine",  # Internal Medicine Physician
    # 3 Geriatric medicine (Whole-person medicine)
    "207QG0300X": "geriatric-medicine",  # Geriatric Medicine (Family Medicine) Physician
    "207RG0300X": "geriatric-medicine",  # Geriatric Medicine (Internal Medicine) Physician
    # 4 Preventive, occupational & aerospace medicine (Whole-person medicine)
    "2083A0100X": "preventive-occupational-aerospace-medicine",  # Aerospace Medicine Physician
    # Preventive Medicine/Occupational Environmental Medicine Physician
    "2083P0500X": "preventive-occupational-aerospace-medicine",
    "2083P0901X": "preventive-occupational-aerospace-medicine",  # Public Health & General Preventive Medicine Physician
    "2083X0100X": "preventive-occupational-aerospace-medicine",  # Occupational Medicine Physician
    # 5 General & preventive cardiology (Heart & circulation)
    # Sample correction: interventional cardiology and electrophysiology now go to their own cards.
    "207RC0000X": "cardiology",  # Cardiovascular Disease Physician
    # 6 Interventional cardiology (Heart & circulation)
    "207RI0011X": "interventional-cardiology",  # Interventional Cardiology Physician
    # 7 Cardiac electrophysiology (Heart & circulation)
    "207RC0001X": "cardiac-electrophysiology",  # Clinical Cardiac Electrophysiology Physician
    # 8 Advanced heart failure & adult congenital heart disease (Heart & circulation)
    # Advanced Heart Failure and Transplant Cardiology Physician
    "207RA0001X": "advanced-heart-failure-adult-congenital-heart-disease",
    "207RA0002X": "advanced-heart-failure-adult-congenital-heart-disease",  # Adult Congenital Heart Disease Physician
    # 9 Endocrinology, diabetes & metabolism (Hormones, digestion & kidneys)
    # Diabetology: the card's title and text name diabetes, and a named field takes its codes whichever base
    # specialty certified them; no other physician card names diabetes.
    "207QB0505X": "endocrinology",  # Diabetology (Internal Medicine) Physician
    "207RE0101X": "endocrinology",  # Endocrinology, Diabetes & Metabolism Physician
    # 10 Gastroenterology (Hormones, digestion & kidneys)
    "207RG0100X": "gastroenterology",  # Gastroenterology Physician
    # 11 Hepatology & transplant hepatology (Hormones, digestion & kidneys)
    "207RI0008X": "hepatology-transplant-hepatology",  # Hepatology Physician
    "207RT0003X": "hepatology-transplant-hepatology",  # Transplant Hepatology Physician
    # 12 Nephrology (Hormones, digestion & kidneys)
    "207RN0300X": "nephrology",  # Nephrology Physician
    # 13 Pulmonary medicine (Lungs, immunity & infection)
    # Sample correction: critical care (207RC0200X) now goes to the critical care card.
    "207RP1001X": "pulmonology",  # Pulmonary Disease Physician
    # 14 Allergy & immunology (Lungs, immunity & infection)
    "207K00000X": "allergy",  # Allergy & Immunology Physician
    "207KA0200X": "allergy",  # Allergy Physician
    "207KI0005X": "allergy",  # Clinical & Laboratory Immunology (Allergy & Immunology) Physician
    "207RA0201X": "allergy",  # Allergy & Immunology (Internal Medicine) Physician
    # Otolaryngic allergy: the card names allergy, so it takes the code whichever base specialty certified it (as
    # sleep medicine certified through otolaryngology goes to card 23).
    "207YX0602X": "allergy",  # Otolaryngic Allergy Physician
    "2080I0007X": "allergy",  # Pediatric Clinical & Laboratory Immunology Physician
    "2080P0201X": "allergy",  # Pediatric Allergy/Immunology Physician
    # 15 Rheumatology (Lungs, immunity & infection)
    "207RR0500X": "rheumatology",  # Rheumatology Physician
    # 16 Infectious diseases (Lungs, immunity & infection)
    "207RI0200X": "infectious-disease",  # Infectious Disease Physician
    # 17 Medical oncology (Cancer & blood disorders)
    # Combined haematology and oncology (207RH0003X) comes here by the decision block at the end of this dict.
    "207RX0202X": "oncology",  # Medical Oncology Physician
    # 18 Hematology (Cancer & blood disorders)
    "207RH0000X": "hematology",  # Hematology (Internal Medicine) Physician
    # 19 Radiation oncology (Cancer & blood disorders)
    "2085R0001X": "radiation-oncology",  # Radiation Oncology Physician
    # Therapeutic radiology is the former name of radiation oncology.
    "2085R0203X": "radiation-oncology",  # Therapeutic Radiology Physician
    # 20 Surgical oncology & cellular/transplant programs (Cancer & blood disorders)
    "2086X0206X": "surgical-oncology-cellular-transplant-programs",  # Surgical Oncology Physician
    # 21 Neurology & vascular neurology (Brain, nerves & sleep)
    # Sample correction: child neurology (2084N0402X) now goes to the paediatric neurology card.
    "2084N0400X": "neurology",  # Neurology Physician
    "2084V0102X": "neurology",  # Vascular Neurology Physician
    # 22 Epilepsy, neurophysiology & neuromuscular medicine (Brain, nerves & sleep)
    # Electrodiagnostic medicine (EMG, nerve conduction) is clinical neurophysiology.
    "204R00000X": "epilepsy-neurophysiology-neuromuscular-medicine",  # Electrodiagnostic Medicine Physician
    # Neuromuscular medicine is named on this card whichever base specialty certified it.
    # Neuromuscular Medicine (Physical Medicine & Rehabilitation) Physician
    "2081N0008X": "epilepsy-neurophysiology-neuromuscular-medicine",
    "2084E0001X": "epilepsy-neurophysiology-neuromuscular-medicine",  # Epilepsy Physician
    # Neuromuscular Medicine (Psychiatry & Neurology) Physician
    "2084N0008X": "epilepsy-neurophysiology-neuromuscular-medicine",
    "2084N0600X": "epilepsy-neurophysiology-neuromuscular-medicine",  # Clinical Neurophysiology Physician
    # 23 Sleep medicine (Brain, nerves & sleep)
    "207QS1201X": "sleep-medicine",  # Sleep Medicine (Family Medicine) Physician
    "207RS0012X": "sleep-medicine",  # Sleep Medicine (Internal Medicine) Physician
    "207YS0012X": "sleep-medicine",  # Sleep Medicine (Otolaryngology) Physician
    "2080S0012X": "sleep-medicine",  # Pediatric Sleep Medicine Physician
    "2084S0012X": "sleep-medicine",  # Sleep Medicine (Psychiatry & Neurology) Physician
    # 24 Neurosurgery (Brain, nerves & sleep)
    "207T00000X": "neurosurgery",  # Neurological Surgery Physician
    # 25 Adult psychiatry & consultation-liaison psychiatry (Mental health & behavior)
    # Psychosomatic medicine is the former name of consultation-liaison psychiatry.
    "2084P0015X": "psychiatry",  # Psychosomatic Medicine Physician
    # Sample correction: child and adolescent psychiatry (2084P0804X) now goes to its own card.
    "2084P0800X": "psychiatry",  # Psychiatry Physician
    # 26 Child, adolescent & geriatric psychiatry (Mental health & behavior)
    "2084P0804X": "child-adolescent-geriatric-psychiatry",  # Child & Adolescent Psychiatry Physician
    "2084P0805X": "child-adolescent-geriatric-psychiatry",  # Geriatric Psychiatry Physician
    # 27 Addiction medicine & addiction psychiatry (Mental health & behavior)
    "207LA0401X": "addiction-medicine-addiction-psychiatry",  # Addiction Medicine (Anesthesiology) Physician
    "207QA0401X": "addiction-medicine-addiction-psychiatry",  # Addiction Medicine (Family Medicine) Physician
    "207RA0401X": "addiction-medicine-addiction-psychiatry",  # Addiction Medicine (Internal Medicine) Physician
    "2083A0300X": "addiction-medicine-addiction-psychiatry",  # Addiction Medicine (Preventive Medicine) Physician
    "2084A0401X": "addiction-medicine-addiction-psychiatry",  # Addiction Medicine (Psychiatry & Neurology) Physician
    "2084P0802X": "addiction-medicine-addiction-psychiatry",  # Addiction Psychiatry Physician
    # 28 Forensic psychiatry (Mental health & behavior)
    "2084F0202X": "forensic-psychiatry",  # Forensic Psychiatry Physician
    # 29 General pediatrics & adolescent medicine (Children & adolescents)
    # Adolescent medicine is named on the paediatrics and adolescent medicine card, whatever the base specialty.
    "207QA0000X": "pediatrics",  # Adolescent Medicine (Family Medicine) Physician
    "207RA0000X": "pediatrics",  # Adolescent Medicine (Internal Medicine) Physician
    # Sample correction: neonatal-perinatal (2080N0001X) now goes to the neonatal card.
    "208000000X": "pediatrics",  # Pediatrics Physician
    "2080A0000X": "pediatrics",  # Pediatric Adolescent Medicine Physician
    # 30 Neonatal, developmental & behavioral pediatrics (Children & adolescents)
    "2080N0001X": "neonatal-developmental-behavioral-pediatrics",  # Neonatal-Perinatal Medicine Physician
    "2080P0006X": "neonatal-developmental-behavioral-pediatrics",  # Developmental - Behavioral Pediatrics Physician
    # Judgement call: neurodevelopmental disabilities sit with developmental paediatrics rather than child neurology.
    "2080P0008X": "neonatal-developmental-behavioral-pediatrics",  # Pediatric Neurodevelopmental Disabilities Physician
    # 31 Pediatric organ-system specialties (Children & adolescents)
    "2080P0202X": "pediatric-organ-system-specialties",  # Pediatric Cardiology Physician
    "2080P0205X": "pediatric-organ-system-specialties",  # Pediatric Endocrinology Physician
    "2080P0206X": "pediatric-organ-system-specialties",  # Pediatric Gastroenterology Physician
    "2080P0207X": "pediatric-organ-system-specialties",  # Pediatric Hematology & Oncology Physician
    "2080P0208X": "pediatric-organ-system-specialties",  # Pediatric Infectious Diseases Physician
    "2080P0210X": "pediatric-organ-system-specialties",  # Pediatric Nephrology Physician
    "2080P0214X": "pediatric-organ-system-specialties",  # Pediatric Pulmonology Physician
    "2080P0216X": "pediatric-organ-system-specialties",  # Pediatric Rheumatology Physician
    # 32 Pediatric neurology, acute & complex care (Children & adolescents)
    # Paediatric emergency medicine goes to card 55, which names emergency medicine; this card's text names hospital
    # and critical care for children and says urgent care is local.
    # The card names child-protection evaluation.
    "2080C0008X": "pediatric-neurology-acute-complex-care",  # Child Abuse Pediatrics Physician
    # Judgement call: card 32 (acute care, critical-care transitions) and card 54 both name critical care; the
    # paediatric card takes the paediatric code, as card 31 takes paediatric cardiology rather than card 5.
    "2080P0203X": "pediatric-neurology-acute-complex-care",  # Pediatric Critical Care Medicine Physician
    # Neurology with Special Qualifications in Child Neurology Physician
    "2084N0402X": "pediatric-neurology-acute-complex-care",
    # 33 Obstetrics & gynecology (Women's health)
    # Sample correction: maternal and fetal medicine (207VM0101X) now goes to its own card.
    "207V00000X": "obgyn",  # Obstetrics & Gynecology Physician
    "207VG0400X": "obgyn",  # Gynecology Physician
    "207VX0000X": "obgyn",  # Obstetrics Physician
    # 34 Maternal-fetal medicine (Women's health)
    "207VM0101X": "maternal-fetal-medicine",  # Maternal & Fetal Medicine Physician
    # 35 Reproductive endocrinology & infertility (Women's health)
    "207VE0102X": "reproductive-endocrinology-infertility",  # Reproductive Endocrinology Physician
    # 36 Gynecologic oncology, pelvic medicine & family planning (Women's health)
    # Urogynecology and Reconstructive Pelvic Surgery (Obstetrics & Gynecology) Physician
    "207VF0040X": "gynecologic-oncology-pelvic-medicine-family-planning",
    "207VX0201X": "gynecologic-oncology-pelvic-medicine-family-planning",  # Gynecologic Oncology Physician
    # Judgement call: urogynecology goes to the pelvic medicine card whichever board (urology or OB/GYN) certified it.
    # Urogynecology and Reconstructive Pelvic Surgery (Urology) Physician
    "2088F0040X": "gynecologic-oncology-pelvic-medicine-family-planning",
    # 37 General surgery (General & abdominal surgery)
    "208600000X": "general-surgery",  # Surgery Physician
    # Judgement call: trauma surgery is a general surgery subspecialty with no card of its own (card 42 is orthopaedic
    # trauma).
    "2086S0127X": "general-surgery",  # Trauma Surgery Physician
    # 39 Colon & rectal surgery (General & abdominal surgery)
    "208C00000X": "colon-rectal-surgery",  # Colon & Rectal Surgery Physician
    # 40 Transplant, hepatobiliary, endocrine & breast surgery (General & abdominal surgery)
    "204F00000X": "transplant-hepatobiliary-endocrine-breast-surgery",  # Transplant Surgery Physician
    # 41 Orthopedic surgery (Bones, joints & movement)
    # Sample correction: spine surgery (207XS0117X) now goes to the hand, spine, foot/ankle card.
    "207X00000X": "orthopedics",  # Orthopaedic Surgery Physician
    # 42 Sports, joint reconstruction & orthopedic trauma (Bones, joints & movement)
    # Sports medicine maps to the sports card whichever base specialty certified it.
    "204C00000X": "sports-medicine",  # Sports Medicine (Neuromusculoskeletal Medicine) Physician
    "207PS0010X": "sports-medicine",  # Sports Medicine (Emergency Medicine) Physician
    "207QS0010X": "sports-medicine",  # Sports Medicine (Family Medicine) Physician
    "207RS0010X": "sports-medicine",  # Sports Medicine (Internal Medicine) Physician
    "207XS0114X": "sports-medicine",  # Adult Reconstructive Orthopaedic Surgery Physician
    "207XX0005X": "sports-medicine",  # Sports Medicine (Orthopaedic Surgery) Physician
    "207XX0801X": "sports-medicine",  # Orthopaedic Trauma Physician
    "2080S0010X": "sports-medicine",  # Pediatric Sports Medicine Physician
    "2081S0010X": "sports-medicine",  # Sports Medicine (Physical Medicine & Rehabilitation) Physician
    # 43 Hand, spine, foot/ankle & pediatric orthopedics (Bones, joints & movement)
    "207XP3100X": "hand-spine-foot-ankle-pediatric-orthopedics",  # Pediatric Orthopaedic Surgery Physician
    "207XS0106X": "hand-spine-foot-ankle-pediatric-orthopedics",  # Orthopaedic Hand Surgery Physician
    "207XS0117X": "hand-spine-foot-ankle-pediatric-orthopedics",  # Orthopaedic Surgery of the Spine Physician
    "207XX0004X": "hand-spine-foot-ankle-pediatric-orthopedics",  # Orthopaedic Foot and Ankle Surgery Physician
    # Hand surgery maps to the hand card whichever base specialty (orthopaedics, plastic or general surgery) certified
    # it.
    "2082S0105X": "hand-spine-foot-ankle-pediatric-orthopedics",  # Surgery of the Hand (Plastic Surgery) Physician
    "2086S0105X": "hand-spine-foot-ankle-pediatric-orthopedics",  # Surgery of the Hand (Surgery) Physician
    # 44 Physical medicine & rehabilitation (Bones, joints & movement)
    "208100000X": "physical-medicine-rehabilitation",  # Physical Medicine & Rehabilitation Physician
    # The PM&R card names spinal injury.
    "2081P0004X": "physical-medicine-rehabilitation",  # Spinal Cord Injury Medicine Physician
    "2081P0010X": "physical-medicine-rehabilitation",  # Pediatric Rehabilitation Medicine Physician
    # 45 Cardiothoracic & congenital cardiac surgery (Specialist surgery)
    # Thoracic Surgery (Cardiothoracic Vascular Surgery) Physician
    "208G00000X": "cardiothoracic-congenital-cardiac-surgery",
    # 46 Vascular surgery (Specialist surgery)
    "2086S0129X": "vascular-surgery",  # Vascular Surgery Physician
    # 47 Plastic & reconstructive surgery (Specialist surgery)
    "208200000X": "plastic-reconstructive-surgery",  # Plastic Surgery Physician
    # Plastic Surgery Within the Head and Neck (Plastic Surgery) Physician
    "2082S0099X": "plastic-reconstructive-surgery",
    "2086S0122X": "plastic-reconstructive-surgery",  # Plastic and Reconstructive Surgery Physician
    # 48 Urology & pediatric urology (Specialist surgery)
    "208800000X": "urology",  # Urology Physician
    "2088P0231X": "urology",  # Pediatric Urology Physician
    # 49 Dermatology & pediatric dermatology (Skin, eyes, ears & head/neck)
    "207N00000X": "dermatology",  # Dermatology Physician
    "207NP0225X": "dermatology",  # Pediatric Dermatology Physician
    # 50 Dermatologic surgery & dermatopathology (Skin, eyes, ears & head/neck)
    "207ND0101X": "dermatologic-surgery-dermatopathology",  # MOHS-Micrographic Surgery Physician
    "207ND0900X": "dermatologic-surgery-dermatopathology",  # Dermatopathology Physician
    "207NS0135X": "dermatologic-surgery-dermatopathology",  # Procedural Dermatology Physician
    # Dermatopathology is named on the dermatologic surgery card whichever base specialty certified it.
    "207ZD0900X": "dermatologic-surgery-dermatopathology",  # Dermatopathology (Pathology) Physician
    # 51 Ophthalmology (Skin, eyes, ears & head/neck)
    "207W00000X": "ophthalmology",  # Ophthalmology Physician
    "207WX0009X": "ophthalmology",  # Glaucoma Specialist (Ophthalmology) Physician
    "207WX0107X": "ophthalmology",  # Retina Specialist (Ophthalmology) Physician
    "207WX0108X": "ophthalmology",  # Uveitis and Ocular Inflammatory Disease (Ophthalmology) Physician
    "207WX0109X": "ophthalmology",  # Neuro-ophthalmology Physician
    "207WX0110X": "ophthalmology",  # Pediatric Ophthalmology and Strabismus Specialist Physician
    "207WX0120X": "ophthalmology",  # Cornea and External Diseases Specialist Physician
    # Oculoplastic surgeons are ophthalmologists.
    "207WX0200X": "ophthalmology",  # Ophthalmic Plastic and Reconstructive Surgery Physician
    # 52 Otolaryngology & neurotology (Skin, eyes, ears & head/neck)
    "207Y00000X": "ent",  # Otolaryngology Physician
    "207YP0228X": "ent",  # Pediatric Otolaryngology Physician
    # Facial plastic surgery by otolaryngologists; the ENT card names reconstructive interests.
    "207YS0123X": "ent",  # Facial Plastic Surgery Physician
    "207YX0007X": "ent",  # Plastic Surgery within the Head & Neck (Otolaryngology) Physician
    "207YX0901X": "ent",  # Otology & Neurotology Physician
    "207YX0905X": "ent",  # Otolaryngology/Facial Plastic Surgery Physician
    # 53 Anesthesiology (Acute care, comfort & function)
    "207L00000X": "anesthesiology",  # Anesthesiology Physician
    # The anaesthesiology card names paediatric expertise.
    "207LP3000X": "anesthesiology",  # Pediatric Anesthesiology Physician
    # 54 Critical care, neurocritical care & surgical critical care (Acute care, comfort & function)
    # Critical Care Medicine (Anesthesiology) Physician
    "207LC0200X": "critical-care-neurocritical-care-surgical-critical-care",
    # Critical Care Medicine (Internal Medicine) Physician
    "207RC0200X": "critical-care-neurocritical-care-surgical-critical-care",
    "2084A2900X": "critical-care-neurocritical-care-surgical-critical-care",  # Neurocritical Care Physician
    "2086S0102X": "critical-care-neurocritical-care-surgical-critical-care",  # Surgical Critical Care Physician
    # 55 Emergency medicine, EMS, toxicology & hyperbaric medicine (Acute care, comfort & function)
    "207P00000X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",  # Emergency Medicine Physician
    # Emergency Medical Services (Emergency Medicine) Physician
    "207PE0004X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",
    # Paediatric emergency medicine, whichever board certified it: the card names emergency medicine; card 32 does not.
    # Pediatric Emergency Medicine (Emergency Medicine) Physician
    "207PP0204X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",
    # Medical Toxicology (Emergency Medicine) Physician
    "207PT0002X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",
    # Pediatric Emergency Medicine (Pediatrics) Physician
    "2080P0204X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",
    # Undersea and hyperbaric medicine: the card names hyperbaric medicine.
    # Undersea and Hyperbaric Medicine (Preventive Medicine) Physician
    "2083P0011X": "emergency-medicine-ems-toxicology-hyperbaric-medicine",
    # 56 Pain, palliative & hospice medicine (Acute care, comfort & function)
    "207LP2900X": "pain",  # Pain Medicine (Anesthesiology) Physician
    "207PH0002X": "pain",  # Hospice and Palliative Medicine (Emergency Medicine) Physician
    "207QH0002X": "pain",  # Hospice and Palliative Medicine (Family Medicine) Physician
    "207RH0002X": "pain",  # Hospice and Palliative Medicine (Internal Medicine) Physician
    "207VH0002X": "pain",  # Hospice and Palliative Medicine (Obstetrics & Gynecology) Physician
    "2080H0002X": "pain",  # Pediatric Hospice and Palliative Medicine Physician
    "2081P2900X": "pain",  # Pain Medicine (Physical Medicine & Rehabilitation) Physician
    "2084P2900X": "pain",  # Pain Medicine (Psychiatry & Neurology) Physician
    "2086H0002X": "pain",  # Hospice and Palliative Medicine (Surgery) Physician
    "208VP0000X": "pain",  # Pain Medicine Physician
    "208VP0014X": "pain",  # Interventional Pain Medicine Physician
    # 57 Diagnostic radiology & subspecialty imaging (Diagnostics & precision medicine)
    # Neuroimaging certified through neurology: the card names subspecialty imaging and neuro studies, so it takes the
    # code whichever base specialty certified it.
    # Diagnostic Neuroimaging (Psychiatry & Neurology) Physician
    "2084D0003X": "diagnostic-radiology-subspecialty-imaging",
    "2085B0100X": "diagnostic-radiology-subspecialty-imaging",  # Body Imaging Physician
    "2085N0700X": "diagnostic-radiology-subspecialty-imaging",  # Neuroradiology Physician
    "2085P0229X": "diagnostic-radiology-subspecialty-imaging",  # Pediatric Radiology Physician
    "2085R0202X": "diagnostic-radiology-subspecialty-imaging",  # Diagnostic Radiology Physician
    "2085U0001X": "diagnostic-radiology-subspecialty-imaging",  # Diagnostic Ultrasound Physician
    # 58 Interventional radiology & nuclear medicine (Diagnostics & precision medicine)
    "207U00000X": "interventional-radiology-nuclear-medicine",  # Nuclear Medicine Physician
    "207UN0901X": "interventional-radiology-nuclear-medicine",  # Nuclear Cardiology Physician
    "207UN0902X": "interventional-radiology-nuclear-medicine",  # Nuclear Imaging & Therapy Physician
    "2085N0904X": "interventional-radiology-nuclear-medicine",  # Nuclear Radiology Physician
    "2085R0204X": "interventional-radiology-nuclear-medicine",  # Vascular & Interventional Radiology Physician
    # 59 Pathology & laboratory medicine (Diagnostics & precision medicine)
    "207ZB0001X": "pathology-laboratory-medicine",  # Blood Banking & Transfusion Medicine Physician
    "207ZC0006X": "pathology-laboratory-medicine",  # Clinical Pathology Physician
    "207ZC0500X": "pathology-laboratory-medicine",  # Cytopathology Physician
    # Haematopathology is a pathology subspecialty (the haematology card is clinical).
    "207ZH0000X": "pathology-laboratory-medicine",  # Hematology (Pathology) Physician
    # The pathology card names molecular interpretation.
    "207ZP0007X": "pathology-laboratory-medicine",  # Molecular Genetic Pathology (Pathology) Physician
    "207ZP0101X": "pathology-laboratory-medicine",  # Anatomic Pathology Physician
    "207ZP0102X": "pathology-laboratory-medicine",  # Anatomic Pathology & Clinical Pathology Physician
    "207ZP0105X": "pathology-laboratory-medicine",  # Clinical Pathology/Laboratory Medicine Physician
    # 60 Medical genetics & genomics (Diagnostics & precision medicine)
    "207SG0201X": "medical-genetics-genomics",  # Clinical Genetics (M.D.) Physician
    # Medical biochemical genetics is clinical care of patients with inborn errors of metabolism; NUCC says its
    # training does not include directing a laboratory, so not card 103 (the laboratory card).
    "207SG0207X": "medical-genetics-genomics",  # Medical Biochemical Genetics
    # 61 Obesity medicine & lifestyle-focused care (Additional clinical practice areas)
    "207QB0002X": "obesity-medicine-lifestyle-focused-care",  # Obesity Medicine (Family Medicine) Physician
    "207RB0002X": "obesity-medicine-lifestyle-focused-care",  # Obesity Medicine (Internal Medicine) Physician
    "2080B0002X": "obesity-medicine-lifestyle-focused-care",  # Pediatric Obesity Medicine Physician
    "2083B0002X": "obesity-medicine-lifestyle-focused-care",  # Obesity Medicine (Preventive Medicine) Physician
    # 62 Osteopathic neuromusculoskeletal medicine (Additional clinical practice areas)
    "204D00000X": "osteopathic-neuromusculoskeletal-medicine",  # Neuromusculoskeletal Medicine & OMM Physician
    # 63 Clinical informatics & medical leadership (Additional clinical practice areas)
    "207ZC0008X": "clinical-informatics-medical-leadership",  # Clinical Informatics (Pathology) Physician
    "2083C0008X": "clinical-informatics-medical-leadership",  # Clinical Informatics Physician
    # 64 Podiatric medicine & surgery (Additional clinical practice areas)
    "213E00000X": "podiatric-medicine-surgery",  # Podiatrist
    "213EP1101X": "podiatric-medicine-surgery",  # Primary Podiatric Medicine Podiatrist
    "213ES0103X": "podiatric-medicine-surgery",  # Foot & Ankle Surgery Podiatrist
    "213ES0131X": "podiatric-medicine-surgery",  # Foot Surgery Podiatrist
    # 65 General dentistry (Dentistry & oral health I)
    # Dentists without a specialisation.
    "122300000X": "general-dentistry",  # Dentist
    "1223G0001X": "general-dentistry",  # General Practice Dentistry
    # 66 Orthodontics & dentofacial orthopedics (Dentistry & oral health I)
    "1223X0400X": "orthodontics-dentofacial-orthopedics",  # Orthodontics and Dentofacial Orthopedics Dentistry
    # 67 Endodontics (Dentistry & oral health I)
    "1223E0200X": "endodontics",  # Endodontics
    # 68 Periodontics (Dentistry & oral health I)
    "1223P0300X": "periodontics",  # Periodontics
    # 69 Prosthodontics (Dentistry & oral health II)
    "1223P0700X": "prosthodontics",  # Prosthodontics
    # 70 Pediatric dentistry (Dentistry & oral health II)
    "1223P0221X": "pediatric-dentistry",  # Pediatric Dentistry
    # 71 Oral & maxillofacial surgery (Dentistry & oral health II)
    "1223S0112X": "oral-maxillofacial-surgery",  # Oral and Maxillofacial Surgery (Dentist)
    "204E00000X": "oral-maxillofacial-surgery",  # Oral & Maxillofacial Surgery (D.M.D.)
    # 72 Oral medicine & orofacial pain (Dentistry & oral health II)
    "1223X2210X": "oral-medicine-orofacial-pain",  # Orofacial Pain Dentistry
    "125Q00000X": "oral-medicine-orofacial-pain",  # Oral Medicine Dentistry
    # 73 Oral & maxillofacial pathology (Dentistry & oral health III)
    "1223P0106X": "oral-maxillofacial-pathology",  # Oral and Maxillofacial Pathology Dentistry
    # 74 Oral & maxillofacial radiology (Dentistry & oral health III)
    "1223X0008X": "oral-maxillofacial-radiology",  # Oral and Maxillofacial Radiology Dentistry
    # 75 Dental anesthesiology (Dentistry & oral health III)
    "1223D0004X": "dental-anesthesiology",  # Dental Anesthesiology
    # 76 Dental public health & dental hygiene (Dentistry & oral health III)
    "1223D0001X": "dental-public-health-dental-hygiene",  # Public Health Dentistry
    "124Q00000X": "dental-public-health-dental-hygiene",  # Dental Hygienist
    # 77 Registered nursing & specialist nursing (Nursing & advanced practice)
    "163W00000X": "registered-nursing-specialist-nursing",  # Registered Nurse
    "163WA0400X": "registered-nursing-specialist-nursing",  # Addiction (Substance Use Disorder) Registered Nurse
    "163WC0200X": "registered-nursing-specialist-nursing",  # Critical Care Medicine Registered Nurse
    "163WC0400X": "registered-nursing-specialist-nursing",  # Case Management Registered Nurse
    "163WC1400X": "registered-nursing-specialist-nursing",  # College Health Registered Nurse
    "163WC1500X": "registered-nursing-specialist-nursing",  # Community Health Registered Nurse
    "163WC3500X": "registered-nursing-specialist-nursing",  # Cardiac Rehabilitation Registered Nurse
    "163WD1100X": "registered-nursing-specialist-nursing",  # Peritoneal Dialysis Registered Nurse
    "163WE0003X": "registered-nursing-specialist-nursing",  # Emergency Registered Nurse
    "163WG0000X": "registered-nursing-specialist-nursing",  # General Practice Registered Nurse
    "163WG0100X": "registered-nursing-specialist-nursing",  # Gastroenterology Registered Nurse
    "163WG0600X": "registered-nursing-specialist-nursing",  # Gerontology Registered Nurse
    "163WH0200X": "registered-nursing-specialist-nursing",  # Home Health Registered Nurse
    "163WI0500X": "registered-nursing-specialist-nursing",  # Infusion Therapy Registered Nurse
    "163WI0600X": "registered-nursing-specialist-nursing",  # Infection Control Registered Nurse
    "163WM0102X": "registered-nursing-specialist-nursing",  # Maternal Newborn Registered Nurse
    "163WM0705X": "registered-nursing-specialist-nursing",  # Medical-Surgical Registered Nurse
    # Nurse massage therapists are registered nurses; the card takes patient-facing RN specialisations.
    "163WM1400X": "registered-nursing-specialist-nursing",  # Nurse Massage Therapist (NMT)
    "163WN0800X": "registered-nursing-specialist-nursing",  # Neuroscience Registered Nurse
    "163WP0200X": "registered-nursing-specialist-nursing",  # Pediatric Registered Nurse
    # Child & Adolescent Psychiatric/Mental Health Registered Nurse
    "163WP0807X": "registered-nursing-specialist-nursing",
    "163WP0808X": "registered-nursing-specialist-nursing",  # Psychiatric/Mental Health Registered Nurse
    "163WP0809X": "registered-nursing-specialist-nursing",  # Adult Psychiatric/Mental Health Registered Nurse
    "163WP1700X": "registered-nursing-specialist-nursing",  # Perinatal Registered Nurse
    "163WP2201X": "registered-nursing-specialist-nursing",  # Ambulatory Care Registered Nurse
    "163WR0006X": "registered-nursing-specialist-nursing",  # Registered Nurse First Assistant
    "163WR1000X": "registered-nursing-specialist-nursing",  # Reproductive Endocrinology/Infertility Registered Nurse
    "163WS0200X": "registered-nursing-specialist-nursing",  # School Registered Nurse
    "163WX0002X": "registered-nursing-specialist-nursing",  # High-Risk Obstetric Registered Nurse
    "163WX0106X": "registered-nursing-specialist-nursing",  # Occupational Health Registered Nurse
    "163WX0200X": "registered-nursing-specialist-nursing",  # Oncology Registered Nurse
    # 78 Nurse practitioners & clinical nurse specialists (Nursing & advanced practice)
    "363L00000X": "nurse-practitioners-clinical-nurse-specialists",  # Nurse Practitioner
    "363LA2100X": "nurse-practitioners-clinical-nurse-specialists",  # Acute Care Nurse Practitioner
    "363LA2200X": "nurse-practitioners-clinical-nurse-specialists",  # Adult Health Nurse Practitioner
    "363LC0200X": "nurse-practitioners-clinical-nurse-specialists",  # Critical Care Medicine Nurse Practitioner
    "363LF0000X": "nurse-practitioners-clinical-nurse-specialists",  # Family Nurse Practitioner
    "363LG0600X": "nurse-practitioners-clinical-nurse-specialists",  # Gerontology Nurse Practitioner
    "363LN0000X": "nurse-practitioners-clinical-nurse-specialists",  # Neonatal Nurse Practitioner
    "363LN0005X": "nurse-practitioners-clinical-nurse-specialists",  # Critical Care Neonatal Nurse Practitioner
    "363LP0200X": "nurse-practitioners-clinical-nurse-specialists",  # Pediatric Nurse Practitioner
    "363LP0222X": "nurse-practitioners-clinical-nurse-specialists",  # Critical Care Pediatric Nurse Practitioner
    "363LP0808X": "nurse-practitioners-clinical-nurse-specialists",  # Psychiatric/Mental Health Nurse Practitioner
    "363LP2300X": "nurse-practitioners-clinical-nurse-specialists",  # Primary Care Nurse Practitioner
    "363LS0200X": "nurse-practitioners-clinical-nurse-specialists",  # School Nurse Practitioner
    "363LW0102X": "nurse-practitioners-clinical-nurse-specialists",  # Women's Health Nurse Practitioner
    "363LX0001X": "nurse-practitioners-clinical-nurse-specialists",  # Obstetrics & Gynecology Nurse Practitioner
    "364S00000X": "nurse-practitioners-clinical-nurse-specialists",  # Clinical Nurse Specialist
    "364SA2100X": "nurse-practitioners-clinical-nurse-specialists",  # Acute Care Clinical Nurse Specialist
    "364SA2200X": "nurse-practitioners-clinical-nurse-specialists",  # Adult Health Clinical Nurse Specialist
    "364SC0200X": "nurse-practitioners-clinical-nurse-specialists",  # Critical Care Medicine Clinical Nurse Specialist
    "364SF0001X": "nurse-practitioners-clinical-nurse-specialists",  # Family Health Clinical Nurse Specialist
    "364SG0600X": "nurse-practitioners-clinical-nurse-specialists",  # Gerontology Clinical Nurse Specialist
    "364SL0600X": "nurse-practitioners-clinical-nurse-specialists",  # Long-Term Care Clinical Nurse Specialist
    "364SM0705X": "nurse-practitioners-clinical-nurse-specialists",  # Medical-Surgical Clinical Nurse Specialist
    # Psychiatric/Mental Health Clinical Nurse Specialist
    "364SP0808X": "nurse-practitioners-clinical-nurse-specialists",
    "364SW0102X": "nurse-practitioners-clinical-nurse-specialists",  # Women's Health Clinical Nurse Specialist
    # 79 Nurse midwifery & nurse anesthesia (Nursing & advanced practice)
    "367500000X": "nurse-midwifery-nurse-anesthesia",  # Certified Registered Nurse Anesthetist
    "367A00000X": "nurse-midwifery-nurse-anesthesia",  # Advanced Practice Midwife
    # 80 Physician assistants / associates (Nursing & advanced practice)
    "363A00000X": "physician-assistants-associates",  # Physician Assistant
    "363AM0700X": "physician-assistants-associates",  # Medical Physician Assistant
    "363AS0400X": "physician-assistants-associates",  # Surgical Physician Assistant
    # 81 Physical therapy (Rehabilitation & communication)
    "225100000X": "physical-therapy",  # Physical Therapist
    "2251E1300X": "physical-therapy",  # Clinical Electrophysiology Physical Therapist
    "2251G0304X": "physical-therapy",  # Geriatric Physical Therapist
    "2251N0400X": "physical-therapy",  # Neurology Physical Therapist
    "2251P0200X": "physical-therapy",  # Pediatric Physical Therapist
    "2251S0007X": "physical-therapy",  # Sports Physical Therapist
    "2251X0800X": "physical-therapy",  # Orthopedic Physical Therapist
    # 82 Occupational therapy (Rehabilitation & communication)
    "225X00000X": "occupational-therapy",  # Occupational Therapist
    "225XH1200X": "occupational-therapy",  # Hand Occupational Therapist
    "225XM0800X": "occupational-therapy",  # Mental Health Occupational Therapist
    "225XN1300X": "occupational-therapy",  # Neurorehabilitation Occupational Therapist
    "225XP0019X": "occupational-therapy",  # Physical Rehabilitation Occupational Therapist
    "225XP0200X": "occupational-therapy",  # Pediatric Occupational Therapist
    "225XR0403X": "occupational-therapy",  # Driving and Community Mobility Occupational Therapist
    # 83 Speech-language pathology & swallowing care (Rehabilitation & communication)
    "235Z00000X": "speech-language-pathology-swallowing-care",  # Speech-Language Pathologist
    # 84 Audiology & vestibular rehabilitation (Rehabilitation & communication)
    "231H00000X": "audiology-vestibular-rehabilitation",  # Audiologist
    # Licensed as audiologists.
    "237600000X": "audiology-vestibular-rehabilitation",  # Audiologist-Hearing Aid Fitter
    # 85 Clinical, counseling & health psychology (Psychology & supportive care)
    "103T00000X": "clinical-counseling-health-psychology",  # Psychologist
    "103TA0400X": "clinical-counseling-health-psychology",  # Addiction (Substance Use Disorder) Psychologist
    "103TA0700X": "clinical-counseling-health-psychology",  # Adult Development & Aging Psychologist
    "103TB0200X": "clinical-counseling-health-psychology",  # Cognitive & Behavioral Psychologist
    "103TC0700X": "clinical-counseling-health-psychology",  # Clinical Psychologist
    "103TC1900X": "clinical-counseling-health-psychology",  # Counseling Psychologist
    "103TC2200X": "clinical-counseling-health-psychology",  # Clinical Child & Adolescent Psychologist
    "103TF0000X": "clinical-counseling-health-psychology",  # Family Psychologist
    "103TH0004X": "clinical-counseling-health-psychology",  # Health Psychologist
    "103TH0100X": "clinical-counseling-health-psychology",  # Health Service Psychologist
    "103TM1800X": "clinical-counseling-health-psychology",  # Intellectual & Developmental Disabilities Psychologist
    "103TP2701X": "clinical-counseling-health-psychology",  # Group Psychotherapy Psychologist
    "103TR0400X": "clinical-counseling-health-psychology",  # Rehabilitation Psychologist
    # School psychologists are psychologists (NUCC: psychological diagnosis, assessment and intervention, as the card
    # describes); no card names school psychology, so the base card takes it, as for family and rehabilitation
    # psychologists.
    "103TS0200X": "clinical-counseling-health-psychology",  # School Psychologist
    # 86 Clinical neuropsychology (Psychology & supportive care)
    "103G00000X": "clinical-neuropsychology",  # Clinical Neuropsychologist
    # 87 Clinical social work, counseling & family therapy (Psychology & supportive care)
    "101Y00000X": "clinical-social-work-counseling-family-therapy",  # Counselor
    "101YA0400X": "clinical-social-work-counseling-family-therapy",  # Addiction (Substance Use Disorder) Counselor
    "101YM0800X": "clinical-social-work-counseling-family-therapy",  # Mental Health Counselor
    # Pastoral counsellors are counsellors (NUCC's counsellor definition draws on pastoral counselling); the card's
    # counselling is not qualified as clinical (its Arabic title qualifies social work only).
    "101YP1600X": "clinical-social-work-counseling-family-therapy",  # Pastoral Counselor
    "101YP2500X": "clinical-social-work-counseling-family-therapy",  # Professional Counselor
    # Social workers without the clinical specialisation (104100000X, 1041S0200X) come here by the decision block at the
    # end of this dict.
    "1041C0700X": "clinical-social-work-counseling-family-therapy",  # Clinical Social Worker
    "106H00000X": "clinical-social-work-counseling-family-therapy",  # Marriage & Family Therapist
    # 88 Behavior analysis & developmental support (Psychology & supportive care)
    "103K00000X": "behavior-analysis-developmental-support",  # Behavior Analyst
    # Assistant behaviour analysts assess and write treatment plans (NUCC), as the card describes.
    "106E00000X": "behavior-analysis-developmental-support",  # Assistant Behavior Analyst
    # Developmental therapists (early intervention): the card names developmental support.
    "222Q00000X": "behavior-analysis-developmental-support",  # Developmental Therapist
    # 89 Registered dietitian nutritionists (Nutrition, pharmacy & genetics)
    "133V00000X": "registered-dietitian-nutritionists",  # Registered Dietitian
    "133VN1004X": "registered-dietitian-nutritionists",  # Pediatric Nutrition Registered Dietitian
    "133VN1005X": "registered-dietitian-nutritionists",  # Renal Nutrition Registered Dietitian
    "133VN1006X": "registered-dietitian-nutritionists",  # Metabolic Nutrition Registered Dietitian
    "133VN1201X": "registered-dietitian-nutritionists",  # Obesity and Weight Management Nutrition Registered Dietitian
    # 90 Clinical pharmacy & pharmacy specialties (Nutrition, pharmacy & genetics)
    # Pharmacists without a specialisation (183500000X) come here by the decision block at the end of this dict.
    "1835C0205X": "clinical-pharmacy-pharmacy-specialties",  # Critical Care Pharmacist
    "1835C0206X": "clinical-pharmacy-pharmacy-specialties",  # Cardiology Pharmacist
    "1835C0207X": "clinical-pharmacy-pharmacy-specialties",  # Compounded Sterile Preparations Pharmacist
    "1835E0208X": "clinical-pharmacy-pharmacy-specialties",  # Emergency Medicine Pharmacist
    "1835G0303X": "clinical-pharmacy-pharmacy-specialties",  # Geriatric Pharmacist
    "1835I0206X": "clinical-pharmacy-pharmacy-specialties",  # Infectious Diseases Pharmacist
    "1835N0905X": "clinical-pharmacy-pharmacy-specialties",  # Nuclear Pharmacist
    "1835N1003X": "clinical-pharmacy-pharmacy-specialties",  # Nutrition Support Pharmacist
    "1835P0018X": "clinical-pharmacy-pharmacy-specialties",  # Pharmacist Clinician (PhC)/ Clinical Pharmacy Specialist
    "1835P0200X": "clinical-pharmacy-pharmacy-specialties",  # Pediatric Pharmacist
    "1835P1200X": "clinical-pharmacy-pharmacy-specialties",  # Pharmacotherapy Pharmacist
    "1835P1300X": "clinical-pharmacy-pharmacy-specialties",  # Psychiatric Pharmacist
    "1835P2201X": "clinical-pharmacy-pharmacy-specialties",  # Ambulatory Care Pharmacist
    "1835X0200X": "clinical-pharmacy-pharmacy-specialties",  # Oncology Pharmacist
    # 91 Genetic counseling (Nutrition, pharmacy & genetics)
    "170300000X": "genetic-counseling",  # Genetic Counselor (M.S.)
    # 92 Diabetes education & lactation support (Nutrition, pharmacy & genetics)
    # Registered nurse diabetes educators: the diabetes education card is the more specific one.
    "163WD0400X": "diabetes-education-lactation-support",  # Diabetes Educator Registered Nurse
    # Registered nurse lactation consultants: the lactation card is the more specific one.
    "163WL0100X": "diabetes-education-lactation-support",  # Lactation Consultant (Registered Nurse)
    "174N00000X": "diabetes-education-lactation-support",  # Lactation Consultant (Non-RN)
    # 93 Respiratory therapy & sleep technology (Allied clinical & technical services)
    "227800000X": "respiratory-therapy-sleep-technology",  # Certified Respiratory Therapist
    "2278H0200X": "respiratory-therapy-sleep-technology",  # Home Health Certified Respiratory Therapist
    "2278P1005X": "respiratory-therapy-sleep-technology",  # Pulmonary Rehabilitation Certified Respiratory Therapist
    "2278P3900X": "respiratory-therapy-sleep-technology",  # Neonatal/Pediatric Certified Respiratory Therapist
    "227900000X": "respiratory-therapy-sleep-technology",  # Registered Respiratory Therapist
    "2279C0205X": "respiratory-therapy-sleep-technology",  # Critical Care Registered Respiratory Therapist
    "2279P1005X": "respiratory-therapy-sleep-technology",  # Pulmonary Rehabilitation Registered Respiratory Therapist
    # 94 Optometry, orthoptics & low-vision care (Allied clinical & technical services)
    "152W00000X": "optometry-orthoptics-low-vision-care",  # Optometrist
    "152WC0802X": "optometry-orthoptics-low-vision-care",  # Corneal and Contact Management Optometrist
    "152WL0500X": "optometry-orthoptics-low-vision-care",  # Low Vision Rehabilitation Optometrist
    "152WP0200X": "optometry-orthoptics-low-vision-care",  # Pediatric Optometrist
    "152WV0400X": "optometry-orthoptics-low-vision-care",  # Vision Therapy Optometrist
    "152WX0102X": "optometry-orthoptics-low-vision-care",  # Occupational Vision Optometrist
    # 95 Prosthetics, orthotics & assistive technology (Allied clinical & technical services)
    # Ocularists fit and make custom ocular prostheses (NUCC), as mastectomy fitters fit breast prostheses.
    "156FX1700X": "prosthetics-orthotics-assistive-technology",  # Ocularist
    "222Z00000X": "prosthetics-orthotics-assistive-technology",  # Orthotist
    # Mastectomy fitters fit breast prostheses.
    "224900000X": "prosthetics-orthotics-assistive-technology",  # Mastectomy Fitter
    "224P00000X": "prosthetics-orthotics-assistive-technology",  # Prosthetist
    "225000000X": "prosthetics-orthotics-assistive-technology",  # Orthotic Fitter
    # The card names assistive technology.
    # Assistive Technology Practitioner Rehabilitation Counselor
    "225CA2400X": "prosthetics-orthotics-assistive-technology",
    # 96 Athletic training, exercise physiology & rehabilitation support (Allied clinical & technical services)
    "224Y00000X": "athletic-training-exercise-physiology-rehabilitation-support",  # Clinical Exercise Physiologist
    # The card text covers assistants who work under supervision.
    "224Z00000X": "athletic-training-exercise-physiology-rehabilitation-support",  # Occupational Therapy Assistant
    # Environmental Modification Occupational Therapy Assistant
    "224ZE0001X": "athletic-training-exercise-physiology-rehabilitation-support",
    "225200000X": "athletic-training-exercise-physiology-rehabilitation-support",  # Physical Therapy Assistant
    "2255A2300X": "athletic-training-exercise-physiology-rehabilitation-support",  # Athletic Trainer
    # 97 Medical laboratory science, cytotechnology & histotechnology (Diagnostic, procedural & community support)
    # Pathology technologists without a specialisation: clinical laboratory science (NUCC).
    "246Q00000X": "medical-laboratory-science-cytotechnology-histotechnology",  # Pathology Specialist/Technologist
    "246QH0000X": "medical-laboratory-science-cytotechnology-histotechnology",  # Hematology Specialist/Technologist
    "246QM0706X": "medical-laboratory-science-cytotechnology-histotechnology",  # Medical Technologist
    "246QM0900X": "medical-laboratory-science-cytotechnology-histotechnology",  # Microbiology Specialist/Technologist
    "246RM2200X": "medical-laboratory-science-cytotechnology-histotechnology",  # Medical Laboratory Technician
    # 98 Radiography, sonography, nuclear & radiation technology (Diagnostic, procedural & community support)
    # Radiologist assistants are advanced radiographers.
    "243U00000X": "radiography-sonography-nuclear-radiation-technology",  # Radiology Practitioner Assistant
    # Vascular technologists are vascular sonographers (NUCC).
    # Vascular Specialist/Technologist Cardiovascular
    "246XC2903X": "radiography-sonography-nuclear-radiation-technology",
    # Sonography Specialist/Technologist Cardiovascular
    "246XS1301X": "radiography-sonography-nuclear-radiation-technology",
    "247100000X": "radiography-sonography-nuclear-radiation-technology",  # Radiologic Technologist
    "2471B0102X": "radiography-sonography-nuclear-radiation-technology",  # Bone Densitometry Radiologic Technologist
    "2471C3401X": "radiography-sonography-nuclear-radiation-technology",  # Computed Tomography Radiologic Technologist
    "2471C3402X": "radiography-sonography-nuclear-radiation-technology",  # Radiography Radiologic Technologist
    # Magnetic Resonance Imaging Radiologic Technologist
    "2471M1202X": "radiography-sonography-nuclear-radiation-technology",
    "2471S1302X": "radiography-sonography-nuclear-radiation-technology",  # Sonography Radiologic Technologist
    "2471V0105X": "radiography-sonography-nuclear-radiation-technology",  # Vascular Sonography Radiologic Technologist
    # 99 Perfusion, neurodiagnostics & procedural support (Diagnostic, procedural & community support)
    "242T00000X": "perfusion-neurodiagnostics-procedural-support",  # Perfusionist
    "246XC2901X": "perfusion-neurodiagnostics-procedural-support",  # Cardiovascular Invasive Specialist/Technologist
    "246ZC0007X": "perfusion-neurodiagnostics-procedural-support",  # Surgical Assistant
    "246ZE0600X": "perfusion-neurodiagnostics-procedural-support",  # Electroneurodiagnostic Specialist/Technologist
    "246ZS0410X": "perfusion-neurodiagnostics-procedural-support",  # Surgical Technologist
    # 100 Paramedicine, community health & patient navigation (Diagnostic, procedural & community support)
    # Basic and intermediate EMTs (146N00000X, 146M00000X) come here by the decision block at the end of this dict.
    "146L00000X": "paramedicine-community-health-patient-navigation",  # Paramedic
    # Case managers help people reach medical, social and other services and coordinate them with other providers
    # (NUCC): the card names patient navigation and expects nonclinical navigators.
    "171M00000X": "paramedicine-community-health-patient-navigation",  # Case Manager/Care Coordinator
    "172V00000X": "paramedicine-community-health-patient-navigation",  # Community Health Worker
    # 101 Pediatric surgery (Additional specialist services)
    "2086S0120X": "pediatric-surgery",  # Pediatric Surgery Physician
    # 102 Medical physics & dosimetry (Additional specialist services)
    # Radiological physics is medical physics.
    "2085R0205X": "medical-physics-dosimetry",  # Radiological Physics Physician
    # 103 Laboratory genetics & biochemical genetics (Additional specialist services)
    "207SC0300X": "laboratory-genetics-biochemical-genetics",  # Clinical Cytogenetics Physician
    # Clinical biochemical genetics is laboratory work (NUCC: performing and interpreting biochemical analyses).
    "207SG0202X": "laboratory-genetics-biochemical-genetics",  # Clinical Biochemical Genetics Physician
    # 104 Forensic, neuropathology & pediatric pathology (Additional specialist services)
    "207ZF0201X": "forensic-neuropathology-pediatric-pathology",  # Forensic Pathology Physician
    "207ZN0500X": "forensic-neuropathology-pediatric-pathology",  # Neuropathology Physician
    "207ZP0213X": "forensic-neuropathology-pediatric-pathology",  # Pediatric Pathology Physician
    # Decided 20 Oct 2026 (Yasir): every large group goes to its most logical card. These codes were UNMAPPED under the
    # strict rule above; each comment says why the card fits. Students, generic or support roles and professions no card
    # covers stay UNMAPPED. Only doctors (Physician and Dentist) are imported as listings (seed_professionals.py).
    # Hospitalist Physician: most hospitalists train in internal medicine, and the card covers adult inpatient medicine.
    "208M00000X": "internal-medicine",
    # Magnetic Resonance Imaging (MRI) Internal Medicine Physician: an internal-medicine code; the base card takes it.
    "207RM1200X": "internal-medicine",
    # Physician Nutrition Specialist (Internal Medicine): an internal-medicine code; the base card takes it.
    "207RP1002X": "internal-medicine",
    # Clinical Pharmacology Physician: physicians in medication review and drug therapy; card 2 names medication review.
    "208U00000X": "internal-medicine",
    # General Practice Physician: general practice is first-contact care for all ages, what card 1 describes.
    "208D00000X": "family-medicine",
    # Hematology & Oncology Physician: combined fellowship; most practise cancer care, so card 17 (one group per code).
    "207RH0003X": "oncology",
    # Behavioral Neurology & Neuropsychiatry Physician: behavioural neurology is a neurology field; card 21.
    "2084B0040X": "neurology",
    # Denturist: dentures are the prosthodontics card's work (not imported: denturists are not doctors).
    "122400000X": "prosthodontics",
    # Pharmacist: the only pharmacy card.
    "183500000X": "clinical-pharmacy-pharmacy-specialties",
    # Behavior Technician: works under a behaviour analyst; the card is the behaviour-support family.
    "106S00000X": "behavior-analysis-developmental-support",
    # Social Worker: the only social-work card.
    "104100000X": "clinical-social-work-counseling-family-therapy",
    # School Social Worker: the only social-work card.
    "1041S0200X": "clinical-social-work-counseling-family-therapy",
    # Licensed Practical Nurse: the nursing card.
    "164W00000X": "registered-nursing-specialist-nursing",
    # Intermediate Emergency Medical Technician: emergency medical services; card 100 is paramedicine.
    "146M00000X": "paramedicine-community-health-patient-navigation",
    # Basic Emergency Medical Technician: emergency medical services; card 100 is paramedicine.
    "146N00000X": "paramedicine-community-health-patient-navigation",
    # Ph.D. Medical Genetics: laboratory and consulting genetics; card 103.
    "170100000X": "laboratory-genetics-biochemical-genetics",
}

UNMAPPED: dict[str, str] = {
    # Students
    # Student in an Organized Health Care Education/Training Program
    "390200000X": "student in a training programme, not a practising professional",
    # Group practices
    # Single Specialty Group
    "193400000X": "group practice code, not an individual professional",
    # Facilities, agencies, hospital units and managed care organisations
    # Lodging Provider
    "177F00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Local Education Agency (LEA)
    "251300000X": "facility, agency, unit or organisation code, not an individual professional",
    # Case Management Agency
    "251B00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Developmentally Disabled Services Day Training Agency
    "251C00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Home Health Agency
    "251E00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Community Based Hospice Care Agency
    "251G00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Nursing Care Agency
    "251J00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Community/Behavioral Health Agency
    "251S00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Voluntary or Charitable Agency
    "251V00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Supports Brokerage Agency
    "251X00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Early Intervention Provider Agency
    "252Y00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Foster Care Agency
    "253J00000X": "facility, agency, unit or organisation code, not an individual professional",
    # In Home Supportive Care Agency
    "253Z00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Clinic/Center
    "261Q00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Adult Day Care Clinic/Center
    "261QA0600X": "facility, agency, unit or organisation code, not an individual professional",
    # Dental Clinic/Center
    "261QD0000X": "facility, agency, unit or organisation code, not an individual professional",
    # Developmental Disabilities Clinic/Center
    "261QD1600X": "facility, agency, unit or organisation code, not an individual professional",
    # Emergency Care Clinic/Center
    "261QE0002X": "facility, agency, unit or organisation code, not an individual professional",
    # Health Service Clinic/Center
    "261QH0100X": "facility, agency, unit or organisation code, not an individual professional",
    # Mental Health Clinic/Center (Including Community Mental Health Center)
    "261QM0801X": "facility, agency, unit or organisation code, not an individual professional",
    # Adult Mental Health Clinic/Center
    "261QM0850X": "facility, agency, unit or organisation code, not an individual professional",
    # Adolescent and Children Mental Health Clinic/Center
    "261QM0855X": "facility, agency, unit or organisation code, not an individual professional",
    # Multi-Specialty Clinic/Center
    "261QM1300X": "facility, agency, unit or organisation code, not an individual professional",
    # Medical Specialty Clinic/Center
    "261QM2500X": "facility, agency, unit or organisation code, not an individual professional",
    # Federal Public Health Clinic/Center
    "261QP0904X": "facility, agency, unit or organisation code, not an individual professional",
    # Physical Therapy Clinic/Center
    "261QP2000X": "facility, agency, unit or organisation code, not an individual professional",
    # Primary Care Clinic/Center
    "261QP2300X": "facility, agency, unit or organisation code, not an individual professional",
    # Rehabilitation Clinic/Center
    "261QR0400X": "facility, agency, unit or organisation code, not an individual professional",
    # Substance Use Disorder Rehabilitation Clinic/Center
    "261QR0405X": "facility, agency, unit or organisation code, not an individual professional",
    # Research Clinic/Center
    "261QR1100X": "facility, agency, unit or organisation code, not an individual professional",
    # Student Health Clinic/Center
    "261QS1000X": "facility, agency, unit or organisation code, not an individual professional",
    # Sleep Disorder Diagnostic Clinic/Center
    "261QS1200X": "facility, agency, unit or organisation code, not an individual professional",
    # Urgent Care Clinic/Center
    "261QU0200X": "facility, agency, unit or organisation code, not an individual professional",
    # Occupational Medicine Clinic/Center
    "261QX0100X": "facility, agency, unit or organisation code, not an individual professional",
    # Epilepsy Hospital Unit
    "273100000X": "facility, agency, unit or organisation code, not an individual professional",
    # Psychiatric Hospital Unit
    "273R00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Chronic Disease Hospital
    "281P00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Long Term Care Hospital
    "282E00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Religious Nonmedical Health Care Institution
    "282J00000X": "facility, agency, unit or organisation code, not an individual professional",
    # General Acute Care Hospital
    "282N00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Critical Access Hospital
    "282NC0060X": "facility, agency, unit or organisation code, not an individual professional",
    # Children's Hospital
    "282NC2000X": "facility, agency, unit or organisation code, not an individual professional",
    # Women's Hospital
    "282NW0100X": "facility, agency, unit or organisation code, not an individual professional",
    # Psychiatric Hospital
    "283Q00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Special Hospital
    "284300000X": "facility, agency, unit or organisation code, not an individual professional",
    # Clinical Medical Laboratory
    "291U00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Exclusive Provider Organization
    "302F00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Health Maintenance Organization
    "302R00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Preferred Provider Organization
    "305R00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Point of Service
    "305S00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Assisted Living Facility
    "310400000X": "facility, agency, unit or organisation code, not an individual professional",
    # Assisted Living Facility (Mental Illness)
    "3104A0625X": "facility, agency, unit or organisation code, not an individual professional",
    # Assisted Living Facility (Behavioral Disturbances)
    "3104A0630X": "facility, agency, unit or organisation code, not an individual professional",
    # Adult Care Home Facility
    "311ZA0620X": "facility, agency, unit or organisation code, not an individual professional",
    # Skilled Nursing Facility
    "314000000X": "facility, agency, unit or organisation code, not an individual professional",
    # Pediatric Skilled Nursing Facility
    "3140N1450X": "facility, agency, unit or organisation code, not an individual professional",
    # Intellectual and/or Developmental Disabilities Residential Treatment Facility
    "320600000X": "facility, agency, unit or organisation code, not an individual professional",
    # Physical Disabilities Residential Treatment Facility
    "320700000X": "facility, agency, unit or organisation code, not an individual professional",
    # Mental Illness Community Based Residential Treatment Facility
    "320800000X": "facility, agency, unit or organisation code, not an individual professional",
    # Intellectual and/or Developmental Disabilities Community Based Residential Treatment Facility
    "320900000X": "facility, agency, unit or organisation code, not an individual professional",
    # Psychiatric Residential Treatment Facility
    "323P00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Substance Abuse Rehabilitation Facility
    "324500000X": "facility, agency, unit or organisation code, not an individual professional",
    # Respite Care
    "385H00000X": "facility, agency, unit or organisation code, not an individual professional",
    # Child Mental Illness Respite Care
    "385HR2055X": "facility, agency, unit or organisation code, not an individual professional",
    # Child Intellectual and/or Developmental Disabilities Respite Care
    "385HR2060X": "facility, agency, unit or organisation code, not an individual professional",
    # Suppliers
    # Durable Medical Equipment & Medical Supplies
    "332B00000X": "supplier of equipment, medicines or meals, not an individual professional",
    # Customized Equipment (DME)
    "332BC3200X": "supplier of equipment, medicines or meals, not an individual professional",
    # Oxygen Equipment & Supplies (DME)
    "332BX2000X": "supplier of equipment, medicines or meals, not an individual professional",
    # Home Delivered Meals
    "332U00000X": "supplier of equipment, medicines or meals, not an individual professional",
    # Pharmacy
    "333600000X": "supplier of equipment, medicines or meals, not an individual professional",
    # Clinic Pharmacy
    "3336C0002X": "supplier of equipment, medicines or meals, not an individual professional",
    # Community/Retail Pharmacy
    "3336C0003X": "supplier of equipment, medicines or meals, not an individual professional",
    # Home Infusion Therapy Pharmacy
    "3336H0001X": "supplier of equipment, medicines or meals, not an individual professional",
    # Institutional Pharmacy
    "3336I0012X": "supplier of equipment, medicines or meals, not an individual professional",
    # Mail Order Pharmacy
    "3336M0002X": "supplier of equipment, medicines or meals, not an individual professional",
    # Managed Care Organization Pharmacy
    "3336M0003X": "supplier of equipment, medicines or meals, not an individual professional",
    # Specialty Pharmacy
    "3336S0011X": "supplier of equipment, medicines or meals, not an individual professional",
    # Prosthetic/Orthotic Supplier
    "335E00000X": "supplier of equipment, medicines or meals, not an individual professional",
    # Transport
    # Driver
    "172A00000X": "transport service, not a clinical profession",
    # Ambulance
    "341600000X": "transport service, not a clinical profession",
    # Land Ambulance
    "3416L0300X": "transport service, not a clinical profession",
    # Transportation Network Company
    "342000000X": "transport service, not a clinical profession",
    # Secured Medical Transport (VAN)
    "343800000X": "transport service, not a clinical profession",
    # Non-emergency Medical Transport (VAN)
    "343900000X": "transport service, not a clinical profession",
    # Taxi
    "344600000X": "transport service, not a clinical profession",
    # Private Vehicle
    "347C00000X": "transport service, not a clinical profession",
    # Transportation Broker
    "347E00000X": "transport service, not a clinical profession",
    # Personal care and home support
    # Personal Emergency Response Attendant
    "146D00000X": "personal care, home support or companion role; no card covers it",
    # Chore Provider
    "372500000X": "personal care, home support or companion role; no card covers it",
    # Adult Companion
    "372600000X": "personal care, home support or companion role; no card covers it",
    # Attendant Care Provider
    "3747A0650X": "personal care, home support or companion role; no card covers it",
    # Personal Care Attendant
    "3747P1801X": "personal care, home support or companion role; no card covers it",
    # Home Health Aide
    "374U00000X": "personal care, home support or companion role; no card covers it",
    # Homemaker
    "376J00000X": "personal care, home support or companion role; no card covers it",
    # Nurse's Aide
    "376K00000X": "personal care, home support or companion role; no card covers it",
    # Contractors
    # Contractor
    "171W00000X": "home or vehicle modification contractor, not a clinical profession",
    # Home Modifications Contractor
    "171WH0202X": "home or vehicle modification contractor, not a clinical profession",
    # Vehicle Modifications Contractor
    "171WV0202X": "home or vehicle modification contractor, not a clinical profession",
    # Administrative, management and records roles
    # Administrator Registered Nurse
    "163WA2000X": "administrative, management or records role, not patient care",
    # Continuing Education/Staff Development Registered Nurse
    "163WC1600X": "administrative, management or records role, not patient care",
    # Prosthetics Case Management
    "1744P3200X": "administrative, management or records role, not patient care",
    # Research Study Specialist
    "1744R1102X": "administrative, management or records role, not patient care",
    # Research Study Abstracter/Coder
    "1744R1103X": "administrative, management or records role, not patient care",
    # Laboratory Management Specialist/Technologist
    "246QL0900X": "administrative, management or records role, not patient care",
    # Diplomate Laboratory Management Specialist/Technologist
    "246QL0901X": "administrative, management or records role, not patient care",
    # Health Information Specialist/Technologist
    "246Y00000X": "administrative, management or records role, not patient care",
    # Physician Office Based Coding Specialist
    "246YC3302X": "administrative, management or records role, not patient care",
    # Registered Record Administrator
    "246YR1600X": "administrative, management or records role, not patient care",
    # Health Information Technician
    "247000000X": "administrative, management or records role, not patient care",
    # Assistant Health Information Record Technician
    "2470A2800X": "administrative, management or records role, not patient care",
    # Clinical Laboratory Director (Non-physician)
    "247ZC0005X": "administrative, management or records role, not patient care",
    # Nursing Home Administrator
    "376G00000X": "administrative, management or records role, not patient care",
    # Generic classifications
    # Technician/Technologist
    "156F00000X": "generic classification that does not say which profession; no single card",
    # Specialist
    "174400000X": "generic classification that does not say which profession; no single card",
    # Rehabilitation Practitioner
    "225400000X": "generic classification that does not say which profession; no single card",
    # Respiratory/Developmental/Rehabilitative Specialist/Technologist
    "225500000X": "generic classification that does not say which profession; no single card",
    # Speech/Language/Hearing Specialist/Technologist
    "235500000X": "generic classification that does not say which profession; no single card",
    # Cardiovascular Specialist/Technologist
    "246X00000X": "generic classification that does not say which profession; no single card",
    # Other Specialist/Technologist
    "246Z00000X": "generic classification that does not say which profession; no single card",
    # Other Technician
    "247200000X": "generic classification that does not say which profession; no single card",
    # Technician
    "374700000X": "generic classification that does not say which profession; no single card",
    # Chiropractors
    # Chiropractor
    "111N00000X": "chiropractic: no card covers chiropractors",
    # Independent Medical Examiner Chiropractor
    "111NI0013X": "chiropractic: no card covers chiropractors",
    # Neurology Chiropractor
    "111NN0400X": "chiropractic: no card covers chiropractors",
    # Nutrition Chiropractor
    "111NN1001X": "chiropractic: no card covers chiropractors",
    # Radiology Chiropractor
    "111NR0200X": "chiropractic: no card covers chiropractors",
    # Rehabilitation Chiropractor
    "111NR0400X": "chiropractic: no card covers chiropractors",
    # Sports Physician Chiropractor
    "111NS0005X": "chiropractic: no card covers chiropractors",
    # Occupational Health Chiropractor
    "111NX0100X": "chiropractic: no card covers chiropractors",
    # Orthopedic Chiropractor
    "111NX0800X": "chiropractic: no card covers chiropractors",
    # Massage therapy
    # Massage Therapist
    "225700000X": "massage therapy: no card covers it",
    # Complementary and alternative therapies
    # Acupuncturist
    "171100000X": "complementary or alternative therapy: no card covers it",
    # Mechanotherapist
    "172M00000X": "complementary or alternative therapy: no card covers it",
    # Naprapath
    "172P00000X": "complementary or alternative therapy: no card covers it",
    # Reflexologist
    "173C00000X": "complementary or alternative therapy: no card covers it",
    # Naturopath
    "175F00000X": "complementary or alternative therapy: no card covers it",
    # Creative arts and recreation therapies
    # Drama Therapist
    "101200000X": "creative arts or recreation therapy: no card covers it",
    # Art Therapist
    "221700000X": "creative arts or recreation therapy: no card covers it",
    # Dance Therapist
    "225600000X": "creative arts or recreation therapy: no card covers it",
    # Recreation Therapist
    "225800000X": "creative arts or recreation therapy: no card covers it",
    # Music Therapist
    "225A00000X": "creative arts or recreation therapy: no card covers it",
    # Military
    # Military Health Care Provider
    "171000000X": "military role: no card covers it",
    # Independent Duty Corpsman
    "1710I1002X": "military role: no card covers it",
    # Independent Duty Medical Technicians
    "1710I1003X": "military role: no card covers it",
    # Veterinary
    # Veterinarian
    "174M00000X": "veterinary, not human health care",
    # Professions and specialties no single card clearly covers
    # School Counselor
    "101YS0200X": "school guidance counsellor, an education-sector role; card 87 is clinical counselling",
    # Psychoanalyst
    "102L00000X": "practised by psychiatrists, psychologists and social workers; the code does not say which card",
    # Exercise & Sports Psychologist
    "103TE1100X": "sport and exercise psychology: performance work with athletes and sports organisations (NUCC), "
    "not the assessment and therapy card 85 describes",
    # Forensic Psychologist
    "103TF0200X": "forensic psychology (legal assessment); card 28 covers forensic psychiatry, physicians only",
    # Dental Therapist
    "125J00000X": "dental therapist: a mid-level dental role no card names",
    # Advanced Practice Dental Therapist
    "125K00000X": "advanced practice dental therapist: a mid-level dental role no card names",
    # Dental Assistant
    "126800000X": "dental assistant: support role; no card covers it",
    # Nutritionist
    "133N00000X": "nutritionist, not a registered dietitian (NUCC); card 89 names registered dietitians",
    # Nutrition Education Nutritionist
    "133NN1002X": "nutritionist, not a registered dietitian (NUCC); card 89 names registered dietitians",
    # Ophthalmic Assistant
    "156FX1101X": "ophthalmic assistant: support role; no card covers it",
    # Optician
    "156FX1800X": "dispensing optician (eyewear); card 94 names optometry, orthoptics and low vision",
    # Licensed Vocational Nurse
    "164X00000X": "licensed vocational nurse; card 77 names registered and specialist nursing",
    # Licensed Psychiatric Technician
    "167G00000X": "licensed psychiatric technician: no card covers it",
    # Health & Wellness Coach
    "171400000X": "health and wellness coaching: no card covers it",
    # Interpreter
    "171R00000X": "interpreter: language service, not a clinical profession",
    # Legal Medicine
    "173000000X": "legal medicine spans forensic pathology and forensic psychiatry; no single card",
    # Health Educator
    "174H00000X": "general health education: no card names it (card 92 is diabetes education and lactation only)",
    # Peer Specialist
    "175T00000X": "peer support (lived-experience) role: no card covers it",
    # Midwife
    "176B00000X": "midwife who need not be a nurse (NUCC); card 79 names nurse midwifery",
    # Pharmacy Technician
    "183700000X": "pharmacy technician: support role; card 90 is pharmacists",
    # Independent Medical Examiner Physician
    "202C00000X": "independent medical examiner: insurance and legal assessments; no card covers it",
    # Integrative Medicine Physician
    "202D00000X": "integrative medicine: no card names it",
    # Phlebology Physician
    "202K00000X": "phlebology (venous disease) is practised from several base specialties; card 46 is vascular surgery",
    # Legal Medicine (M.D./D.O.) Physician
    "209800000X": "legal medicine spans forensic pathology and forensic psychiatry; no single card",
    # Podiatric Assistant
    "211D00000X": "podiatric assistant: support role; card 64 is podiatrists",
    # Rehabilitation Counselor
    "225C00000X": "rehabilitation counsellor (vocational): no card covers it",
    # Orientation and Mobility Training Rehabilitation Counselor
    "225CX0006X": "orientation and mobility instructor for visual impairment: no card names it",
    # Speech-Language Assistant
    "2355S0801X": "card 83 is the pathologist; card 96 names physical-rehabilitation assistants, not this one",
    # Hearing Instrument Specialist
    "237700000X": "hearing instrument specialist (hearing aid dispenser), not an audiologist (card 84)",
    # Phlebotomy Technician
    "246RP1900X": "phlebotomy (specimen collection); card 97 names laboratory science, cytotechnology, histotechnology",
    # Cardiology Technician
    "246W00000X": "the code does not say whether the work is recording (card 99) or imaging (card 98)",
    # Medical Art Specialist/Technologist
    "246ZA2600X": "medical illustration: not patient care",
    # Biomedical Engineer
    "246ZB0301X": "biomedical engineering: not patient care",
    # Biochemist
    "246ZB0500X": "biochemist: NUCC gives no definition; laboratory scientist role no card names",
    # Nephrology Specialist/Technologist
    "246ZN0300X": "nephrology (dialysis) technologist: NUCC gives no definition; no card covers it",
    # Orthopedic Assistant
    "246ZX2200X": "orthopaedic physician extender: clinic work (history, examination, injections, casts) as well as "
    "first assisting; card 99 covers only the theatre half",
    # Anesthesiologist Assistant
    "367H00000X": "not a nurse anaesthetist (card 79) or a physician assistant (card 80); no card names it",
    # Day Training/Habilitation Specialist
    "373H00000X": "life-skills support for people with developmental disabilities; card 88 is behaviour analysis",
    # Doula
    "374J00000X": "doula: non-clinical birth support; no card covers it",
    # Prevention Professional
    "405300000X": "prevention professional (substance-use prevention programmes): no card covers it",
}
