import re

def extract_real_education(full_text: str) -> list[dict]:
    if not full_text:
        return []
    
    # 1. Comprehensive Moroccan & International Higher Education Institutions
    schools_db = [
        # Public Universities & Faculties
        (r"Universit[eé]\s+[A-Za-z0-9\-\s\']+(?:de\s+[A-Za-z\s]+)?", "Université"),
        (r"Facult[eé]\s+des\s+Sciences\s+et\s+Techniques\s*(?:\([^)]+\)|[A-Za-z\-]+)?", "FST"),
        (r"Facult[eé]\s+des\s+Sciences\s*(?:\([^)]+\)|[A-Za-z\-]+)?", "Faculté des Sciences"),
        (r"Facult[eé]\s+Polydisciplinaire\s*(?:\([^)]+\)|[A-Za-z\-]+)?", "Faculté Polydisciplinaire"),
        (r"FST\s+[A-Za-z\-]+", "FST"),
        (r"EST\s+[A-Za-z\-]+", "EST"),
        (r"FSB\s+[A-Za-z\-]+", "FSB"),
        (r"FSR\s+[A-Za-z\-]+", "FSR"),
        
        # Engineering Grandes Écoles
        (r"UM6P\s*-\s*University\s+Mohammed\s+VI\s+Polytechnic|UM6P", "UM6P - University Mohammed VI Polytechnic"),
        (r"Acad[eé]mie\s+Internationale\s+Mohammed\s+VI\s+de\s+l\'Aviation\s+Civile\s*-\s*AIAC|AIAC", "Académie Internationale Mohammed VI de l'Aviation Civile (AIAC)"),
        (r"Moroccan\s+School\s+of\s+Engineering\s+Sciences|EMSI", "EMSI - École Marocaine des Sciences de l'Ingénieur"),
        (r"[EÉ]cole\s+Mohammadia\s+d\'Ing[eé]nieurs|EMI", "École Mohammadia d'Ingénieurs (EMI)"),
        (r"[EÉ]cole\s+Nationale\s+Sup[eé]rieure\s+d\'Informatique\s+et\s+d\'Analyse\s+des\s+Syst[eé]mes|ENSIAS", "ENSIAS (Rabat)"),
        (r"Institut\s+National\s+des\s+Postes\s+et\s+T[eé]l[eé]communications|INPT", "INPT (Rabat)"),
        (r"[EÉ]cole\s+Nationale\s+des\s+Sciences\s+Appliqu[eé]es\s*(?:\([^)]+\)|[A-Za-z\-]+)?|ENSA\s+[A-Za-z\-]+", "ENSA"),
        (r"[EÉ]cole\s+Nationale\s+Sup[eé]rieure\s+d\'Arts\s+et\s+M[eé]tiers|ENSAM", "ENSAM"),
        (r"[EÉ]cole\s+Hassania\s+des\s+Travaux\s+Publics|EHTP", "EHTP"),
        (r"Al\s+Akhawayn\s+University|AUI", "Al Akhawayn University in Ifrane"),
        (r"1337\s+Coding\s+School|1337\s+School|1337", "1337 Coding School (UM6P)"),
        (r"YouCode\s+School|YouCode", "YouCode (UM6P)"),
        (r"ENCG\s+[A-Za-z\-]+|[EÉ]cole\s+Nationale\s+de\s+Commerce\s+et\s+de\s+Gestion", "ENCG"),
        (r"ISCAE", "Groupe ISCAE"),
        (r"HEM\s+Business\s+School|HEM", "HEM Business School"),
        (r"[EÉ]cole\s+Num[eé]rique\s+[A-Za-z\s]+", "École Numérique"),
        (r"SUPINFO|IGA|ESITH", "École d'Ingénierie"),
    ]
    
    # 2. Degrees
    deg_patterns = [
        r"Licence\s+professionnelle\s+[A-Za-z\s\(\)]+",
        r"Licence\s+fondamentale\s+[A-Za-z\s\(\)]+",
        r"Licence\s+en\s+[A-Za-z\s\(\)]+",
        r"Master\s+Sp[eé]cialis[eé]\s+[A-Za-z\s\(\)]+",
        r"Master\s+en\s+[A-Za-z\s\(\)]+",
        r"Dipl[oô]me\s+d\'Ing[eé]nieur\s+d\'[EÉ]tat\s+[A-Za-z\s\(\)]+",
        r"Dipl[oô]me\s+d\'Ing[eé]nieur\s+[A-Za-z\s\(\)]+",
        r"Ing[eé]nieur\s+d\'[EÉ]tat\s+en\s+[A-Za-z\s\(\)]+",
        r"Ing[eé]nieur\s+en\s+[A-Za-z\s\(\)]+",
        r"Doctorat\s+en\s+[A-Za-z\s\(\)]+|PhD",
        r"DUT|DEUG|DEUST|BTS|MIAGE",
        r"Bachelor\s+of\s+Science|Bachelor\s+in\s+[A-Za-z\s]+|Bachelor",
    ]
    
    found_unis = []
    for pat, label in schools_db:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            val = m.group(0).strip().strip(".-,;·")
            val = re.sub(r"\s+(?:Casablanca|Rabat|Maroc|Morocco|Tanger|Fes|Marrakech).*$", "", val, flags=re.IGNORECASE).strip()
            if len(val) >= 3 and val not in found_unis:
                found_unis.append(val)
                
    found_degs = []
    for pat in deg_patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            val = m.group(0).strip().strip(".-,;·")
            if len(val) >= 3 and val not in found_degs:
                found_degs.append(val)
                
    edus = []
    if found_unis:
        for idx, u in enumerate(found_unis[:2]):
            d = found_degs[idx] if idx < len(found_degs) else (found_degs[0] if found_degs else "Diplôme d'Enseignement Supérieur / Ingénierie")
            edus.append({
                "institution": u,
                "degree": d,
                "period": "Diplômé(e)",
                "description": f"Formation académique : {d} à {u}."
            })
    elif found_degs:
        edus.append({
            "institution": "Établissement d'Enseignement Supérieur & Ingénierie",
            "degree": found_degs[0],
            "period": "Diplômé(e)",
            "description": f"Obtention du {found_degs[0]}."
        })
        
    return edus

snippets = [
    "Confirmed Full Stack Java Developer | Spring Boot • Microservices • React ... Université Hassan II de Casablanca. Licence professionnelle Méthodes ...",
    "Abdelilah LAHDILI. Développeur Java back-end chez @Binarios par T2S Group. M2T SA FST Settat. Casablanca, Casablanca-Settat, Maroc ... Intern as Java Developer.",
    "Full-Stack Java Developer | Spring Boot & Angular | AWS | Workflow Automation (n8n). Agro Lora UM6P - University Mohammed VI Polytechnic. Morocco. 2K followers ...",
    "Full Stack Java Developer | Spring Boot, React.js, MySQL, Docker | Clean Code & API REST. École Numérique Ahmed Al Hansali MIAGE Casablanca Officielle. الدار ...",
    "Ayoub Falsy. Java Developer & Production Engineer at Goldman Sachs via Infosys Java | Spring boot | ReactJs. Infosys Moroccan School of Engineering Sciences ...",
    "Software Engineer and Java developer | Full Stack Java Developer. INVOLYS Académie Internationale Mohammed VI de l'Aviation Civile - AIAC. Casablanca ...",
    "Senior Java Developer with 4+ years of experience building scalable enterprise applications using Spring Boot and microservices.",
]

for s in snippets:
    print("\nText:", s[:65], "...")
    print("Result:", extract_real_education(s))
