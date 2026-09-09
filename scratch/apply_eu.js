import fs from 'fs';

const translations = {
    eu: {
        terms: {
            title: "Summits – Zerbitzu-baldintzak (Kanpoko Plataformen Datuen Erabilera)",
            lastUpdated: "Azken eguneratzea: 2025eko urtarrila",
            introduction: {
                title: "Atarikoa",
                content: "Summits mendi-tontorren igoeren esperientzia jarraitzeko eta partekatzeko plataforma bat da. Zerbitzu hau emateko, Summits hirugarrenen plataformekin integratzen da, Garmin Connect, Strava eta Wikiloc barne (hemendik aurrera, \"Kanpoko Plataformak\"), zure kanpoko aktibitateen datuak inportatzeko eta analizatzeko. Summits erabiliz eta Kanpoko Plataformetako kontuekin erregistratuz, datu horien erabilerari buruzko Zerbitzu-baldintza hauek onartzen dituzu."
            },
            dataCollection: {
                title: "1. Datuen bilketa eta tratamendua",
                whatData: {
                    title: "1.1 Zer datu eskuratzen ditugun",
                    intro: "Zure Kanpoko Plataformetako kontuak Summits-ekin konektatzean, datu mota hauek eskuratzen ditugu:",
                    fromWikiloc: "Wikiloc-etik:",
                    wikiloc: {
                        activity: "Aktibitate eta ibilbideen datuak (GPX fitxategiak, track-log-ak)",
                        timestamps: "Aktibitateen data eta ordua",
                        elevation: "Altxuera-profilak eta koordenada geografikoak",
                        routeNames: "Ibilbideen izenak eta deskribapenak",
                        activityTypes: "Aktibitate motak (senderismoa, eskalada, etab.)",
                        profile: "Profil publikoaren informazioa"
                    },
                    fromStrava: "Strava-tik:",
                    strava: {
                        activity: "Aktibitateen datuak, ibilbideak eta track-ak barne",
                        timestamps: "Aktibitateen ordua eta iraupena",
                        elevation: "Altxuera, distantzia eta iraupen neurketak",
                        coordinates: "Koordenada geografikoak eta altxuera-profilak",
                        activityTypes: "Aktibitate eta kirol motak",
                        profile: "Oinarrizko profilaren informazioa (izena, erabiltzaile-izena, profil-argazkia)"
                    },
                    fromGarmin: "Garmin Connect-etik:",
                    garmin: {
                        activity: "Garmin gailuen bidezko aktibitate erregistroak",
                        gps: "GPS jarraipen datuak eta ibilbideak",
                        elevation: "Altxuera, distantzia eta denbora datuak",
                        summaries: "Aktibitateen laburpenak eta estatistikak",
                        location: "Kokapen geografikoaren datuak",
                        profile: "Oinarrizko profilaren informazioa (izena, erabiltzaile-izena, profil-argazkia)"
                    }
                },
                howWeUse: {
                    title: "1.2 Nola erabiltzen ditugun zure datuak",
                    intro: "Kanpoko Plataformetako datuak honetarako erabiltzen ditugu:",
                    identifyPeaks: "Zein mendi-tontor igo dituzun identifikatzeko",
                    trackProgress: "Zure mendizale progresioa jarraitzeko",
                    displayHistory: "Zure igoeren historiala mapa interaktiboetan erakusteko",
                    calculateStats: "Igotako tontor kopurua eta bestelako estatistikak kalkulatzeko",
                    enableSharing: "Lorpenak beste erabiltzaile batzuekin partekatzeko (pribatutasun-ezarpenen arabera)",
                    leaderboards: "Zure estatistikak komunitateko sailkapenetan sartzeko",
                    analyzeRoutes: "Zure ibilbideak eta identifikatutako tontorrak aztertu eta gordetzeko"
                }
            },
            thirdParty: {
                title: "2. Hirugarrenen plataformen zerbitzu-baldintzak",
                compliance: {
                    title: "2.1 Kanpoko Plataformetako politiken betetzea",
                    intro: "Zure Kanpoko Plataformetako kontuak Summits-ekin konektatzean, honako hau aitortzen duzu:",
                    readAgree: "Plataforma bakoitzaren Zerbitzu-baldintzak irakurri eta onartu dituzula",
                    apiTerms: "Zure datuak emandako baimenen eta plataforma bakoitzaren API baldintzen arabera soilik eskuratzen ditugula",
                    devPolicies: "Garmin, Strava eta Wikiloc-en garatzaile eta pribatutasun politikak betetzen ditugula",
                    noCredentials: "Ez ditugula zure saio-hasierako kredentzialak partekatzen",
                    secureTokens: "Sarbide-tokenak segurtasunez gordetzen ditugula eta aktibitate datuak inportatzeko soilik erabiltzen ditugula"
                },
                scope: {
                    title: "2.2 Baimenen esparrua",
                    intro: "Summits baimentzean, baimena ematen diogu:",
                    readStore: "Zure aktibitate datuak irakurtzeko, gordetzeko eta prozesatzeko",
                    analyzeTransform: "Datuak aztertu eta transformatzeko tontorrak identifikatzeko",
                    notDo: {
                        intro: "Ez dugu egingo:",
                        modify: "Zure izenean aktibitaterik aldatu, ezabatu edo argitaratu",
                        share: "Zure datuak iragarleekin edo hirugarrenekin partekatu (4. atalean deskribatutakoa izan ezik)",
                        sell: "Zure datu pertsonalak saldu"
                    }
                },
                revocation: {
                    title: "2.3 Sarbidea kentzea",
                    content: "Summits-en sarbidea edozein unetan kendu dezakezu Kanpoko Plataformako kontu-ezarpenen bidez. Behin sarbidea kenduta, ez da datu berririk inportatuko. Aurretik inportatutako datuak gorde egingo dira, ezabatzea eskatzen ez baduzu."
                }
            },
            dataStorage: {
                title: "3. Datuen biltegiratzea eta segurtasuna",
                retention: {
                    title: "3.1 Datuak gordetzea",
                    active: "Inportatutako datuak gordeko dira zure Summits kontua aktibo dagoen bitartean.",
                    deleted: "Ezabatutako kontuak eta datuak 30 eguneko epean ezabatuko dira betirako.",
                    matching: "Tontorren identifikazio informazioa gordeko da prozesamenduaren eraginkortasuna hobetzeko."
                },
                security: {
                    title: "3.2 Datuen segurtasuna",
                    intro: "Zure datuak babesteko industriako neurri estandarrak erabiltzen ditugu, besteak beste:",
                    encryption: "Zifratzea (HTTPS/TLS eta biltegiratzean)",
                    access: "Baimendutako pertsonentzako sarbide-kontrola soilik",
                    infrastructure: "Lodeian hodeiko biltegiratze-azpiegitura segurua",
                    updates: "Segurtasun eguneraketa eta adabaki erregularrak"
                },
                location: {
                    title: "3.3 Datuen kokapena",
                    content: "Zure datuak datu-babeseko lege egokiak betetzen dituzten hodeiko zerbitzarietan gordetzen dira. Summits erabiliz, datu horien transferentzia eta prozesamendua onartzen duzu."
                }
            },
            dataSharing: {
                title: "4. Datuak partekatzea eta zabaltzea",
                public: {
                    title: "4.1 Informazio publikoa",
                    intro: "Zure profila publikoa bada, beste erabiltzaileek hau ikusi ahal izango dute:",
                    statistics: "Zure tontorren estatistikak eta igoera kopurua",
                    username: "Zure erabiltzaile-izena eta profil-argazkia",
                    rankings: "Zure postua sailkapenetan",
                    profile: "Zure profila bilaketa-emaitzetan eta zerrendetan"
                },
                private: {
                    title: "4.2 Informazio pribatua",
                    intro: "Hau pribatua izango da beti:",
                    routes: "Ibilbideen track-ak eta koordenada zehatzak",
                    elevation: "Altxuera-profil zehatzak",
                    times: "Aktibitateen hasiera/amaiera orduak",
                    email: "E-posta eta identifikatzaile pertsonalak",
                    followers: "Jarraitzaileen eta jarraitutako erabiltzaileen zerrendak (publikoa ez bada)"
                },
                thirdParties: {
                    title: "4.3 Hirugarrenekin datuak partekatzea",
                    noSell: "Ez dugu datu pertsonalik saltzen.",
                    aggregated: "Datu anonimo eta agregatuak partekatu ditzakegu analisietarako edo ikerketarako.",
                    shareWith: "Datuak honako hauekin soilik partekatu ditzakegu:",
                    serviceProviders: "Plataformaren operazioa mantentzen duten zerbitzu-emaileak",
                    authorities: "Legeak eskatutako agintariak",
                    safety: "Erabiltzaileen segurtasuna bermatzeko alderdi garrantzitsuak"
                }
            },
            rights: {
                title: "5. Zure eskubideak eta kontrolak",
                correction: {
                    title: "5.1 Datuak zuzentzea",
                    content: "App-an tontorren identifikazio okerrak egiaztatu edo jakinarazi ditzakezu. Egiaztatutako zuzenketak berrikusi eta eguneratuko dira."
                },
                deletion: {
                    title: "5.2 Kontua ezabatzea",
                    content: "Zure Summits kontua edozein unetan ezabatu dezakezu. Inportatutako datu eta konexio sozial guztiak 30 eguneko epean ezabatuko dira. Summits kontua ezabatzeak ez dio zure Kanpoko Plataformetako kontuei eragiten."
                },
                privacy: {
                    title: "5.3 Pribatutasun-ezarpenak",
                    content: "Ikusgaitasuna, partekatzeko aukerak eta funtzio sozialak zuzenean kudeatu ditzakezu app-aren pribatutasun-ezarpenetan."
                }
            },
            accuracy: {
                title: "6. Datuen zehaztasuna eta mugak",
                peakIdentification: {
                    title: "6.1 Tontorrak identifikatzea",
                    algorithmic: "Tontorren identifikazioa algoritmoen bidez egiten da eta baliteke beti ez izatea zehatza.",
                    errors: "Erroreak jakinarazi daitezke etorkizunean zehaztasuna hobetzeko."
                },
                routeData: {
                    title: "6.2 Ibilbide-datuen kalitatea",
                    accuracy: "Zehaztasuna Kanpoko Plataformetako GPS datuen araberakoa da.",
                    incomplete: "Datu osatugabeek edo falta direnek prozesamenduan eragin dezakete.",
                    delays: "Datu-multzo handiekin atzerapenak egon daitezke."
                },
                warranty: {
                    title: "6.3 Bermearen ukapena",
                    intro: "Summits-ek ez du bermerik ematen honako hauen inguruan:",
                    accuracy: "Tontorren edo ibilbideen datuen zehaztasuna edo osotasuna",
                    reliability: "Kanpoko Plataformetako APIen fidagarritasuna",
                    uptime: "Zerbitzuaren eskuragarritasuna edo etenik gabeko sarbidea",
                    disclaimer: "Summits-en erabilera zure ardurapean dago."
                }
            },
            changes: {
                title: "7. Baldintza hauen aldaketak",
                modifications: {
                    title: "7.1 Aldaketak",
                    content: "Zerbitzu-baldintza hauek edozein unetan aldatu ditzakegu. Eguneraketak app-ean edo webgunean argitaratzen direnean sartuko dira indarrean."
                },
                continuedUse: {
                    title: "7.2 Erabiltzen jarraitzea",
                    content: "Aldaketen ondoren zerbitzua erabiltzen jarraitzeak baldintza berriak onartzea dakar. Ados ez bazaude, utzi zerbitzua erabiltzeari eta ezabatu zure kontua."
                }
            },
            termination: {
                title: "8. Zerbitzua amaitzea",
                serviceTermination: {
                    title: "8.1 Zerbitzua amaitzea",
                    intro: "Kontuak eten edo amaitu ditzakegu honako arrazoiengatik:",
                    violation: "Baldintza hauek edo Kanpoko Plataformetako baldintzak haustea",
                    fraudulent: "Jarduera iruzurrezkoak edo abusuak",
                    legal: "Legezko edo arauzko eskakizunak"
                },
                effect: {
                    title: "8.2 Amaieraren ondorioak",
                    content: "Sarbidea berehala kenduko da eta datuak gordetze-politikaren arabera ezabatuko dira."
                }
            },
            indemnification: {
                title: "9. Kalte-ordaina",
                intro: "Ados zaude Summits kalteetatik babestearekin honako arrazoiengatik sortutako erreklamazioen aurrean:",
                violations: "Baldintza hauek haustea",
                platformPolicies: "Kanpoko Plataformetako politikak haustea",
                misuse: "Erabilera okerra edo datuen bidalketa iruzurrezkoa",
                disputes: "Beste erabiltzaile batzuekin izandako gatazkak"
            },
            liability: {
                title: "10. Erantzukizunaren muga",
                intro: "Legeak baimentzen duen neurrian:",
                asIs: "Summits \"dagoen moduan\" ematen da, bermerik gabe.",
                notLiable: "Ez dugu erantzukizunik zeharkako kalteengatik edo ondoriozko kalteengatik.",
                platformDowntime: "Ez dugu erantzukizunik Kanpoko Plataformen etenengatik edo API aldaketengatik."
            },
            disputes: {
                title: "11. Gatazkak eta aplikatu beharreko legea",
                governingLaw: {
                    title: "11.1 Aplikatu beharreko legea",
                    content: "Baldintza hauek Costa Ricako legeen menpe daude, lege-gatazken printzipioak alde batera utzita."
                },
                resolution: {
                    title: "11.2 Gatazken ebazpena",
                    negotiation: "Fede oneko negoziazioa",
                    mediation: "Mediazioa negoziazioak huts egiten badu",
                    arbitration: "Ebatzi gabeko gatazketarako arbitraje loteslea"
                },
                classAction: {
                    title: "11.3 Akzio kolektiboei uko egitea",
                    content: "Gatazka guztiak banaka ebatzi behar dira; ez da akzio kolektiborik onartuko."
                }
            },
            contact: {
                title: "12. Harremanetarako informazioa",
                intro: "Zalantzarik baduzu, jarri gurekin harremanetan:",
                email: "E-posta: cesc.riera@summitstracker.com",
                website: "Webgunea: summitstracker.com",
                support: "Laguntza: App-aren barruko laguntza-funtzioen bidez eskuragarri"
            },
            acknowledgment: {
                title: "13. Onarpena",
                intro: "Summits erabiliz eta Garmin, Strava edo Wikiloc kontuak konektatuz, hau onartzen duzu:",
                read: "Baldintza hauek irakurri eta ulertu dituzula",
                consent: "Deskribatutako datuen erabilera onartzen duzula",
                capacity: "Onartzeko gaitasun juridikoa duzula",
                comply: "Lege egokiak beteko dituzula",
                responsible: "Zure kontuen segurtasuna mantentzearen arduraduna zarela",
                footer: "Summits erabiltzen jarraituz, Zerbitzu-baldintza hauek onartzen dituzu. Ados ez bazaude, mesedez, utzi zerbitzua erabiltzeari eta ezabatu zure kontua."
            }
        },
        privacy: {
            title: "Summits – Pribatutasun-politika",
            lastUpdated: "Azken eguneratzea: 2025eko urtarrila",
            introduction: {
                title: "1. Atarikoa",
                content: "Summits-en zure pribatutasuna babesteko konpromisoa dugu. Pribatutasun-politika honek azaltzen du nola biltzen, erabiltzen, zabaltzen eta babesten dugun zure informazioa gure mugikorreko aplikazioa eta webgunea (hemendik aurrera, \"Zerbitzua\") erabiltzean."
            },
            dataController: {
                title: "2. Datuen kontrolatzailea",
                content: "Zure informazio pertsonalaren arduraduna hau da:",
                email: "E-posta: cesc.riera@summitstracker.com",
                website: "Webgunea: summitstracker.com"
            },
            dataCollection: {
                title: "3. Biltzen dugun informazioa",
                personalData: {
                    title: "3.1 Informazio pertsonala",
                    intro: "Kontu bat sortzean, hau biltzen dugu:",
                    account: "Kontuaren informazioa (e-posta, erabiltzaile-izena, pasahitza)",
                    profile: "Profilaren informazioa (izena, profil-argazkia, biografia)",
                    preferences: "App-aren ezarpen eta hobespenak"
                },
                activityData: {
                    title: "3.2 Kanpoko Plataformetako aktibitate datuak",
                    intro: "Zure Wikiloc, Strava edo Garmin kontuak konektatzean, hau biltzen dugu:",
                    fromWikiloc: "Wikiloc-etik:",
                    wikiloc: {
                        activity: "Aktibitate datuak (ibilbideak, track-ak, koordenadak)",
                        timestamps: "Aktibitateen denbora-markak (hasiera, amaiera, iraupena)",
                        elevation: "Altxuera datuak eta profilak",
                        routeNames: "Ibilbideen izenak eta deskribapenak",
                        activityTypes: "Aktibitate motak (senderismoa, etab.)",
                        profile: "Profil publikoaren informazioa"
                    },
                    fromStrava: "Strava-tik:",
                    strava: {
                        activity: "Aktibitate datuak (ibilbideak, track-ak, koordenadak)",
                        timestamps: "Aktibitateen denbora-markak (hasiera, amaiera, iraupena)",
                        elevation: "Altxuera datuak eta profilak",
                        coordinates: "GPS koordenadak eta track-ak",
                        activityTypes: "Aktibitate motak (korrika, bizikleta, etab.)",
                        profile: "Profil publikoaren informazioa"
                    },
                    fromGarmin: "Garmin-etik:",
                    garmin: {
                        activity: "Garmin Connect-eko aktibitate datuak",
                        gps: "GPS track-ak eta koordenadak",
                        elevation: "Altxuera datuak eta bihotz-taupadak",
                        summaries: "Aktibitateen laburpenak eta estatistikak",
                        location: "Kokapen datuak",
                        profile: "Profil publikoaren informazioa"
                    }
                },
                technicalData: {
                    title: "3.3 Informazio teknikoa",
                    intro: "Automatikoki biltzen dugu:",
                    device: "Gailuaren informazioa (mota, sistema eragilea, identifikatzaileak)",
                    ip: "IP helbidea eta kokapen datuak",
                    browser: "Brauzy mota eta bertsioa",
                    logs: "Erabilera erregistroak eta analitika datuak"
                }
            },
            dataUsage: {
                title: "4. Nola erabiltzen dugun zure informazioa",
                purposes: {
                    title: "4.1 Erabileraren helburuak",
                    intro: "Honeetarako erabiltzen dugu zure informazioa:",
                    service: "Zerbitzua emateko eta mantentzeko",
                    peakIdentification: "Igotako tontorrak identifikatzeko",
                    progress: "Zure progresioa jarraitzeko eta estatistikak sortzeko",
                    statistics: "Lorpen eta estatistikekin zerrendak osatzeko",
                    community: "Funtzio sozialak eta sailkapena ahalbidetzeko",
                    communication: "Jakinarazpenak eta laguntza mezuak bidaltzeko",
                    improvement: "Zerbitzua hobetzeko, pertsonalizatzeko eta garatzeko",
                    security: "Arazo teknikoak eta segurtasun mehatxuak ekiditeko"
                },
                legalBasis: {
                    title: "4.2 Oinarri juridikoa",
                    intro: "Zure datuak honako hauetan oinarrituta prozesatzen ditugu:",
                    consent: "Zure baimena hirugarrenen kontuak konektatzean",
                    contract: "Zurekin dugun kontratua betetzeko",
                    legitimate: "Gure interes legitimoak zerbitzua hobetzeko",
                    legal: "Legezko betebeharrak betetzeko"
                }
            },
            dataSharing: {
                title: "5. Datuak partekatzea eta zabaltzea",
                thirdParties: {
                    title: "5.1 Hirugarren zerbitzu-emaileak",
                    intro: "Datuak zerbitzu-emaile konfiantzazkoekin partekatu ditzakegu, honetan laguntzeko:",
                    serviceProviders: "Ostatua eta azpiegitura zerbitzuak",
                    analytics: "Analitika eta errendimenduaren jarraipena",
                    cloud: "Hodeiko biltegiratzea eta prozesatzea"
                },
                publicData: {
                    title: "5.2 Informazio publikoa",
                    intro: "Honako informazio hau publikoa izan daiteke:",
                    statistics: "Laburpen estatistikoak eta lorpenak",
                    username: "Erabiltzaile-izena eta profil publikoa",
                    rankings: "Sailkapeneko postua",
                    profile: "Partekatzea erabakitzen duzun profil publikoa"
                },
                legal: {
                    title: "5.3 Lege-eskakizunak",
                    content: "Zure informazioa zabaldu dezakegu legeak, epaileak edo agintariek eskatzen badute, edo gure erabiltzaileen edo besteen eskubideak babesteko."
                }
            },
            dataStorage: {
                title: "6. Datuen biltegiratzea eta segurtasuna",
                location: {
                    title: "6.1 Datuen kokapena",
                    content: "Zure datuak Europar Batasunean eta AEBetan dauden zerbitzari seguruetan gordetzen dira."
                },
                retention: {
                    title: "6.2 Datuak gordetzea",
                    intro: "Datuak gordetzen ditugu:",
                    active: "Zure kontua aktibo dagoen bitartean",
                    deleted: "Kontua ezabatu eta 30 egunera arte",
                    legal: "Legeak eta araudiak eskatzen duten arte"
                },
                security: {
                    title: "6.3 Segurtasun neurriak",
                    intro: "Neurri tekniko eta organizatibo egokiak erabiltzen ditugu:",
                    encryption: "Datuak zifratzea trantsitoan eta biltegiratzean",
                    access: "Sarbide-kontrola eta autentifikazioa",
                    infrastructure: "Azpiegitura segurua eta segurtasun auditoretzak",
                    updates: "Eguneraketa eta adabaki erregularrak"
                }
            },
            userRights: {
                title: "7. Zure eskubideak (GDPR/DBLO)",
                access: {
                    title: "7.1 Sarbide eskubidea",
                    content: "Zure datu pertsonaletara sartzeko eta kopia bat jasotzeko eskubidea duzu."
                },
                rectification: {
                    title: "7.2 Zuzentzeko eskubidea",
                    content: "Datu okerrak edo osatugabeak zuzentzea eskatu dezakezu."
                },
                erasure: {
                    title: "7.3 Ezabatzeko eskubidea",
                    content: "Zure datu pertsonalak ezabatzea eskatu dezakezu edozein unetan."
                },
                restriction: {
                    title: "7.4 Tratamendua mugatzeko eskubidea",
                    content: "Egoera batzuetan, datuen tratamendua mugatzea eskatu dezakezu."
                },
                portability: {
                    title: "7.5 Datuen eramangarritasun eskubidea",
                    content: "Zure datuen kopia bat formatu egituratu eta makinaz irakurtzeko moduko batean eskatu dezakezu."
                },
                objection: {
                    title: "7.6 Aurka egiteko eskubidea",
                    content: "Zure datuen tratamenduari aurka egiteko eskubidea duzu."
                },
                withdraw: {
                    title: "7.7 Baimena atzera hartzeko eskubidea",
                    content: "Eman duzun baimena edozein unetan har dezakezu atzera."
                },
                complaint: {
                    title: "7.8 Erreklamazioa egiteko eskubidea",
                    content: "Eskubideak urratu direla uste baduzu, agintaritza eskudunera jo dezakezu."
                }
            },
            cookies: {
                title: "8. Cookie-ak eta jarraipen-teknologiak",
                intro: "Cookie-ak eta antzeko teknologiak erabiltzen ditugu informazioa gordetzeko.",
                types: {
                    title: "8.1 Cookie motak",
                    essential: "Behar-beharrezkoak zerbitzuak ondo funtzionatzeko",
                    analytics: "Analitikoak erabiltzaileen erabilera ulertzeko",
                    functional: "Funtzionalak zure hobespenak gogoratzeko"
                },
                management: {
                    title: "8.2 Cookie-en kudeaketa",
                    content: "Brauzytik kudeatu ditzakezu cookie-ak, baina horrek zerbitzuaren funtzionamenduan eragina izan dezake."
                }
            },
            children: {
                title: "9. Haurren pribatutasuna",
                content: "Gure zerbitzua adin guztiko umeentzat dago eskuragarri. Segurtasun eta pribatutasun neurri guztiak hartzen ditugu."
            },
            international: {
                title: "10. Datuen nazioarteko transferentziak",
                content: "Zure informazioa bizilekutik kanpoko herrialdeetara transferitu daiteke. Segurtasun neurri guztiak bermatuko ditugu."
            },
            changes: {
                title: "11. Pribatutasun-politika honen aldaketak",
                content: "Aldian-aldian eguneratu dezakegu politika hau. Aldaketen berri emango dizugu orrialde honetan bertan."
            },
            contact: {
                title: "12. Jarri gurekin harremanetan",
                intro: "Zalantzarik baduzu edo zure eskubideak erabili nahi badituzu, jarri gurekin harremanetan:",
                email: "E-posta: cesc.riera@summitstracker.com",
                website: "Webgunea: summitstracker.com",
                support: "Laguntza: App-aren barruko laguntza-funtzioen bidez eskuragarri"
            }
        }
    }
};

function applyTranslations(lang) {
    const path = `src/shared/locales/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    // Deep merge function
    function merge(target, source) {
        for (const key in source) {
            if (typeof source[key] === 'object' && source[key] !== null) {
                if (!target[key]) target[key] = {};
                merge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    if (translations[lang]) {
        merge(data, translations[lang]);
        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Applied translations to ${path}`);
    }
}

applyTranslations('eu');
