// Site copy in the four languages ROC publishes in.
//
// Property titles, descriptions and types come from the database — this is
// only the surrounding chrome. English is the default locale and lives at the
// root; the others sit under /es/, /ca/ and /fr/.

export const LOCALES = ['en', 'es', 'ca', 'fr'];
export const DEFAULT_LOCALE = 'en';

/** '/' for English, '/es/' etc. for the rest. `rest` is appended as given. */
export function localeBase(lang) {
  return lang === DEFAULT_LOCALE ? '' : `/${lang}`;
}

export function localeUrl(lang, rest = '/') {
  return `${localeBase(lang)}${rest}`;
}

/** Intl locale tags, for number and currency formatting. */
export const INTL_LOCALE = {
  en: 'en-GB', es: 'es-ES', ca: 'ca-AD', fr: 'fr-FR',
};

const en = {
  htmlLang: 'en',
  name: 'English',
  strip: 'ROC Propietats in association with Hamptons International',

  nav: { residences: 'Properties', parishes: 'Locations', hamptons: 'Hamptons', advisory: 'Advisory', contact: 'Contact' },
  cta: 'Request a Valuation',

  siteTitle: 'ROC Propietats · Prime properties in Andorra',
  eyebrow: 'Prime Properties · Principat d’Andorra',
  heroTitle: 'Mountain Living, Considered',
  heroLead: 'Exceptional homes across the seven parishes of Andorra, presented with the reach of an international network and the discretion of a private office.',
  viewResidences: 'View Properties',
  association: 'The Association →',
  inAssociation: 'In association with',

  buy: 'Buy', rent: 'Rent',
  parish: 'Location', allParishes: 'All locations',
  type: 'Property type', allTypes: 'All types',
  price: 'Price', anyPrice: 'Any price', search: 'Search',

  introEyebrow: 'Private Office · Andorra',
  introTitle: 'A small country, known intimately. A buyer network that reaches far beyond it.',
  introP1: 'ROC Propietats represents a select portfolio of residences across the Principality — from contemporary chalets above Escaldes to restored stone bordas in the valley of Ordino. Every property is visited, understood and presented as it deserves.',
  introP2: 'Our association with Hamptons International places Andorran homes before an established audience of buyers in the United Kingdom and beyond, while every conversation remains personal, local and confidential.',
  approach: 'Our Approach →',

  selected: 'Selected Properties', portfolio: 'Current Portfolio', all: 'All',
  viewAll: 'View All Properties',

  assocLabel: 'The Association',
  assocTitle: 'Andorran homes, presented to an international audience',
  assocLead: 'For sellers, the association means exposure to qualified buyers who are already considering a move — many drawn by the Principality’s quality of life, security and residency framework. For buyers relocating from abroad, it means a familiar standard of service from first enquiry to completion.',
  pillars: [
    ['International Reach', 'Listings presented to the Hamptons International buyer audience.'],
    ['Local Expertise', 'Parish-by-parish knowledge of value, planning and community.'],
    ['One Standard', 'A considered, consistent service from enquiry to completion.'],
  ],

  sevenParishes: 'Locations', whereToLive: 'Where to Live in Andorra',
  properties: 'properties', property: 'property',

  advisory: 'Advisory', advisoryTitle: 'A Complete, Discreet Service',
  services: [
    ['01', 'Sales', 'A carefully presented sale, marketed locally and to Hamptons International’s audience of qualified buyers.'],
    ['02', 'Lettings', 'Long-let residences for professionals and families relocating to the Principality, managed with care.'],
    ['03', 'Valuation', 'Considered, data-led valuations that reflect true market conditions. Clear, honest, and always confidential.'],
    ['04', 'Residency Advisory', 'Introductions to trusted legal and fiscal advisers for active and passive residency in Andorra.'],
  ],

  quote: '“We were relocating from London with very little time. ROC understood the Principality, understood us, and found a home in La Massana we would never have discovered alone.”',
  quoteAttr: 'Private client · Relocated 2025',

  contactLabel: 'Valuation & Enquiries', contactTitle: 'Begin a Private Conversation',
  contactLead: 'Whether you are considering a sale, searching for a home or exploring residency, we will respond personally within one working day. Every enquiry is treated in confidence.',
  intents: ['Selling', 'Buying', 'Letting'],
  fName: 'Full name', fEmail: 'Email address', fPhone: 'Telephone', fParish: 'Location of interest',
  fMessage: 'Tell us a little about what you are looking for',
  gdpr: 'Your details are held in accordance with Andorran data-protection law.',
  send: 'Send Enquiry',

  footExplore: 'Explore', footSale: 'Properties for Sale', footRent: 'Properties to Let',
  footParishes: 'Locations', footAdvisory: 'Residency Advisory',
  footOffice: 'Office', footVisit: 'Arrange a Visit →',
  rights: '© 2026 ROC Propietats. All rights reserved.',
  legal: 'Legal Notice', privacy: 'Privacy', cookies: 'Cookies',

  // Residences listing
  resEyebrow: 'Full Portfolio', resTitle: 'Properties',
  resLead: 'Every property currently available through ROC Propietats, refreshed daily from our register.',
  forSale: 'For sale', toLet: 'To let',
  minPrice: 'Minimum price', sort: 'Sort',
  sortPriceDesc: 'Price: high to low', sortPriceAsc: 'Price: low to high',
  showing: 'showing', of: 'of', results: 'properties',
  none: 'No properties match these criteria.', reset: 'Clear filters',

  // Property detail
  back: '← All properties', ref: 'Reference', description: 'Description',
  details: 'Details', features: 'Features',
  bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', garage: 'Garage',
  built: 'Built surface', living: 'Living area', plot: 'Plot', terrace: 'Terrace',
  garden: 'Garden', balcony: 'Balcony', garageArea: 'Garage area',
  typeLabel: 'Type', parishLabel: 'Location', yes: 'Yes', no: 'No',
  enquire: 'Enquire about this property', arrange: 'Arrange a viewing',
  tour: '360° virtual tour', video: 'Video',
  related: 'You may also consider', sourced: 'Original listing on rocpropietats.com →',
  priceOnApplication: 'Price on application', perMonth: ' pcm',
  bedShort: 'bed', bathShort: 'bath', plotShort: 'plot',
  statusNew: 'New instruction', statusSale: 'For sale', statusRent: 'To let',


  // Navigation, menu and standing pages
  navNews: 'News', navAbout: 'About us',
  menuOpen: 'Menu', menuClose: 'Close',
  moreLinks: 'More', legalLinks: 'Legal',
  newsTitle: 'News', newsEyebrow: 'From the office',
  newsLead: 'Notes on the Andorran market, residency and the practicalities of moving here.',
  readMore: 'Read more', backToNews: '← All news', published: 'Published',
  relatedNews: 'More from the journal', allCategories: 'All',
  aboutEyebrow: 'The office',
  agiaTitle: 'Member of the Association of Real Estate Agents of Andorra',
  agiaSubtitle: 'Col·legi Professional d’Agents i Gestors Immobiliaris d’Andorra',
  followUs: 'Follow us', whatsapp: 'Message us on WhatsApp',
  sourceNote: 'Originally published on rocpropietats.com →',

  thanksTitle: 'Thank you.',
  thanksBody: 'A member of our team will be in touch personally within one working day.',
  thanksBack: '← Back to home',
};

const es = {
  htmlLang: 'es',
  name: 'Español',
  strip: 'ROC Propietats en asociación con Hamptons International',

  nav: { residences: 'Propiedades', parishes: 'Ubicaciones', hamptons: 'Hamptons', advisory: 'Asesoramiento', contact: 'Contacto' },
  cta: 'Solicitar una valoración',

  siteTitle: 'ROC Propietats · Propiedades exclusivas en Andorra',
  eyebrow: 'Propiedades exclusivas · Principat d’Andorra',
  heroTitle: 'Vivir la montaña, con criterio',
  heroLead: 'Viviendas excepcionales en las siete parroquias de Andorra, presentadas con el alcance de una red internacional y la discreción de una oficina privada.',
  viewResidences: 'Ver propiedades',
  association: 'La asociación →',
  inAssociation: 'En asociación con',

  buy: 'Comprar', rent: 'Alquilar',
  parish: 'Ubicación', allParishes: 'Todas las ubicaciones',
  type: 'Tipo de propiedad', allTypes: 'Todos los tipos',
  price: 'Precio', anyPrice: 'Cualquier precio', search: 'Buscar',

  introEyebrow: 'Oficina privada · Andorra',
  introTitle: 'Un país pequeño, conocido a fondo. Una red de compradores que llega mucho más lejos.',
  introP1: 'ROC Propietats representa una cartera selecta de propiedades por todo el Principado — desde chalets contemporáneos sobre Escaldes hasta bordas de piedra restauradas en el valle de Ordino. Cada propiedad se visita, se entiende y se presenta como merece.',
  introP2: 'Nuestra asociación con Hamptons International sitúa las viviendas andorranas ante un público consolidado de compradores del Reino Unido y más allá, mientras cada conversación sigue siendo personal, local y confidencial.',
  approach: 'Nuestro enfoque →',

  selected: 'Propiedades seleccionadas', portfolio: 'Cartera actual', all: 'Todas',
  viewAll: 'Ver todas las propiedades',

  assocLabel: 'La asociación',
  assocTitle: 'Viviendas andorranas, presentadas a un público internacional',
  assocLead: 'Para quien vende, la asociación significa exposición ante compradores cualificados que ya se plantean un cambio — muchos atraídos por la calidad de vida, la seguridad y el marco de residencia del Principado. Para quien compra desde fuera, significa un estándar de servicio familiar desde la primera consulta hasta la firma.',
  pillars: [
    ['Alcance internacional', 'Propiedades presentadas al público comprador de Hamptons International.'],
    ['Conocimiento local', 'Conocimiento parroquia a parroquia del valor, el urbanismo y la comunidad.'],
    ['Un solo estándar', 'Un servicio cuidado y coherente, de la consulta a la firma.'],
  ],

  sevenParishes: 'Ubicaciones', whereToLive: 'Dónde vivir en Andorra',
  properties: 'propiedades', property: 'propiedad',

  advisory: 'Asesoramiento', advisoryTitle: 'Un servicio completo y discreto',
  services: [
    ['01', 'Ventas', 'Una venta cuidadosamente presentada, comercializada localmente y ante el público de compradores cualificados de Hamptons International.'],
    ['02', 'Alquileres', 'Viviendas de alquiler de larga duración para profesionales y familias que se trasladan al Principado, gestionadas con cuidado.'],
    ['03', 'Valoración', 'Valoraciones meditadas y basadas en datos que reflejan las condiciones reales del mercado. Claras, honestas y siempre confidenciales.'],
    ['04', 'Residencia', 'Presentaciones a asesores legales y fiscales de confianza para la residencia activa y pasiva en Andorra.'],
  ],

  quote: '«Nos trasladábamos desde Londres con muy poco tiempo. ROC entendía el Principado, nos entendía a nosotros, y encontró una casa en La Massana que nunca habríamos descubierto solos.»',
  quoteAttr: 'Cliente privado · Trasladado en 2025',

  contactLabel: 'Valoraciones y consultas', contactTitle: 'Inicie una conversación privada',
  contactLead: 'Tanto si considera una venta, busca una vivienda o explora la residencia, le responderemos personalmente en un día laborable. Cada consulta se trata con confidencialidad.',
  intents: ['Vender', 'Comprar', 'Alquilar'],
  fName: 'Nombre completo', fEmail: 'Correo electrónico', fPhone: 'Teléfono', fParish: 'Ubicación de interés',
  fMessage: 'Cuéntenos un poco qué está buscando',
  gdpr: 'Sus datos se tratan conforme a la ley andorrana de protección de datos.',
  send: 'Enviar consulta',

  footExplore: 'Explorar', footSale: 'Propiedades en venta', footRent: 'Propiedades en alquiler',
  footParishes: 'Ubicaciones', footAdvisory: 'Asesoramiento de residencia',
  footOffice: 'Oficina', footVisit: 'Concertar una visita →',
  rights: '© 2026 ROC Propietats. Todos los derechos reservados.',
  legal: 'Aviso legal', privacy: 'Privacidad', cookies: 'Cookies',

  resEyebrow: 'Cartera completa', resTitle: 'Propiedades',
  resLead: 'Todas las propiedades disponibles actualmente a través de ROC Propietats, actualizadas a diario desde nuestro registro.',
  forSale: 'En venta', toLet: 'En alquiler',
  minPrice: 'Precio mínimo', sort: 'Ordenar',
  sortPriceDesc: 'Precio: de mayor a menor', sortPriceAsc: 'Precio: de menor a mayor',
  showing: 'mostrando', of: 'de', results: 'propiedades',
  none: 'Ninguna propiedad coincide con estos criterios.', reset: 'Borrar filtros',

  back: '← Todas las propiedades', ref: 'Referencia', description: 'Descripción',
  details: 'Detalles', features: 'Características',
  bedrooms: 'Habitaciones', bathrooms: 'Baños', garage: 'Garaje',
  built: 'Superficie construida', living: 'Vivienda', plot: 'Terreno', terrace: 'Terraza',
  garden: 'Jardín', balcony: 'Balcón', garageArea: 'Superficie de garaje',
  typeLabel: 'Tipo', parishLabel: 'Ubicación', yes: 'Sí', no: 'No',
  enquire: 'Solicitar información', arrange: 'Concertar una visita',
  tour: 'Visita virtual 360°', video: 'Vídeo',
  related: 'También puede interesarle', sourced: 'Ficha original en rocpropietats.com →',
  priceOnApplication: 'Precio a consultar', perMonth: '/mes',
  bedShort: 'hab', bathShort: 'baño', plotShort: 'terreno',
  statusNew: 'Nueva incorporación', statusSale: 'En venta', statusRent: 'En alquiler',


  navNews: 'Noticias', navAbout: 'Conócenos',
  menuOpen: 'Menú', menuClose: 'Cerrar',
  moreLinks: 'Más', legalLinks: 'Legal',
  newsTitle: 'Noticias', newsEyebrow: 'Desde la oficina',
  newsLead: 'Apuntes sobre el mercado andorrano, la residencia y los aspectos prácticos de instalarse aquí.',
  readMore: 'Leer más', backToNews: '← Todas las noticias', published: 'Publicado',
  relatedNews: 'Más del blog', allCategories: 'Todas',
  aboutEyebrow: 'La oficina',
  agiaTitle: 'Miembro de la Asociación de Agentes Inmobiliarios de Andorra',
  agiaSubtitle: 'Col·legi Professional d’Agents i Gestors Immobiliaris d’Andorra',
  followUs: 'Síguenos', whatsapp: 'Escríbenos por WhatsApp',
  sourceNote: 'Publicado originalmente en rocpropietats.com →',

  thanksTitle: 'Gracias.',
  thanksBody: 'Un miembro de nuestro equipo se pondrá en contacto personalmente en un día laborable.',
  thanksBack: '← Volver al inicio',
};

const ca = {
  htmlLang: 'ca',
  name: 'Català',
  strip: 'ROC Propietats en associació amb Hamptons International',

  nav: { residences: 'Propietats', parishes: 'Ubicacions', hamptons: 'Hamptons', advisory: 'Assessorament', contact: 'Contacte' },
  cta: 'Sol·licita una valoració',

  siteTitle: 'ROC Propietats · Propietats exclusives a Andorra',
  eyebrow: 'Propietats exclusives · Principat d’Andorra',
  heroTitle: 'Viure la muntanya, amb criteri',
  heroLead: 'Habitatges excepcionals a les set parròquies d’Andorra, presentats amb l’abast d’una xarxa internacional i la discreció d’una oficina privada.',
  viewResidences: 'Veure propietats',
  association: 'L’associació →',
  inAssociation: 'En associació amb',

  buy: 'Comprar', rent: 'Llogar',
  parish: 'Ubicació', allParishes: 'Totes les ubicacions',
  type: 'Tipus de propietat', allTypes: 'Tots els tipus',
  price: 'Preu', anyPrice: 'Qualsevol preu', search: 'Cercar',

  introEyebrow: 'Oficina privada · Andorra',
  introTitle: 'Un país petit, conegut a fons. Una xarxa de compradors que va molt més enllà.',
  introP1: 'ROC Propietats representa una selecció de propietats arreu del Principat — des de xalets contemporanis sobre Escaldes fins a bordes de pedra restaurades a la vall d’Ordino. Cada propietat es visita, s’entén i es presenta com mereix.',
  introP2: 'La nostra associació amb Hamptons International situa els habitatges andorrans davant d’un públic consolidat de compradors del Regne Unit i més enllà, mentre cada conversa continua sent personal, local i confidencial.',
  approach: 'El nostre enfocament →',

  selected: 'Propietats seleccionades', portfolio: 'Cartera actual', all: 'Totes',
  viewAll: 'Veure totes les propietats',

  assocLabel: 'L’associació',
  assocTitle: 'Habitatges andorrans, presentats a un públic internacional',
  assocLead: 'Per a qui ven, l’associació significa exposició a compradors qualificats que ja es plantegen un canvi — molts atrets per la qualitat de vida, la seguretat i el marc de residència del Principat. Per a qui compra des de fora, significa un estàndard de servei familiar des de la primera consulta fins a la signatura.',
  pillars: [
    ['Abast internacional', 'Propietats presentades al públic comprador de Hamptons International.'],
    ['Coneixement local', 'Coneixement parròquia a parròquia del valor, l’urbanisme i la comunitat.'],
    ['Un sol estàndard', 'Un servei considerat i coherent, de la consulta a la signatura.'],
  ],

  sevenParishes: 'Ubicacions', whereToLive: 'On viure a Andorra',
  properties: 'propietats', property: 'propietat',

  advisory: 'Assessorament', advisoryTitle: 'Un servei complet i discret',
  services: [
    ['01', 'Vendes', 'Una venda acuradament presentada, comercialitzada localment i al públic de compradors qualificats de Hamptons International.'],
    ['02', 'Lloguers', 'Habitatges de lloguer de llarga durada per a professionals i famílies que es traslladen al Principat, gestionats amb cura.'],
    ['03', 'Valoració', 'Valoracions considerades i basades en dades que reflecteixen les condicions reals del mercat. Clares, honestes i sempre confidencials.'],
    ['04', 'Residència', 'Presentacions a assessors legals i fiscals de confiança per a la residència activa i passiva a Andorra.'],
  ],

  quote: '«Ens traslladàvem des de Londres amb molt poc temps. ROC entenia el Principat, ens entenia a nosaltres, i va trobar una casa a La Massana que mai no hauríem descobert sols.»',
  quoteAttr: 'Client privat · Traslladat el 2025',

  contactLabel: 'Valoracions i consultes', contactTitle: 'Comenci una conversa privada',
  contactLead: 'Tant si considera una venda, busca una llar o explora la residència, respondrem personalment en un dia laborable. Cada consulta es tracta amb confidencialitat.',
  intents: ['Vendre', 'Comprar', 'Llogar'],
  fName: 'Nom complet', fEmail: 'Adreça electrònica', fPhone: 'Telèfon', fParish: 'Ubicació d’interès',
  fMessage: 'Expliqui’ns una mica què està buscant',
  gdpr: 'Les seves dades es tracten d’acord amb la llei andorrana de protecció de dades.',
  send: 'Enviar consulta',

  footExplore: 'Explora', footSale: 'Propietats en venda', footRent: 'Propietats de lloguer',
  footParishes: 'Ubicacions', footAdvisory: 'Assessorament de residència',
  footOffice: 'Oficina', footVisit: 'Concertar una visita →',
  rights: '© 2026 ROC Propietats. Tots els drets reservats.',
  legal: 'Avís legal', privacy: 'Privadesa', cookies: 'Galetes',

  resEyebrow: 'Cartera completa', resTitle: 'Propietats',
  resLead: 'Totes les propietats actualment disponibles a través de ROC Propietats, actualitzades diàriament des del nostre registre.',
  forSale: 'En venda', toLet: 'De lloguer',
  minPrice: 'Preu mínim', sort: 'Ordenar',
  sortPriceDesc: 'Preu: de major a menor', sortPriceAsc: 'Preu: de menor a major',
  showing: 'mostrant', of: 'de', results: 'propietats',
  none: 'Cap propietat coincideix amb aquests criteris.', reset: 'Esborrar filtres',

  back: '← Totes les propietats', ref: 'Referència', description: 'Descripció',
  details: 'Detalls', features: 'Característiques',
  bedrooms: 'Habitacions', bathrooms: 'Banys', garage: 'Garatge',
  built: 'Superfície construïda', living: 'Habitatge', plot: 'Terreny', terrace: 'Terrassa',
  garden: 'Jardí', balcony: 'Balcó', garageArea: 'Superfície de garatge',
  typeLabel: 'Tipus', parishLabel: 'Ubicació', yes: 'Sí', no: 'No',
  enquire: 'Sol·licitar informació', arrange: 'Concertar una visita',
  tour: 'Visita virtual 360°', video: 'Vídeo',
  related: 'També us pot interessar', sourced: 'Fitxa original a rocpropietats.com →',
  priceOnApplication: 'Preu a consultar', perMonth: '/mes',
  bedShort: 'hab', bathShort: 'bany', plotShort: 'terreny',
  statusNew: 'Nova incorporació', statusSale: 'En venda', statusRent: 'De lloguer',


  navNews: 'Notícies', navAbout: 'Coneix-nos',
  menuOpen: 'Menú', menuClose: 'Tancar',
  moreLinks: 'Més', legalLinks: 'Legal',
  newsTitle: 'Notícies', newsEyebrow: 'Des de l’oficina',
  newsLead: 'Apunts sobre el mercat andorrà, la residència i els aspectes pràctics d’instal·lar-s’hi.',
  readMore: 'Llegir més', backToNews: '← Totes les notícies', published: 'Publicat',
  relatedNews: 'Més del blog', allCategories: 'Totes',
  aboutEyebrow: 'L’oficina',
  agiaTitle: 'Membre de l’Associació d’Agents Immobiliaris d’Andorra',
  agiaSubtitle: 'Col·legi Professional d’Agents i Gestors Immobiliaris d’Andorra',
  followUs: 'Segueix-nos', whatsapp: 'Escriu-nos per WhatsApp',
  sourceNote: 'Publicat originalment a rocpropietats.com →',

  thanksTitle: 'Gràcies.',
  thanksBody: 'Un membre del nostre equip es posarà en contacte personalment en un dia laborable.',
  thanksBack: '← Tornar a l’inici',
};

const fr = {
  htmlLang: 'fr',
  name: 'Français',
  strip: 'ROC Propietats en association avec Hamptons International',

  nav: { residences: 'Propriétés', parishes: 'Localisations', hamptons: 'Hamptons', advisory: 'Conseil', contact: 'Contact' },
  cta: 'Demander une estimation',

  siteTitle: 'ROC Propietats · Propriétés d’exception en Andorre',
  eyebrow: 'Propriétés d’exception · Principat d’Andorra',
  heroTitle: 'Vivre la montagne, avec discernement',
  heroLead: 'Des demeures d’exception dans les sept paroisses d’Andorre, présentées avec la portée d’un réseau international et la discrétion d’un bureau privé.',
  viewResidences: 'Voir les propriétés',
  association: 'L’association →',
  inAssociation: 'En association avec',

  buy: 'Acheter', rent: 'Louer',
  parish: 'Localisation', allParishes: 'Toutes les localisations',
  type: 'Type de bien', allTypes: 'Tous les types',
  price: 'Prix', anyPrice: 'Tous les prix', search: 'Rechercher',

  introEyebrow: 'Bureau privé · Andorre',
  introTitle: 'Un petit pays, connu intimement. Un réseau d’acquéreurs qui va bien au-delà.',
  introP1: 'ROC Propietats représente une sélection de propriétés dans toute la Principauté — des chalets contemporains au-dessus d’Escaldes aux bordes de pierre restaurées dans la vallée d’Ordino. Chaque bien est visité, compris et présenté comme il le mérite.',
  introP2: 'Notre association avec Hamptons International présente les demeures andorranes à un public établi d’acquéreurs au Royaume-Uni et au-delà, tandis que chaque échange reste personnel, local et confidentiel.',
  approach: 'Notre approche →',

  selected: 'Propriétés sélectionnées', portfolio: 'Portefeuille actuel', all: 'Toutes',
  viewAll: 'Voir toutes les propriétés',

  assocLabel: 'L’association',
  assocTitle: 'Des demeures andorranes, présentées à un public international',
  assocLead: 'Pour les vendeurs, l’association signifie une exposition auprès d’acquéreurs qualifiés qui envisagent déjà un changement — nombre d’entre eux attirés par la qualité de vie, la sécurité et le cadre de résidence de la Principauté. Pour les acquéreurs venus de l’étranger, elle signifie un standard de service familier, de la première demande à la signature.',
  pillars: [
    ['Portée internationale', 'Des biens présentés au public acquéreur de Hamptons International.'],
    ['Expertise locale', 'Une connaissance paroisse par paroisse de la valeur, de l’urbanisme et de la vie locale.'],
    ['Un seul standard', 'Un service réfléchi et constant, de la demande à la signature.'],
  ],

  sevenParishes: 'Localisations', whereToLive: 'Où vivre en Andorre',
  properties: 'propriétés', property: 'propriété',

  advisory: 'Conseil', advisoryTitle: 'Un service complet et discret',
  services: [
    ['01', 'Ventes', 'Une vente soigneusement présentée, commercialisée localement et auprès du public d’acquéreurs qualifiés de Hamptons International.'],
    ['02', 'Locations', 'Des résidences en location longue durée pour les professionnels et les familles s’installant dans la Principauté, gérées avec soin.'],
    ['03', 'Estimation', 'Des estimations réfléchies, fondées sur les données, qui reflètent les conditions réelles du marché. Claires, honnêtes et toujours confidentielles.'],
    ['04', 'Résidence', 'Mise en relation avec des conseillers juridiques et fiscaux de confiance pour la résidence active et passive en Andorre.'],
  ],

  quote: '« Nous déménagions de Londres avec très peu de temps. ROC connaissait la Principauté, nous a compris, et a trouvé à La Massana une maison que nous n’aurions jamais découverte seuls. »',
  quoteAttr: 'Client privé · Installé en 2025',

  contactLabel: 'Estimations et demandes', contactTitle: 'Engagez une conversation privée',
  contactLead: 'Que vous envisagiez une vente, cherchiez une demeure ou exploriez la résidence, nous vous répondrons personnellement sous un jour ouvré. Chaque demande est traitée en toute confidentialité.',
  intents: ['Vendre', 'Acheter', 'Louer'],
  fName: 'Nom complet', fEmail: 'Adresse e-mail', fPhone: 'Téléphone', fParish: 'Localisation recherchée',
  fMessage: 'Dites-nous en quelques mots ce que vous recherchez',
  gdpr: 'Vos données sont traitées conformément à la loi andorrane sur la protection des données.',
  send: 'Envoyer la demande',

  footExplore: 'Explorer', footSale: 'Propriétés à vendre', footRent: 'Propriétés à louer',
  footParishes: 'Localisations', footAdvisory: 'Conseil en résidence',
  footOffice: 'Bureau', footVisit: 'Organiser une visite →',
  rights: '© 2026 ROC Propietats. Tous droits réservés.',
  legal: 'Mentions légales', privacy: 'Confidentialité', cookies: 'Cookies',

  resEyebrow: 'Portefeuille complet', resTitle: 'Propriétés',
  resLead: 'Tous les biens actuellement disponibles chez ROC Propietats, actualisés chaque jour depuis notre registre.',
  forSale: 'À vendre', toLet: 'À louer',
  minPrice: 'Prix minimum', sort: 'Trier',
  sortPriceDesc: 'Prix : décroissant', sortPriceAsc: 'Prix : croissant',
  showing: 'affichage de', of: 'sur', results: 'propriétés',
  none: 'Aucun bien ne correspond à ces critères.', reset: 'Effacer les filtres',

  back: '← Toutes les propriétés', ref: 'Référence', description: 'Description',
  details: 'Détails', features: 'Caractéristiques',
  bedrooms: 'Chambres', bathrooms: 'Salles de bain', garage: 'Garage',
  built: 'Surface construite', living: 'Surface habitable', plot: 'Terrain', terrace: 'Terrasse',
  garden: 'Jardin', balcony: 'Balcon', garageArea: 'Surface de garage',
  typeLabel: 'Type', parishLabel: 'Localisation', yes: 'Oui', no: 'Non',
  enquire: 'Demander des informations', arrange: 'Organiser une visite',
  tour: 'Visite virtuelle 360°', video: 'Vidéo',
  related: 'Pourrait aussi vous intéresser', sourced: 'Annonce d’origine sur rocpropietats.com →',
  priceOnApplication: 'Prix sur demande', perMonth: '/mois',
  bedShort: 'ch.', bathShort: 'sdb', plotShort: 'terrain',
  statusNew: 'Nouveauté', statusSale: 'À vendre', statusRent: 'À louer',


  navNews: 'Actualités', navAbout: 'Nous connaître',
  menuOpen: 'Menu', menuClose: 'Fermer',
  moreLinks: 'Plus', legalLinks: 'Légal',
  newsTitle: 'Actualités', newsEyebrow: 'Depuis le bureau',
  newsLead: 'Notes sur le marché andorran, la résidence et les aspects pratiques d’une installation.',
  readMore: 'Lire la suite', backToNews: '← Toutes les actualités', published: 'Publié',
  relatedNews: 'Plus du journal', allCategories: 'Toutes',
  aboutEyebrow: 'Le bureau',
  agiaTitle: 'Membre de l’Association des Agents Immobiliers d’Andorre',
  agiaSubtitle: 'Col·legi Professional d’Agents i Gestors Immobiliaris d’Andorra',
  followUs: 'Suivez-nous', whatsapp: 'Écrivez-nous sur WhatsApp',
  sourceNote: 'Publié à l’origine sur rocpropietats.com →',

  thanksTitle: 'Merci.',
  thanksBody: 'Un membre de notre équipe vous contactera personnellement sous un jour ouvré.',
  thanksBack: '← Retour à l’accueil',
};

const DICT = { en, es, ca, fr };

export function t(lang) {
  return DICT[lang] ?? DICT[DEFAULT_LOCALE];
}

/** Parish notes, per language, for the accordion on the home page. */
export const PARISH_NOTES = {
  en: {
    'Andorra la Vella': 'The capital — elegant apartments within walking distance of the old town, the Valira river and the country’s principal services.',
    'Escaldes-Engordany': 'The most sought-after address for prime residences, from Engolasters chalets to apartments steps from the thermal quarter.',
    'La Massana': 'Sunlit, residential and favoured by families, with international schools nearby and Vallnord within easy reach.',
    'Ordino': 'The quietest and most traditional parish — stone bordas, protected valleys and an unhurried pace of life.',
    'Canillo': 'Mountain living at altitude, close to the Grandvalira slopes, with ski-in residences and sweeping views.',
    'Encamp': 'Central and well connected, offering generous homes and the funicamp to the high peaks.',
    'Sant Julià de Lòria': 'The southern gateway — vineyards, warmer light and the shortest drive to Barcelona.',
  },
  es: {
    'Andorra la Vella': 'La capital — apartamentos elegantes a un paseo del casco antiguo, el río Valira y los principales servicios del país.',
    'Escaldes-Engordany': 'La dirección más codiciada para propiedades exclusivas, desde los chalets de Engolasters hasta pisos a pocos pasos del barrio termal.',
    'La Massana': 'Soleada, residencial y preferida por las familias, con colegios internacionales cerca y Vallnord a mano.',
    'Ordino': 'La parroquia más tranquila y tradicional — bordas de piedra, valles protegidos y un ritmo de vida pausado.',
    'Canillo': 'Vida de montaña en altura, junto a las pistas de Grandvalira, con viviendas a pie de pista y vistas amplias.',
    'Encamp': 'Céntrica y bien comunicada, con viviendas generosas y el funicamp hacia las cotas altas.',
    'Sant Julià de Lòria': 'La puerta sur — viñedos, luz más cálida y el trayecto más corto hasta Barcelona.',
  },
  ca: {
    'Andorra la Vella': 'La capital — pisos elegants a tocar del centre històric, el riu Valira i els principals serveis del país.',
    'Escaldes-Engordany': 'L’adreça més cobejada per a propietats exclusives, des dels xalets d’Engolasters fins a pisos a pocs passos del barri termal.',
    'La Massana': 'Assolellada, residencial i preferida per les famílies, amb escoles internacionals a prop i Vallnord a l’abast.',
    'Ordino': 'La parròquia més tranquil·la i tradicional — bordes de pedra, valls protegides i un ritme de vida pausat.',
    'Canillo': 'Vida de muntanya en alçada, al costat de les pistes de Grandvalira, amb habitatges a peu de pista i vistes àmplies.',
    'Encamp': 'Cèntrica i ben comunicada, amb habitatges generosos i el funicamp cap a les cotes altes.',
    'Sant Julià de Lòria': 'La porta sud — vinyes, llum més càlida i el trajecte més curt fins a Barcelona.',
  },
  fr: {
    'Andorra la Vella': 'La capitale — des appartements élégants à quelques pas de la vieille ville, de la Valira et des principaux services du pays.',
    'Escaldes-Engordany': 'L’adresse la plus recherchée pour les biens d’exception, des chalets d’Engolasters aux appartements à deux pas du quartier thermal.',
    'La Massana': 'Ensoleillée, résidentielle et prisée des familles, avec des écoles internationales à proximité et Vallnord tout près.',
    'Ordino': 'La paroisse la plus calme et la plus traditionnelle — bordes de pierre, vallées protégées et rythme de vie paisible.',
    'Canillo': 'La montagne en altitude, au pied des pistes de Grandvalira, avec des résidences skis aux pieds et de vastes panoramas.',
    'Encamp': 'Centrale et bien desservie, avec des logements généreux et le funicamp vers les hauts sommets.',
    'Sant Julià de Lòria': 'La porte sud — vignes, lumière plus douce et le trajet le plus court vers Barcelone.',
  },
};

/** ROC's own channels. */
export const SOCIAL = {
  instagram: 'https://www.instagram.com/rocpropietats/',
  facebook: 'https://www.facebook.com/profile.php?id=61554481671422',
  whatsapp: 'https://api.whatsapp.com/send/?phone=376333899&text&type=phone_number&app_absent=0',
  phone: '+376 747 577',
  phoneHref: 'tel:+376747577',
  email: 'immo@rocpropietats.com',
  address: 'Ctra. General, AD400 La Massana',
};

/** Where each standing page lives, per language. */
export const PAGE_SLUGS = {
  about:   { en: 'about',   es: 'conocenos',  ca: 'coneix-nos',  fr: 'nous-connaitre' },
  legal:   { en: 'legal-notice', es: 'aviso-legal', ca: 'avis-legal', fr: 'mentions-legales' },
  privacy: { en: 'privacy-policy', es: 'politica-de-privacidad', ca: 'politica-de-privadesa', fr: 'politique-de-confidentialite' },
  cookies: { en: 'cookie-policy', es: 'politica-de-galletas', ca: 'politica-de-galetes', fr: 'politique-des-cookies' },
};

export function pagePath(key, lang) {
  return `${localeBase(lang)}/${PAGE_SLUGS[key][lang]}/`;
}

export function newsPath(lang) {
  return `${localeBase(lang)}/news/`;
}
