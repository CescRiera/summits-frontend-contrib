const fs = require('fs');
const path = 'C:/Users/crier/OneDrive/Documents/Cims/cimsweb/src/shared/locales';

const translations = {
  ca: {
    'clubs.filters.activity': 'Activitat',
    'clubs.filters.allCategories': 'Totes les categories',
    'clubs.filters.routes': 'Rutes',
    'clubs.form.cropDescription': 'Posa i fes zoom al teu logotip per previsualitzar l\'avatar circular.',
    'clubs.form.cropTitle': 'Ajusta el logotip del club',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Rànquing',
    'communityInfo.filterAll': 'Totes',
    'communityInfo.filterClubRelated': 'Relacionat amb el club',
    'communityInfo.filterMyClubs': 'Els meus clubs',
    'lastUpdate.smallFixes.description': 'També hem llançat petites correccions i pedaços per mantenir l\'aplicació més fluida i fiable.',
    'lastUpdate.smallFixes.title': 'Petites correccions i millores',
    'leaderboard.inPastYear': 'en {year} ',
    'leaderboard.inYear': 'en {year}'
  },
  de: {
    'clubs.filters.activity': 'Aktivität',
    'clubs.filters.allCategories': 'Alle Kategorien',
    'clubs.filters.routes': 'Routen',
    'clubs.form.cropDescription': 'Positionieren und zoomen Sie Ihr Logo, um den kreisförmigen Avatar voranzusehen.',
    'clubs.form.cropTitle': 'Club-Logo anpassen',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Rangliste',
    'communityInfo.filterAll': 'Alle',
    'communityInfo.filterClubRelated': 'Club-bezogen',
    'communityInfo.filterMyClubs': 'Meine Clubs',
    'lastUpdate.smallFixes.description': 'Wir haben auch kleine Fehlerbehebungen und Patches veröffentlicht, um die App reibungsloser und zuverlässiger zu machen.',
    'lastUpdate.smallFixes.title': 'Kleine Korrekturen & Verbesserungen',
    'leaderboard.inPastYear': 'in {year} ',
    'leaderboard.inYear': 'in {year}'
  },
  es: {
    'clubs.filters.activity': 'Actividad',
    'clubs.filters.allCategories': 'Todas las categorías',
    'clubs.filters.routes': 'Rutas',
    'clubs.form.cropDescription': 'Posiciona y haz zoom en tu logotipo para previsualizar el avatar circular.',
    'clubs.form.cropTitle': 'Ajustar logotipo del club',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Clasificación',
    'communityInfo.filterAll': 'Todas',
    'communityInfo.filterClubRelated': 'Relacionado con el club',
    'communityInfo.filterMyClubs': 'Mis clubs',
    'lastUpdate.smallFixes.description': 'También hemos lanzado pequeñas correcciones y parches para mantener la aplicación más fluida y confiable.',
    'lastUpdate.smallFixes.title': 'Pequeñas correcciones y mejoras',
    'leaderboard.inPastYear': 'en {year} ',
    'leaderboard.inYear': 'en {year}'
  },
  eu: {
    'clubs.filters.activity': 'Jarduera',
    'clubs.filters.allCategories': 'Kategoria guztiak',
    'clubs.filters.routes': 'Ibilbideak',
    'clubs.form.cropDescription': 'Kokatu eta egin zoom logotipoan zirkulu-formako avatarra aurreikusteko.',
    'clubs.form.cropTitle': 'Clubaren logotipoa doitu',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Sailkapena',
    'communityInfo.filterAll': 'Guztiak',
    'communityInfo.filterClubRelated': 'Clubarekin erlazionatuta',
    'communityInfo.filterMyClubs': 'Nire clubak',
    'lastUpdate.smallFixes.description': 'Aplikazioa leunagoa eta fidagarriagoa mantentzeko konponketa eta adabaki txikiak bidali ditugu.',
    'lastUpdate.smallFixes.title': 'Konponketa txikiak eta hobekuntzak',
    'leaderboard.inPastYear': '{year}ean ',
    'leaderboard.inYear': '{year}ean'
  },
  fr: {
    'clubs.filters.activity': 'Activité',
    'clubs.filters.allCategories': 'Toutes les catégories',
    'clubs.filters.routes': 'Itinéraires',
    'clubs.form.cropDescription': 'Positionnez et zoomez sur votre logo pour prévisualiser l\'avatar circulaire.',
    'clubs.form.cropTitle': 'Ajuster le logo du club',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Classement',
    'communityInfo.filterAll': 'Tout',
    'communityInfo.filterClubRelated': 'Lié au club',
    'communityInfo.filterMyClubs': 'Mes clubs',
    'lastUpdate.smallFixes.description': 'Nous avons également publié de petites corrections et des correctifs pour rendre l\'application plus fluide et plus fiable.',
    'lastUpdate.smallFixes.title': 'Petites corrections et améliorations',
    'leaderboard.inPastYear': 'en {year} ',
    'leaderboard.inYear': 'en {year}'
  },
  it: {
    'clubs.filters.activity': 'Attività',
    'clubs.filters.allCategories': 'Tutte le categorie',
    'clubs.filters.routes': 'Percorsi',
    'clubs.form.cropDescription': 'Posiziona e fai zoom sul tuo logo per visualizzare l\'anteprima dell\'avatar circolare.',
    'clubs.form.cropTitle': 'Regola il logo del club',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Classifica',
    'communityInfo.filterAll': 'Tutte',
    'communityInfo.filterClubRelated': 'Correlate al club',
    'communityInfo.filterMyClubs': 'I miei club',
    'lastUpdate.smallFixes.description': 'Abbiamo anche rilasciato piccole correzioni e patch per mantenere l\'app più fluida e affidabile.',
    'lastUpdate.smallFixes.title': 'Piccole correzioni e miglioramenti',
    'leaderboard.inPastYear': 'nel {year} ',
    'leaderboard.inYear': 'nel {year}'
  },
  ja: {
    'clubs.filters.activity': 'アクティビティ',
    'clubs.filters.allCategories': 'すべてのカテゴリー',
    'clubs.filters.routes': 'ルート',
    'clubs.form.cropDescription': 'ロゴを配置してズームし、円形のアバターをプレビューします。',
    'clubs.form.cropTitle': 'クラブのロゴを調整',
    'clubs.form.cropZoom': 'ズーム',
    'common.ranking': 'ランキング',
    'communityInfo.filterAll': 'すべて',
    'communityInfo.filterClubRelated': 'クラブ関連',
    'communityInfo.filterMyClubs': 'マイクラブ',
    'lastUpdate.smallFixes.description': 'アプリをよりスムーズで信頼性の高いものにするために、小規模な修正とバグパッチも提供しました。',
    'lastUpdate.smallFixes.title': '小規模な修正と改善',
    'leaderboard.inPastYear': '{year}年に ',
    'leaderboard.inYear': '{year}年に'
  },
  no: {
    'clubs.filters.activity': 'Aktivitet',
    'clubs.filters.allCategories': 'Alle kategorier',
    'clubs.filters.routes': 'Ruter',
    'clubs.form.cropDescription': 'Posisjoner og zoom inn på logoen din for å forhåndsvise den sirkulære avataren.',
    'clubs.form.cropTitle': 'Juster klubb-logo',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Rangering',
    'communityInfo.filterAll': 'Alle',
    'communityInfo.filterClubRelated': 'Klubbrelatert',
    'communityInfo.filterMyClubs': 'Mine klubber',
    'lastUpdate.smallFixes.description': 'Vi har også lansert små feilrettinger og oppdateringer for å holde appen jevnere og mer pålitelig.',
    'lastUpdate.smallFixes.title': 'Små rettelser og forbedringer',
    'leaderboard.inPastYear': 'i {year} ',
    'leaderboard.inYear': 'i {year}'
  },
  pl: {
    'clubs.filters.activity': 'Aktywność',
    'clubs.filters.allCategories': 'Wszystkie kategorie',
    'clubs.filters.routes': 'Trasy',
    'clubs.form.cropDescription': 'Umieść i powiększ logo, aby wyświetlić podgląd okrągłego awatara.',
    'clubs.form.cropTitle': 'Dostosuj logo klubu',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Ranking',
    'communityInfo.filterAll': 'Wszystkie',
    'communityInfo.filterClubRelated': 'Związane z klubem',
    'communityInfo.filterMyClubs': 'Moje kluby',
    'lastUpdate.smallFixes.description': 'Wprowadziliśmy również drobne poprawki i łatki, aby aplikacja działała płynniej i była bardziej niezawodna.',
    'lastUpdate.smallFixes.title': 'Drobne poprawki i ulepszenia',
    'leaderboard.inPastYear': 'w {year} roku ',
    'leaderboard.inYear': 'w {year} roku'
  },
  pt: {
    'clubs.filters.activity': 'Atividade',
    'clubs.filters.allCategories': 'Todas as categorias',
    'clubs.filters.routes': 'Rotas',
    'clubs.form.cropDescription': 'Posicione e dê zoom no seu logotipo para visualizar o avatar circular.',
    'clubs.form.cropTitle': 'Ajustar logotipo do clube',
    'clubs.form.cropZoom': 'Zoom',
    'common.ranking': 'Classificação',
    'communityInfo.filterAll': 'Todas',
    'communityInfo.filterClubRelated': 'Relacionado ao clube',
    'communityInfo.filterMyClubs': 'Meus clubes',
    'lastUpdate.smallFixes.description': 'Também lançamos pequenas correções e patches para manter o aplicativo mais suave e confiável.',
    'lastUpdate.smallFixes.title': 'Pequenas correções e melhorias',
    'leaderboard.inPastYear': 'em {year} ',
    'leaderboard.inYear': 'em {year}'
  },
  ru: {
    'clubs.filters.activity': 'Активность',
    'clubs.filters.allCategories': 'Все категории',
    'clubs.filters.routes': 'Маршруты',
    'clubs.form.cropDescription': 'Переместите и увеличьте логотип, чтобы просмотреть круглый аватар.',
    'clubs.form.cropTitle': 'Настроить логотип клуба',
    'clubs.form.cropZoom': 'Масштаб',
    'common.ranking': 'Рейтинг',
    'communityInfo.filterAll': 'Все',
    'communityInfo.filterClubRelated': 'Связанные с клубом',
    'communityInfo.filterMyClubs': 'Мои клубы',
    'lastUpdate.smallFixes.description': 'Мы также выпустили небольшие исправления и патчи, чтобы приложение работало стабильнее и надежнее.',
    'lastUpdate.smallFixes.title': 'Небольшие исправления и улучшения',
    'leaderboard.inPastYear': 'в {year} году ',
    'leaderboard.inYear': 'в {year} году'
  },
  zh: {
    'clubs.filters.activity': '活动',
    'clubs.filters.allCategories': '所有类别',
    'clubs.filters.routes': '路线',
    'clubs.form.cropDescription': '调整并缩放您的徽标以预览圆形头像。',
    'clubs.form.cropTitle': '调整俱乐部徽标',
    'clubs.form.cropZoom': '缩放',
    'common.ranking': '排名',
    'communityInfo.filterAll': '全部',
    'communityInfo.filterClubRelated': '俱乐部相关',
    'communityInfo.filterMyClubs': '我的俱乐部',
    'lastUpdate.smallFixes.description': '我们还发布了小修复和补丁，以保持应用程序更流畅和可靠。',
    'lastUpdate.smallFixes.title': '小修复和改进',
    'leaderboard.inPastYear': '在{year}年',
    'leaderboard.inYear': '在{year}年'
  }
};

const locales = ['ca', 'de', 'es', 'eu', 'fr', 'it', 'ja', 'no', 'pl', 'pt', 'ru', 'zh'];

locales.forEach(locale => {
  const filePath = path + '/' + locale + '.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  Object.entries(translations[locale]).forEach(([key, value]) => {
    const parts = key.split('.');
    let current = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  });
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Updated ' + locale + '.json');
});
console.log('Done!');
