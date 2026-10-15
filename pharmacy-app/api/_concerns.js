// Groups the catalogue by what customers actually shop for (skin care,
// dental, diabetes ...) instead of the dosage form in the CSV (tablet,
// syrup ...). Each medicine is assigned ONE concern by simple keyword rules
// on its category, generic and brand name. Rules run top to bottom; first
// match wins, so order matters. Anything unmatched falls into "Other".
//
// This is a browsing aid, not medical advice: it only decides which shelf a
// product is shown on. Search still matches everything by name/generic.

const CONCERNS = [
  { id: 'skin',      label: 'Skin & Hair Care',       icon: 'skin',      tone: 0 },
  { id: 'dental',    label: 'Dental & Oral Care',     icon: 'dental',    tone: 1 },
  { id: 'diabetes',  label: 'Diabetes Care',          icon: 'diabetes',  tone: 2 },
  { id: 'vitamins',  label: 'Vitamins & Supplements', icon: 'vitamins',  tone: 3 },
  { id: 'surgical',  label: 'Surgical & First Aid',   icon: 'surgical',  tone: 4 },
  { id: 'sexual',    label: 'Sexual Wellness',        icon: 'sexual',    tone: 5 },
  { id: 'heart',     label: 'Heart & Blood Pressure', icon: 'heart',     tone: 4 },
  { id: 'digestive', label: 'Digestive Health',       icon: 'digestive', tone: 1 },
  { id: 'pain',      label: 'Pain & Fever',           icon: 'pain',      tone: 0 },
  { id: 'cold',      label: 'Cold, Cough & Allergy',  icon: 'cold',      tone: 2 },
  { id: 'infection', label: 'Infection Care',         icon: 'infection', tone: 3 },
  { id: 'eyeear',    label: 'Eye & Ear Care',         icon: 'eye',       tone: 5 },
  { id: 'women',     label: "Women's Health",         icon: 'women',     tone: 4 },
  { id: 'baby',      label: 'Baby & Child',           icon: 'baby',      tone: 1 },
  { id: 'brain',     label: 'Brain, Nerves & Sleep',  icon: 'brain',     tone: 3 },
  { id: 'other',     label: 'More Medicines',         icon: 'pill',      tone: 0 },
];

const re = (s) => new RegExp(s, 'i');

// Pass A: rules decided mainly by the product form / category.
const BY_FORM = [
  ['baby',     re('baby|paediatric|pediatric|infant'), null],
  ['eyeear',   re('eye|ophthalm|\\bear\\b|ear drop|e/e|intravitreal'), null],
  ['dental',   re('mouth ?wash|oral paste|oral gel|dental'), re('sodium fluoride|benzydamine|triamcinolone')],
  ['surgical', re('hand rub|sanitizer|test strip|irrigation|dialysis|infusion|nfusion|iv injection or'), re('povidone|iodine|sodium chloride|dextrose|ringer|glucose iv|water for injection')],
  ['women',    re("women|vaginal"), null],
  ['skin',     re('cream|ointment|lotion|shampoo|topical|scalp|medicated bar|gel|soap|\\bbar\\b'), re('clotrimazole|terbinafine|miconazole|ketoconazole|betamethasone|mometasone|clobetasol|fusidic|mupirocin|permethrin|isotretinoin|adapalene|tretinoin|benzoyl|calamine|minoxidil|tacrolimus|sulfadiazine|luliconazole|sertaconazole|hydroquinone|azelaic')],
];

// Pass B: rules decided by what the medicine contains (generic or brand).
const BY_GENERIC = [
  ['sexual',    re('sildenafil|tadalafil|vardenafil|dapoxetine|levonorgestrel|ulipristal|desogestrel|ethinyl|drospirenone|condom|contracept|norgestrel|etonogestrel|medroxyprogesterone')],
  ['diabetes',  re('metformin|glimepiride|gliclazide|glipizide|glibenclamide|sitagliptin|vildagliptin|linagliptin|saxagliptin|teneligliptin|pioglitazone|empagliflozin|dapagliflozin|canagliflozin|insulin|acarbose|repaglinide|voglibose|semaglutide|liraglutide|glucose test|glucometer|lancet')],
  ['heart',     re('amlodipine|losartan|telmisartan|valsartan|olmesartan|candesartan|irbesartan|azilsartan|bisoprolol|atenolol|metoprolol|carvedilol|nebivolol|propranolol|atorvastatin|rosuvastatin|simvastatin|pitavastatin|clopidogrel|ticagrelor|prasugrel|warfarin|rivaroxaban|apixaban|dabigatran|isosorbide|nitroglycerin|glyceryl trinitrate|ramipril|enalapril|lisinopril|perindopril|hydrochlorothiazide|chlorthalidone|indapamide|furosemide|torsemide|spironolactone|ivabradine|trimetazidine|ranolazine|fenofibrate|ezetimibe|digoxin|amiodarone|diltiazem|verapamil|nifedipine|cilnidipine|clonidine|methyldopa|hydralazine|sacubitril|aspirin.*(75|81)|enoxaparin|heparin|diosmin|hesperidin|vericiguat|finerenone|prazosin|pentoxifylline|cilostazol')],
  ['digestive', re('omeprazole|esomeprazole|pantoprazole|rabeprazole|lansoprazole|dexlansoprazole|ranitidine|famotidine|nizatidine|domperidone|ondansetron|granisetron|metoclopramide|itopride|levosulpiride|antacid|aluminium|aluminum|magnesium hydroxide|simethicone|dimethicone|tiemonium|hyoscine|drotaverine|mebeverine|otilonium|lactulose|bisacodyl|loperamide|racecadotril|saline|oral rehydration|\\bors\\b|probiotic|lactobacillus|bacillus|saccharomyces|sucralfate|ursodeoxycholic|mesalazine|sulfasalazine|albendazole|mebendazole|nitazoxanide|pyrantel|sodium alginate|rebamipide|bismuth|esomeprazole|vonoprazan|picosulfate|prucalopride|dicycloverine|dicyclomine|palonosetron|levamisole|domperidone|senna|ispaghula|psyllium|glycerin supp|trimebutine')],
  ['cold',      re('cetirizine|levocetirizine|fexofenadine|loratadine|desloratadine|montelukast|salbutamol|albuterol|levosalbutamol|ambroxol|bromhexine|guaifenesin|dextromethorphan|pseudoephedrine|phenylephrine|chlorpheniramine|ketotifen|doxofylline|theophylline|budesonide|formoterol|tiotropium|ipratropium|fluticasone|beclomethasone|terbutaline|acetylcysteine|carbocisteine|hydroxyzine|bilastine|rupatadine|oxymetazoline|xylometazoline|cough|inhal|nebuli|nasal|respule|cold|butamirate|ebastine|promethazine|bambuterol|doxophylline|guaiphenesin|diphenhydramine|dextro')],
  ['pain',      re('paracetamol|acetaminophen|ibuprofen|diclofenac|naproxen|ketorolac|aceclofenac|etoricoxib|celecoxib|piroxicam|tramadol|mefenamic|nimesulide|aspirin|ketoprofen|flurbiprofen|thiocolchicoside|tizanidine|baclofen|eperisone|methocarbamol|orphenadrine|tolperisone|indomethacin|meloxicam|colchicine|allopurinol|febuxostat|nalbuphine|pethidine|morphine|mirogabalin|nabumetone|tolfenamic|tenoxicam|tapentadol|lornoxicam|diacerein|glucosamine|dexketoprofen')],
  ['brain',     re('clonazepam|alprazolam|diazepam|lorazepam|bromazepam|escitalopram|citalopram|sertraline|fluoxetine|paroxetine|fluvoxamine|venlafaxine|duloxetine|mirtazapine|amitriptyline|nortriptyline|olanzapine|quetiapine|risperidone|aripiprazole|haloperidol|levetiracetam|carbamazepine|valpro|gabapentin|pregabalin|lamotrigine|topiramate|phenytoin|zolpidem|melatonin|betahistine|flunarizine|cinnarizine|sumatriptan|rizatriptan|donepezil|memantine|piracetam|citicoline|lithium|buspirone|tofisopam|etizolam|flupenthixol|melitracen|trihexyphenidyl|midazolam|clobazam|rivastigmine|levodopa|pizotifen|tetrabenazine|promethazine|oxcarbazepine|lacosamide|zonisamide|perampanel|escitalopram')],
  ['vitamins',  re('vitamin|vit\\.|multivit|calcium|zinc|iron|ferrous|ferric|folic|folate|omega|fish oil|cod liver|magnesium|biotin|cholecalciferol|ergocalciferol|calcitriol|alfacalcidol|cyanocobalamin|methylcobalamin|mecobalamin|ascorbic|thiamine|pyridoxine|riboflavin|niacin|nicotinamide|b complex|b-complex|carnitine|coenzyme|coq10|protein|amino acid|lysine|selenium|iodine supp|lycopene|glucosamine|chondroitin|collagen|evening primrose|ginseng|spirulina|colostrum|hematinic|haematinic|electrolyte|astaxanthin|sucralose|potassium citrate')],
  ['infection', re('cef|ceph|cillin|mycin|floxacin|cycline|metronidazole|tinidazole|ornidazole|secnidazole|fluconazole|itraconazole|voriconazole|nystatin|griseofulvin|acyclovir|valacyclovir|oseltamivir|famciclovir|tenofovir|entecavir|sofosbuvir|rifa|isoniazid|ethambutol|pyrazinamide|linezolid|meropenem|imipenem|ertapenem|aztreonam|gentamicin|amikacin|tobramycin|vancomycin|teicoplanin|colistin|polymyxin|cotrimoxazole|trimethoprim|sulfamethoxazole|nitrofurantoin|fosfomycin|ivermectin|chloroquine|artemether|lumefantrine|primaquine|praziquantel|bactericid|tazobactam|sulbactam|clavul|cloxacillin|fusidic')],
  ['women',     re('progesterone|dydrogesterone|norethisterone|estradiol|estrogen|clomiphene|letrozole|tranexamic|misoprostol|oxytocin|methylergometrine|ospemifene|raloxifene|bromocriptine|cabergoline')],
  ['skin',      re('clotrimazole|terbinafine|miconazole|ketoconazole|betamethasone|mometasone|hydrocortisone|clobetasol|permethrin|isotretinoin|adapalene|tretinoin|minoxidil|finasteride.*topical|calamine|sunscreen|zinc oxide|urea|salicylic|antiseptic|chlorhexidine|silver')],
];

function concernOf(r) {
  const cat = String(r.category_name || '');
  const gen = String(r.generic_name || '');
  const name = String(r.medicine_name || '');
  for (const [id, catRe, genRe] of BY_FORM) {
    if (catRe && catRe.test(cat)) return id;
    if (genRe && genRe.test(gen)) {
      // generic-only form rules (e.g. fluoride, povidone) apply to any form
      return id;
    }
  }
  const hay = gen + ' ' + name;
  for (const [id, rx] of BY_GENERIC) {
    if (rx.test(gen) || (gen === '' && rx.test(name))) return id;
  }
  // category-only fallbacks for oddly-named items
  if (/inhal|nasal|nebul|respule/i.test(cat)) return 'cold';
  if (/injection/i.test(cat) && /vit|b12|cobalamin/i.test(hay)) return 'vitamins';
  return 'other';
}

module.exports = { CONCERNS, concernOf };
