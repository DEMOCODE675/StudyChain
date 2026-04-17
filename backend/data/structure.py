"""Central academic hierarchy used for validation and frontend navigation."""

from copy import deepcopy

ACADEMIC_STRUCTURE: dict[str, dict[str, dict[str, list[str]]]] = {
    "CSE": {
        "1st Year": {
            "Semester 1": [
                "Physics",
                "Mathematics",
                "Programming Basics",
                "Soft Skills",
                "Emerging Trends : 1",
                "C Programming Lab",
            ],
            "Semester 2": [
                
                "Mathematics",
                "Physics",
                "Chemistry",
                "Electronics",
                "Electrical",
                "Mechanical",
                "ACAD",
                "Soft Skills",
                "Emerging Trends : 2",
                "Python Programming Lab",
                "Electronics Lab",
                "Chemistry Lab",
                "Electrical Lab",
                "Physics Lab",
                "Digital Workshop",

                


            ],
        },
        "2nd Year": {
            "Semester 3": ["comming soon"],
            "Semester 4": ["comming soon"],
        },
    },
    
    "ECE": {
        "1st Year": {
            "Semester 1": [
                "comming soon"
            ],
            "Semester 2": [
                "comming soon"
            ],
        },
        "2nd Year": {
            "Semester 3": ["comming soon"],
            "Semester 4": ["comming soon"],
        },
    },
    "ME": {
        "1st Year": {
            "Semester 1": [
                "comming soon"
            ],
            "Semester 2": [
                "comming soon"
            ],
        },
        "2nd Year": {
            "Semester 3": ["comming soon"],
            "Semester 4": ["comming soon"],
        },
    },
    "ME": {
        "1st Year": {
            "Semester 1": [
                "comming soon"
            ],
            "Semester 2": [
                "comming soon"
            ],
        },
        "2nd Year": {
            "Semester 3": ["comming soon"],
            "Semester 4": ["comming soon"],
        },
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
