import json
import os

def flatten_json(y):
    out = {}
    def flatten(x, name=''):
        if type(x) is dict:
            if not x:
                out[name[:-1]] = {}
            for a in x:
                flatten(x[a], name + a + '.')
        else:
            out[name[:-1]] = x
    flatten(y)
    return out

def unflatten_json(d):
    out = {}
    for key, value in d.items():
        parts = key.split('.')
        curr = out
        for i in range(len(parts) - 1):
            if parts[i] not in curr:
                curr[parts[i]] = {}
            curr = curr[parts[i]]
        curr[parts[-1]] = value
    return out

# Dictionary of {key: {lang: translation}}
# Languages: es, ca, fr, it
translations_map = {
    # Common
    "common.delete": {"es": "Eliminar", "ca": "Eliminar", "fr": "Supprimer", "it": "Elimina"},
    "common.back": {"es": "Atrás", "ca": "Enrere", "fr": "Retour", "it": "Indietro"},
    "common.next": {"es": "Siguiente", "ca": "Següent", "fr": "Suivant", "it": "Avanti"},
    "common.previous": {"es": "Anterior", "ca": "Anterior", "fr": "Précédent", "it": "Precedente"},
    "common.filter": {"es": "Filtrar", "ca": "Filtrar", "fr": "Filtrer", "it": "Filtra"},
    "common.sort": {"es": "Ordenar", "ca": "Ordenar", "fr": "Trier", "it": "Ordina"},
    "common.refresh": {"es": "Actualizar", "ca": "Actualitzar", "fr": "Actualiser", "it": "Aggiorna"},
    "common.min": {"es": "Mín", "ca": "Mín", "fr": "Min", "it": "Min"},
    "common.max": {"es": "Máx", "ca": "Màx", "fr": "Max", "it": "Max"},
    "common.chooseCountry": {"es": "Elige un país", "ca": "Tria un país", "fr": "Choisir un pays", "it": "Scegli un paese"},
    "common.chooseRegion": {"es": "Elige una región", "ca": "Tria una regió", "fr": "Choisir une région", "it": "Scegli una regione"},
    
    # Install Webapp
    "installWebapp.title": {"es": "Bienvenido a Summits", "ca": "Benvingut a Summits", "fr": "Bienvenue sur Summits", "it": "Benvenuto su Summits"},
    "installWebapp.titlePrefix": {"es": "Bienvenido a", "ca": "Benvingut a", "fr": "Bienvenue sur", "it": "Benvenuto su"},
    "installWebapp.subtitle": {"es": "Para la mejor experiencia, añade la app a tu pantalla de inicio", "ca": "Per a la millor experiència, afegeix l'app a la teva pantalla d'inici", "fr": "Pour une meilleure expérience, ajoutez l'app à votre écran d'accueil", "it": "Per la migliore esperienza, aggiungi l'app alla tua schermata home"},
    "installWebapp.ios.step1_before": {"es": "Toca", "ca": "Prem", "fr": "Appuyez sur", "it": "Tocca"},
    "installWebapp.ios.step1_term": {"es": "Compartir", "ca": "Compartir", "fr": "Partager", "it": "Condividi"},
    "installWebapp.ios.step2_before": {"es": "Desplázate y toca", "ca": "Desplaça't i prem", "fr": "Faites défiler et appuyez sur", "it": "Scorri e tocca"},
    "installWebapp.ios.step2_term": {"es": "Añadir a inicio", "ca": "Afegir a l'inici", "fr": "Sur l'écran d'accueil", "it": "Aggiungi alla schermata Home"},
    "installWebapp.ios.step3_before": {"es": "Toca", "ca": "Prem", "fr": "Appuyez sur", "it": "Tocca"},
    "installWebapp.ios.step3_term": {"es": "Añadir", "ca": "Afegir", "fr": "Ajouter", "it": "Aggiungi"},
    "installWebapp.ios.step4_text": {"es": "Abre la app desde tu pantalla de inicio. ¡Disfruta!", "ca": "Obre l'app des de la teva pantalla d'inici. Gaudeix!", "fr": "Ouvrez l'app depuis votre écran d'accueil. Profitez !", "it": "Apri l'app dalla tua schermata Home. Buon divertimento!"},
    "installWebapp.android.step1_before": {"es": "Toca", "ca": "Prem", "fr": "Appuyez sur", "it": "Tocca"},
    "installWebapp.android.step1_term": {"es": "los 3 puntos verticales", "ca": "els 3 punts verticals", "fr": "les 3 points verticaux", "it": "i 3 puntini verticali"},
    "installWebapp.android.step2_before": {"es": "Selecciona", "ca": "Selecciona", "fr": "Sélectionnez", "it": "Seleziona"},
    "installWebapp.android.step2_term": {"es": "Añadir a pantalla de inicio", "ca": "Afegir a pantalla d'inici", "fr": "Ajouter à l'écran d'accueil", "it": "Aggiungi a schermata Home"},
    "installWebapp.android.step3_before": {"es": "Toca", "ca": "Prem", "fr": "Appuyez sur", "it": "Tocca"},
    "installWebapp.android.step3_term": {"es": "Añadir", "ca": "Afegir", "fr": "Ajouter", "it": "Aggiungi"},
    "installWebapp.android.step4_text": {"es": "Abre la app desde tu pantalla de inicio. ¡Disfruta!", "ca": "Obre l'app des de la teva pantalla d'inici. Gaudeix!", "fr": "Ouvrez l'app depuis votre écran d'accueil. Profitez !", "it": "Apri l'app dalla tua schermata Home. Buon divertimento!"},
    "installWebapp.agree": {"es": "Entendido", "ca": "Entès", "fr": "Compris", "it": "Capito"},
    "installWebapp.ctaExplore": {"es": "Descubrir", "ca": "Descobrir", "fr": "Découvrir", "it": "Scopri"},
    
    # Auth
    "auth.noAccount": {"es": "¿No tienes cuenta?", "ca": "No tens compte?", "fr": "Pas de compte ?", "it": "Non hai un account?"},
    "auth.createAccount": {"es": "Crear cuenta", "ca": "Crear compte", "fr": "Créer un compte", "it": "Crea account"},
    "auth.hasAccount": {"es": "¿Ya tienes cuenta?", "ca": "Ja tens compte?", "fr": "Vous avez déjà un compte ?", "it": "Hai già un account?"},
    "auth.resetPassword.messageWithEmail": {"es": "Te hemos enviado un código a {email}", "ca": "T'hem enviat un codi a {email}", "fr": "Nous avons envoyé un code à {email}", "it": "Abbiamo inviato un codice a {email}"},
    "auth.resetPassword.codePlaceholder": {"es": "Código de verificación", "ca": "Codi de verificació", "fr": "Code de vérification", "it": "Codice di verifica"},
    "auth.resetPassword.codeRequired": {"es": "El código es obligatorio", "ca": "El codi és obligatori", "fr": "Le code est requis", "it": "Il codice è obbligatorio"},
    "auth.resetPassword.emailRequired": {"es": "El email es obligatorio", "ca": "L'email és obligatori", "fr": "L'email est requis", "it": "L'email è obbligatoria"},
    "auth.resetPassword.resendCode": {"es": "Reenviar código", "ca": "Reenviar codi", "fr": "Renvoyer le code", "it": "Invia di nuovo codice"},
    "auth.resetPassword.resendSuccess": {"es": "Código reenviado", "ca": "Codi reenviat", "fr": "Code renvoyé", "it": "Codice inviato di nuovo"},
    "auth.resetPassword.resendError": {"es": "Error al reenviar código", "ca": "Error al reenviar codi", "fr": "Erreur lors du renvoi", "it": "Errore nell'invio del codice"},
    "auth.loginRequired.viewCompletedPeaks": {"es": "Inicia sesión para ver tus cimas completadas", "ca": "Inicia sessió per veure els teus cims completats", "fr": "Connectez-vous pour voir vos sommets complétés", "it": "Accedi per vedere le tue vette completate"},
    "auth.or": {"es": "o", "ca": "o", "fr": "ou", "it": "o"},
    "auth.loginWithStrava": {"es": "Iniciar sesión con Strava", "ca": "Inicia sessió amb Strava", "fr": "Se connecter avec Strava", "it": "Accedi con Strava"},
    "auth.register.strava.title": {"es": "Registro con Strava", "ca": "Registre amb Strava", "fr": "Inscription avec Strava", "it": "Registrazione con Strava"},
    "auth.register.garmin.title": {"es": "Registro con Garmin", "ca": "Registre amb Garmin", "fr": "Inscription avec Garmin", "it": "Registrazione con Garmin"},
    "auth.resetPassword.invalidToken": {"es": "Token inválido", "ca": "Token invàlid", "fr": "Jeton invalide", "it": "Token non valido"},

    # Navigation
    "navigation.userProfile": {"es": "Perfil de usuario", "ca": "Perfil d'usuari", "fr": "Profil utilisateur", "it": "Profilo utente"},
    "navigation.routeDetails": {"es": "Detalles de la ruta", "ca": "Detalls de la ruta", "fr": "Détails de l'itinéraire", "it": "Dettagli percorso"},
    "navigation.peakDetails": {"es": "Detalles del pico", "ca": "Detalls del pic", "fr": "Détails du sommet", "it": "Dettagli vetta"},

    # Main
    "main.totalAscents": {"es": "Ascensiones totales", "ca": "Ascensions totals", "fr": "Total des ascensions", "it": "Ascensioni totali"},
    "main.scrapingMessage": {"es": "🔄 Cargando cimas de tus rutas...", "ca": "🔄 Carregant cims de les teves rutes...", "fr": "🔄 Chargement des sommets...", "it": "🔄 Caricamento vette..."},
    "main.failedToRefresh": {"es": "Error al actualizar datos", "ca": "Error en actualitzar dades", "fr": "Échec de l'actualisation", "it": "Aggiornamento fallito"},
    "main.completedPeaksInList": {"es": "Has completado {completed} de {total} cimas en esta lista.", "ca": "Has completat {completed} de {total} cims d'aquesta llista.", "fr": "Vous avez complété {completed} sur {total} sommets de cette liste.", "it": "Hai completato {completed} su {total} vette in questa lista."},
    "main.swipeProgressHint": {"es": "Desliza para explorar tu progreso en diferentes listas", "ca": "Llisca per explorar el teu progrés en diferents llistes", "fr": "Balayez pour voir votre progression", "it": "Scorri per esplorare i tuoi progressi"},
    "main.swipeDiscoverHint": {"es": "Desliza para descubrir listas increíbles del mundo", "ca": "Llisca per descobrir llistes increïbles del món", "fr": "Balayez pour découvrir des listes", "it": "Scorri per scoprire liste incredibili"},
    "main.yourHighestPeaks": {"es": "Tus cimas más altas", "ca": "Els teus cims més altos", "fr": "Vos plus hauts sommets", "it": "Le tue vette più alte"},
    "main.yourHighestPeaksDesc": {"es": "Las montañas más altas que has conquistado", "ca": "Les muntanyes més altes que has conquerit", "fr": "Les plus hautes montagnes conquises", "it": "Le montagne più alte che hai conquistato"},
    "main.communityHighestPeaks": {"es": "Cimas más altas de la comunidad", "ca": "Cims més altos de la comunitat", "fr": "Sommets les plus hauts de la communauté", "it": "Vette più alte della community"},
    "main.communityHighestPeaksDesc": {"es": "Las cimas más impresionantes alcanzadas por la comunidad", "ca": "Els cims més impressionants assolits per la comunitat", "fr": "Les sommets impressionnants atteints par la communauté", "it": "Le vette più impressionanti raggiunte dalla community"},

    # Peak Details
    "peakDetails.expand": {"es": "Expandir", "ca": "Expandir", "fr": "Développer", "it": "Espandi"},

    # Peaks
    "peaks.noPeaksFound": {"es": "No se encontraron cimas", "ca": "No s'han trobat cims", "fr": "Aucun sommet trouvé", "it": "Nessuna vetta trovata"},
    "peaks.peakInfo": {"es": "Información de la cima", "ca": "Informació del cim", "fr": "Infos du sommet", "it": "Informazioni vetta"},
    "peaks.information": {"es": "Información", "ca": "Informació", "fr": "Information", "it": "Informazioni"},
    "peaks.noPeaksNearCoordinates": {"es": "No hay cimas cerca de estas coordenadas", "ca": "No hi ha cims a prop d'aquestes coordenades", "fr": "Aucun sommet proche de ces coordonnées", "it": "Nessuna vetta vicino a queste coordinate"},
    "peaks.images": {"es": "Imágenes", "ca": "Imatges", "fr": "Images", "it": "Immagini"},

    # Map
    "map.noRoutes": {"es": "No hay rutas disponibles", "ca": "No hi ha rutes disponibles", "fr": "Aucun itinéraire disponible", "it": "Nessun percorso disponibile"},
    "map.loadingRoutes": {"es": "Cargando rutas...", "ca": "Carregant rutes...", "fr": "Chargement des itinéraires...", "it": "Caricamento percorsi..."},
    "map.mapView": {"es": "Vista de mapa", "ca": "Vista de mapa", "fr": "Vue carte", "it": "Vista mappa"},

    # Profile
    "profile.userProfile": {"es": "Perfil de usuario", "ca": "Perfil d'usuari", "fr": "Profil utilisateur", "it": "Profilo utente"},
    "profile.about": {"es": "Acerca de", "ca": "Sobre", "fr": "À propos", "it": "Informazioni"},
    "profile.version": {"es": "Versión", "ca": "Versió", "fr": "Version", "it": "Versione"},
    "profile.nameRequired": {"es": "El nombre es obligatorio", "ca": "El nom és obligatori", "fr": "Le nom est requis", "it": "Il nome è obbligatorio"},
    "profile.nameTooLong": {"es": "El nombre debe tener 100 caracteres o menos", "ca": "El nom ha de tenir 100 caràcters o menys", "fr": "Le nom doit comporter 100 caractères ou moins", "it": "Il nome deve essere di 100 caratteri o meno"},
    "profile.nameUpdateFailed": {"es": "Error al actualizar el nombre", "ca": "Error en actualitzar el nom", "fr": "Échec de la mise à jour du nom", "it": "Aggiornamento nome fallito"},
    "profile.editName": {"es": "Editar nombre", "ca": "Editar nom", "fr": "Modifier le nom", "it": "Modifica nome"},
    "profile.saveName": {"es": "Guardar nombre", "ca": "Guardar nom", "fr": "Enregistrer le nom", "it": "Salva nome"},
    "profile.cancelEditName": {"es": "Cancelar edición", "ca": "Cancel·lar edició", "fr": "Annuler l'édition", "it": "Annulla modifica"},
    "profile.suggestionsMessage": {"es": "Comparte tus ideas y sugerencias para ayudar a mejorar la app.", "ca": "Comparteix les teves idees i suggeriments per ajudar a millorar l'app.", "fr": "Partagez vos idées et suggestions pour améliorer l'app.", "it": "Condividi le tue idee e suggerimenti per migliorare l'app."},
    "profile.follows.accept": {"es": "Aceptar", "ca": "Acceptar", "fr": "Accepter", "it": "Accetta"},
    "profile.follows.reject": {"es": "Rechazar", "ca": "Rebutjar", "fr": "Refuser", "it": "Rifiuta"},
    "profile.follows.loading": {"es": "Cargando...", "ca": "Carregant...", "fr": "Chargement...", "it": "Caricamento..."},
    "profile.follows.error": {"es": "Error al cargar datos", "ca": "Error al carregar dades", "fr": "Erreur de chargement", "it": "Errore caricamento dati"},

    # Help
    "help.subtitle": {"es": "Aprende a sacar el máximo partido a Summits y descubre todas sus funciones", "ca": "Aprèn a treure el màxim profit de Summits i descobreix totes les seves funcions", "fr": "Apprenez à tirer le meilleur parti de Summits", "it": "Impara a sfruttare al meglio Summits"},
    "help.mapNavigation.title": {"es": "Navegación del mapa", "ca": "Navegació del mapa", "fr": "Navigation sur la carte", "it": "Navigazione mappa"},
    "help.mapNavigation.pinchZoom": {"es": "Pellizca para acercar y alejar el mapa", "ca": "Pellissen per apropar i allunyar el mapa", "fr": "Pincez pour zoomer", "it": "Pizzica per zoomare"},
    "help.mapNavigation.dragPan": {"es": "Arrastra para moverte por el mapa", "ca": "Arrossega per moure't pel mapa", "fr": "Faites glisser pour vous déplacer", "it": "Trascina per spostarti"},
    "help.mapNavigation.tapPeak": {"es": "Toca en las cimas para ver detalles", "ca": "Toca els cims per veure detalls", "fr": "Appuyez sur les sommets pour voir les détails", "it": "Tocca le vette per vedere i dettagli"},
    "help.mapNavigation.layers": {"es": "Cambia entre diferentes capas de mapa", "ca": "Canvia entre diferents capes de mapa", "fr": "Changez de calque", "it": "Cambia livelli mappa"},
    "help.userFeatures.title": {"es": "Funciones de usuario", "ca": "Funcions d'usuari", "fr": "Fonctionnalités utilisateur", "it": "Funzionalità utente"},
    "help.userFeatures.savedPeaks": {"es": "Guarda tus cimas favoritas", "ca": "Guarda els teus cims preferits", "fr": "Enregistrez vos sommets favoris", "it": "Salva le tue vette preferite"},
    "help.userFeatures.routes": {"es": "Crea y gestiona tus rutas", "ca": "Crea i gestiona les teves rutes", "fr": "Créez et gérez vos itinéraires", "it": "Crea e gestisci i tuoi percorsi"},
    "help.userFeatures.statistics": {"es": "Sigue tu progreso y logros", "ca": "Segueix el teu progrés i èxits", "fr": "Suivez vos progrès et réalisations", "it": "Traccia i tuoi progressi e risultati"},
    "help.userFeatures.profile": {"es": "Gestiona tu cuenta y preferencias", "ca": "Gestiona el teu compte i preferències", "fr": "Gérez votre compte et préférences", "it": "Gestisci il tuo account e preferenze"},
    "help.leaderboard.title": {"es": "Clasificación", "ca": "Classificació", "fr": "Classement", "it": "Classifica"},
    "help.leaderboard.ranking": {"es": "Compite con otros escaladores", "ca": "Competeix amb altres escaladors", "fr": "Affrontez d'autres grimpeurs", "it": "Competi con altri scalatori"},
    "help.leaderboard.categories": {"es": "Ver rankings por categorías", "ca": "Veure rànquings per categories", "fr": "Voir les classements par catégories", "it": "Vedi classifiche per categorie"},
    "help.leaderboard.filters": {"es": "Filtra resultados por país, región...", "ca": "Filtra resultats per país, regió...", "fr": "Filtrer les résultats", "it": "Filtra risultati"},
    "help.leaderboard.achievements": {"es": "Desbloquea logros e insignias", "ca": "Desbloqueja èxits i insígnies", "fr": "Débloquez des succès", "it": "Sblocca obiettivi e badge"},
    "help.settings.title": {"es": "Ajustes y Preferencias", "ca": "Ajustos i Preferències", "fr": "Paramètres et Préférences", "it": "Impostazioni e Preferenze"},
    "help.settings.language": {"es": "Cambiar idioma de la app", "ca": "Canviar idioma de l'app", "fr": "Changer la langue", "it": "Cambia lingua"},
    "help.settings.notifications": {"es": "Gestionar notificaciones", "ca": "Gestionar notificacions", "fr": "Gérer les notifications", "it": "Gestisci notifiche"},
    "help.settings.privacy": {"es": "Controlar privacidad", "ca": "Controlar privacitat", "fr": "Contrôler la confidentialité", "it": "Controlla privacy"},
    "help.settings.data": {"es": "Gestionar datos y cuenta", "ca": "Gestionar dades i compte", "fr": "Gérer les données et le compte", "it": "Gestisci dati e account"},

    # Errors
    "errors.networkError": {"es": "Error de red", "ca": "Error de xarxa", "fr": "Erreur réseau", "it": "Errore di rete"},
    "errors.serverError": {"es": "Error del servidor", "ca": "Error del servidor", "fr": "Erreur du serveur", "it": "Errore del server"},
    "errors.timeoutError": {"es": "Tiempo de espera agotado", "ca": "Temps d'espera esgotat", "fr": "Délai d'attente dépassé", "it": "Timeout"},
    "errors.unknownError": {"es": "Error desconocido", "ca": "Error desconegut", "fr": "Erreur inconnue", "it": "Errore sconosciuto"},

    # Peaks List
    "peaksList.yourPeaks": {"es": "Tus cimas", "ca": "Els teus cims", "fr": "Vos sommets", "it": "Le tue vette"},
    "peaksList.noPeaksMatchingSearch": {"es": "No se encontraron cimas coincidentes", "ca": "No s'han trobat cims coincidents", "fr": "Aucun sommet correspondant", "it": "Nessuna vetta corrispondente"},
    "peaksList.noPeaksInRoutes": {"es": "No se encontraron cimas en tus rutas", "ca": "No s'han trobat cims a les teves rutes", "fr": "Aucun sommet trouvé dans vos itinéraires", "it": "Nessuna vetta trovata nei tuoi percorsi"},
    "peaksList.loadingPeaksData": {"es": "Cargando datos de cimas...", "ca": "Carregant dades de cims...", "fr": "Chargement des données...", "it": "Caricamento dati vette..."},
    "peaksList.loadingPeaksMetadata": {"es": "Cargando metadatos...", "ca": "Carregant metadades...", "fr": "Chargement des métadonnées...", "it": "Caricamento metadati..."},
    "peaksList.noPeaksDataAvailable": {"es": "No hay datos de cimas disponibles", "ca": "No hi ha dades de cims disponibles", "fr": "Aucune donnée disponible", "it": "Nessun dato disponibile"},

    # Gallery
    "gallery.media": {"es": "Multimedia", "ca": "Multimèdia", "fr": "Média", "it": "Media"},
    "gallery.noMedia": {"es": "No hay multimedia", "ca": "No hi ha multimèdia", "fr": "Aucun média", "it": "Nessun media"},
    "gallery.videoError": {"es": "Error de video", "ca": "Error de vídeo", "fr": "Erreur vidéo", "it": "Errore video"},
    "gallery.photos": {"es": "Fotos", "ca": "Fotos", "fr": "Photos", "it": "Foto"},
    "gallery.videos": {"es": "Vídeos", "ca": "Vídeos", "fr": "Vidéos", "it": "Video"},
    "gallery.video": {"es": "Vídeo", "ca": "Vídeo", "fr": "Vidéo", "it": "Video"},
    "gallery.photo": {"es": "Foto", "ca": "Foto", "fr": "Photo", "it": "Foto"},
    "gallery.openVideoMessage": {"es": "Abrir video", "ca": "Obrir vídeo", "fr": "Ouvrir la vidéo", "it": "Apri video"},
    "gallery.openVideo": {"es": "Abrir", "ca": "Obrir", "fr": "Ouvrir", "it": "Apri"},
    "gallery.watchVideo": {"es": "Ver video", "ca": "Veure vídeo", "fr": "Regarder la vidéo", "it": "Guarda video"},
    "gallery.viewOnPexels": {"es": "Ver en Pexels", "ca": "Veure a Pexels", "fr": "Voir sur Pexels", "it": "Vedi su Pexels"},

    # Filters
    "filters.currentFilter": {"es": "Filtro actual", "ca": "Filtre actual", "fr": "Filtre actuel", "it": "Filtro attuale"},
    "filters.choosePeakList": {"es": "Elige lista de cimas", "ca": "Tria llista de cims", "fr": "Choisir une liste", "it": "Scegli lista vette"},
    "filters.chooseListOfSummits": {"es": "Elige una lista de cumbres", "ca": "Tria una llista de cims", "fr": "Choisir une liste de sommets", "it": "Scegli una lista di vette"},

    # Leaderboard
    "leaderboard.title": {"es": "Clasificación", "ca": "Classificació", "fr": "Classement", "it": "Classifica"},
    "leaderboard.seeMoreAboutList": {"es": "Ver más sobre esta lista", "ca": "Veure més sobre aquesta llista", "fr": "Voir plus sur cette liste", "it": "Vedi altro su questa lista"},
    "leaderboard.sortBy": {"es": "Ordenar por", "ca": "Ordenar per", "fr": "Trier par", "it": "Ordina per"},
    "leaderboard.seeAll": {"es": "Ver todo", "ca": "Veure tot", "fr": "Voir tout", "it": "Vedi tutto"},
    "leaderboard.loadMorePeaks": {"es": "Cargar más cimas", "ca": "Carregar més cims", "fr": "Charger plus", "it": "Carica altre vette"},
    "leaderboard.loadMoreUsers": {"es": "Cargar más usuarios", "ca": "Carregar més usuaris", "fr": "Charger plus d'utilisateurs", "it": "Carica altri utenti"},
    "leaderboard.distanceChampion": {"es": "Campeón de distancia", "ca": "Campió de distància", "fr": "Champion de distance", "it": "Campione di distanza"},
    "leaderboard.elevationMaster": {"es": "Maestro de desnivel", "ca": "Mestre de desnivell", "fr": "Maître du dénivelé", "it": "Maestro di dislivello"},
    "leaderboard.routeExplorer": {"es": "Explorador de rutas", "ca": "Explorador de rutes", "fr": "Explorateur d'itinéraires", "it": "Esploratore di percorsi"},
    "leaderboard.peakConqueror": {"es": "Conquistador de cimas", "ca": "Conqueridor de cims", "fr": "Conquérant de sommets", "it": "Conquistatore di vette"},
    "leaderboard.enduranceKing": {"es": "Rey de la resistencia", "ca": "Rei de la resistència", "fr": "Roi de l'endurance", "it": "Re della resistenza"},
    "leaderboard.topPerformer": {"es": "Alto rendimiento", "ca": "Alt rendiment", "fr": "Meilleure performance", "it": "Miglior performer"},
    "leaderboard.listChampion": {"es": "Campeón de lista", "ca": "Campió de llista", "fr": "Champion de liste", "it": "Campione di lista"},
    "leaderboard.badges.distanceChampion": {"es": "Campeón de distancia", "ca": "Campió de distància", "fr": "Champion de distance", "it": "Campione di distanza"},
    "leaderboard.badges.elevationMaster": {"es": "Maestro de desnivel", "ca": "Mestre de desnivell", "fr": "Maître du dénivelé", "it": "Maestro di dislivello"},
    "leaderboard.badges.routeExplorer": {"es": "Explorador de rutas", "ca": "Explorador de rutes", "fr": "Explorateur d'itinéraires", "it": "Esploratore di percorsi"},
    "leaderboard.badges.peakConqueror": {"es": "Conquistador de cimas", "ca": "Conqueridor de cims", "fr": "Conquérant de sommets", "it": "Conquistatore di vette"},
    "leaderboard.badges.enduranceKing": {"es": "Rey de la resistencia", "ca": "Rei de la resistència", "fr": "Roi de l'endurance", "it": "Re della resistenza"},
    "leaderboard.badges.topPerformer": {"es": "Alto rendimiento", "ca": "Alt rendiment", "fr": "Meilleure performance", "it": "Miglior performer"},
    "leaderboard.participants": {"es": "participantes", "ca": "participants", "fr": "participants", "it": "partecipanti"},
    "leaderboard.peakLists": {"es": "Listas de cimas", "ca": "Llistes de cims", "fr": "Listes de sommets", "it": "Liste vette"},
    "leaderboard.peakListsDescription": {"es": "Compite en varias listas de cimas", "ca": "Competeix en diverses llistes de cims", "fr": "Affrontez-vous sur diverses listes", "it": "Competi in varie liste"},
    "leaderboard.topPerformers": {"es": "Mejores rendimientos", "ca": "Millors rendiments", "fr": "Meilleures performances", "it": "Migliori performance"},
    "leaderboard.allRankings": {"es": "Todos los rankings", "ca": "Tots els rànquings", "fr": "Tous les classements", "it": "Tutte le classifiche"},

    # Landing
    "landing.loginPrompt": {"es": "¿Quieres llevar tu progreso más lejos?", "ca": "Vols portar el teu progrés més lluny?", "fr": "Aller plus loin ?", "it": "Vuoi andare oltre?"},
    "landing.home": {"es": "Inicio", "ca": "Inici", "fr": "Accueil", "it": "Home"},
    "landing.explore": {"es": "Descubrir", "ca": "Descobrir", "fr": "Découvrir", "it": "Scopri"},
    "landing.map": {"es": "Mapa", "ca": "Mapa", "fr": "Carte", "it": "Mappa"},
    "landing.leaderboards": {"es": "Clasificaciones", "ca": "Classificacions", "fr": "Classements", "it": "Classifiche"},
    "landing.signIn": {"es": "Iniciar sesión", "ca": "Inicia sessió", "fr": "Se connecter", "it": "Accedi"},
    "landing.navIntro": {"es": "¡Usa estos botones para explorar!", "ca": "Usa aquests botons per explorar!", "fr": "Utilisez ces boutons pour explorer !", "it": "Usa questi pulsanti per esplorare!"},
    "landing.desktopWarning.title": {"es": "Summits funciona mejor en móvil", "ca": "Summits funciona millor al mòbil", "fr": "Summits fonctionne mieux sur mobile", "it": "Summits funziona meglio su mobile"},
    "landing.desktopWarning.subtitle": {"es": "Para la experiencia completa, descarga nuestra app móvil.", "ca": "Per a l'experiència completa, descarrega la nostra app mòbil.", "fr": "Pour l'expérience complète, téléchargez notre application mobile.", "it": "Per l'esperienza completa, scarica la nostra app mobile."},
    "desktopWarning.mobileSubtitle": {"es": "Escanea para abrir en móvil", "ca": "Escaneja per obrir al mòbil", "fr": "Scannez pour ouvrir sur mobile", "it": "Scansiona per aprire su mobile"},

    # Recent Community
    "recentCommunityPeaks.title": {"es": "Cimas Recientes", "ca": "Cims Recents", "fr": "Sommets Récents", "it": "Vette Recenti"},
    "recentCommunityPeaks.subtitle": {"es": "Últimas cimas conquistadas", "ca": "Últims cims conquerits", "fr": "Derniers sommets conquis", "it": "Ultime vette conquistate"},
    "recentCommunityPeaks.elevation": {"es": "Elevación", "ca": "Elevació", "fr": "Élévation", "it": "Elevazione"},
    "recentCommunityPeaks.location": {"es": "Ubicación", "ca": "Ubicació", "fr": "Lieu", "it": "Posizione"},
    "recentCommunityRoutes.title": {"es": "Rutas Recientes", "ca": "Rutes Recents", "fr": "Itinéraires Récents", "it": "Percorsi Recenti"},
    "recentCommunityRoutes.subtitle": {"es": "Últimas rutas completadas", "ca": "Últimes rutes completades", "fr": "Derniers itinéraires complétés", "it": "Ultimi percorsi completati"},
    "recentCommunityRoutes.elevationGain": {"es": "Desnivel", "ca": "Desnivell", "fr": "Dénivelé", "it": "Dislivello"},
    "recentCommunityRoutes.time": {"es": "Tiempo", "ca": "Temps", "fr": "Temps", "it": "Tempo"},
    "recentCommunityRoutes.distance": {"es": "Distancia", "ca": "Distància", "fr": "Distance", "it": "Distanza"},
    "recentCommunityRoutes.peaks": {"es": "Cimas", "ca": "Cims", "fr": "Sommets", "it": "Vette"},

    # User Peaks / Saved / Routes / Stats
    "userPeaks.noPeaks": {"es": "Aún no has completado ninguna cima. ¡Empieza tu aventura!", "ca": "Encara no has completat cap cim. Comença la teva aventura!", "fr": "Vous n'avez pas encore de sommet. Commencez l'aventure !", "it": "Non hai ancora completato vette. Inizia la tua avventura!"},
    "userPeaks.loading": {"es": "Cargando tus cimas...", "ca": "Carregant els teus cims...", "fr": "Chargement de vos sommets...", "it": "Caricamento vette..."},
    "userPeaks.error": {"es": "Error al cargar tus cimas", "ca": "Error al carregar els teus cims", "fr": "Erreur de chargement", "it": "Errore caricamento"},
    "userPeaks.timeline": {"es": "Cronología", "ca": "Cronologia", "fr": "Chronologie", "it": "Cronologia"},
    "userPeaks.summary.singleRoute": {"es": "Has completado {peakName} {countText} en {routeName} el {date}", "ca": "Has completat {peakName} {countText} a {routeName} el {date}", "fr": "Complété {peakName} {countText} sur {routeName} le {date}", "it": "Completato {peakName} {countText} su {routeName} il {date}"},
    "userPeaks.summary.twoRoutes": {"es": "Has completado {peakName} {countText} en {routeNames} en {dates}", "ca": "Has completat {peakName} {countText} a {routeNames} a {dates}", "fr": "Complété {peakName} {countText} sur {routeNames} le {dates}", "it": "Completato {peakName} {countText} su {routeNames} il {dates}"},
    "userPeaks.summary.multipleRoutes": {"es": "Has completado {peakName} {countText} en {routeNames} en {dates}", "ca": "Has completat {peakName} {countText} a {routeNames} a {dates}", "fr": "Complété {peakName} {countText} sur {routeNames} le {dates}", "it": "Completato {peakName} {countText} su {routeNames} il {dates}"},
    "userPeaks.grid": {"es": "Cuadrícula", "ca": "Quadrícula", "fr": "Grille", "it": "Griglia"},

    "userSavedPeaks.noPeaks": {"es": "Aún no has guardado ninguna cima. ¡Empieza a explorar!", "ca": "Encara no has guardat cap cim. Comença a explorar!", "fr": "Aucun sommet enregistré.", "it": "Nessuna vetta salvata."},
    "userSavedPeaks.loading": {"es": "Cargando cimas guardadas...", "ca": "Carregant cims guardats...", "fr": "Chargement...", "it": "Caricamento..."},
    "userSavedPeaks.error": {"es": "Error al cargar cimas guardadas", "ca": "Error al carregar cims guardats", "fr": "Erreur de chargement", "it": "Errore caricamento"},
    "userSavedPeaks.advancedFilters": {"es": "Filtros avanzados", "ca": "Filtres avançats", "fr": "Filtres avancés", "it": "Filtri avanzati"},
    "userSavedPeaks.dateRange": {"es": "Rango de fechas", "ca": "Rang de dates", "fr": "Plage de dates", "it": "Intervallo date"},
    "userSavedPeaks.startDate": {"es": "Fecha inicio", "ca": "Data inici", "fr": "Date de début", "it": "Data inizio"},
    "userSavedPeaks.endDate": {"es": "Fecha fin", "ca": "Data fi", "fr": "Date de fin", "it": "Data fine"},
    "userSavedPeaks.elevationRange": {"es": "Rango de elevación", "ca": "Rang d'elevació", "fr": "Plage d'altitude", "it": "Intervallo altitudine"},
    "userSavedPeaks.country": {"es": "País", "ca": "País", "fr": "Pays", "it": "Paese"},
    "userSavedPeaks.region": {"es": "Región", "ca": "Regió", "fr": "Région", "it": "Regione"},
    "userSavedPeaks.allCountries": {"es": "Todos los países", "ca": "Tots els països", "fr": "Tous les pays", "it": "Tutti i paesi"},
    "userSavedPeaks.allRegions": {"es": "Todas las regiones", "ca": "Totes les regions", "fr": "Toutes les régions", "it": "Tutte le regioni"},
    "userSavedPeaks.clearAll": {"es": "Borrar todo", "ca": "Esborrar tot", "fr": "Tout effacer", "it": "Cancella tutto"},
    "userSavedPeaks.applyFilters": {"es": "Aplicar filtros", "ca": "Aplicar filtres", "fr": "Appliquer", "it": "Applica"},

    "userRoutes.loadingCountries": {"es": "Cargando países...", "ca": "Carregant països...", "fr": "Chargement des pays...", "it": "Caricamento paesi..."},
    
    "userStats.activityType": {"es": "Tipo de actividad", "ca": "Tipus d'activitat", "fr": "Type d'activité", "it": "Tipo di attività"},
    "userStats.globalStats": {"es": "Estadísticas globales", "ca": "Estadístiques globals", "fr": "Stats globales", "it": "Statistiche globali"},
    "userStats.byActivity": {"es": "Por actividad", "ca": "Per activitat", "fr": "Par activité", "it": "Per attività"},
    "userStats.progressChart": {"es": "Gráfico de progreso", "ca": "Gràfic de progrés", "fr": "Graphique de progression", "it": "Grafico progressi"},
    "userStats.rotate": {"es": "Gira el dispositivo para mejor vista", "ca": "Gira el dispositiu per a millor vista", "fr": "Tournez l'appareil", "it": "Ruota dispositivo"},

    "communityInfo.yourProgress": {"es": "Tu progreso", "ca": "El teu progrés", "fr": "Votre progression", "it": "I tuoi progressi"},
    "communityInfo.lastCompleted": {"es": "Última completada", "ca": "Última completada", "fr": "Dernière complétée", "it": "Ultima completata"},

    "weather.weatherDataUnavailable": {"es": "Datos del tiempo no disponibles", "ca": "Dades del temps no disponibles", "fr": "Météo indisponible", "it": "Meteo non disponibile"},
    "infrastructure.noDataForPeak": {"es": "No hay datos de infraestructura", "ca": "No hi ha dades d'infraestructura", "fr": "Pas de données d'infrastructure", "it": "Nessun dato infrastruttura"},
    "infrastructure.noNearbyWithin5km": {"es": "No hay infraestructura cercana (5km)", "ca": "No hi ha infraestructura propera (5km)", "fr": "Pas d'infrastructure proche (5km)", "it": "Nessuna infrastruttura vicina (5km)"},
    
    # Missing EN
    "auth.resetPassword.invalidToken": {"en": "Invalid or missing reset token. Please request a new password reset link."},
    "landing.desktopWarning.title": {"en": "Summits works best on mobile"},
    "landing.desktopWarning.subtitle": {"en": "For the full experience, download our mobile app."},
}

def apply_translations():
    locales_dir = r"c:\Users\crier\OneDrive\Documents\Cims\cimsweb\src\shared\locales"
    target_files = ["en.json", "es.json", "ca.json", "fr.json", "it.json"]
    
    for f in target_files:
        path = os.path.join(locales_dir, f)
        lang_code = f.split(".")[0] # es, ca, fr, it, en
        
        with open(path, 'r', encoding='utf-8') as jf:
            data = json.load(jf)
            
        flat_data = flatten_json(data)
        
        # Apply translations
        updated_count = 0
        for key, trans_dict in translations_map.items():
            if key not in flat_data:
                if lang_code in trans_dict:
                    flat_data[key] = trans_dict[lang_code]
                    updated_count += 1
        
        if updated_count > 0:
            print(f"Updating {f} with {updated_count} new translations...")
            new_data = unflatten_json(flat_data)
            with open(path, 'w', encoding='utf-8') as jf:
                json.dump(new_data, jf, indent=2, ensure_ascii=False)
        else:
            print(f"No updates needed for {f}")

if __name__ == "__main__":
    apply_translations()
