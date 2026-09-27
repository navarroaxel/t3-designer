const dossier = {
  "ui": {
    "status": {
      "official": "Source publique",
      "reported": "Déclaré",
      "estimated": "Estimé",
      "observed": "Observé",
      "pending": "À documenter",
      "derived": "Calculé"
    },
    "review": {
      "original-pending": "Original à vérifier",
      "disputed": "Écart à résoudre",
      "pending": "Documents en attente",
      "checked": "Vérifié"
    },
    "sourceKind": {
      "public-record": "Registre public",
      "reference": "Référence fournie",
      "model": "Reconstitution du projet",
      "official-guide": "Guide officiel"
    },
    "sections": {
      "overview": "Vue d’ensemble",
      "apartment": "L’appartement",
      "building": "Bâtiment et parcelle",
      "energy": "Énergie et environnement",
      "sources": "Bibliothèque des sources",
      "questions": "À compléter"
    },
    "titles": {
      "overview": {
        "eyebrow": "01 / Le dossier",
        "title": "Une vue complète.",
        "description": "Ce que nous savons du lieu, de la parcelle à chaque pièce."
      },
      "apartment": {
        "eyebrow": "02 / Échelle intérieure",
        "title": "L’appartement en détail.",
        "description": "Surfaces déclarées, état visible et références de la reconstitution."
      },
      "building": {
        "eyebrow": "03 / Échelle du bâtiment",
        "title": "Le lieu qui l’abrite.",
        "description": "Identité, cadastre et caractéristiques du bâtiment selon les bases publiques."
      },
      "energy": {
        "eyebrow": "04 / Contexte et performance",
        "title": "Énergie et environnement.",
        "description": "Les sources disponibles et les éléments nécessaires pour aller plus loin."
      },
      "sources": {
        "eyebrow": "05 / Les preuves",
        "title": "Chaque donnée a une origine.",
        "description": "Une bibliothèque de registres publics, de références et de documents du projet."
      },
      "questions": {
        "eyebrow": "06 / Prochaines pièces",
        "title": "Un dossier qui s’étoffe.",
        "description": "Les questions ouvertes et les documents qui aideront à y répondre."
      }
    },
    "heroKicker": "Le dossier de notre T3",
    "heroTitle": "Un lieu où vivre.<br/><accent>Et à connaître en détail.</accent>",
    "heroDescription": "L’appartement, son immeuble et les sources qui le décrivent. Toutes les informations réunies, avec leur origine visible.",
    "reviewDate": "Revue documentaire · 27 sept. 2026",
    "statsLabel": "Chiffres du dossier",
    "apartmentArea": "Surface du T3",
    "carrezReported": "Surface Carrez déclarée",
    "plot": "La parcelle",
    "cadastralArea": "Contenance cadastrale",
    "buildingHeight": "Hauteur du bâtiment",
    "ignRecord": "Registre IGN",
    "accuracy": "précision",
    "evidenceGathered": "Éléments réunis",
    "sources": "sources",
    "recordsReferences": "Registres et références",
    "explore": "Explorer le dossier",
    "documentationSections": "Rubriques documentaires",
    "readData": "Comment lire les données",
    "legend": "Une source publique décrit son propre périmètre. Une estimation conserve toujours ce statut.",
    "print": "Imprimer cette rubrique",
    "searchInFile": "Recherche dans le dossier",
    "findInSources": "Chercher parmi les sources.",
    "searchLabel": "Rechercher dans le dossier",
    "searchPlaceholder": "Rechercher une donnée ou une source…",
    "clearSearch": "Effacer la recherche",
    "results_one": "{{count}} résultat pour « {{query}} »",
    "results_other": "{{count}} résultats pour « {{query}} »",
    "emptyTitle": "Cette donnée est introuvable.",
    "emptyDescription": "Essayez « surface », « cadastre » ou « énergie ».",
    "backToFile": "Retour au dossier",
    "factsHeading": "Données et caractéristiques",
    "sourcesHeading": "Sources",
    "questionsHeading": "Questions ouvertes",
    "observedHeading": "État observé",
    "aptLabel": "Appartement / T3",
    "eightRooms": "Huit pièces.<br/>Une même histoire.",
    "apartmentIntro": "Deux chambres, séjour, cuisine et espaces de service. Balcon et cave indiqués séparément.",
    "exploreAreas": "Explorer les surfaces",
    "reconstructedPlan": "Plan reconstitué · proportions estimées",
    "placeIdentity": "Identité du lieu",
    "oneBuilding": "Un bâtiment, trois adresses",
    "rnbRelation": "Lien explicite dans la fiche RNB.",
    "consultBuilding": "Consulter le bâtiment et la parcelle",
    "floorConfirmation": "Un point important à confirmer : l’étage.",
    "floorDescription": "Le plan indique « 4e étage » et la reconstitution place le logement à un troisième étage estimé. Nous conservons les deux références en attendant de vérifier le document du logement.",
    "seePending": "Voir les éléments en attente et l’écart d’étage",
    "documentedIdentity": "Une identité documentée",
    "allSources": "Voir toutes les sources",
    "tourApartment": "Parcourir l’appartement",
    "returnInterior": "Revenir à l’intérieur et à sa lumière",
    "viewBuildingSun": "Voir le bâtiment et le soleil",
    "placeInContext": "Le situer dans son environnement",
    "openPlan": "Ouvrir l’image du plan et ses surfaces",
    "planAlt": "Plan proportionnel du T3 avec les surfaces déclarées et la référence au diagnostic",
    "currentReference": "La référence disponible aujourd’hui.",
    "estimatedShapes": "Surfaces transcrites ; formes et longueurs estimées.",
    "openFullPlan": "Ouvrir le plan complet",
    "areasAttachments": "Surfaces, annexes et dimensions",
    "referencesShow": "Ce que montrent les références",
    "observationCaveat": "Observations issues d’un index de 11 photos et 4 vidéos. La présence d’un élément ne confirme ni ses dimensions ni ses performances.",
    "fromCadastre": "De la parcelle au bâtiment",
    "plotFootprintVolume": "La parcelle, l’emprise<br/>et le volume.",
    "scalesDescription": "Ce sont différentes échelles du même lieu. Chaque surface et hauteur conserve la définition et la précision de sa source.",
    "view3d": "Voir le contexte en 3D",
    "mapLabel": "Géométrie IGN et cadastre · nord en haut",
    "nextLayer": "La prochaine couche du dossier",
    "learnPerformance": "Comprendre ses performances<br/>à partir de ses documents.",
    "dpeMissing": "Le DPE de l’appartement n’a pas encore été identifié. Les diagnostics du groupe de bâtiments ne sont pas automatiquement attribués à ce T3.",
    "energyDiagnosis": "Diagnostic énergétique",
    "conventionalPerformance": "Performances conventionnelles et méthode du DPE.",
    "estimatedCost": "Coût estimé",
    "diagnosisRange": "Fourchette du diagnostic et prix de référence.",
    "actualUse": "Consommation réelle",
    "billsEnergyPeriod": "Factures, énergie et période mesurée.",
    "sourceEvidence": "Fiche de preuve",
    "closeSource": "Fermer la fiche source",
    "sourceType": "Type de source",
    "consultationReview": "Consultation ou revue",
    "originalSource": "Ouvrir la source originale",
    "availableCopy": "Voir la copie disponible",
    "linkedFacts": "Données liées",
    "dateCaveat": "La date de consultation et celle de la donnée peuvent différer. Le périmètre et la précision sont conservés dans chaque fiche.",
    "sourceCard": "Voir la fiche source",
    "tableCaption": "Surfaces transcrites depuis l’image du plan",
    "room": "Pièce",
    "area": "Surface",
    "reportedTotal": "Total déclaré · Carrez",
    "areaSumCaption": "La somme correspond au total de l’image. Le certificat original reste à vérifier.",
    "libraryNote": "Cinq services publics consultés de nouveau le 27/09/2026. Les autres références gardent leur périmètre et leurs points en attente.",
    "downloadExtract": "Télécharger l’extrait",
    "questionsIntro": "Le prochain document peut transformer une hypothèse en donnée étayée. Ces questions rendent visibles les points encore inconnus.",
    "footerTitle": "T3 · Dossier immobilier",
    "footerDescription": "Registres publics, références fournies et estimations identifiées.",
    "footerDate": "Quimper · Septembre 2026",
    "sitePlanAlt": "Plan cartographique de la parcelle AL 0538 et du bâtiment, nord en haut",
    "apartmentPlanAlt": "Plan schématique de l’appartement : surfaces déclarées et formes estimées",
    "mapPlot": "Parcelle {{label}} · IGN / Cadastre",
    "noData": "Aucune donnée",
    "unknown": "Inconnu",
    "openOriginalEvidence": "Voir la preuve source",
    "dateFormat": "short",
    "scope": {
      "Dirección": "Adresse",
      "Parcela": "Parcelle",
      "Edificio": "Bâtiment",
      "Grupo BDNB": "Groupe BDNB",
      "Departamento": "Appartement",
      "Estancia": "Pièce",
      "Balcón": "Balcon",
      "Cave": "Cave",
      "Entorno": "Environnement"
    },
    "contentLabel": "Contenu du dossier immobilier",
    "originalLocator": "Repère dans la source originale"
  },
  "facts": {
    "official-address": {
      "label": "Adresse normalisée",
      "value": "{{value}}",
      "note": "La référence initiale « 1 ter Rue… » est une variante. La fiche consultée utilise impasse."
    },
    "ban-address-id": {
      "label": "Identifiant d’adresse",
      "value": "{{value}}",
      "note": "Clé d’adresse commune aux requêtes BAN et RNB. Elle diffère des identifiants du bâtiment et de la parcelle."
    },
    "address-point": {
      "label": "Point d’adresse BAN",
      "value": "{{value}}",
      "note": "Latitude et longitude WGS84, dans cet ordre. Le point d’accès diffère de l’origine intérieure RNB utilisée par la scène ; il ne désigne pas à lui seul une parcelle."
    },
    "rnb-id": {
      "label": "Bâtiment RNB",
      "value": "{{value}}",
      "note": "La fiche relie 1, 1 bis et 1 ter à un même bâtiment ; elle n’identifie pas le lot de l’appartement."
    },
    "ign-id": {
      "label": "Bâtiment IGN",
      "value": "{{value}}",
      "note": "Correspondance explicite entre les fiches IGN et RNB."
    },
    "parcel-id": {
      "label": "Parcelle cadastrale",
      "value": "{{value}}",
      "note": "Identifiant complet {{id}}. La parcelle et le lot de copropriété sont deux entités différentes."
    },
    "parcel-area": {
      "label": "Surface de la parcelle",
      "value": "{{value}}",
      "note": "Contenance cadastrale de la parcelle entière. Ce n’est ni l’emprise bâtie ni la surface du T3."
    },
    "bdnb-group": {
      "label": "Groupe BDNB",
      "value": "{{value}}",
      "note": "Groupe renvoyé par la recherche d’adresse ; il n’équivaut pas automatiquement à une copropriété juridique."
    },
    "construction-year": {
      "label": "Année de construction déclarée",
      "value": "{{value}}",
      "note": "Année dans la BDNB. Le champ IGN date_d_apparition indique aussi 1956, avec un autre sens."
    },
    "dwelling-count": {
      "label": "Logements du groupe",
      "value": "{{value}}",
      "note": "Les deux sources recensent 30 logements. Cela ne confirme pas le nombre ni la numérotation des lots juridiques."
    },
    "building-footprint": {
      "label": "Emprise déclarée",
      "value": "{{value}}",
      "note": "Emprise au sol du groupe. Le polygone IGN projeté donne environ 476 m² selon une autre méthode ; les valeurs ne sont ni additionnées ni moyennées."
    },
    "building-height": {
      "label": "Hauteur IGN",
      "value": "{{value}}",
      "note": "Hauteur de la source interprétée comme hauteur d’égout lors de la recherche. Elle ne prouve pas une mesure sur place au faîtage."
    },
    "building-mean-height": {
      "label": "Hauteur moyenne BDNB",
      "value": "{{value}}",
      "note": "Autre mesure issue de la source. Elle ne remplace pas automatiquement les 15,5 m de l’IGN."
    },
    "ground-altitudes": {
      "label": "Altitudes min. / max. du sol",
      "value": "{{value}}",
      "note": "Altitudes de la source IGN. Ce ne sont ni des hauteurs d’étage ni un relevé intérieur ; le terrain du modèle reste plat."
    },
    "roof-altitudes": {
      "label": "Altitudes min. / max. du toit",
      "value": "{{value}}",
      "note": "Altitudes du toit. Elles ne déterminent pas à elles seules la pente ni la forme de la couverture."
    },
    "roof-range": {
      "label": "Écart vertical du toit",
      "value": "{{value}}",
      "note": "Différence calculée entre les altitudes. L’utiliser comme élévation du toit visible reste une hypothèse du modèle."
    },
    "building-storeys": {
      "label": "Étages : champ source",
      "value": "{{value}}",
      "note": "La valeur littérale 5 est conservée ; sa convention ne confirme pas l’étage du T3."
    },
    "source-accuracy": {
      "label": "Précision déclarée",
      "value": "{{value}}",
      "note": "Plan / hauteur. Méthodes : BDParcellaire recalée et interpolation du bâti BDTopo ; les décimales du rendu n’améliorent pas cette précision."
    },
    "wall-material": {
      "label": "Matériau des murs",
      "value": "BÉTON - PIERRE",
      "note": "Classification du groupe. Elle ne décrit ni les couches, ni l’épaisseur, ni l’isolation de chaque mur de l’appartement."
    },
    "roof-material": {
      "label": "Matériau de toiture",
      "value": "ZINC ALUMINIUM",
      "note": "Classification du toit du groupe ; sa forme et sa pente en 3D restent reconstituées."
    },
    "ign-record-updated": {
      "label": "Modification de la fiche IGN",
      "value": "{{value}}",
      "note": "Date indiquée dans la fiche, distincte de la consultation du 27/09/2026. Cette consultation ne constitue pas un nouveau relevé."
    },
    "apartment-carrez": {
      "label": "Surface Carrez déclarée",
      "value": "{{value}}",
      "note": "La valeur figure dans l’image. Le certificat original n’a pas encore été vérifié."
    },
    "apartment-area-sum": {
      "label": "Somme des huit pièces",
      "value": "{{value}}",
      "note": "Vérification arithmétique des surfaces transcrites. Ce n’est ni une seconde mesure ni une certification Carrez."
    },
    "balcony-area": {
      "label": "Balcon",
      "value": "{{value}}",
      "note": "Hors Carrez selon l’image. Ses proportions et le détail du garde-corps restent estimés."
    },
    "basement-area": {
      "label": "Cave en sous-sol",
      "value": "{{value}}",
      "note": "Hors Carrez selon l’image. Le lot, l’emplacement et le plan manquent ; rien n’a été reconstitué en 3D."
    },
    "floor-plan": {
      "label": "Étage indiqué sur l’image",
      "value": "4e étage",
      "note": "L’image indique le quatrième étage. Cette lecture est conservée malgré la différence avec l’interprétation visuelle du modèle."
    },
    "floor-model": {
      "label": "Étage utilisé dans le modèle",
      "value": "3e étage estimé",
      "note": "La cote de {{elevation}} m découle de 3 × (15,5 / 5). Elle ne résout pas l’écart avec « 4e étage »."
    },
    "living-orientation": {
      "label": "Séjour et cuisine côté cour",
      "value": "Sud-ouest · {{azimuth}}°",
      "note": "Orientation déduite de l’ajustement du plan sur la façade repérée. Les chambres sont au nord-est ; un plan orienté ou une mesure manque."
    },
    "ceiling-height": {
      "label": "Hauteur intérieure du modèle",
      "value": "{{value}}",
      "note": "Hypothèse de reconstitution de l’intérieur. Ce n’est pas une hauteur mesurée ou indiquée par le diagnostic."
    },
    "apartment-dpe": {
      "label": "DPE de l’appartement",
      "value": "Identification en attente",
      "note": "Aucune classe énergétique ni étiquette GES n’est attribuée au T3 à partir des diagnostics d’autres logements du bâtiment."
    },
    "actual-energy-use": {
      "label": "Consommation réelle",
      "value": "Aucune facture ajoutée",
      "note": "Périodes, énergie, relevés et kWh manquent. Ils seront enregistrés séparément de la consommation conventionnelle du DPE, sans annualiser les périodes incomplètes."
    },
    "energy-cost": {
      "label": "Dépense énergétique",
      "value": "Aucune donnée ajoutée",
      "note": "La future estimation en euros/an conservera les années de référence des prix. Les factures auront leur période et leur détail propres."
    },
    "legal-lots": {
      "label": "Lots et copropriété",
      "value": "Documents en attente",
      "note": "Désignation juridique, annexes et tantièmes manquent. Les 30 logements BDNB ne permettent pas de reconstituer ces lots."
    },
    "risks": {
      "label": "Risques de la parcelle",
      "value": "Recherche spécifique en attente",
      "note": "Aucune conclusion de risque n’a été émise et l’état des risques de la vente n’a pas été ajouté."
    },
    "planning": {
      "label": "Urbanisme et patrimoine",
      "value": "Zonage à vérifier",
      "note": "Le portail municipal est une source disponible. Il ne confirme pas encore la zone ni l’inclusion dans un périmètre protégé."
    },
    "room-area-bedroom-1": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    },
    "room-area-bedroom-2": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    },
    "room-area-living": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    },
    "room-area-entrance": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    },
    "room-area-wc": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    },
    "room-area-bathroom": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    },
    "room-area-kitchen": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    },
    "room-area-closet": {
      "label": "Surface : {{room}}",
      "value": "{{value}}",
      "note": "Surface transcrite depuis l’image. À vérifier sur le document original ; elle ne provient pas d’une mesure du modèle 3D."
    }
  },
  "sources": {
    "ban": {
      "title": "Adresse normalisée",
      "description": "Résultat sélectionné par l’identifiant d’adresse. Son point situe l’accès ; il n’identifie pas à lui seul la parcelle ou le lot intérieur.",
      "label": "Consulté le 27/09/2026"
    },
    "rnb": {
      "title": "Identité du bâtiment",
      "description": "Fiche RNB reliant les numéros 1, 1 bis et 1 ter au bâtiment et à ses identifiants externes. Elle n’identifie pas l’appartement.",
      "label": "Consulté le 27/09/2026"
    },
    "cadastre": {
      "title": "Parcelle AL 0538",
      "description": "Identifiant, contenance et géométrie de la parcelle. La surface cadastrale n’est pas celle de l’appartement et ne prouve pas la désignation de ses lots.",
      "label": "Consulté le 27/09/2026"
    },
    "ign": {
      "title": "Géométrie et hauteurs du bâtiment",
      "description": "Fiche BATIMENT0000000316727839. Elle indique une modification le 25/03/2019 et une précision de 3 m en plan et 2,5 m en hauteur. La consulter en 2026 n’est pas un nouveau relevé.",
      "label": "Consulté le 27/09/2026 · fiche modifiée en 2019"
    },
    "bdnb": {
      "title": "Caractéristiques du groupe",
      "description": "Groupe trouvé par adresse : ancienneté, emprise, matériaux et logements. Les champs de DPE représentatif sont exclus ; aucun diagnostic n’est attribué au T3.",
      "label": "Consulté le 27/09/2026"
    },
    "plan": {
      "title": "Plan proportionnel et surfaces",
      "description": "L’image fournie cite DIO AGENDA, diagnostic du 06/07/2026, dossier M-2026-07-002 : surfaces p. 62 et disposition p. 65. Ces pages originales n’ont pas été reçues. Formes et longueurs estimées.",
      "label": "Image disponible · original en attente"
    },
    "visual": {
      "title": "État visible",
      "description": "Index de 11 photos et 4 vidéos consultées le 26/09/2026. Il documente des éléments et relations visibles ; les mesures, l’état caché et les causes des dégâts ne sont pas déduits des images.",
      "label": "Revue visuelle du 26/09/2026"
    },
    "model": {
      "title": "Hypothèses de reconstitution",
      "description": "Géométrie de t3.ts et enregistrement apartment-placement.ts. Plan, altitude, dimensions linéaires et orientation restent approximatifs, même si les calculs sont reproductibles.",
      "label": "Modèle revu · valeurs estimées"
    },
    "ademe": {
      "title": "Identification du DPE",
      "description": "Démarche officielle pour vérifier un diagnostic à partir de son numéro. Le DPE individuel de l’appartement n’a pas été identifié ni reçu.",
      "label": "Source pour compléter le dossier"
    },
    "georisques": {
      "title": "Risques et état des risques",
      "description": "Page de consultation des risques et du document remis lors de l’achat. Ce lien ne constitue pas un rapport propre à la parcelle ni une conclusion.",
      "label": "Recherche spécifique en attente"
    },
    "quimper": {
      "title": "Urbanisme et patrimoine",
      "description": "Portail municipal du PLU et du Site Patrimonial Remarquable. La parcelle reste à confronter aux plans et règlements en vigueur.",
      "label": "Recherche spécifique en attente"
    },
    "copropriete": {
      "title": "Documents de copropriété",
      "description": "Guide des documents de vente en copropriété. L’acte, l’EDD, le règlement, les tantièmes et les documents de travaux restent à ajouter.",
      "label": "Documents du bien en attente"
    }
  },
  "questions": {
    "floor-discrepancy": {
      "title": "Quatrième ou troisième étage ?",
      "description": "L’image indique « 4e étage » et la reconstitution utilise un troisième étage estimé. Les deux affirmations sont conservées ; aucun étage n’est confirmé.",
      "needed": "Désignation du lot dans l’acte et plan d’étage ou référence d’accès sans ambiguïté."
    },
    "original-area": {
      "title": "Vérifier les 49,18 m² sur l’original",
      "description": "Les huit surfaces correspondent arithmétiquement au total de l’image. Il reste à les contrôler dans le document cité.",
      "needed": "Dossier DIO AGENDA M-2026-07-002 : métrage Carrez p. 62 et disposition p. 65, avec pagination imprimée."
    },
    "geometry": {
      "title": "Calibrer les dimensions et l’orientation",
      "description": "Murs, ouvertures et hauteur intérieure sont approximatifs. Le plan est environ 1 à 2 m plus court que la profondeur cartographique du bâtiment.",
      "needed": "Plan coté et orienté, épaisseurs, hauteur entre planchers et mesures des fenêtres et du balcon."
    },
    "individual-dpe": {
      "title": "Rattacher le bon DPE",
      "description": "Un diagnostic du groupe n’identifie pas à lui seul le T3. Il ne correspond pas non plus à la consommation réelle de ses occupants.",
      "needed": "DPE complet avec numéro ADEME, adresse, étage/lot, date et surfaces de référence ; factures séparées."
    },
    "parcel-context": {
      "title": "Compléter le contexte de la parcelle",
      "description": "AL 0538 est identifiée ; ses risques et règles d’urbanisme précises restent à consulter.",
      "needed": "État des risques remis à l’achat et comparaison avec les plans/règlements du PLU et du SPR, en conservant date et version."
    }
  },
  "observations": {
    "hall-condition": {
      "room": "Entrée",
      "title": "Sol et équipements visibles",
      "description": "Une zone de sol soulevée ou cassée est visible près de l’accès salle d’eau/WC, avec des tuyaux apparents et un panneau au-dessus du passage vers le séjour. La cause et l’étendue exacte des dégâts ne sont pas établies."
    },
    "living-condition": {
      "room": "Séjour",
      "title": "Parquet, placard et accès au balcon",
      "description": "Parquet usé, panneau de placard cassé, radiateur près de la cuisine et porte vitrée à deux vantaux vers le balcon. Leur présence est documentée, pas leurs dimensions exactes."
    },
    "bedroom-openings": {
      "room": "Chambres",
      "title": "Fenêtres et radiateurs",
      "description": "Deux fenêtres à deux vantaux, caissons de volets, protection extérieure et radiateurs sous les fenêtres. L’association avec la chambre de 11,81 ou 9,32 m² repose encore sur le plan."
    },
    "kitchen-layout": {
      "room": "Cuisine",
      "title": "Équipement en U",
      "description": "Plans de travail et meubles bas en U, évier, réfrigérateur, four/plaques, hotte, micro-ondes et habillage apparent de chaudière. Le lave-vaisselle et les performances des appareils ne sont pas confirmés."
    },
    "bathroom-fixtures": {
      "room": "Salle d’eau",
      "title": "Lavabo, lave-linge et douche",
      "description": "Lavabo rond sur meuble, lave-linge frontal, miroir, douche et cloison en briques de verre. Le second lavabo apparent est un reflet ; l’ajustement métrique reste à vérifier."
    },
    "wc-door": {
      "room": "WC",
      "title": "Pièce séparée",
      "description": "Toilettes avec réservoir, ventilation haute et porte ouvrant vers l’entrée. Les dimensions réelles de la pièce et la largeur de passage restent à mesurer."
    }
  },
  "publishers": {
    "ban": "IGN · Base Adresse Nationale",
    "rnb": "Référentiel National des Bâtiments",
    "cadastre": "DGFiP · API Carto IGN",
    "ign": "IGN · BD TOPO",
    "bdnb": "Base de Données Nationale des Bâtiments",
    "plan": "Image fournie au projet",
    "visual": "Photos et vidéos fournies",
    "model": "Modèle du projet",
    "ademe": "ADEME · Service Public",
    "georisques": "Géorisques",
    "quimper": "Ville de Quimper",
    "copropriete": "Service Public"
  },
  "evidenceLocators": {
    "official-address": [
      "properties.label / properties.id"
    ],
    "ban-address-id": [
      "properties.id",
      "addresses[street_rep=TER].id"
    ],
    "address-point": [
      "geometry.coordinates: longitude, latitude"
    ],
    "rnb-id": [
      "rnb_id / addresses / ext_ids"
    ],
    "ign-id": [
      "properties.cleabs",
      "ext_ids[source=bdtopo]"
    ],
    "parcel-id": [
      "properties.idu / section / numero"
    ],
    "parcel-area": [
      "properties.contenance"
    ],
    "bdnb-group": [
      "batiment_groupe_id / l_parcelle_id"
    ],
    "construction-year": [
      "annee_construction"
    ],
    "dwelling-count": [
      "nb_log",
      "properties.nombre_de_logements"
    ],
    "building-footprint": [
      "surface_emprise_sol"
    ],
    "building-height": [
      "properties.hauteur"
    ],
    "building-mean-height": [
      "hauteur_mean"
    ],
    "ground-altitudes": [
      "properties.altitude_minimale_sol / altitude_maximale_sol"
    ],
    "roof-altitudes": [
      "properties.altitude_minimale_toit / altitude_maximale_toit"
    ],
    "roof-range": [
      "altitude_maximale_toit − altitude_minimale_toit = 25,1 − 24,3"
    ],
    "building-storeys": [
      "properties.nombre_d_etages"
    ],
    "source-accuracy": [
      "properties.precision_planimetrique / precision_altimetrique"
    ],
    "wall-material": [
      "mat_mur_txt"
    ],
    "roof-material": [
      "mat_toit_txt"
    ],
    "ign-record-updated": [
      "properties.date_modification = 2019-03-25T06:31:23.773Z"
    ],
    "apartment-carrez": [
      "« Surface privative Carrez » et « Total Carrez » ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "apartment-area-sum": [
      "Somme des huit surfaces de «Les surfaces»"
    ],
    "balcony-area": [
      "«En complément» · Balcon"
    ],
    "basement-area": [
      "«En complément» · Cave au sous-sol"
    ],
    "floor-plan": [
      "En-tête : «1 ter, rue Jean-Baptiste Colbert · 4e étage · Géométrie estimée»"
    ],
    "floor-model": [
      "APARTMENT_PLACEMENT.floorIndex ; interprétation de l’image annotée du bâtiment"
    ],
    "living-orientation": [
      "APARTMENT_PLACEMENT.livingFacadeAzimuth"
    ],
    "ceiling-height": [
      "t3Apartment.walls[].height / APARTMENT_PLACEMENT.wallHeight"
    ],
    "apartment-dpe": [
      "Numéro et document du diagnostic individuel non fournis",
      "Le groupe n’établit pas de correspondance avec cet appartement"
    ],
    "actual-energy-use": [
      "Le diagnostic conventionnel ne remplace pas les factures ni les exports de consommation"
    ],
    "energy-cost": [
      "Estimation du DPE et facturation réelle : documents toujours en attente"
    ],
    "legal-lots": [
      "Acte, EDD et règlement de copropriété du bien non encore intégrés"
    ],
    "risks": [
      "Parcours général ; rapport propre à la parcelle manquant"
    ],
    "planning": [
      "PLU / SPR : plans et règlement, vérification de la parcelle en attente"
    ],
    "room-area-bedroom-1": [
      "Table «Les surfaces» · Chambre 1 ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "room-area-bedroom-2": [
      "Table «Les surfaces» · Chambre 2 ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "room-area-living": [
      "Table «Les surfaces» · Salon / séjour ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "room-area-entrance": [
      "Table «Les surfaces» · Entrée ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "room-area-wc": [
      "Table «Les surfaces» · WC ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "room-area-bathroom": [
      "Table «Les surfaces» · Salle d’eau ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "room-area-kitchen": [
      "Table «Les surfaces» · Cuisine ; renvoi à la p. 62 du diagnostic original non reçu"
    ],
    "room-area-closet": [
      "Table «Les surfaces» · Placard ; renvoi à la p. 62 du diagnostic original non reçu"
    ]
  }
} as const

export default dossier
