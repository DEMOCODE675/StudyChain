"""Central academic hierarchy used for validation and frontend navigation."""

from copy import deepcopy

ACADEMIC_STRUCTURE: dict[str, dict[str, dict[str, list[str]]]] = {
    "CSE": {
        "1st Year": {
            "Semester 1": [
                "Physics",
                "Mathematics",
                "Programming Basics",
                "ACAD",
                "ADAC",
                "Soft Skills",
                "Emerging Trends",
                "Python Lab",
            ],
            "Semester 2": [
                
                "Mathematics",
                "Physics",
                "Chemistry",
                "Electronics",
                "Electrical",
                "Mechanical",
                "ADAC",
                "Soft Skills",
                "Emerging Trends",
                "Python Programming Lab",
                "Electronics Lab",
                "Chemistry Lab",
                "Electrical Lab",
                "Physics Lab",
                "Digital Workshop",

                


            ],
        },
        "2nd Year": {
            "Semester 3": ["Data Structures", "Digital Electronics"],
            "Semester 4": ["Operating Systems", "DBMS"],
        },
    },
    "ECE": {
        "1st Year": {
            "Semester 1": [
                "Physics",
                "Mathematics",
                "ACAD",
                "ADAC",
                "Soft Skills",
                "Emerging Trends",
            ],
            "Semester 2": [
                "Mathematics",
                "Physics",
                "Basic Electronics",
                "Electrical",
                "Mechanical",
                "ADAC",
                "Soft Skills",
                "Emerging Trends",
                "Python Lab",
                "Electronics Lab",
                "Chemistry Lab",
            ],
        },
        "2nd Year": {
            "Semester 3": ["Signals and Systems", "Network Theory"],
            "Semester 4": ["Microprocessors", "Communication Systems"],
        },
    },
    "ME": {
        "1st Year": {
            "Semester 1": [
                "Engineering Mechanics",
                "Mathematics",
                "ACAD",
                "ADAC",
                "Soft Skills",
                "Emerging Trends",
            ],
            "Semester 2": [
                "Mathematics",
                "Physics",
                "Thermodynamics",
                "Material Science",
                "Electrical",
                "Mechanical",
                "ADAC",
                "Soft Skills",
                "Emerging Trends",
                "Python Lab",
                "Electronics Lab",
                "Chemistry Lab",
            ],
        }
    },
}


def get_academic_structure() -> dict[str, dict[str, dict[str, list[str]]]]:
    """Return a defensive copy so callers cannot mutate the shared constant."""
    return deepcopy(ACADEMIC_STRUCTURE)


def is_valid_structure_path(branch: str, year: str, semester: str, subject: str) -> bool:
    years = ACADEMIC_STRUCTURE.get(branch)
    if not years:
        return False

    semesters = years.get(year)
    if not semesters:
        return False

    subjects = semesters.get(semester)
    if not subjects:
        return False

    return subject in subjects
