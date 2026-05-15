/* ================================================
   APP.JS — Atelier KHEM
   Rôle : Chargement des données depuis le fichier
   XML, gestion de l'audio ambiant, animations GSAP
   et toutes les interactions utilisateur.
   ================================================ */


/* --- Enregistrement des plugins GSAP --- */
// ScrollTrigger : permet de déclencher des animations au scroll
// ScrollToPlugin : permet à GSAP de scroller vers un élément du DOM
gsap.registerPlugin(ScrollTrigger)


/* ================================================
   STOCKAGE DES DONNÉES (rempli lors du chargement XML)

   dataStore    : contient les items de chaque zone de chaque activité
                  ex: dataStore['rhumsarrangesremk']['remkfruit'] = [{title, description, image}, ...]
   state        : mémorise l'index de l'item affiché par section/zone
                  ex: state['rhumsarrangesremk']['remkfruit'] = 2
   currentType  : mémorise la zone actuellement sélectionnée par section
                  ex: currentType['rhumsarrangesremk'] = 'remkfruit'
   sectionSounds: associe chaque section à son fichier audio
                  ex: sectionSounds['hero'] = 'sounds/accueil.mp3'
   ================================================ */
const dataStore     = {}
const state         = {}
const currentType   = {}
const sectionSounds = {}

/* ================================================
   VARIABLES GLOBALES
   ================================================ */

let currentAudio       = null
let currentSound       = null

let AUDIO_UNLOCKED     = false
let AUDIO_ENABLED      = true
let AUDIO_MUTED        = true

let ANIMATION_ENABLED  = true
let BLOBS_ENABLED      = true

/* ================================================
   FLOATING CONTROLS
   ================================================ */

let audioToggle = document.getElementById('audio-toggle')
let blobToggle  = document.getElementById('blob-toggle')

/* ================================================
   SYSTÈME AUDIO
   ================================================ */

/**
 * Joue le son associé à une section.
 * Le son n'est réellement joué que si :
 * - l'audio est activé dans le XML
 * - l'audio a été débloqué par un geste utilisateur
 * - le son n'est pas muté
 */

function playSectionSound(src)
{
	if (!AUDIO_ENABLED) return
	if (!src) return

	/* Évite de recréer le même son inutilement */
	if (currentSound === src && currentAudio)
	{
		/* Relance simplement si besoin */
		if (
			AUDIO_UNLOCKED &&
			!AUDIO_MUTED &&
			currentAudio.paused
		)
		{
			currentAudio.play().catch(() => {})
		}

		return
	}

	currentSound = src

	/* Stop ancien son */
	if (currentAudio)
	{
		currentAudio.pause()
		currentAudio.currentTime = 0
	}

	/* Prépare nouveau son */
	currentAudio = new Audio(src)

	currentAudio.preload = 'auto'
	currentAudio.loop    = true
	currentAudio.volume  = 0.6

	/* Ne joue pas tant que l'utilisateur n'a pas interagi */
	if (!AUDIO_UNLOCKED || AUDIO_MUTED) return

	currentAudio.play().catch(() => {})
}


/* ================================================
   DÉBLOCAGE AUDIO NAVIGATEUR
   ================================================ */

function unlockAudio()
{
	if (AUDIO_UNLOCKED) return

	AUDIO_UNLOCKED = true

	console.log('AUDIO DÉBLOQUÉ')
}


/* ================================================
   ACTIVE LE SON
   ================================================ */

function enableAudio()
{
	if (!AUDIO_ENABLED) return

	/* Débloque navigateur */
	unlockAudio()

	/* Active son */
	AUDIO_MUTED = false

	/* Lance son courant */
	if (currentAudio)
	{
		currentAudio.play().catch(() => {})
	}

	/* Mise à jour bouton */
	updateAudioButton()

	/* Supprime overlay */
	removeAudioOverlay()
}


/* ================================================
   DÉSACTIVE LE SON
   ================================================ */

function disableAudio()
{
	AUDIO_MUTED = true

	if (currentAudio)
	{
		currentAudio.pause()
	}

	updateAudioButton()
}


/* ================================================
   TOGGLE AUDIO
   ================================================ */

function toggleAudio()
{
	/* Premier clic utilisateur */
	if (!AUDIO_UNLOCKED)
	{
		enableAudio()
		return
	}

	/* Toggle classique */
	if (AUDIO_MUTED)
	{
		enableAudio()
	}
	else
	{
		disableAudio()
	}
}


/* ================================================
   MISE À JOUR BOUTON AUDIO
   ================================================ */

function updateAudioButton()
{
	const audioToggle =
		document.getElementById('audio-toggle')

	if (!audioToggle) return

	audioToggle.innerHTML =
		AUDIO_MUTED
			? '🔇'
			: '🔊'
}


/* ================================================
   OVERLAY AUDIO
   ================================================ */

function createAudioOverlay()
{
	if (!AUDIO_ENABLED) return

	/* Évite doublons */
	if (document.getElementById('audio-unlock-overlay'))
	{
		return
	}

	const overlay = document.createElement('div')

	overlay.id = 'audio-unlock-overlay'

	/* IMPORTANT :
	   overlay visible mais ne bloque PAS les boutons */
	overlay.style.position = 'fixed'
	overlay.style.inset = '0'
	overlay.style.zIndex = '999'
	overlay.style.background = 'transparent'

	document.body.appendChild(overlay)

	/* =========================================
	   CLIC SUR OVERLAY
	========================================= */

	overlay.addEventListener(
		'click',
		() =>
		{
			enableAudio()
		},
		{ once: true }
	)

	overlay.addEventListener(
		'touchstart',
		() =>
		{
			enableAudio()
		},
		{ once: true }
	)
}


/* ================================================
   SUPPRIME OVERLAY
   ================================================ */

function removeAudioOverlay()
{
	document
		.getElementById('audio-unlock-overlay')
		?.remove()
}


/* ================================================
   AUDIO TOGGLE
   ================================================ */

if (AUDIO_ENABLED && audioToggle)
{
	audioToggle.classList.remove('hidden')

	updateAudioButton()

	audioToggle.addEventListener('click', (e) =>
	{
		e.stopPropagation()

		toggleAudio()
	})
}

/* ================================================
   CHARGEMENT DU FICHIER XML
   Toutes les données du site (textes, images, sons,
   liens WhatsApp...) sont stockées dans le XML.
   Le fetch récupère le fichier, le parse, puis
   construit dynamiquement toutes les sections HTML.
   ================================================ */

fetch('data/atelier-khem.xml')
	.then(res => res.text())                                       // Récupère le contenu brut du fichier
	.then(str => new DOMParser().parseFromString(str, "text/xml")) // Convertit le texte en objet XML navigable
	.then(xml => {


	/* -----------------------------------------------
	   CONFIGURATION GLOBALE (nœud <config> du XML)
	   ----------------------------------------------- */

	const config = xml.querySelector('config')
	
	/* ================================================
	   THÈME DYNAMIQUE
	   Les couleurs globales du site sont chargées
	   depuis le XML puis injectées en variables CSS.
	   ================================================ */
   
   const theme = config?.querySelector('theme')

	document.documentElement.style.setProperty(
		'--color-bg',
		theme?.querySelector('background')?.textContent.trim()
	)

	document.documentElement.style.setProperty(
		'--color-primary',
		theme?.querySelector('primary')?.textContent.trim()
	)

	document.documentElement.style.setProperty(
		'--color-secondary',
		theme?.querySelector('secondary')?.textContent.trim()
	)

	document.documentElement.style.setProperty(
		'--color-text-soft',
		theme?.querySelector('textSoft')?.textContent.trim()
	)

	/* ================================================
		CONFIGURATION GLOBALE
		================================================ */

	// Lit l'activation de l'audio depuis le XML : <audio>1</audio> = activé
	AUDIO_ENABLED = config?.querySelector('audio')?.textContent.trim() === '1'

/* ================================================
   CONFIGURATION AUDIO XML
   ================================================ */

if (!AUDIO_ENABLED)
{
	/* Cache bouton audio */
	audioToggle?.classList.add('hidden')

	/* Supprime overlay éventuel */
	removeAudioOverlay()

	/* Coupe audio éventuel */
	if (currentAudio)
	{
		currentAudio.pause()
		currentAudio = null
	}

	currentSound = null
}

	// Lit l'activation des animations depuis le XML : <animation>1</animation> = activé
	ANIMATION_ENABLED = config?.querySelector('animation')?.textContent.trim() === '1'

	// Si les animations sont désactivées : ajoute une classe CSS sur le body
	// (permet de cibler les blobs en CSS avec .no-animations .blob)
	if (!ANIMATION_ENABLED) {
		document.body.classList.add('no-animations')
	}

	// Si les animations sont désactivées : supprime aussi le conteneur de blobs du DOM
	// (plus direct que le CSS, évite tout rendu inutile)
	if (!ANIMATION_ENABLED) {
		document.getElementById('alchemic-bg')?.remove()
	}
	
	/* ================================================
	   BLOB TOGGLE
	   ================================================ */

	const alchemicBg = document.getElementById('alchemic-bg')

	if (
		ANIMATION_ENABLED
		&& blobToggle
		&& alchemicBg
	)
	{
		blobToggle.classList.remove('hidden')

		blobToggle.innerHTML = '✨'

		blobToggle.addEventListener('click', () =>
		{
			BLOBS_ENABLED = !BLOBS_ENABLED

			alchemicBg.style.display =
				BLOBS_ENABLED
					? 'block'
					: 'none'

			blobToggle.innerHTML =
				BLOBS_ENABLED
					? '✨'
					: '❌'
		})
	}


	/* -----------------------------------------------
	   SEO : INJECTION DES MÉTADONNÉES DYNAMIQUES
	   Les balises <meta> sont générées depuis le XML
	   pour le référencement et le partage social.
	   ----------------------------------------------- */

	const seo = config?.querySelector('seo')

	if (seo) {

		/**
		 * Crée ou met à jour une balise <meta> dans le <head> de la page.
		 * Si la balise existe déjà, elle est mise à jour. Sinon, elle est créée.
		 *
		 * @param {string}  name     - Nom ou propriété de la balise meta
		 * @param {string}  content  - Valeur du contenu
		 * @param {boolean} property - true = attribut "property" (Open Graph), false = attribut "name"
		 */
		const setMeta = (name, content, property = false) => {

			if (!content) return

			// Sélecteur CSS selon le type de balise (name ou property)
			let selector = property
				? `meta[property="${name}"]`
				: `meta[name="${name}"]`

			let meta = document.querySelector(selector)

			// Crée la balise si elle n'existe pas encore
			if (!meta) {
				meta = document.createElement('meta')
				if (property) {
					meta.setAttribute('property', name)
				} else {
					meta.setAttribute('name', name)
				}
				document.head.appendChild(meta)
			}

			meta.setAttribute('content', content)

		}

		// Lecture des valeurs depuis le XML
		const title       = seo.querySelector('title')?.textContent.trim()
		const description = seo.querySelector('description')?.textContent.trim()
		const keywords    = seo.querySelector('keywords')?.textContent.trim()
		const author      = seo.querySelector('author')?.textContent.trim()
		const ogImage     = seo.querySelector('ogImage')?.textContent.trim()

		// Mise à jour du titre de l'onglet
		if (title) document.title = title

		// Balises meta standard (référencement Google)
		setMeta('description', description)
		setMeta('keywords',    keywords)
		setMeta('author',      author)

		// Open Graph : partage sur Facebook, LinkedIn, WhatsApp...
		setMeta('og:title',       title,       true)
		setMeta('og:description', description, true)
		setMeta('og:image',       ogImage,     true)
		setMeta('og:type',        'website',   true)

		// Twitter Cards : aperçu lors du partage sur Twitter/X
		setMeta('twitter:card',        'summary_large_image')
		setMeta('twitter:title',       title)
		setMeta('twitter:description', description)
		setMeta('twitter:image',       ogImage)

	}

	/* ================================================
	   [MOD|2026-05-14|18:58]

	   BRANDING GLOBAL DYNAMIQUE
	   Injection :
	   - nom du site
	   - logo
	   - URLs SEO
	   - couleurs globales
	   - loader
	   depuis le XML.

	   Le site devient ainsi entièrement duplicable
	   sans modifier index.html.

	   ================================================ */

	const branding = config?.querySelector('branding')

	if (branding) {

		const siteName      = branding.querySelector('siteName')?.textContent?.trim()
		const siteUrl       = branding.querySelector('siteUrl')?.textContent?.trim()
		const logo          = branding.querySelector('logo')?.textContent?.trim()
		const loaderText    = branding.querySelector('loaderText')?.textContent?.trim()

		const colorPrimary   = branding.querySelector('colorPrimary')?.textContent?.trim()
		const colorSecondary = branding.querySelector('colorSecondary')?.textContent?.trim()
		const colorBackground= branding.querySelector('colorBackground')?.textContent?.trim()
		const colorText      = branding.querySelector('colorText')?.textContent?.trim()

		/* --- TITLE --- */
		if (siteName) {
			document.title = siteName
		}

		/* --- THEME COLOR --- */
		const themeMeta = document.querySelector('meta[name="theme-color"]')
		if (themeMeta && colorBackground) {
			themeMeta.setAttribute('content', colorBackground)
		}

		/* --- CANONICAL --- */
		const canonical = document.querySelector('link[rel="canonical"]')
		if (canonical && siteUrl) {
			canonical.href = siteUrl
		}

		/* --- JSON-LD ORGANIZATION --- */
		const ldJson = {
			"@context": "https://schema.org",
			"@type":    "Organization",
			"name":     siteName,
			"url":      siteUrl,
			"logo":     `${siteUrl}${logo}`
		}

		const ldScript = document.querySelector('#dynamic-ld-json')

		if (ldScript) {
			ldScript.textContent = JSON.stringify(ldJson, null, 2)
		}

		/* --- LOGOS --- */
		document.querySelectorAll('[data-site-logo]').forEach(img => {
			img.src = logo
			img.alt = siteName
		})

		/* --- LOADER TEXT --- */
		const loaderTextElement = document.getElementById('startup-loader-text')

		if (loaderTextElement && loaderText) {
			loaderTextElement.textContent = loaderText
		}

		/* --- VARIABLES CSS --- */
		const root = document.documentElement

		if (colorPrimary) {
			root.style.setProperty('--color-primary', colorPrimary)
		}

		if (colorSecondary) {
			root.style.setProperty('--color-secondary', colorSecondary)
		}

		if (colorBackground) {
			root.style.setProperty('--color-bg', colorBackground)
		}

		if (colorText) {
			root.style.setProperty('--color-text', colorText)
		}

	}

	/* [/MOD|2026-05-14|18:58] */

	/* -----------------------------------------------
	   SECTION HÉRO (ACCUEIL)
	   ----------------------------------------------- */

	const accueil      = xml.querySelector('accueil')
	const accueilSound = accueil.querySelector('sound')?.textContent?.trim()

	// Enregistre le son de l'accueil pour l'observateur de sections
	sectionSounds['hero'] = accueilSound

	// Injection du contenu dans les éléments HTML du héro
	document.getElementById('hero-badge').innerHTML       = accueil.querySelector('badge').textContent
	document.getElementById('hero-title').innerHTML       = accueil.querySelector('titre').textContent
	document.getElementById('hero-description').innerHTML = accueil.querySelector('intro').textContent
	document.getElementById('hero-button').innerHTML      = accueil.querySelector('ctaTexte').textContent
	document.getElementById('hero-button').href           = accueil.querySelector('ctaLien').textContent
	document.getElementById('hero-button2').innerHTML     = accueil.querySelector('ctaTexte2').textContent
	document.getElementById('hero-button2').href          = accueil.querySelector('ctaLien2').textContent

	// Lance le son de bienvenue dès le chargement de la page
	playSectionSound(accueilSound)

	// IMPORTANT : mémorise immédiatement le son courant
	CURRENT_SOUND = accueilSound

	/* -----------------------------------------------
	   PRÉPARATION DES ACTIVITÉS ET DU FOOTER
	   ----------------------------------------------- */

	const container = document.getElementById('activities-container')
	const activites = xml.querySelectorAll('activite')

	// Le footer est lu ici car il sert à construire le bouton "Suivant"
	// de la dernière activité (qui pointe vers le footer)
	const footer      = xml.querySelector('footer')
	const footerSound = footer?.querySelector('sound')?.textContent?.trim()
	sectionSounds['footer-cta'] = footerSound

	// Tableau des IDs de toutes les activités dans l'ordre du XML
	// ex: ['rhumsarrangesremk', 'guiahsongs', 'kokolux', 'btcs']
	const actIds = Array.from(activites).map(a => a.getAttribute('id'))

	/* ================================================
	   [MOD|2026-05-14|15:56]

	   CORRECTION :
	   Remplace le scroll natif du bouton héros
	   par le scroll GSAP fluide utilisé partout
	   ailleurs dans le site.

	   Évite le "saut" brutal observé au premier clic.
	   ================================================ */

	const heroButton = document.getElementById('hero-button')

	heroButton.removeAttribute('href')

	heroButton.addEventListener('click', (e) => {

		e.preventDefault()

		goToSection(
			actIds[0],
			sectionSounds[actIds[0]]
		)

	})

	/* [/MOD|2026-05-14|15:56] */

	/* -----------------------------------------------
	   BOUCLE DE GÉNÉRATION DES SECTIONS D'ACTIVITÉS
	   Pour chaque <activite> du XML, on génère
	   dynamiquement une section HTML complète.
	   ----------------------------------------------- */

	activites.forEach((act) => {

		/* --- Lecture des données de l'activité --- */
		const actId         = act.getAttribute('id')
		const actIndex      = actIds.indexOf(actId)     // Position dans la liste (0, 1, 2...)
		const nom           = act.querySelector('nom').textContent
		const defaultVisual = act.querySelector('defaultVisual').textContent
		const subtitle      = act.querySelector('subtitle').textContent
		const description   = act.querySelector('description').textContent
		const telephone     = act.querySelector('telephone').textContent
		const whatsapp      = act.querySelector('whatsapp').textContent
		const whatsappText  = act.querySelector('whatsappText').textContent
		const next          = act.querySelector('next').textContent
		const nextText      = act.querySelector('nextText').textContent
		const previousText  = act.querySelector('previousText').textContent
		const activitySound = act.querySelector('sound')?.textContent?.trim()

		// Enregistre le son de cette activité pour l'observateur
		sectionSounds[actId] = activitySound

		/* --- Calcul de l'activité précédente (avec bouclage circulaire) --- */
		// Le % (modulo) assure qu'on ne sort jamais du tableau
		const prevId       = actIds[(actIndex - 1 + actIds.length) % actIds.length]
		const prevActivity = activites[(actIndex - 1 + actIds.length) % actIds.length]
		const prevSound    = prevActivity.querySelector('sound')?.textContent.trim()

		/* --- Calcul de l'activité suivante (avec bouclage circulaire) --- */
		const nextActivity = activites[(actIndex + 1) % actIds.length]
		const nextSound    = nextActivity.querySelector('sound')?.textContent.trim()

		/* --- Bouton "Précédent" ---
		   Si c'est la 1ère activité (index 0), le bouton pointe vers l'accueil (hero).
		   Sinon, il pointe vers l'activité précédente. */
		const prevButton = actIndex === 0
			? `<button onclick="goToSection('hero', '${accueilSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${previousText}</button>`
			: `<button onclick="goToSection('${prevId}', '${prevSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${previousText}</button>`

		/* --- Bouton "Suivant" ---
		   Si c'est la dernière activité, le bouton pointe vers le footer.
		   Sinon, il pointe vers l'activité suivante. */
		const nextButton = actIndex === actIds.length - 1
			? `<button onclick="goToSection('footer-cta', '${footerSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${nextText}</button>`
			: `<button onclick="goToSection('${next}', '${nextSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${nextText}</button>`

		// Initialise le stockage des données pour cette activité
		dataStore[actId] = {}

		/* --- Génération des boutons de zones ---
		   Chaque activité peut contenir plusieurs zones
		   ex: "remK fruits", "remK épices", "remK racines"... */
		const zones = act.querySelectorAll('zone')
		let buttons = ''

		zones.forEach((zone) => {

			const zid   = zone.getAttribute('id')
			const zname = zone.querySelector('nom').textContent

			// Ajoute un bouton cliquable pour cette zone
			buttons += `<button onclick="changeContent('${actId}','${zid}')" class="glass rounded-2xl p-5 card-hover text-left">${zname}</button>`

			// Initialise le tableau d'items pour cette zone
			dataStore[actId][zid] = []

			// Parcourt et stocke chaque item (titre + texte + image) de la zone
			zone.querySelectorAll('item').forEach(item => {
				dataStore[actId][zid].push({
					title:       item.querySelector('titre').textContent,
					description: item.querySelector('texte').textContent,
					image:       item.querySelector('image').textContent
				})
			})

		})

		/* --- Génération du HTML de la section activité ---
		   Layout en 2 colonnes :
		   - Gauche  : texte, boutons de zones, navigation entre activités
		   - Droite  : panneau vitrine (image par défaut ou contenu dynamique) */
		const html = `
<section id="${actId}" class="grid lg:grid-cols-2 gap-16 items-start section-fade border-b border-white/10 pb-24">

	<!-- ═══ COLONNE GAUCHE ═══ -->
	<div class="space-y-8">

		<!-- Ancre invisible : cible du scroll animé via goToSection() -->
		<div id="${actId}-anchor" class="scroll-offset"></div>

		<!-- En-tête : sous-titre coloré + nom de l'activité -->
		<div class="w-full">
			<div class="text-sm tracking-[0.35em] uppercase text-[#1FAF8C]">${subtitle}</div>
			<h2 class="titre text-5xl font-light mt-2">${nom}</h2>
		</div>

		<!-- Description de l'activité -->
		<p class="text-[#B7B0A7] text-lg leading-relaxed">${description}</p>

		<!-- Grille de boutons : un bouton par zone -->
		<div class="grid sm:grid-cols-2 gap-4">${buttons}</div>

		<!-- Navigation : Précédent | WhatsApp | Suivant -->
		<div class="flex flex-wrap gap-4 pt-4">
			${prevButton}
			<a href="${whatsapp}" target="_blank" class="inline-block px-8 py-4 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">${whatsappText}</a>
			${nextButton}
		</div>

	</div>

	<!-- ═══ COLONNE DROITE : PANNEAU VITRINE ═══ -->
	<!-- Le style inline est nécessaire pour les valeurs non supportées par Tailwind -->
	<div style="background:rgba(255,255,255,.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:3rem;height:650px;display:flex;flex-direction:column;justify-content:space-between;">

		<!-- Zone de contenu : affiche l'image par défaut, puis le contenu dynamique -->
		<div id="${actId}-content" style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;">
			<img src="${defaultVisual}" alt="${nom}" style="max-width:100%;max-height:100%;object-fit:contain;">
		</div>

		<!-- Barre de navigation items : cachée par défaut, affichée lors du 1er clic sur une zone -->
		<div id="${actId}-nav" class="hidden flex-wrap gap-4 justify-between pt-8">
			<button id="${actId}-prev" onclick="changeContent('${actId}', currentType['${actId}'], -1)" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">← Précédent</button>
			<!-- Le titre de l'item affiché est lu via innerText pour composer le message WhatsApp -->
			<button onclick="window.open('https://wa.me/${telephone}?text=%5BEn%20provenance%20du%20site%20%2AAtelier%20KHEM%2A%20%28Rhums%20arrangés%20remK%29%5D%0A%0ABonjour%2C%0A%0AJe%20souhaite%20commander%20un%20Rhum%20arrangés%20remK%20' + encodeURIComponent(document.getElementById('${actId}-title').innerText) + '%0A%0A');" class="inline-block px-8 py-4 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">Je commande</button>
			<button id="${actId}-next" onclick="changeContent('${actId}', currentType['${actId}'], 1)" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">Suivant →</button>
		</div>

	</div>

</section>`

		// Ajoute la section générée au conteneur HTML
		container.innerHTML += html

		// Initialise l'état de cette activité : aucune zone ni item sélectionné
		currentType[actId] = null
		state[actId]       = {}

	})


	/* -----------------------------------------------
	   GÉNÉRATION DU FOOTER
	   ----------------------------------------------- */

	document.getElementById('footer-cta').innerHTML = `
<div class="max-w-5xl mx-auto text-center space-y-10 relative">

	<!-- Ancre invisible pour le scroll ciblé -->
	<div id="footer-cta-anchor" class="scroll-offset"></div>

	<!-- Label de marque -->
	<div class="tracking-[0.35em] uppercase text-sm text-[#C68346]">Atelier KHEM</div>

	<!-- Titre accrocheur -->
	<h2 class="titre text-6xl md:text-8xl font-light leading-none">${footer.querySelector('titre').textContent}</h2>

	<!-- Texte d'accompagnement -->
	<p class="text-xl text-[#B7B0A7] leading-relaxed max-w-3xl mx-auto">${footer.querySelector('texte').textContent}</p>

	<!-- Boutons d'action : Retour | WhatsApp | Email -->
	<div class="flex flex-wrap justify-center gap-5 pt-6">
		<!-- Retour vers la dernière activité de la liste -->
		<button onclick="goToSection('${actIds[actIds.length - 1]}')" class="px-8 py-5 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">← Retour</button>
		<a href="${footer.querySelector('whatsapp').textContent}" target="_blank" class="px-8 py-5 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">${footer.querySelector('whatsappText').textContent}</a>
		<a href="mailto:${footer.querySelector('email').textContent}" class="px-8 py-5 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${footer.querySelector('email').textContent}</a>
	</div>

</div>
<!-- Espace vertical en bas de page pour que le ScrollTrigger du footer puisse se déclencher correctement -->
<div style="padding-bottom: 500px;"></div>`


	/* -----------------------------------------------
	   SCROLL TRIGGER AUDIO DU FOOTER
	   Quand l'utilisateur atteint le footer en
	   scrollant (dans les deux sens), le son
	   du footer se déclenche automatiquement.
	   ----------------------------------------------- */

	ScrollTrigger.create({
		trigger:     '#footer-cta',
		start:       'top center',
		end:         'bottom center',
		onEnter:     () => { playSectionSound(footerSound) }, // En scrollant vers le bas
		onEnterBack: () => { playSectionSound(footerSound) }  // En scrollant vers le haut
	})

	// Initialise les animations d'entrée au scroll pour toutes les sections
	initAnimations()

	// Démarre l'observateur qui change le son en fonction de la section visible
	initSectionAudioObserver()
	
	/* ================================================
	   [MOD|2026-05-14|15:06]

	   Lance le préchauffage visuel du site après
	   l'initialisation complète du DOM dynamique.
	   ================================================

	cinematicWarmup()
	
	 [/MOD|2026-05-14|15:06] */
	 /* ================================================
		   [MOD|2026-05-14|15:43]

		   Force un recalcul global GSAP/ScrollTrigger
		   juste avant le warmup cinématique.
		   ================================================ */

		requestAnimationFrame(() => {

			ScrollTrigger.refresh()

			/* ================================================
			   [MOD|2026-05-14|16:11]

			   PRÉCHARGEMENT DES VISUELS PRINCIPAUX
			   ================================================ */

			preloadEssentialImages()

			/* [/MOD|2026-05-14|16:11] */

			createAudioOverlay()
			
			cinematicWarmup()

		})

		/* [/MOD|2026-05-14|15:43] */

	})

/* ================================================
   GESTION AUDIO LORS D'UNE NAVIGATION UTILISATEUR

   IMPORTANT :
   - si le son est déjà activé → on continue
   - si le son est muté → on respecte le mute
   - on ne force PLUS jamais l'activation audio
     lors des navigations "Suivant/Précédent"

   Le déblocage audio ne doit se produire QUE :
   - clic overlay
   - clic bouton audio
   ================================================ */

function ensureAudioStarted()
{
	if (!AUDIO_ENABLED) return

	/* Ignore warmup */
	if (window.__WARMUP_RUNNING__) return

	/* =========================================
	   Si l'utilisateur a déjà activé le son,
	   on s'assure juste que l'audio est débloqué.
	========================================= */

	if (!AUDIO_MUTED && !AUDIO_UNLOCKED)
	{
		unlockAudio()

		if (currentAudio)
		{
			currentAudio.play().catch(() => {})
		}

		updateAudioButton()
	}
}

/* ================================================
   NAVIGATION : SCROLL ANIMÉ VERS UNE SECTION
   ================================================ */

/**
 * Fait défiler la page vers une section cible avec une animation GSAP fluide.
 * Change également le son ambiant si un fichier audio est fourni.
 *
 * Chaque section possède un div ancre invisible avec l'id "{sectionId}-anchor".
 * C'est cet élément qui est ciblé par le scroll.
 *
 * @param {string}      sectionId - ID de la section cible (ex: 'rhumsarrangesremk')
 * @param {string|null} soundSrc  - Chemin du son à jouer lors de la navigation (optionnel)

function goToSection(sectionId, soundSrc = null) {

	// Retire le focus visuel du bouton cliqué (évite le contour bleu résiduel)
	if (document.activeElement) document.activeElement.blur()

	// Cible l'ancre invisible de la section
	const target = document.getElementById(`${sectionId}-anchor`)
	if (!target) return

	// Lance le son correspondant à la section de destination
	if (soundSrc) playSectionSound(soundSrc)

	// Annule toute animation de scroll GSAP en cours pour éviter les conflits
	gsap.killTweensOf(window)

	// Scroll animé vers l'ancre
	gsap.to(window, {
		duration: 1.2,
		scrollTo: { y: target, offsetY: 0, autoKill: false },
		ease:     'power2.inOut'
	})

}
*/
/* ================================================
   [MOD|2026-05-14|15:06]

   CORRECTION :
   Recalcule la position réelle de l'ancre juste
   avant le scroll animé afin d'éviter les décalages
   provoqués par :
   - les images chargées dynamiquement
   - les animations GSAP
   - les changements de hauteur du DOM
   - les recalculs de layout navigateur

   requestAnimationFrame :
   Attend le frame suivant pour laisser le layout
   se stabiliser avant de lancer le scroll.
   ================================================ */

function goToSection(sectionId, soundSrc = null) {

	ensureAudioStarted()

	if (document.activeElement) {
		document.activeElement.blur()
	}

	const target = document.getElementById(`${sectionId}-anchor`)
	if (!target) return

	if (soundSrc) {
		playSectionSound(soundSrc)
	}

	gsap.killTweensOf(window)

	requestAnimationFrame(() => {

		const y = target.getBoundingClientRect().top + window.scrollY

		gsap.to(window, {
			duration: 1.2,
			scrollTo: {
				y: y,
				autoKill: false
			},
			ease: 'power2.inOut'
		})

	})

}

/* [/MOD|2026-05-14|15:06] */


/* ================================================
   OBSERVATEUR DE SECTION POUR L'AUDIO
   Surveille en continu quelle section est la plus
   visible à l'écran et joue le son correspondant.
   Fonctionne en parallèle du ScrollTrigger du footer.
   ================================================ */

function initSectionAudioObserver() {

	// Liste de toutes les sections à surveiller
	const sections = [
		document.getElementById('hero'),
		...document.querySelectorAll('section[id]'), // Toutes les sections d'activités
		document.getElementById('footer-cta')
	]

	let currentVisible = null // ID de la section actuellement considérée comme "active"

	/**
	 * Parcourt toutes les sections, calcule leur visibilité dans la fenêtre
	 * et joue le son de celle qui est la plus présente à l'écran.
	 */
	function checkVisibleSection() {

		let bestSection = null
		let bestRatio   = 0

		sections.forEach(section => {

			if (!section) return

			const rect        = section.getBoundingClientRect()
			const windowHeight = window.innerHeight

			// Calcule combien de pixels de la section sont visibles dans la fenêtre
			const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0)

			// Ratio de visibilité : 0 = pas visible, 1 = entièrement visible
			const ratio = visibleHeight / rect.height

			if (ratio > bestRatio) {
				bestRatio   = ratio
				bestSection = section
			}

		})

		// Si la section dominante a changé : met à jour et joue le nouveau son
		if (bestSection && bestSection.id !== currentVisible) {
			currentVisible = bestSection.id
			playSectionSound(sectionSounds[currentVisible])
		}

	}

	// Vérifie la section visible à chaque événement de scroll
	window.addEventListener('scroll', checkVisibleSection)

	// Vérification initiale au chargement (avant tout scroll)
	checkVisibleSection()

}


/* ================================================
   AFFICHAGE DU CONTENU D'UNE ZONE
   Appelée au clic sur un bouton de zone (direction=0)
   ou sur les boutons Précédent (direction=-1)
   et Suivant (direction=+1) du panneau vitrine.
   ================================================ */

/**
 * Affiche l'item courant d'une zone dans le panneau vitrine (colonne droite).
 * Gère la navigation entre les items et la visibilité des boutons Précédent/Suivant.
 *
 * @param {string} section   - ID de l'activité parente (ex: 'rhumsarrangesremk')
 * @param {string} type      - ID de la zone sélectionnée (ex: 'remkfruit')
 * @param {number} direction - 0: premier item | -1: item précédent | +1: item suivant
 */
function changeContent(section, type, direction = 0) {

	// Sécurité : vérifie que les données existent avant de continuer
	if (!type || !dataStore[section][type]) return

	// Mémorise la zone active pour cette section
	currentType[section] = type

	// Affiche la barre de navigation (boutons Précédent/Commander/Suivant)
	// Elle est cachée (hidden) par défaut et passe en flex au premier clic
	const nav = document.getElementById(`${section}-nav`)
	nav.classList.remove('hidden')
	nav.classList.add('flex')

	// Animation d'apparition de la barre de navigation
	gsap.killTweensOf(`#${section}-nav`)
	gsap.fromTo(`#${section}-nav`,
		{ opacity: 0, y: 20 },
		{ opacity: 1, y: 0, duration: 0.4, overwrite: 'auto' }
	)

	// Initialise l'état si c'est la première fois qu'on accède à cette zone
	if (!state[section])               state[section]       = {}
	if (state[section][type] === undefined) state[section][type] = 0

	const items = dataStore[section][type]

	// Met à jour l'index selon la direction demandée
	if (direction !== 0) {

		state[section][type] += direction

		// Bouclage : si on dépasse les bornes, on revient au début ou à la fin
		if (state[section][type] < 0)             state[section][type] = items.length - 1
		if (state[section][type] >= items.length) state[section][type] = 0

	}

	const current      = items[state[section][type]] // L'objet item à afficher
	const currentIndex = state[section][type]         // Sa position dans le tableau

	// Références aux boutons de navigation
	const prevBtn = document.getElementById(`${section}-prev`)
	const nextBtn = document.getElementById(`${section}-next`)

	// Masque le bouton Précédent si on est sur le premier item
	prevBtn.style.visibility = currentIndex === 0                ? 'hidden' : 'visible'

	// Masque le bouton Suivant si on est sur le dernier item
	nextBtn.style.visibility = currentIndex === items.length - 1 ? 'hidden' : 'visible'

	// Injection du contenu de l'item dans le panneau vitrine
	document.getElementById(`${section}-content`).innerHTML = `
	<div class="w-full">
		<!-- Image de fond en CSS background-image pour un meilleur contrôle du rendu -->
		<div id="${section}-image" class="dynamic-image rounded-[2rem] h-[320px] mb-8" style="background-image:url('${current.image}')"></div>
		<div class="space-y-4">
			<!-- L'id sur le titre est utilisé pour lire son texte dans le message WhatsApp -->
			<h3 id="${section}-title" class="text-4xl font-light">${current.title}</h3>
			<div id="${section}-description" class="text-[#B7B0A7] text-lg leading-relaxed">${current.description}</div>
		</div>
	</div>`

	// Animation d'entrée de l'image (zoom léger + fondu)
	gsap.fromTo(`#${section}-image`,
		{ opacity: 0, scale: 0.95 },
		{ opacity: 1, scale: 1, duration: 1 }
	)

}


/* ================================================
   ANIMATIONS D'ENTRÉE AU SCROLL (GSAP + ScrollTrigger)
   ================================================ */

/**
 * Initialise les animations d'apparition des sections au scroll.
 * Chaque élément avec la classe .section-fade démarre invisible
 * (opacity:0, translateY:80px) et s'anime vers son état final
 * quand son bord supérieur atteint 85% de la hauteur de la fenêtre.
 */
function initAnimations() {

	gsap.utils.toArray('.section-fade').forEach(section => {

		gsap.fromTo(section,
			{ opacity: 0, y: 80 },
			{
				opacity:  1,
				y:        0,
				duration: 1.2,
				ease:     'power4.out',
				scrollTrigger: {
					trigger: section,
					start:   'top 85%' // Se déclenche quand le haut de la section atteint 85% de la fenêtre
				}
			}
		)

	})

}

/* ================================================
   [MOD|2026-05-14|16:10]

   PRÉCHARGEMENT MINIMAL DES IMAGES

   Charge uniquement :
   - logo
   - visuels d'accueil des activités

   Objectif :
   - réduire le temps de chargement initial
   - réduire la consommation de données
   - stabiliser rapidement les layouts
   ================================================ */

function preloadEssentialImages() {

	const images = []

	// Logo
	images.push('img/Logo.png')

	// Images principales des activités
	document.querySelectorAll('#activities-container img')
		.forEach(img => {

			if (img.src) {
				images.push(img.src)
			}

		})

	images.forEach(src => {

		const img = new Image()
		img.src = src

	})

}

/* [/MOD|2026-05-14|16:10] */

/* ================================================
   [MOD|2026-05-14|15:32]

   PRÉCHAUFFAGE CINÉMATIQUE DES SECTIONS

   Force le navigateur à calculer toutes les
   hauteurs/layouts/images avant la première
   navigation utilisateur afin d'éviter les
   décalages de scroll.
   ================================================

async function cinematicWarmup() {

	const loader = document.getElementById('startup-loader')

	if (!loader) return

	const sections = [
		'hero',
		...Object.keys(dataStore),
		'footer-cta'
	]

	await new Promise(resolve => setTimeout(resolve, 1200))

	for (const id of sections) {

		const target =
			document.getElementById(`${id}-anchor`)
			|| document.getElementById(id)

		if (!target) continue

		window.scrollTo({
			top: target.offsetTop,
			behavior: 'smooth'
		})

		await new Promise(resolve => setTimeout(resolve, 350))

	}

	for (const id of [...sections].reverse()) {

		const target =
			document.getElementById(`${id}-anchor`)
			|| document.getElementById(id)

		if (!target) continue

		window.scrollTo({
			top: target.offsetTop,
			behavior: 'smooth'
		})

		await new Promise(resolve => setTimeout(resolve, 180))

	}

	window.scrollTo({
		top: 0,
		behavior: 'smooth'
	})

	setTimeout(() => {

		loader.classList.add('hidden')

	}, 500)

}

[/MOD|2026-05-14|15:32] */
/* ================================================
   [MOD|2026-05-14|15:42]

   PRÉCHAUFFAGE CINÉMATIQUE RÉEL

   Cette version simule les véritables clics
   utilisateur sur les boutons "Suivant" et
   "Précédent" afin de :

   - déclencher les vrais scrolls GSAP
   - forcer les recalculs ScrollTrigger
   - stabiliser les hauteurs dynamiques
   - charger toutes les images
   - initialiser tous les layouts

   Le loader masque entièrement l'opération
   pour transformer ce warmup technique en
   expérience cinématique premium.
   ================================================ */

async function cinematicWarmup() {
	
	window.__WARMUP_RUNNING__ = true

	const loader = document.getElementById('startup-loader')

	if (!loader) return

	// Empêche toute interaction pendant le warmup
	document.body.style.overflow = 'hidden'

	// Attend que tout le DOM soit bien peint
	await new Promise(resolve => setTimeout(resolve, 250))

	const nextButtons = [
		...document.querySelectorAll('button')
	].filter(btn =>
		btn.textContent.includes('Suivant')
	)

	const prevButtons = [
		...document.querySelectorAll('button')
	].filter(btn =>
		btn.textContent.includes('Précédent')
	)

	/* ================================================
	   DESCENTE : Suivant → Suivant → Suivant
	   ================================================ */

	for (const btn of nextButtons) {

		btn.dispatchEvent(
	new MouseEvent('click', {
		bubbles: true,
		cancelable: true
	})
)

		// Attend la fin du scroll GSAP
		await new Promise(resolve => setTimeout(resolve, 250))

		// Force recalcul navigateur
		window.dispatchEvent(new Event('resize'))

		// Force recalcul ScrollTrigger
		ScrollTrigger.refresh()
}

	/* ================================================
	   REMONTÉE : Précédent → Précédent → Précédent
	   ================================================ */

	for (const btn of [...prevButtons].reverse()) {

		btn.dispatchEvent(
	new MouseEvent('click', {
		bubbles: true,
		cancelable: true
	})
)

		await new Promise(resolve => setTimeout(resolve, 250))

		window.dispatchEvent(new Event('resize'))

		ScrollTrigger.refresh()

	}

	/* ================================================
	   FINALISATION
	   ================================================ */

	window.scrollTo({
		top: 0,
		behavior: 'instant'
	})

	await new Promise(resolve => setTimeout(resolve, 250))

	loader.classList.add('hidden')
	
	/* ================================================
	   [MOD|2026-05-14|16:15]

	   Lance le préchargement progressif des images
	   secondaires après affichage du site.
	   ================================================ */

	setTimeout(() => {

		preloadRemainingImages()

	}, 1200)

	/* [/MOD|2026-05-14|16:15] */

	window.__WARMUP_RUNNING__ = false
	
	document.body.style.overflow = ''
	
	/* =========================================
		   RESET AUDIO APRÈS WARMUP
		========================================= */

	/* Etat réel navigateur */
	AUDIO_UNLOCKED = false

	/* Son désactivé par défaut */
	AUDIO_MUTED = true

	/* Coupe tout son éventuel */
	if (currentAudio)
	{
		currentAudio.pause()
		currentAudio.currentTime = 0
	}

	/* Réinitialise le bouton */
	const audioToggle = document.getElementById('audio-toggle')

	if (audioToggle)
	{
		audioToggle.innerHTML = '🔇'
	}

	/* Réaffiche l'overlay de démarrage */
	const overlay = document.getElementById('audio-unlock-overlay')

	if (overlay && AUDIO_ENABLED)
	{
		overlay.style.display = 'flex'
	}

}

/* [/MOD|2026-05-14|15:42] */

/* ================================================
   [MOD|2026-05-14|16:14]

   PRÉCHARGEMENT PROGRESSIF EN ARRIÈRE-PLAN

   Une fois le site affiché, les images
   secondaires sont chargées discrètement
   pour fluidifier les futures interactions.
   ================================================ */

function preloadRemainingImages() {

	const images = []

	Object.values(dataStore).forEach(section => {

		Object.values(section).forEach(zone => {

			zone.forEach(item => {

				if (item.image) {
					images.push(item.image)
				}

			})

		})

	})

	let index = 0

	function loadNext() {

		if (index >= images.length) return

		const img = new Image()
		img.src = images[index]

		index++

		// Petit délai pour éviter de saturer le réseau
		setTimeout(loadNext, 250)

	}

	loadNext()

}

/* [/MOD|2026-05-14|16:14] */