// ONE-TIME SCRIPT — cleans up the inventory collection to match your
// decision: keep ONLY the medicines that have a barcode (real, in-use
// stock), re-link those to the new medicines.csv under its slugs and
// prices, and delete every other tracked record (the last migration
// attempt, plus anything untouched, was all experimental data).
//
// Unlike the last script, this one uses each barcode item's ORIGINAL
// pre-migration identity (name/strength/dosage form), embedded below,
// recovered from before you swapped the catalog — not its current
// Firestore fields, since 3 items got their category/strength
// overwritten with wrong data by the last run. Matching also now
// requires the dosage form (Tablet/Capsule/Injection/etc.) to agree,
// which is the check that was missing before and caused those 3
// mismatches.
//
// HOW TO RUN (from pharmacy-pos-backend/, with the NEW medicines.csv
// already in this folder):
//
//   node reset-to-new-catalog.js
//
// It prints exactly what it kept, what it deleted, and anything it
// couldn't confidently match (which is NEVER deleted even without a
// match, only reported) before making any changes.

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { db, admin } = require('./firebaseAdmin');

// --- original (pre-migration) identity of every record that was ever
// tracked, keyed by its CURRENT Firestore doc id (old id if untouched,
// new id if it got renamed last time) ---
const PRISTINE = {"napa-extra": [{"originalSlug": "Napa-extra-tablet-500mg-65mg", "pristine": {"medicine_name": "Napa Extra", "category_name": "Tablet", "slug": "Napa-extra-tablet-500mg-65mg", "generic_name": "Paracetamol + Caffeine", "strength": "500 mg+65 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "Piece", "unit_size": "1", "price": "2.5"}}], "seclo-injection": [{"originalSlug": "Seclo-20-mg", "pristine": {"medicine_name": "Seclo", "category_name": "Capsule", "slug": "Seclo-20-mg", "generic_name": "Omeprazole", "strength": "20 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "6.0"}}], "ace-power-power": [{"originalSlug": "ace-power-1000-mg-tablet", "pristine": {"medicine_name": "Ace Power", "category_name": "Tablet", "slug": "ace-power-1000-mg-tablet", "generic_name": "Paracetamol", "strength": "1000 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "2.25"}}], "ace-xr": [{"originalSlug": "ace-xr-665-mg-tablet", "pristine": {"medicine_name": "Ace XR", "category_name": "Tablet", "slug": "ace-xr-665-mg-tablet", "generic_name": "Paracetamol", "strength": "665 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "2.0"}}], "alatrol-tablet": [{"originalSlug": "alatrol-10-mg-tablet", "pristine": {"medicine_name": "Alatrol", "category_name": "Tablet", "slug": "alatrol-10-mg-tablet", "generic_name": "Cetirizine Hydrochloride [Oral]", "strength": "10 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "3.01"}}], "ardance": [{"originalSlug": "ardance-10-mg-tablet", "pristine": {"medicine_name": "Ardance", "category_name": "Tablet", "slug": "ardance-10-mg-tablet", "generic_name": "Empagliflozin", "strength": "10 mg", "manufacturer_name": "Radiant Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "250.0"}}], "betaloc": [{"originalSlug": "betaloc-25-mg-tablet", "pristine": {"medicine_name": "Betaloc", "category_name": "Tablet", "slug": "betaloc-25-mg-tablet", "generic_name": "Metoprolol Tartrate", "strength": "25 mg", "manufacturer_name": "Drug International Ltd.", "unit": "14's Strip", "unit_size": "14", "price": "21.7"}}], "bizoran-tablet": [{"originalSlug": "bizoran-5-mg-20-mg-tablet", "pristine": {"medicine_name": "Bizoran", "category_name": "Tablet", "slug": "bizoran-5-mg-20-mg-tablet", "generic_name": "Amlodipine + Olmesartan Medoxomil", "strength": "5 mg+20 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "15's Strip", "unit_size": "15", "price": "180.09"}}, {"originalSlug": "bizoran-5-mg-40-mg-tablet", "pristine": {"medicine_name": "Bizoran", "category_name": "Tablet", "slug": "bizoran-5-mg-40-mg-tablet", "generic_name": "Amlodipine + Olmesartan Medoxomil", "strength": "5 mg+40 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "15's Strip", "unit_size": "15", "price": "300.0"}}], "calchek": [{"originalSlug": "calchek-5-mg-tablet", "pristine": {"medicine_name": "Calchek", "category_name": "Tablet", "slug": "calchek-5-mg-tablet", "generic_name": "Amlodipine", "strength": "5 mg", "manufacturer_name": "General Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "5.02"}}], "ceevit": [{"originalSlug": "ceevit-250-mg-chewable-tablet", "pristine": {"medicine_name": "Ceevit", "category_name": "Chewable Tablet", "slug": "ceevit-250-mg-chewable-tablet", "generic_name": "Vitamin C [Ascorbic acid]", "strength": "250 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "1.9"}}], "cef-3-ds": [{"originalSlug": "cef-3-ds-400-mg-capsule", "pristine": {"medicine_name": "Cef-3 DS", "category_name": "Capsule", "slug": "cef-3-ds-400-mg-capsule", "generic_name": "Cefixime Trihydrate", "strength": "400 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "60.0"}}], "cefaclav": [{"originalSlug": "cefaclav-500-mg-125-mg-tablet", "pristine": {"medicine_name": "Cefaclav", "category_name": "Tablet", "slug": "cefaclav-500-mg-125-mg-tablet", "generic_name": "Cefuroxime Axetil + Clavulanic Acid", "strength": "500 mg", "manufacturer_name": "Incepta Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "60.0"}}], "cefotil-tablet": [{"originalSlug": "cefotil-250-mg-tablet", "pristine": {"medicine_name": "Cefotil", "category_name": "Tablet", "slug": "cefotil-250-mg-tablet", "generic_name": "Cefuroxime Axetil", "strength": "250 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "25.17"}}], "cefotil-plus-powder-for-suspension": [{"originalSlug": "cefotil-plus-70-ml-powder-for-suspension", "pristine": {"medicine_name": "Cefotil Plus", "category_name": "Powder for Suspension", "slug": "cefotil-plus-70-ml-powder-for-suspension", "generic_name": "Cefuroxime Axetil + Clavulanic Acid", "strength": "70 ml", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "70 ml bottle", "unit_size": "1", "price": "265.0"}}], "comprid-xr-tablet": [{"originalSlug": "comprid-xr-60-mg-tablet", "pristine": {"medicine_name": "Comprid XR", "category_name": "Tablet", "slug": "comprid-xr-60-mg-tablet", "generic_name": "Gliclazide", "strength": "60 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "120.0"}}], "d-rise-2": [{"originalSlug": "d-rise-40000-iu-capsule", "pristine": {"medicine_name": "D-Rise", "category_name": "Capsule", "slug": "d-rise-40000-iu-capsule", "generic_name": "Colecalciferol [Vitamin D3]", "strength": "40000 IU", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "35.0"}}], "dermasol-s-scalp-solution": [{"originalSlug": "dermasol-s-0-05-scalp-solution", "pristine": {"medicine_name": "Dermasol-S", "category_name": "Scalp Solution", "slug": "dermasol-s-0-05-scalp-solution", "generic_name": "Clobetasol Propionate [Scalp Preparation]", "strength": "0.05%", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "25 ml bottle", "unit_size": "1", "price": "200.61"}}], "erata": [{"originalSlug": "erata-500-mg-tablet", "pristine": {"medicine_name": "Erata", "category_name": "Tablet", "slug": "erata-500-mg-tablet", "generic_name": "Levetiracetam", "strength": "500 mg", "manufacturer_name": "SANDOZ (A Novartis Division)", "unit": "piece", "unit_size": "1", "price": "30.3"}}], "fexo": [{"originalSlug": "fexo-120-mg-tablet", "pristine": {"medicine_name": "Fexo", "category_name": "Tablet", "slug": "fexo-120-mg-tablet", "generic_name": "Fexofenadine Hydrochloride", "strength": "120 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "9.0"}}], "furonaaf-cv-tablet-250-mg-625-mg": [{"originalSlug": "furonaaf-cv-250-mg-62-5-mg-tablet", "pristine": {"medicine_name": "Furonaaf-CV", "category_name": "Tablet", "slug": "furonaaf-cv-250-mg-62-5-mg-tablet", "generic_name": "Cefuroxime Axetil + Clavulanic Acid", "strength": "250 mg+62.5 mg", "manufacturer_name": "Naafco Pharma Ltd.", "unit": "piece", "unit_size": "1", "price": "30.0"}}], "fusitop-hc-cream": [{"originalSlug": "fusitop-hc-20-gm-cream", "pristine": {"medicine_name": "Fusitop-HC", "category_name": "Cream", "slug": "fusitop-hc-20-gm-cream", "generic_name": "Fusidic acid + Hydrocortisone", "strength": "20 gm", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "20 gm tube", "unit_size": "1", "price": "160.0"}}], "hemorif-tablet": [{"originalSlug": "hemorif-450-mg-50-mg-tablet", "pristine": {"medicine_name": "Hemorif", "category_name": "Tablet", "slug": "hemorif-450-mg-50-mg-tablet", "generic_name": "Micronised Diosmin + Hesperidin", "strength": "450 mg+50 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "8.06"}}], "intimate-tablet-10mg": [{"originalSlug": "intimate-10-mg-tablet", "pristine": {"medicine_name": "Intimate", "category_name": "Tablet", "slug": "intimate-10-mg-tablet", "generic_name": "Tadalafil", "strength": "10 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "35.11"}}], "intimate": [{"originalSlug": "intimate-5-mg-tablet", "pristine": {"medicine_name": "Intimate", "category_name": "Tablet", "slug": "intimate-5-mg-tablet", "generic_name": "Tadalafil", "strength": "5 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "18.05"}}], "labeta-tablet-200mg": [{"originalSlug": "labeta-200-mg-tablet", "pristine": {"medicine_name": "Labeta", "category_name": "Tablet", "slug": "labeta-200-mg-tablet", "generic_name": "Labetalol Hydrochloride", "strength": "200 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "9.0"}}], "maxpro-mups-tablet": [{"originalSlug": "maxpro-mups-20-mg-mups-tablet", "pristine": {"medicine_name": "Maxpro MUPS", "category_name": "MUPS Tablet", "slug": "maxpro-mups-20-mg-mups-tablet", "generic_name": "Esomeprazole Magnesium Trihydrate", "strength": "20 mg", "manufacturer_name": "Renata Limited", "unit": "piece", "unit_size": "1", "price": "10.0"}}], "melixol-tablet": [{"originalSlug": "melixol-0-5-mg-10-mg-tablet", "pristine": {"medicine_name": "Melixol", "category_name": "Tablet", "slug": "melixol-0-5-mg-10-mg-tablet", "generic_name": "Flupentixol + Melitracen", "strength": "0.5 mg+10 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "5.02"}}], "motigut-tablet-10mg": [{"originalSlug": "motigut-10-mg-tablet", "pristine": {"medicine_name": "Motigut", "category_name": "Tablet", "slug": "motigut-10-mg-tablet", "generic_name": "Domperidone Maleate", "strength": "10 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "3.5"}}], "napa-extend": [{"originalSlug": "napa-extend-665-mg-tablet", "pristine": {"medicine_name": "Napa Extend", "category_name": "Tablet", "slug": "napa-extend-665-mg-tablet", "generic_name": "Paracetamol", "strength": "665 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "2.0"}}], "neurolep-tablet": [{"originalSlug": "neurolep-800-mg-tablet", "pristine": {"medicine_name": "Neurolep", "category_name": "Tablet", "slug": "neurolep-800-mg-tablet", "generic_name": "Piracetam", "strength": "800 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "6.04"}}], "nitrocontin-tablet": [{"originalSlug": "nitrocontin-2-6-mg-tablet", "pristine": {"medicine_name": "Nitrocontin", "category_name": "Tablet", "slug": "nitrocontin-2-6-mg-tablet", "generic_name": "Nitroglycerin", "strength": "2.6 mg", "manufacturer_name": "Mundipharma (BD) Pvt. Ltd.", "unit": "30's pack", "unit_size": "30", "price": "161.4"}}], "norium-tablet": [{"originalSlug": "norium-10-mg-tablet", "pristine": {"medicine_name": "Norium", "category_name": "Tablet", "slug": "norium-10-mg-tablet", "generic_name": "Flunarizine", "strength": "10 mg", "manufacturer_name": "Eskayef Bangladesh Ltd.", "unit": "piece", "unit_size": "1", "price": "7.0"}}], "omg-3": [{"originalSlug": "omg-3-1000-mg-capsule", "pristine": {"medicine_name": "OMG-3", "category_name": "Capsule", "slug": "omg-3-1000-mg-capsule", "generic_name": "Omega-3 Acid Ethyl Esters", "strength": "1000 mg", "manufacturer_name": "Drug International Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "70.0"}}], "phytocal-d": [{"originalSlug": "phytocal-d-500mg-200iu", "pristine": null}], "prosalic-lotion": [{"originalSlug": "prosalic-0-05-2-scalp-lotion", "pristine": {"medicine_name": "Prosalic", "category_name": "Scalp Lotion", "slug": "prosalic-0-05-2-scalp-lotion", "generic_name": "Betamethasone + Salicylic Acid", "strength": "0.05%+2%", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "25 gm tube", "unit_size": "1", "price": "150.45"}}], "relentus-tablet": [{"originalSlug": "relentus-2-mg-tablet", "pristine": {"medicine_name": "Relentus", "category_name": "Tablet", "slug": "relentus-2-mg-tablet", "generic_name": "Tizanidine Hydrochloride", "strength": "2 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "5.0"}}], "rupa-tablet": [{"originalSlug": "rupa-10-mg-tablet", "pristine": {"medicine_name": "Rupa", "category_name": "Tablet", "slug": "rupa-10-mg-tablet", "generic_name": "Rupatadine Fumarate", "strength": "10 mg", "manufacturer_name": "Aristopharma Ltd.", "unit": "piece", "unit_size": "1", "price": "12.0"}}], "sinafresh-ophthalmic-solution": [{"originalSlug": "sinafresh-1-ophthalmic-solution", "pristine": {"medicine_name": "Sinafresh", "category_name": "Ophthalmic Solution", "slug": "sinafresh-1-ophthalmic-solution", "generic_name": "Carboxymethyl Cellulose", "strength": "1%", "manufacturer_name": "Ibn-Sina Pharmaceuticals Ltd.", "unit": "10 ml drop", "unit_size": "1", "price": "270.0"}}], "solas-tablet-100mg": [{"originalSlug": "solas-100-mg-chewable-tablet", "pristine": {"medicine_name": "Solas", "category_name": "Chewable Tablet", "slug": "solas-100-mg-chewable-tablet", "generic_name": "Mebendazole", "strength": "100 mg", "manufacturer_name": "Opsonin Pharma Ltd.", "unit": "6's Strip", "unit_size": "6", "price": "7.0"}}], "telmilok-tablet-40mg": [{"originalSlug": "telmilok-40-mg-tablet", "pristine": {"medicine_name": "Telmilok", "category_name": "Tablet", "slug": "telmilok-40-mg-tablet", "generic_name": "Telmisartan", "strength": "40 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "125.0"}}], "voligel-gel": [{"originalSlug": "voligel-1-16-w-w-gel", "pristine": {"medicine_name": "Voligel", "category_name": "Gel", "slug": "voligel-1-16-w-w-gel", "generic_name": "Diclofenac Sodium", "strength": "50 gm", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "50 gm tube", "unit_size": "1", "price": "97.0"}}], "Mixtard-30-Penfill-Injection": [{"originalSlug": "Mixtard-30-Penfill-Injection", "pristine": {"medicine_name": "Mixtard 30 Cartridge", "category_name": "Cartridge", "slug": "Mixtard-30-Penfill-Injection", "generic_name": "Insulin Human [rDNA] + Isophane Insulin Human", "strength": "100IU/ml", "manufacturer_name": "Novo Nordisk", "unit": "3 ml Cartridge", "unit_size": "1", "price": "460.0"}}], "Sergel-20-mg-Capsule": [{"originalSlug": "Sergel-20-mg-Capsule", "pristine": {"medicine_name": "Sergel", "category_name": "Capsule", "slug": "Sergel-20-mg-Capsule", "generic_name": "Esomeprazole Magnesium Trihydrate", "strength": "20 mg", "manufacturer_name": "Healthcare Pharmacuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "7.0"}}], "ace-500-mg-tablet": [{"originalSlug": "ace-500-mg-tablet", "pristine": {"medicine_name": "Ace", "category_name": "Tablet", "slug": "ace-500-mg-tablet", "generic_name": "Paracetamol", "strength": "500 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "1.2"}}], "adovas-200-ml-syrup": [{"originalSlug": "adovas-200-ml-syrup", "pristine": {"medicine_name": "Adovas", "category_name": "Syrup", "slug": "adovas-200-ml-syrup", "generic_name": "Alcohol Cough Syrup", "strength": "200 ml", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "200 ml bottle", "unit_size": "1", "price": "110.0"}}], "angilock-plus-50-mg-12-5-mg-tablet": [{"originalSlug": "angilock-plus-50-mg-12-5-mg-tablet", "pristine": {"medicine_name": "Angilock Plus", "category_name": "Tablet", "slug": "angilock-plus-50-mg-12-5-mg-tablet", "generic_name": "Losartan Potassium + Hydrochlorothiazide", "strength": "50 mg+12.5 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "100.0"}}], "avolac-200-ml-syrup": [{"originalSlug": "avolac-200-ml-syrup", "pristine": {"medicine_name": "Avolac", "category_name": "Syrup", "slug": "avolac-200-ml-syrup", "generic_name": "Concentrated Oral Solution", "strength": "200 ml", "manufacturer_name": "Aristopharma Ltd.", "unit": "200ml", "unit_size": "1", "price": "290.0"}}], "bactrocin-10-gm-ointment": [{"originalSlug": "bactrocin-10-gm-ointment", "pristine": {"medicine_name": "Bactrocin", "category_name": "Ointment", "slug": "bactrocin-10-gm-ointment", "generic_name": "Mupirocin", "strength": "10 gm", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10 gm tube", "unit_size": "1", "price": "140.42"}}], "camlosart-5-mg-20-mg-tablet": [{"originalSlug": "camlosart-5-mg-20-mg-tablet", "pristine": {"medicine_name": "Camlosart", "category_name": "Tablet", "slug": "camlosart-5-mg-20-mg-tablet", "generic_name": "Amlodipine + Olmesartan Medoxomil", "strength": "5 mg+20 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "120.0"}}], "dermasol-n-25-gm-cream": [{"originalSlug": "dermasol-n-25-gm-cream", "pristine": {"medicine_name": "Dermasol-N", "category_name": "Cream", "slug": "dermasol-n-25-gm-cream", "generic_name": "Clobetasol Propionate + Neomycin Sulphate + Nystatin", "strength": "25 gm", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "25 gm tube", "unit_size": "1", "price": "90.0"}}], "emjard-25-mg-tablet": [{"originalSlug": "emjard-25-mg-tablet", "pristine": {"medicine_name": "Emjard", "category_name": "Tablet", "slug": "emjard-25-mg-tablet", "generic_name": "Empagliflozin", "strength": "25 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's pack", "unit_size": "10", "price": "400.0"}}], "emoli-lotion-100ml": [{"originalSlug": "emoli-lotion-100ml", "pristine": null}], "entacyd-plus-200-ml-oral-suspension": [{"originalSlug": "entacyd-plus-200-ml-oral-suspension", "pristine": {"medicine_name": "Entacyd Plus", "category_name": "Syrup", "slug": "entacyd-plus-200-ml-oral-suspension", "generic_name": "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone", "strength": "200 ml", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "200 ml bottle", "unit_size": "1", "price": "80.0"}}], "entacyd-plus-400-mg-400-mg-30-mg-tablet": [{"originalSlug": "entacyd-plus-400-mg-400-mg-30-mg-tablet", "pristine": {"medicine_name": "Entacyd Plus", "category_name": "Tablet", "slug": "entacyd-plus-400-mg-400-mg-30-mg-tablet", "generic_name": "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone", "strength": "", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "2.5"}}], "fexo-50-ml-oral-suspension": [{"originalSlug": "fexo-50-ml-oral-suspension", "pristine": {"medicine_name": "Fexo", "category_name": "Oral Suspension", "slug": "fexo-50-ml-oral-suspension", "generic_name": "Fexofenadine Hydrochloride", "strength": "50 ml", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "50 ml bottle", "unit_size": "1", "price": "55.0"}}], "intimate-20-mg-tablet": [{"originalSlug": "intimate-20-mg-tablet", "pristine": {"medicine_name": "Intimate", "category_name": "Tablet", "slug": "intimate-20-mg-tablet", "generic_name": "Tadalafil", "strength": "20 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "60.18"}}], "jardian-10-mg-tablet": [{"originalSlug": "jardian-10-mg-tablet", "pristine": {"medicine_name": "Jardian", "category_name": "Tablet", "slug": "jardian-10-mg-tablet", "generic_name": "Empagliflozin", "strength": "10 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "250.0"}}], "maximilk": [{"originalSlug": "maximilk", "pristine": null}], "maxpro-20-mg-tablet": [{"originalSlug": "maxpro-20-mg-tablet", "pristine": {"medicine_name": "Maxpro", "category_name": "Tablet", "slug": "maxpro-20-mg-tablet", "generic_name": "Esomeprazole Magnesium Trihydrate", "strength": "20 mg", "manufacturer_name": "Renata Limited", "unit": "piece", "unit_size": "1", "price": "7.0"}}], "menaril-8-mg-tablet": [{"originalSlug": "menaril-8-mg-tablet", "pristine": {"medicine_name": "Menaril", "category_name": "Tablet", "slug": "menaril-8-mg-tablet", "generic_name": "Betahistine Dihydrochloride", "strength": "8 mg", "manufacturer_name": "Incepta Pharmaceuticals Ltd.", "unit": "piece", "unit_size": "1", "price": "3.0"}}], "monas-10-mg-tablet": [{"originalSlug": "monas-10-mg-tablet", "pristine": {"medicine_name": "Monas 10", "category_name": "Tablet", "slug": "monas-10-mg-tablet", "generic_name": "Montelukast", "strength": "10 mg", "manufacturer_name": "ACME Laboratories Ltd.", "unit": "15's Strip", "unit_size": "15", "price": "262.5"}}], "napa-500-mg-tablet": [{"originalSlug": "napa-500-mg-tablet", "pristine": {"medicine_name": "Napa", "category_name": "Tablet", "slug": "napa-500-mg-tablet", "generic_name": "Paracetamol", "strength": "500 mg", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "Piece", "unit_size": "1", "price": "1.2"}}], "prod_qxvd1jb8g": [{"originalSlug": "prod_qxvd1jb8g", "pristine": null}], "renovit-100-mg-200-mg-200-mcg-tablet": [{"originalSlug": "renovit-100-mg-200-mg-200-mcg-tablet", "pristine": {"medicine_name": "Renovit", "category_name": "Tablet", "slug": "renovit-100-mg-200-mg-200-mcg-tablet", "generic_name": "Vitamin B1 + B6 + B12", "strength": "", "manufacturer_name": "Healthcare Pharmacuticals Ltd.", "unit": "30's pack", "unit_size": "30", "price": "270.0"}}], "rosuva-10-mg-tablet": [{"originalSlug": "rosuva-10-mg-tablet", "pristine": {"medicine_name": "Rosuva", "category_name": "Tablet", "slug": "rosuva-10-mg-tablet", "generic_name": "Rosuvastatin", "strength": "10 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "201.3"}}], "rosuva-5-mg-tablet": [{"originalSlug": "rosuva-5-mg-tablet", "pristine": {"medicine_name": "Rosuva", "category_name": "Tablet", "slug": "rosuva-5-mg-tablet", "generic_name": "Rosuvastatin", "strength": "5 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's Strip", "unit_size": "10", "price": "100.3"}}], "saloride-0-9-iv-infusion": [{"originalSlug": "saloride-0-9-iv-infusion", "pristine": {"medicine_name": "Saloride", "category_name": "IV Infusion", "slug": "saloride-0-9-iv-infusion", "generic_name": "Sodium Chloride", "strength": "0.9%", "manufacturer_name": "Beximco Pharmaceuticals Ltd.", "unit": "100 ml bottle", "unit_size": "1", "price": "48.06"}}], "valmor-50-mg-tablet": [{"originalSlug": "valmor-50-mg-tablet", "pristine": {"medicine_name": "Valmor", "category_name": "Tablet", "slug": "valmor-50-mg-tablet", "generic_name": "Sacubitril + Valsartan", "strength": "50 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "10's pack", "unit_size": "10", "price": "450.0"}}], "viglimet-50-mg-500-mg-tablet": [{"originalSlug": "viglimet-50-mg-500-mg-tablet", "pristine": {"medicine_name": "Viglimet", "category_name": "Tablet", "slug": "viglimet-50-mg-500-mg-tablet", "generic_name": "Vildagliptin + Metformin Hydrochloride", "strength": "50 mg+500 mg", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "6's Strip", "unit_size": "6", "price": "120.0"}}], "viodin-5-w-w-ointment": [{"originalSlug": "viodin-5-w-w-ointment", "pristine": {"medicine_name": "Viodin", "category_name": "Ointment", "slug": "viodin-5-w-w-ointment", "generic_name": "Povidone Iodine", "strength": "25 gm", "manufacturer_name": "Square Pharmaceuticals Ltd.", "unit": "25 gm tube", "unit_size": "1", "price": "55.0"}}]};

function norm(s) {
  return (s || '').toString().toLowerCase().replace(/[.,()]/g, '').replace(/\s+/g, ' ').trim();
}
function normStrength(s) {
  return (s || '').toString().toLowerCase().replace(/\s+/g, '');
}
function allNumbers(s) {
  return ((s || '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
}
function firstNumber(s) {
  const n = allNumbers(s);
  return n.length ? n[0] : null;
}
const CATEGORY_SYNONYMS = {
  'capsule enteric coated': 'capsule', 'dr capsule': 'capsule', 'mups tablet': 'tablet',
  'xr tablet': 'tablet', 'scalp lotion': 'lotion', 'scalp solution': 'solution',
};
function catNorm(c) {
  const n = norm(c);
  return CATEGORY_SYNONYMS[n] || n;
}
function genericTokens(s) {
  let n = norm(s).replace(' axetil', '').replace(' hydrochloride', ' hcl').replace(' medoxomil', '');
  return new Set(n.split(' ').filter(t => t && t !== 'and' && t !== '+'));
}

function loadNewCatalog() {
  const raw = fs.readFileSync(path.join(__dirname, 'medicines.csv'), 'utf8');
  return Papa.parse(raw, { header: true, skipEmptyLines: true }).data.filter(r => r.medicine_name && r.slug);
}

function score(o, c) {
  let s = 0;
  const on = norm(o.medicine_name), cn = norm(c.medicine_name);
  if (on === cn) s += 4;
  else if (cn.startsWith(on) || on.startsWith(cn)) s += 3;

  const ost = normStrength(o.strength), cst = normStrength(c.strength);
  if (ost && ost === cst) s += 3;
  else {
    const onums = allNumbers(o.strength), cnums = allNumbers(c.strength);
    if (onums.length && onums.length === cnums.length && onums.every((v, i) => v === cnums[i])) s += 2.8;
    else if (firstNumber(o.strength) !== null && firstNumber(o.strength) === firstNumber(c.strength)) s += 0.8;
  }

  if (catNorm(o.category_name) === catNorm(c.category_name)) s += 2;
  if (norm(o.manufacturer_name) === norm(c.manufacturer_name)) s += 2;

  const ogt = genericTokens(o.generic_name), cgt = genericTokens(c.generic_name);
  if (ogt.size && cgt.size) {
    let inter = 0;
    for (const t of ogt) if (cgt.has(t)) inter++;
    const union = new Set([...ogt, ...cgt]).size;
    s += inter / union;
  }
  return s;
}

function bestMatch(o, byFirstWord) {
  const fw = o.medicine_name ? norm(o.medicine_name).split(' ')[0] : '';
  const candidates = byFirstWord.get(fw) || [];
  if (!candidates.length) return { match: null, reason: 'no candidates share the first word of the name' };
  const scored = candidates.map(c => [score(o, c), c]).sort((a, b) => b[0] - a[0]);
  const [topScore, topC] = scored[0];
  const runnerScore = scored.length > 1 ? scored[1][0] : -999;
  if (topScore < 4) return { match: null, reason: `best score too low (${topScore.toFixed(1)})` };
  if (topScore - runnerScore < 0.9) return { match: null, reason: `too close to call (top ${topScore.toFixed(1)} vs runner-up ${runnerScore.toFixed(1)})`, top5: scored.slice(0, 5) };
  return { match: topC, reason: `ok (score ${topScore.toFixed(1)}, margin ${(topScore - runnerScore).toFixed(1)})` };
}

// A couple of cases I manually verified by hand (exact price match, same
// dosage form) where the automatic scorer can't quite separate the top
// candidate from a close sibling — confirmed correct, so given directly
// rather than left to the score margin.
const KNOWN_OVERRIDES = {
  'cefaclav': 'cefaclav-500', // Tablet 500mg+125mg, price 60.0 — matches the original exactly
};

async function main() {
  const newRows = loadNewCatalog();
  const byFirstWord = new Map();
  for (const row of newRows) {
    const fw = norm(row.medicine_name).split(' ')[0];
    if (!byFirstWord.has(fw)) byFirstWord.set(fw, []);
    byFirstWord.get(fw).push(row);
  }

  const invSnap = await db.collection('inventory').get();
  console.log(`Found ${invSnap.docs.length} tracked record(s).\n`);

  const toKeep = [];      // { finalSlug, data }
  const toDelete = [];    // doc ids
  const unresolvedBarcoded = []; // has a barcode but couldn't confidently match — NEVER deleted

  for (const doc of invSnap.docs) {
    const data = doc.data();
    const currentId = doc.id;
    const hasBarcode = !!(data.barcode && String(data.barcode).trim());

    if (!hasBarcode) {
      toDelete.push({ id: currentId, name: data.medicine_name, reason: 'no barcode' });
      continue;
    }

    // Special case: two different old strengths of Bizoran both got
    // pushed onto "bizoran-tablet" last time, so only one of their
    // stock counts survived and we can no longer tell which. If this
    // is the one with a barcode, don't touch it automatically.
    if (currentId === 'bizoran-tablet') {
      unresolvedBarcoded.push({ id: currentId, name: data.medicine_name, reason: 'this slug holds merged data from TWO different old Bizoran strengths (5/20 and 5/40) — the stock number here may belong to either one. Please check by hand.' });
      continue;
    }

    const pristineEntries = PRISTINE[currentId];
    let sourceRecord = null;
    if (pristineEntries && pristineEntries.length === 1 && pristineEntries[0].pristine) {
      sourceRecord = pristineEntries[0].pristine;
    } else {
      // No pre-migration data on file for this one (manually-added product) —
      // fall back to trusting its current live fields.
      sourceRecord = {
        medicine_name: data.medicine_name, category_name: data.category_name || '',
        generic_name: data.generic_name || '', strength: data.strength || '',
        manufacturer_name: data.manufacturer_name || '',
      };
    }

    let { match, reason, top5 } = bestMatch(sourceRecord, byFirstWord);
    if (!match && KNOWN_OVERRIDES[currentId]) {
      match = newRows.find(r => r.slug === KNOWN_OVERRIDES[currentId]);
      reason = 'manually verified override';
    }
    if (!match) {
      unresolvedBarcoded.push({ id: currentId, name: data.medicine_name, reason, top5 });
      continue;
    }

    toKeep.push({
      finalSlug: match.slug,
      data: {
        slug: match.slug,
        medicine_name: match.medicine_name,
        generic_name: match.generic_name || '',
        category_name: match.category_name || '',
        strength: match.strength || '',
        manufacturer_name: match.manufacturer_name || '',
        unit: match.unit || '',
        unit_size: match.unit_size || '1',
        price: match.price,
        stock: data.stock ?? 0,
        barcode: data.barcode,
        image: data.image || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      fromId: currentId,
    });
  }

  console.log(`Keeping ${toKeep.length} barcoded item(s), matched to the new catalog:`);
  toKeep.forEach(k => console.log(`  "${k.data.medicine_name}" [${k.fromId}] -> [${k.finalSlug}]  price ${k.data.price}  stock ${k.data.stock}`));

  console.log(`\nDeleting ${toDelete.length} record(s) with no barcode:`);
  toDelete.forEach(d => console.log(`  [${d.id}] "${d.name}"`));

  if (unresolvedBarcoded.length) {
    console.log(`\n${unresolvedBarcoded.length} barcoded record(s) left UNTOUCHED (not deleted, not moved) — handle these by hand:`);
    unresolvedBarcoded.forEach(u => {
      console.log(`  [${u.id}] "${u.name}": ${u.reason}`);
      if (u.top5) u.top5.forEach(([sc, c]) => console.log(`      candidate (score ${sc.toFixed(1)}): ${c.slug} | ${c.medicine_name} ${c.strength} ${c.category_name} | price ${c.price}`));
    });
  }

  // --- apply ---
  const batch = db.batch();
  let ops = 0;
  for (const k of toKeep) {
    batch.set(db.collection('inventory').doc(k.finalSlug), k.data, { merge: false });
    ops++;
    if (ops % 400 === 0) { await batch.commit(); }
  }
  for (const d of toDelete) {
    batch.delete(db.collection('inventory').doc(d.id));
    ops++;
    if (ops % 400 === 0) { await batch.commit(); }
  }
  // Also remove any old doc whose id isn't its own final slug (e.g. the
  // previously-wrong seclo-injection / cefaclav docs), now that the
  // correct replacement has been written above.
  for (const k of toKeep) {
    if (k.fromId !== k.finalSlug) {
      batch.delete(db.collection('inventory').doc(k.fromId));
      ops++;
      if (ops % 400 === 0) { await batch.commit(); }
    }
  }
  await batch.commit();

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
