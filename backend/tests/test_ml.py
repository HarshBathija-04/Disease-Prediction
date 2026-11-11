from main_app import ml


def test_model_has_one_feature_per_symptom():
    assert ml.load_model().feature_log_prob_.shape[1] == len(ml.SYMPTOMS) == 132


def test_predicts_fungal_infection_from_skin_symptoms():
    disease, confidence, specialist = ml.predict(["itching", "skin_rash", "nodal_skin_eruptions"])
    assert disease == "Fungal infection"
    assert 90 <= confidence <= 100
    assert specialist == "Dermatologist"


def test_rheumatologist_mapping_is_not_overwritten():
    # The legacy view had an `if` instead of `elif`, which turned Rheumatologist into "other".
    assert ml.SPECIALIST_BY_DISEASE["Arthritis"] == "Rheumatologist"


def test_display_names_and_labels_are_readable():
    disease, _, specialist = ml.predict(["joint_pain", "knee_pain", "swelling_joints", "movement_stiffness"])
    assert disease == "Osteoarthritis"
    assert specialist == "Rheumatologist"
    assert ml.label("skin_rash") == "Skin rash"
    assert ml.label("cold_hands_and_feets") == "Cold hands and feet"


def test_conditions_without_a_clear_specialist_go_to_a_general_physician():
    for disease in ["Dengue", "Malaria", "Diabetes ", "Hypothyroidism", "Varicose veins"]:
        assert ml.SPECIALIST_BY_DISEASE.get(disease, "General Physician") == "General Physician"
