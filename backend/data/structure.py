"""Central academic hierarchy used for validation and frontend navigation."""

from copy import deepcopy

ACADEMIC_STRUCTURE: dict[str, dict[str, dict[str, list[str]]]] = {
    "CSE": {
        "1st Year": {
            "Semester 1": ["Physics", "Mathematics", "Programming Basics"],
            "Semester 2": ["Chemistry", "Electronics", "Engineering Graphics"],
        },
        "2nd Year": {
            "Semester 3": ["Data Structures", "Digital Electronics"],
            "Semester 4": ["Operating Systems", "DBMS"],
        },
    },
    "ECE": {
        "1st Year": {
            "Semester 1": ["Physics", "Mathematics"],
            "Semester 2": ["Basic Electronics"],
        },
        "2nd Year": {
            "Semester 3": ["Signals and Systems", "Network Theory"],
            "Semester 4": ["Microprocessors", "Communication Systems"],
        },
    },
    "ME": {
        "1st Year": {
            "Semester 1": ["Engineering Mechanics", "Mathematics"],
            "Semester 2": ["Thermodynamics", "Material Science"],
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
