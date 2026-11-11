"""Symptom -> disease prediction using the bundled MultinomialNB model (`trained_model`)."""

import warnings
from functools import lru_cache
from pathlib import Path

import joblib

MODEL_PATH = Path(__file__).resolve().parent.parent / "trained_model"

# Feature order the model was trained on. Order matters; `fluid_overload` really appears twice.
SYMPTOMS = [
    "itching",
    "skin_rash",
    "nodal_skin_eruptions",
    "continuous_sneezing",
    "shivering",
    "chills",
    "joint_pain",
    "stomach_pain",
    "acidity",
    "ulcers_on_tongue",
    "muscle_wasting",
    "vomiting",
    "burning_micturition",
    "spotting_ urination",
    "fatigue",
    "weight_gain",
    "anxiety",
    "cold_hands_and_feets",
    "mood_swings",
    "weight_loss",
    "restlessness",
    "lethargy",
    "patches_in_throat",
    "irregular_sugar_level",
    "cough",
    "high_fever",
    "sunken_eyes",
    "breathlessness",
    "sweating",
    "dehydration",
    "indigestion",
    "headache",
    "yellowish_skin",
    "dark_urine",
    "nausea",
    "loss_of_appetite",
    "pain_behind_the_eyes",
    "back_pain",
    "constipation",
    "abdominal_pain",
    "diarrhoea",
    "mild_fever",
    "yellow_urine",
    "yellowing_of_eyes",
    "acute_liver_failure",
    "fluid_overload",
    "swelling_of_stomach",
    "swelled_lymph_nodes",
    "malaise",
    "blurred_and_distorted_vision",
    "phlegm",
    "throat_irritation",
    "redness_of_eyes",
    "sinus_pressure",
    "runny_nose",
    "congestion",
    "chest_pain",
    "weakness_in_limbs",
    "fast_heart_rate",
    "pain_during_bowel_movements",
    "pain_in_anal_region",
    "bloody_stool",
    "irritation_in_anus",
    "neck_pain",
    "dizziness",
    "cramps",
    "bruising",
    "obesity",
    "swollen_legs",
    "swollen_blood_vessels",
    "puffy_face_and_eyes",
    "enlarged_thyroid",
    "brittle_nails",
    "swollen_extremeties",
    "excessive_hunger",
    "extra_marital_contacts",
    "drying_and_tingling_lips",
    "slurred_speech",
    "knee_pain",
    "hip_joint_pain",
    "muscle_weakness",
    "stiff_neck",
    "swelling_joints",
    "movement_stiffness",
    "spinning_movements",
    "loss_of_balance",
    "unsteadiness",
    "weakness_of_one_body_side",
    "loss_of_smell",
    "bladder_discomfort",
    "foul_smell_of urine",
    "continuous_feel_of_urine",
    "passage_of_gases",
    "internal_itching",
    "toxic_look_(typhos)",
    "depression",
    "irritability",
    "muscle_pain",
    "altered_sensorium",
    "red_spots_over_body",
    "belly_pain",
    "abnormal_menstruation",
    "dischromic _patches",
    "watering_from_eyes",
    "increased_appetite",
    "polyuria",
    "family_history",
    "mucoid_sputum",
    "rusty_sputum",
    "lack_of_concentration",
    "visual_disturbances",
    "receiving_blood_transfusion",
    "receiving_unsterile_injections",
    "coma",
    "stomach_bleeding",
    "distention_of_abdomen",
    "history_of_alcohol_consumption",
    "fluid_overload",
    "blood_in_sputum",
    "prominent_veins_on_calf",
    "palpitations",
    "painful_walking",
    "pus_filled_pimples",
    "blackheads",
    "scurring",
    "skin_peeling",
    "silver_like_dusting",
    "small_dents_in_nails",
    "inflammatory_nails",
    "blister",
    "red_sore_around_nose",
    "yellow_crust_ooze",
]
SYMPTOM_SET = set(SYMPTOMS)

# The legacy mapping sent several conditions to unrelated specialists (diabetes to a gastroenterologist,
# dengue to an allergist, hypothyroidism to ENT). Anything without a clear specialist goes to a General
# Physician; unlisted diseases fall back to General Physician too.
SPECIALIST_BY_DISEASE = {
    disease: specialist
    for specialist, diseases in {
        "Rheumatologist": ["Osteoarthristis", "Arthritis"],
        "Cardiologist": ["Heart attack", "Hypertension "],
        "ENT specialist": ["(vertigo) Paroymsal  Positional Vertigo"],
        "Neurologist": ["Paralysis (brain hemorrhage)", "Migraine", "Cervical spondylosis"],
        "Allergist/Immunologist": ["Allergy", "Bronchial Asthma", "Drug Reaction"],
        "Urologist": ["Urinary tract infection"],
        "Dermatologist": ["Acne", "Chicken pox", "Fungal infection", "Psoriasis", "Impetigo"],
        "Gastroenterologist": [
            "Peptic ulcer diseae",
            "GERD",
            "Chronic cholestasis",
            "Gastroenteritis",
            "Hepatitis E",
            "Alcoholic hepatitis",
            "Jaundice",
            "hepatitis A",
            "Hepatitis B",
            "Hepatitis C",
            "Hepatitis D",
            "Dimorphic hemmorhoids(piles)",
        ],
    }.items()
    for disease in diseases
}

# The training data has typos in some labels; show readable names without retraining.
DISEASE_DISPLAY = {
    "Osteoarthristis": "Osteoarthritis",
    "Peptic ulcer diseae": "Peptic ulcer disease",
    "Dimorphic hemmorhoids(piles)": "Hemorrhoids (piles)",
    "(vertigo) Paroymsal  Positional Vertigo": "Benign paroxysmal positional vertigo",
    "hepatitis A": "Hepatitis A",
}
SYMPTOM_LABELS = {
    "cold_hands_and_feets": "Cold hands and feet",
    "swollen_extremeties": "Swollen extremities",
    "scurring": "Scarring",
    "dischromic _patches": "Discoloured patches",
    "spotting_ urination": "Spotting during urination",
    "toxic_look_(typhos)": "Toxic look (typhoid)",
    "foul_smell_of urine": "Foul-smelling urine",
}

SPECIALIZATIONS = sorted(set(SPECIALIST_BY_DISEASE.values())) + ["General Physician"]


def label(symptom):
    """'skin_rash' -> 'Skin rash'."""
    if symptom in SYMPTOM_LABELS:
        return SYMPTOM_LABELS[symptom]
    text = " ".join(symptom.replace("_", " ").split())
    return text[:1].upper() + text[1:]


@lru_cache(maxsize=1)
def load_model():
    with warnings.catch_warnings():
        # Pickled with scikit-learn 0.21; MultinomialNB's fitted arrays are unchanged in newer versions.
        warnings.simplefilter("ignore")
        return joblib.load(MODEL_PATH)


def predict(symptoms):
    """Return (disease, confidence 0-100, specialist) for a list of known symptom keys."""
    chosen = set(symptoms)
    vector = [[1 if name in chosen else 0 for name in SYMPTOMS]]
    model = load_model()
    disease = str(model.predict(vector)[0])
    confidence = round(float(model.predict_proba(vector).max()) * 100, 2)
    return (
        DISEASE_DISPLAY.get(disease, disease.strip()),
        confidence,
        SPECIALIST_BY_DISEASE.get(disease, "General Physician"),
    )
