/* ================================================
   APP.JS — Atelier KHEM

   Rôle : chargement des données depuis le XML,
   construction dynamique du HTML, gestion de
   l'audio ambiant, animations GSAP et toutes
   les interactions utilisateur.

   DÉPENDANCES (chargées dans index.html avant ce fichier) :
   - GSAP 3.12.5 (gsap.min.js)
   - ScrollTrigger (ScrollTrigger.min.js)
   - ScrollToPlugin (ScrollToPlugin.min.js)
   ================================================ */

/* ── Enregistrement des plugins GSAP ──
   À faire une seule fois, avant tout usage.
   ScrollTrigger : déclenche les animations au scroll.
   ScrollToPlugin : permet à GSAP de scroller vers un élément. */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)


/* ════════════════════════════════════════════
   STOCKAGE DES DONNÉES
   Ces objets sont remplis lors du chargement XML
   et utilisés par changeContent() pour afficher
   le bon contenu dans le panneau vitrine.

   dataStore    — items de chaque zone de chaque activité
                  ex: dataStore['rhumsarrangesremk']['remkfruit']
                      = [{title, description, image}, ...]
   state        — index de l'item affiché par section/zone
                  ex: state['rhumsarrangesremk']['remkfruit'] = 2
   currentType  — zone actuellement sélectionnée par section
                  ex: currentType['rhumsarrangesremk'] = 'remkfruit'
   sectionSounds — son associé à chaque section
                  ex: sectionSounds['hero'] = 'sounds/accueil.mp3'
   ════════════════════════════════════════════ */

const dataStore     = {}
const state         = {}
const currentType   = {}
const sectionSounds = {}


/* ════════════════════════════════════════════
   VARIABLES GLOBALES
   ════════════════════════════════════════════ */

let currentAudio  = null  // Objet Audio en cours de lecture
let currentSound  = null  // Chemin du son en cours (évite de recréer inutilement)

let AUDIO_UNLOCKED = false // true après le premier clic de l'utilisateur
let AUDIO_ENABLED  = true  // Mis à jour depuis le XML (<audio>1</audio>)
let AUDIO_MUTED    = true  // true = son coupé (état par défaut)

let ANIMATION_ENABLED = true // Mis à jour depuis le XML (<animation>1</animation>)
let BLOBS_ENABLED     = true // Contrôlé par le bouton blob flottant


/* ── Références aux boutons flottants ──
   Récupérées au démarrage, avant le chargement du XML. */
let audioToggle = document.getElementById('audio-toggle')
let blobToggle  = document.getElementById('blob-toggle')


/* ════════════════════════════════════════════
   UTILITAIRE DE DÉCODAGE BASE64
   Décode les champs sensibles encodés dans le XML
   (téléphone, WhatsApp, email, liens ctaLien2).
   Retourne la valeur brute si le décodage échoue,
   pour rester compatible avec un XML non encodé.
   ════════════════════════════════════════════ */

/**
 * Décode une valeur Base64 issue du XML.
 * Si la valeur n'est pas du Base64 valide,
 * la retourne telle quelle (compatibilité).
 *
 * @param {string} valeur — contenu textContent d'un nœud XML
 * @returns {string}
 */
function decodeXML(valeur)
{
	if (!valeur) return ''
	try
	{
		return atob(valeur.trim())
	}
	catch
	{
		return valeur.trim()
	}
}


/* ════════════════════════════════════════════
   SYSTÈME AUDIO
   ════════════════════════════════════════════ */

/**
 * Charge et joue le son associé à une section.
 * Si le même son est déjà chargé, il est simplement
 * relancé sans recréer un objet Audio.
 * Le son ne se lance que si l'audio est activé dans
 * le XML, débloqué par un geste utilisateur et non muté.
 *
 * @param {string} src — chemin du fichier audio (ex: 'sounds/accueil.mp3')
 */
function playSectionSound(src)
{
	if (!AUDIO_ENABLED) return
	if (!src) return

	/* Si le même son est déjà chargé, on le relance simplement si besoin */
	if (currentSound === src && currentAudio)
	{
		if (AUDIO_UNLOCKED && !AUDIO_MUTED && currentAudio.paused)
		{
			currentAudio.play().catch(() => {})
		}
		return
	}

	currentSound = src

	/* Arrête le son précédent */
	if (currentAudio)
	{
		currentAudio.pause()
		currentAudio.currentTime = 0
	}

	/* Prépare le nouveau son */
	currentAudio = new Audio(src)
	currentAudio.preload = 'auto'
	currentAudio.loop    = true
	currentAudio.volume  = 0.6

	/* Ne joue pas tant que l'utilisateur n'a pas interagi */
	if (!AUDIO_UNLOCKED || AUDIO_MUTED) return

	currentAudio.play().catch(() => {})
}


/**
 * Débloque l'audio du navigateur.
 * Les navigateurs modernes interdisent la lecture
 * automatique : il faut un premier geste utilisateur.
 * Cette fonction est appelée lors du 1er clic sur
 * l'overlay ou sur le bouton audio.
 */
function unlockAudio()
{
	if (AUDIO_UNLOCKED) return
	AUDIO_UNLOCKED = true
}


/**
 * Active le son : débloque le navigateur si besoin,
 * lance l'audio courant, met à jour le bouton et
 * supprime l'overlay transparent.
 */
function enableAudio()
{
	if (!AUDIO_ENABLED) return

	unlockAudio()

	AUDIO_MUTED = false

	if (currentAudio)
	{
		currentAudio.play().catch(() => {})
	}

	updateAudioButton()
	removeAudioOverlay()
}


/**
 * Coupe le son : met en pause l'audio courant
 * et met à jour le bouton.
 */
function disableAudio()
{
	AUDIO_MUTED = true

	if (currentAudio)
	{
		currentAudio.pause()
	}

	updateAudioButton()
}


/**
 * Bascule entre son activé et son coupé.
 * Au premier clic (avant tout déblocage navigateur),
 * active directement le son.
 */
function toggleAudio()
{
	if (!AUDIO_UNLOCKED)
	{
		enableAudio()
		return
	}

	if (AUDIO_MUTED)
	{
		enableAudio()
	}
	else
	{
		disableAudio()
	}
}


/**
 * Met à jour l'icône du bouton audio flottant
 * en fonction de l'état courant (muté ou non).
 */
function updateAudioButton()
{
	const btn = document.getElementById('audio-toggle')
	if (!btn) return
	btn.innerHTML = AUDIO_MUTED ? '🔇' : '🔊'
}


/**
 * Crée l'overlay transparent qui capture le premier
 * clic ou touch de l'utilisateur pour débloquer l'audio.
 * L'overlay est invisible et ne bloque pas les boutons
 * car son z-index (999) est inférieur à celui des boutons (2000).
 */
function createAudioOverlay()
{
	if (!AUDIO_ENABLED) return

	/* Évite de créer un doublon */
	if (document.getElementById('audio-unlock-overlay')) return

	const overlay = document.createElement('div')
	overlay.id             = 'audio-unlock-overlay'
	overlay.style.position = 'fixed'
	overlay.style.inset    = '0'
	overlay.style.zIndex   = '999'
	overlay.style.background = 'transparent'

	document.body.appendChild(overlay)

	overlay.addEventListener('click',      () => { enableAudio() }, { once: true })
	overlay.addEventListener('touchstart', () => { enableAudio() }, { once: true })
}


/**
 * Supprime l'overlay de déverrouillage audio du DOM.
 * Appelée après que l'utilisateur a cliqué (audio débloqué).
 */
function removeAudioOverlay()
{
	document.getElementById('audio-unlock-overlay')?.remove()
}


/* ── Initialisation du bouton audio flottant ──
   Rendu visible et écouté uniquement si l'audio
   est activé dans le XML. */
if (AUDIO_ENABLED && audioToggle)
{
	audioToggle.classList.remove('hidden')
	updateAudioButton()

	audioToggle.addEventListener('click', (e) =>
	{
		e.stopPropagation() // Évite de déclencher l'overlay en même temps
		toggleAudio()
	})
}


/* ════════════════════════════════════════════
   CHARGEMENT DU FICHIER XML
   Toutes les données du site (textes, images, sons,
   liens WhatsApp...) sont dans le XML.
   Le fetch récupère le fichier, le parse en objet
   XML navigable, puis construit tout le HTML.
   ════════════════════════════════════════════ */

fetch('data/atelier-khem.xml')
	.then(res => {
		if (!res.ok) throw new Error('HTTP ' + res.status)
		return res.text()
	})
	.then(str => {
		const doc = new DOMParser().parseFromString(str, 'text/xml')
		if (doc.querySelector('parsererror'))
			throw new Error('XML invalide — vérifiez l\'encodage du fichier')
		return doc
	})
	.then(xml => {
		
	/* ──────────────────────────────────────────
	   CONFIGURATION GLOBALE (nœud <config> du XML)
	   ────────────────────────────────────────── */

	const config = xml.querySelector('config')
	
	/* Bloque le clic droit */
	const debug = config?.querySelector('debug')?.textContent.trim();

	if (debug === '0') {
		document.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});
	}

	/* ── Couleurs du thème ──
	   Injectées en variables CSS afin que toute la page
	   s'adapte dynamiquement aux couleurs du XML. */
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


	/* ── Audio ──
	   <audio>1</audio> dans le XML = activé.
	   Si désactivé : masque le bouton et coupe tout son. */
	AUDIO_ENABLED = config?.querySelector('audio')?.textContent.trim() === '1'
	
	if (!AUDIO_ENABLED)
	{
		audioToggle?.classList.add('hidden')
		removeAudioOverlay()

		if (currentAudio)
		{
			currentAudio.pause()
			currentAudio = null
		}

		currentSound = null
	}


	/* ── Animations (blobs) ──
	   <animation>1</animation> dans le XML = activé.
	   Si désactivé : ajoute .no-animations sur le body
	   (cible CSS) et supprime le conteneur de blobs du DOM. */
	ANIMATION_ENABLED = config?.querySelector('animation')?.textContent.trim() === '1'

	if (!ANIMATION_ENABLED)
	{
		document.body.classList.add('no-animations')
		document.getElementById('alchemic-bg')?.remove()
	}


	/* ── Bouton blobs ──
	   Visible et actif uniquement si les animations
	   sont activées dans le XML. */
	const alchemicBg = document.getElementById('alchemic-bg')

	if (ANIMATION_ENABLED && blobToggle && alchemicBg)
	{
		blobToggle.classList.remove('hidden')
		blobToggle.innerHTML = '✨'

		blobToggle.addEventListener('click', () =>
		{
			BLOBS_ENABLED = !BLOBS_ENABLED
			alchemicBg.style.display = BLOBS_ENABLED ? 'block' : 'none'
			blobToggle.innerHTML     = BLOBS_ENABLED ? '✨'   : '❌'
		})
	}


	/* ──────────────────────────────────────────
	   SEO : INJECTION DES MÉTADONNÉES
	   Balises <meta> générées depuis le XML pour le
	   référencement Google et le partage social.
	   ────────────────────────────────────────── */

	const seo = config?.querySelector('seo')

	if (seo)
	{
		/**
		 * Crée ou met à jour une balise <meta> dans le <head>.
		 * Si la balise existe déjà, son contenu est mis à jour.
		 * Sinon, une nouvelle balise est créée et ajoutée au <head>.
		 *
		 * @param {string}  name     — nom ou propriété de la balise
		 * @param {string}  content  — valeur du contenu
		 * @param {boolean} property — true = attribut "property" (Open Graph)
		 *                             false = attribut "name" (balises standard)
		 */
		const setMeta = (name, content, property = false) =>
		{
			if (!content) return

			const selector = property
				? `meta[property="${name}"]`
				: `meta[name="${name}"]`

			let meta = document.querySelector(selector)

			if (!meta)
			{
				meta = document.createElement('meta')
				meta.setAttribute(property ? 'property' : 'name', name)
				document.head.appendChild(meta)
			}

			meta.setAttribute('content', content)
		}

		/* Lecture des valeurs depuis le XML */
		const title       = seo.querySelector('title')?.textContent.trim()
		const description = seo.querySelector('description')?.textContent.trim()
		const keywords    = seo.querySelector('keywords')?.textContent.trim()
		const author      = seo.querySelector('author')?.textContent.trim()
		const ogImage     = seo.querySelector('ogImage')?.textContent.trim()

		if (title) document.title = title

		/* Balises standard (référencement Google) */
		setMeta('description', description)
		setMeta('keywords',    keywords)
		setMeta('author',      author)

		/* Open Graph (partage Facebook, LinkedIn, WhatsApp...) */
		setMeta('og:title',       title,       true)
		setMeta('og:description', description, true)
		setMeta('og:image',       ogImage,     true)
		setMeta('og:type',        'website',   true)

		/* Twitter Cards (aperçu sur Twitter/X) */
		setMeta('twitter:card',        'summary_large_image')
		setMeta('twitter:title',       title)
		setMeta('twitter:description', description)
		setMeta('twitter:image',       ogImage)
	}


	/* ──────────────────────────────────────────
	   BRANDING DYNAMIQUE
	   Injection du nom du site, du logo, des URLs
	   SEO, des couleurs et du texte du loader
	   depuis le nœud <branding> du XML.
	   Rend le template entièrement réutilisable
	   sans toucher à index.html.

	   NOTE : <branding> est enfant de <atelier>,
	   pas de <config>. On utilise donc xml.querySelector
	   (et non config.querySelector).
	   ────────────────────────────────────────── */

	const branding = xml.querySelector('branding')

	if (branding)
	{
		const siteName       = branding.querySelector('siteName')?.textContent?.trim()
		const siteUrl        = branding.querySelector('siteUrl')?.textContent?.trim()
		const logo           = branding.querySelector('logo')?.textContent?.trim()
		const loaderText     = branding.querySelector('loaderText')?.textContent?.trim()
		const colorPrimary   = branding.querySelector('colorPrimary')?.textContent?.trim()
		const colorSecondary = branding.querySelector('colorSecondary')?.textContent?.trim()
		const colorBg        = branding.querySelector('colorBackground')?.textContent?.trim()
		const colorText      = branding.querySelector('colorText')?.textContent?.trim()

		/* Titre de l'onglet */
		if (siteName) document.title = siteName

		/* Couleur de la barre du navigateur mobile */
		const themeMeta = document.querySelector('meta[name="theme-color"]')
		if (themeMeta && colorBg) themeMeta.setAttribute('content', colorBg)

		/* URL canonique */
		const canonical = document.querySelector('link[rel="canonical"]')
		if (canonical && siteUrl) canonical.href = siteUrl

		/* Données structurées Schema.org */
		const ldScript = document.querySelector('#dynamic-ld-json')
		if (ldScript)
		{
			ldScript.textContent = JSON.stringify({
				"@context": "https://schema.org",
				"@type":    "Organization",
				"name":     siteName,
				"url":      siteUrl,
				"logo":     `${siteUrl}${logo}`
			}, null, 2)
		}

		/* Logos (tous les éléments avec data-site-logo dans le HTML) */
		document.querySelectorAll('[data-site-logo]').forEach(img =>
		{
			img.src = logo
			img.alt = siteName
		})

		/* Texte du loader */
		const loaderEl = document.getElementById('startup-loader-text')
		if (loaderEl && loaderText) loaderEl.textContent = loaderText

		/* Variables CSS de couleur */
		const root = document.documentElement
		if (colorPrimary)   root.style.setProperty('--color-primary',   colorPrimary)
		if (colorSecondary) root.style.setProperty('--color-secondary',  colorSecondary)
		if (colorBg)        root.style.setProperty('--color-bg',         colorBg)
		if (colorText)      root.style.setProperty('--color-text',       colorText)
	}


	/* ──────────────────────────────────────────
	   SECTION HÉRO (nœud <accueil> du XML)
	   ────────────────────────────────────────── */

	const accueil      = xml.querySelector('accueil')
	const accueilSound = accueil.querySelector('sound')?.textContent?.trim()

	/* Enregistre le son de l'accueil pour l'observateur audio */
	sectionSounds['hero'] = accueilSound

	/* Injection du contenu dans les éléments HTML du héro.
	   ctaLien2 est encodé en Base64 dans le XML (lien WhatsApp). */
	document.getElementById('hero-badge').innerHTML       = accueil.querySelector('badge')?.textContent     ?? ''
	document.getElementById('hero-title').innerHTML       = accueil.querySelector('titre')?.textContent     ?? ''
	document.getElementById('hero-description').innerHTML = accueil.querySelector('intro')?.textContent     ?? ''
	document.getElementById('hero-button').innerHTML      = accueil.querySelector('ctaTexte')?.textContent  ?? ''
	document.getElementById('hero-button').href           = accueil.querySelector('ctaLien')?.textContent   ?? ''
	document.getElementById('hero-button2').innerHTML     = accueil.querySelector('ctaTexte2')?.textContent ?? ''
	document.getElementById('hero-button2').href          = decodeXML(accueil.querySelector('ctaLien2')?.textContent)

	/* Lance le son d'accueil et mémorise le son courant */
	playSectionSound(accueilSound)
	currentSound = accueilSound


	/* ──────────────────────────────────────────
	   PRÉPARATION DES ACTIVITÉS ET DU FOOTER
	   ────────────────────────────────────────── */

	const container = document.getElementById('activities-container')
	const activites = xml.querySelectorAll('activite')

	/* Le footer est lu ici car il sert à construire le bouton
	   "Suivant →" de la dernière activité (qui pointe vers lui). */
	const footer      = xml.querySelector('footer')
	const footerSound = footer?.querySelector('sound')?.textContent?.trim()
	sectionSounds['footer-cta'] = footerSound

	/* Tableau des IDs dans l'ordre du XML
	   ex: ['rhumsarrangesremk', 'guiahsongs', 'kokolux', 'btcs'] */
	const actIds = Array.from(activites).map(a => a.getAttribute('id'))

	/* ── Bouton héro : remplacement du lien natif par le scroll GSAP ──
	   Le href est retiré pour éviter un saut brutal.
	   Un écouteur d'événement lance goToSection() à la place. */
	const heroButton = document.getElementById('hero-button')
	heroButton.removeAttribute('href')
	heroButton.addEventListener('click', (e) =>
	{
		e.preventDefault()
		goToSection(actIds[0], sectionSounds[actIds[0]])
	})


	/* ──────────────────────────────────────────
	   BOUCLE DE GÉNÉRATION DES SECTIONS D'ACTIVITÉS
	   Pour chaque <activite> du XML, une section HTML
	   complète est générée dynamiquement et ajoutée
	   au conteneur #activities-container.
	   ────────────────────────────────────────── */

	activites.forEach((act) =>
	{
		/* ── Lecture des données de l'activité ──
		   telephone, whatsapp : encodés en Base64 dans le XML.
		   Les autres champs sont en clair. */
		const actId         = act.getAttribute('id')
		const actIndex      = actIds.indexOf(actId)
		const nom           = act.querySelector('nom')?.textContent           ?? ''
		const defaultVisual = act.querySelector('defaultVisual')?.textContent ?? ''
		const subtitle      = act.querySelector('subtitle')?.textContent      ?? ''
		const description   = act.querySelector('description')?.textContent   ?? ''
		const telephone     = decodeXML(act.querySelector('telephone')?.textContent)
		const whatsapp      = decodeXML(act.querySelector('whatsapp')?.textContent)
		const whatsappText  = act.querySelector('whatsappText')?.textContent  ?? ''
		const next          = act.querySelector('next')?.textContent          ?? ''
		const nextText      = act.querySelector('nextText')?.textContent      ?? ''
		const previousText  = act.querySelector('previousText')?.textContent  ?? ''
		const activitySound = act.querySelector('sound')?.textContent?.trim() ?? ''

		sectionSounds[actId] = activitySound

		/* ── Activité précédente (avec bouclage circulaire via %) ── */
		const prevId       = actIds[(actIndex - 1 + actIds.length) % actIds.length]
		const prevActivity = activites[(actIndex - 1 + actIds.length) % actIds.length]
		const prevSound    = prevActivity.querySelector('sound')?.textContent.trim() ?? ''

		/* ── Activité suivante (avec bouclage circulaire) ── */
		const nextActivity = activites[(actIndex + 1) % actIds.length]
		const nextSound    = nextActivity.querySelector('sound')?.textContent.trim() ?? ''

		/* MODIF_RESPONSIVE ── Bouton "← Précédent" ──
		   La 1ère activité (index 0) pointe vers l'accueil.
		   Les autres pointent vers l'activité précédente. 
		const prevButton = actIndex === 0
			? `<button onclick="goToSection('hero', '${accueilSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${previousText}</button>`
			: `<button onclick="goToSection('${prevId}', '${prevSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${previousText}</button>`
		*/
		const prevButton = actIndex === 0
			? `<button onclick="goToSection('hero', '${accueilSound}')" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${previousText}</button>`
			: `<button onclick="goToSection('${prevId}', '${prevSound}')" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${previousText}</button>`
		/* MODIF_RESPONSIVE ── Bouton "Suivant →" ──
		   La dernière activité pointe vers le footer.
		   Les autres pointent vers l'activité suivante. 
		const nextButton = actIndex === actIds.length - 1
			? `<button onclick="goToSection('footer-cta', '${footerSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${nextText}</button>`
			: `<button onclick="goToSection('${next}', '${nextSound}')" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${nextText}</button>`
		*/
		const nextButton = actIndex === actIds.length - 1
			? `<button onclick="goToSection('footer-cta', '${footerSound}')" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${nextText}</button>`
			: `<button onclick="goToSection('${next}', '${nextSound}')" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${nextText}</button>`
		
		/* ── Génération des boutons de zones ──
		   Chaque zone (<zone id="..."><nom>...</nom>) génère
		   un bouton cliquable dans la colonne gauche. */
		dataStore[actId] = {}
		const zones = act.querySelectorAll('zone')
		let buttons = ''

		zones.forEach((zone) =>
		{
			const zid   = zone.getAttribute('id')
			const zname = zone.querySelector('nom')?.textContent ?? ''

			// MODIF_RESPONSIVE buttons += `<button onclick="changeContent('${actId}','${zid}')" class="glass rounded-2xl p-5 card-hover text-left">${zname}</button>`
			buttons += `<button onclick="changeContent('${actId}','${zid}')" class="glass rounded-2xl p-3 sm:p-5 text-sm sm:text-base card-hover text-left">${zname}</button>`

			/* Stocke les items de la zone */
			dataStore[actId][zid] = []
			zone.querySelectorAll('item').forEach(item =>
			{
				dataStore[actId][zid].push({
					title:       item.querySelector('titre')?.textContent ?? '',
					description: item.querySelector('texte')?.textContent ?? '',
					image:       item.querySelector('image')?.textContent ?? ''
				})
			})
		})

		/* ── Génération du HTML de la section ──
		   Layout 2 colonnes :
		   - Gauche  : texte, boutons de zones, navigation
		   - Droite  : panneau vitrine (image + titre + texte)

		   Note : les styles inline dans la colonne droite sont
		   nécessaires car Tailwind ne supporte pas toutes les
		   valeurs utilisées (ex: height:650px, flex-direction). */
		const html = `<section id="${actId}" class="grid lg:grid-cols-2 gap-16 items-start section-fade border-b border-white/10 pb-24">

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

		<!-- Navigation entre activités : Précédent | WhatsApp | Suivant -->
		<div class="flex flex-wrap gap-4 pt-4">
			${prevButton}
			<!-- MODIF_RESPONSIVE a href="${whatsapp}" target="_blank" class="inline-block px-8 py-4 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">${whatsappText}</a -->
			<a href="${whatsapp}" target="_blank" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">${whatsappText}</a>
			${nextButton}
		</div>
	</div>

	<!-- ═══ COLONNE DROITE : PANNEAU VITRINE ═══ -->
	<div style="background:rgba(255,255,255,.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:3rem;height:650px;display:flex;flex-direction:column;justify-content:space-between;">

		<!-- MODIF_RESPONSIVE Zone d'affichage : image par défaut au chargement,
		     contenu dynamique après clic sur une zone
		<div id="${actId}-content" style="flex:1;min-height:0;display:flex;align-items:flex-start;justify-content:center;overflow:hidden;">
			<img src="${defaultVisual}" alt="${nom}" style="max-height:100%;object-fit:contain;border-radius:3rem;" />
		</div> -->
		<div id="${actId}-content" style="flex:1;min-height:0;display:flex;align-items:flex-start;justify-content:center;overflow:hidden;">
			<img src="${defaultVisual}" alt="${nom}" style="width:100%;max-width:100%;height:auto;max-height:60vh;object-fit:contain;border-radius:3rem;" />
		</div>

		<!-- Barre de navigation des items (cachée par défaut, affichée au 1er clic) -->
		<div id="${actId}-nav" class="hidden flex-wrap gap-4 justify-between pt-8" style="padding:2rem;">
			<!-- MODIF_RESPONSIVE button id="${actId}-prev" onclick="changeContent('${actId}', currentType['${actId}'], -1)" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">← Précédent</button -->
			<button id="${actId}-prev" onclick="changeContent('${actId}', currentType['${actId}'], -1)" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">← Précédent</button>
			<!-- Le titre de l'item est lu via innerText pour composer le message WhatsApp -->
			<!-- MODIF_RESPONSIVE button onclick="window.open('https://wa.me/${telephone}?text=%5BEn%20provenance%20du%20site%20%2AAtelier%20KHEM%2A%20%28Rhums%20arrang%C3%A9s%20remK%29%5D%0A%0ABonjour%2C%0A%0AJe%20souhaite%20commander%20un%20Rhum%20arrang%C3%A9%20remK%20' + encodeURIComponent(document.getElementById('${actId}-title').innerText) + '%0A%0A');" class="inline-block px-8 py-4 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">Je commande</button -->
			<button onclick="window.open('https://wa.me/${telephone}?text=%5BEn%20provenance%20du%20site%20%2AAtelier%20KHEM%2A%20%28Rhums%20arrang%C3%A9s%20remK%29%5D%0A%0ABonjour%2C%0A%0AJe%20souhaite%20commander%20un%20Rhum%20arrang%C3%A9%20remK%20' + encodeURIComponent(document.getElementById('${actId}-title').innerText) + '%0A%0A');" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">Je commande</button>
			<!-- MODIF_RESPONSIVE button id="${actId}-next" onclick="changeContent('${actId}', currentType['${actId}'], 1)" class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">Suivant →</button -->
			<button id="${actId}-next" onclick="changeContent('${actId}', currentType['${actId}'], 1)" class="inline-block px-4 py-2 text-sm sm:px-8 sm:py-4 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">Suivant →</button>
		</div>

	</div>

</section>`

		container.innerHTML += html

		/* Initialise l'état de l'activité : aucune zone sélectionnée */
		currentType[actId] = null
		state[actId]       = {}

	})


	/* ──────────────────────────────────────────
	   GÉNÉRATION DU FOOTER
	   whatsapp et email sont encodés en Base64 dans le XML.
	   ────────────────────────────────────────── */

	const footerWhatsapp = decodeXML(footer.querySelector('whatsapp')?.textContent)
	const footerEmail    = decodeXML(footer.querySelector('email')?.textContent)

	document.getElementById('footer-cta').innerHTML = `
<div class="max-w-5xl mx-auto text-center space-y-10 relative">

	<!-- Ancre invisible pour le scroll ciblé -->
	<div id="footer-cta-anchor" class="scroll-offset"></div>

	<!-- Badge de marque -->
	<div class="inline-block border rounded-full px-12 py-6 text-3xl tracking-[0.6em] uppercase font-extralight" style="border-color:color-mix(in srgb, var(--color-primary) 30%, transparent);color:var(--color-primary);box-shadow:0 0 40px rgba(198,131,70,.15);">Atelier KHEM</div>

	<!-- Titre et texte d'accroche -->
	<h2 class="titre text-6xl md:text-8xl font-light leading-none">${footer.querySelector('titre')?.textContent ?? ''}</h2>
	<p class="text-xl text-[#B7B0A7] leading-relaxed max-w-3xl mx-auto">${footer.querySelector('texte')?.textContent ?? ''}</p>

	<!-- Boutons : Retour | WhatsApp | Email -->
	<div class="flex flex-wrap justify-center gap-5 pt-6">
		<!-- MODIF_RESPONSIVE button onclick="goToSection('${actIds[actIds.length - 1]}')" class="px-8 py-5 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">← Retour</button -->
		<button onclick="goToSection('${actIds[actIds.length - 1]}')" class="px-4 py-2 text-sm sm:px-8 sm:py-5 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">← Retour</button>
		<!-- MODIF_RESPONSIVE a href="${footerWhatsapp}" target="_blank" class="px-8 py-5 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">${footer.querySelector('whatsappText')?.textContent ?? ''}</a -->
		<a href="${footerWhatsapp}" target="_blank" class="px-4 py-2 text-sm sm:px-8 sm:py-5 sm:text-base rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300">${footer.querySelector('whatsappText')?.textContent ?? ''}</a>
		<!-- MODIF_RESPONSIVE a href="mailto:${footerEmail}" class="px-8 py-5 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${footerEmail}</a -->
		<a href="mailto:${footerEmail}" class="px-4 py-2 text-sm sm:px-8 sm:py-5 sm:text-base rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300">${footerEmail}</a>
	</div>

</div>
<!-- Espace pour que le ScrollTrigger audio du footer puisse se déclencher -->
<div style="padding-bottom:500px;"></div>`


	/* ── ScrollTrigger audio du footer ──
	   Déclenche le son du footer quand l'utilisateur
	   scrolle jusqu'à la section (dans les deux sens). */
	ScrollTrigger.create({
		trigger:     '#footer-cta',
		start:       'top center',
		end:         'bottom center',
		onEnter:     () => { playSectionSound(footerSound) }, // Scroll vers le bas
		onEnterBack: () => { playSectionSound(footerSound) }  // Scroll vers le haut
	})

	/* Lance les animations d'entrée au scroll pour toutes les sections */
	initAnimations()

	/* Démarre l'observateur qui change le son selon la section visible */
	initSectionAudioObserver()

	/* Attend le frame suivant pour stabiliser le layout
	   (images chargées, hauteurs calculées, ScrollTrigger à jour)
	   avant de lancer le préchauffage cinématique. */
	requestAnimationFrame(() =>
	{
		ScrollTrigger.refresh()
		preloadEssentialImages()
		createAudioOverlay()
		cinematicWarmup()
	})

	})

	.catch(err => {
		console.error('[Atelier KHEM] Erreur de chargement :', err)
		const loaderText = document.getElementById('startup-loader-text')
		if (loaderText) loaderText.textContent = 'Erreur — Rechargez la page'
		setTimeout(() => {
			document.getElementById('startup-loader')?.classList.add('hidden')
		}, 4000)
	})


/* ════════════════════════════════════════════
   GESTION AUDIO LORS DE LA NAVIGATION

   L'audio ne doit JAMAIS être forcé lors des
   navigations Suivant/Précédent.
   Le déblocage se produit uniquement via :
   - clic sur l'overlay
   - clic sur le bouton audio
   ════════════════════════════════════════════ */

/**
 * S'assure que l'audio est correctement démarré
 * si l'utilisateur avait déjà activé le son.
 * Ne fait rien pendant le préchauffage cinématique
 * (window.__WARMUP_RUNNING__ = true).
 */
function ensureAudioStarted()
{
	if (!AUDIO_ENABLED) return
	if (window.__WARMUP_RUNNING__) return

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


/* ════════════════════════════════════════════
   NAVIGATION : SCROLL ANIMÉ VERS UNE SECTION
   ════════════════════════════════════════════ */

/**
 * Fait défiler la page vers une section avec GSAP.
 * Utilise requestAnimationFrame pour recalculer la
 * position réelle de l'ancre juste avant le scroll
 * (évite les décalages dus aux images dynamiques
 * ou aux recalculs de layout en cours).
 *
 * @param {string}      sectionId — ID de la section cible
 *                                  (ex: 'rhumsarrangesremk')
 * @param {string|null} soundSrc  — son à jouer (optionnel)
 */
function goToSection(sectionId, soundSrc = null)
{
	ensureAudioStarted()

	/* Retire le contour bleu du bouton cliqué */
	if (document.activeElement) document.activeElement.blur()

	/* Cible l'ancre invisible en haut de la section */
	const target = document.getElementById(`${sectionId}-anchor`)
	if (!target) return

	if (soundSrc) playSectionSound(soundSrc)

	/* Annule tout scroll GSAP en cours pour éviter les conflits */
	gsap.killTweensOf(window)

	requestAnimationFrame(() =>
	{
		/* getBoundingClientRect donne la position relative à la fenêtre ;
		   window.scrollY la convertit en position absolue dans la page. */
		const y = target.getBoundingClientRect().top + window.scrollY

		gsap.to(window, {
			duration: 1.2,
			scrollTo: { y, autoKill: false },
			ease: 'power2.inOut'
		})
	})
}


/* ════════════════════════════════════════════
   OBSERVATEUR AUDIO PAR SECTION
   ════════════════════════════════════════════ */

/**
 * Surveille en continu quelle section est la plus
 * visible à l'écran et joue le son correspondant.
 * Fonctionne en parallèle du ScrollTrigger du footer.
 */
function initSectionAudioObserver()
{
	const sections = [
		document.getElementById('hero'),
		...document.querySelectorAll('section[id]'),
		document.getElementById('footer-cta')
	]

	let currentVisible = null

	/**
	 * Calcule la visibilité de chaque section dans la fenêtre
	 * et joue le son de celle qui occupe le plus d'espace à l'écran.
	 */
	function checkVisibleSection()
	{
		let bestSection = null
		let bestRatio   = 0

		sections.forEach(section =>
		{
			if (!section) return

			const rect         = section.getBoundingClientRect()
			const windowHeight  = window.innerHeight

			/* Hauteur visible de la section dans la fenêtre */
			const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0)

			/* Ratio : 0 = pas visible, 1 = entièrement visible */
			const ratio = visibleHeight / rect.height

			if (ratio > bestRatio)
			{
				bestRatio   = ratio
				bestSection = section
			}
		})

		/* Si la section dominante a changé, on joue son son */
		if (bestSection && bestSection.id !== currentVisible)
		{
			currentVisible = bestSection.id
			playSectionSound(sectionSounds[currentVisible])
		}
	}

	window.addEventListener('scroll', checkVisibleSection)
	checkVisibleSection() // Vérification initiale avant tout scroll
}


/* ════════════════════════════════════════════
   AFFICHAGE DU CONTENU D'UNE ZONE
   ════════════════════════════════════════════ */

/**
 * Affiche un item dans le panneau vitrine (colonne droite).
 * Appelée au clic sur un bouton de zone (direction = 0)
 * ou sur les boutons Précédent/Suivant du panneau (direction = ±1).
 * Gère le bouclage des items et la visibilité des boutons nav.
 *
 * @param {string} section   — ID de l'activité (ex: 'rhumsarrangesremk')
 * @param {string} type      — ID de la zone    (ex: 'remkfruit')
 * @param {number} direction — 0: premier item | -1: précédent | +1: suivant
 */
function changeContent(section, type, direction = 0)
{
	if (!type || !dataStore[section][type]) return

	/* Mémorise la zone active pour cette section */
	currentType[section] = type

	/* Affiche la barre de navigation (cachée par défaut) */
	const nav = document.getElementById(`${section}-nav`)
	nav.classList.remove('hidden')
	nav.classList.add('flex')

	gsap.killTweensOf(`#${section}-nav`)
	gsap.fromTo(`#${section}-nav`,
		{ opacity: 0, y: 20 },
		{ opacity: 1, y: 0, duration: 0.4, overwrite: 'auto' }
	)

	/* Initialise l'état si c'est la 1ère visite sur cette zone */
	if (!state[section])                     state[section]       = {}
	if (state[section][type] === undefined)  state[section][type] = 0

	const items = dataStore[section][type]

	/* Met à jour l'index avec bouclage circulaire */
	if (direction !== 0)
	{
		state[section][type] += direction

		if (state[section][type] < 0) state[section][type] = items.length - 1
		if (state[section][type] >= items.length) state[section][type] = 0
	}

	const current      = items[state[section][type]]
	const currentIndex = state[section][type]

	/* Masque le bouton Précédent sur le 1er item, Suivant sur le dernier */
	const prevBtn = document.getElementById(`${section}-prev`)
	const nextBtn = document.getElementById(`${section}-next`)
	prevBtn.style.visibility = currentIndex === 0                ? 'hidden' : 'visible'
	nextBtn.style.visibility = currentIndex === items.length - 1 ? 'hidden' : 'visible'

	/* Injection du contenu dans le panneau vitrine.
	   L'image est en background-image (meilleur contrôle du rendu).
	   L'id sur le titre est lu par le bouton "Je commande"
	   pour composer le message WhatsApp. */
	document.getElementById(`${section}-content`).innerHTML = `
	<div class="w-full">
		<div id="${section}-image" class="dynamic-image rounded-[3rem] h-[320px] mb-8" style="background-image:url('${current.image}')"></div>
		<div class="space-y-4" style="padding:0 2rem;">
			<h3 id="${section}-title" class="text-4xl font-light">${current.title}</h3>
			<div id="${section}-description" class="text-[#B7B0A7] text-lg leading-relaxed">${current.description}</div>
		</div>
	</div>`

	/* Animation d'entrée de l'image : zoom léger + fondu */
	gsap.fromTo(`#${section}-image`,
		{ opacity: 0, scale: 0.95 },
		{ opacity: 1, scale: 1, duration: 1 }
	)
}


/* ════════════════════════════════════════════
   ANIMATIONS D'ENTRÉE AU SCROLL
   ════════════════════════════════════════════ */

/**
 * Initialise les animations d'apparition au scroll
 * pour tous les éléments avec la classe .section-fade.
 * État de départ (CSS) : opacity:0, translateY:80px.
 * Déclenchement : quand le bord supérieur de l'élément
 * atteint 85% de la hauteur de la fenêtre.
 */
function initAnimations()
{
	gsap.utils.toArray('.section-fade').forEach(section =>
	{
		gsap.fromTo(section,
			{ opacity: 0, y: 80 },
			{
				opacity:  1,
				y:        0,
				duration: 1.2,
				ease:     'power4.out',
				scrollTrigger: {
					trigger: section,
					start:   'top 85%'
				}
			}
		)
	})
}


/* ════════════════════════════════════════════
   PRÉCHARGEMENT MINIMAL DES IMAGES
   ════════════════════════════════════════════ */

/**
 * Précharge en priorité le logo et les images
 * d'accueil des activités (visuels par défaut).
 * Appelée avant le préchauffage cinématique pour
 * stabiliser rapidement les layouts.
 */
function preloadEssentialImages()
{
	const images = ['img/Logo.jpg']

	document.querySelectorAll('#activities-container img').forEach(img =>
	{
		if (img.src) images.push(img.src)
	})

	images.forEach(src =>
	{
		const img = new Image()
		img.src = src
	})
}


/* ════════════════════════════════════════════
   PRÉCHAUFFAGE CINÉMATIQUE
   ════════════════════════════════════════════ */

/**
 * Simule les clics "Suivant" et "Précédent" pour forcer
 * le navigateur à calculer tous les layouts, charger
 * toutes les images et stabiliser ScrollTrigger avant
 * que l'utilisateur n'interagisse.
 *
 * Le loader masque entièrement l'opération, ce qui
 * la transforme en expérience cinématique fluide.
 *
 * Séquence :
 * 1. Descente : clique sur tous les boutons "Suivant"
 * 2. Remontée : clique sur tous les boutons "Précédent"
 * 3. Retour en haut de page
 * 4. Masquage du loader
 * 5. Navigation URL si paramètre ?s= présent
 * 6. Préchargement progressif des images secondaires
 * 7. Reset audio (état initial : muté, non débloqué)
 */
async function cinematicWarmup()
{
	window.__WARMUP_RUNNING__ = true

	const loader = document.getElementById('startup-loader')
	if (!loader) return

	/* Bloque les interactions pendant le warmup */
	document.body.style.overflow = 'hidden'

	/* Attend que le DOM soit complètement peint */
	await new Promise(resolve => setTimeout(resolve, 250))

	const nextButtons = [...document.querySelectorAll('button')]
		.filter(btn => btn.textContent.includes('Suivant'))

	const prevButtons = [...document.querySelectorAll('button')]
		.filter(btn => btn.textContent.includes('Précédent'))

	/* ── Descente : Suivant → Suivant → Suivant ── */
	for (const btn of nextButtons)
	{
		btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
		await new Promise(resolve => setTimeout(resolve, 250))
		window.dispatchEvent(new Event('resize'))
		ScrollTrigger.refresh()
	}

	/* ── Remontée : Précédent → Précédent → Précédent ── */
	for (const btn of [...prevButtons].reverse())
	{
		btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
		await new Promise(resolve => setTimeout(resolve, 250))
		window.dispatchEvent(new Event('resize'))
		ScrollTrigger.refresh()
	}

	/* ── Finalisation ── */
	window.scrollTo({ top: 0, behavior: 'instant' })
	await new Promise(resolve => setTimeout(resolve, 250))

	loader.classList.add('hidden')

	/* ── Navigation par paramètre URL ──
	   Exemple : monsite.com/?s=rhumsarrangesremk
	   Valeurs valides : 'hero', un ID d'activité, 'footer-cta' */
	const urlTarget = new URLSearchParams(window.location.search).get('s')
	if (urlTarget) {
		setTimeout(() => goToSection(urlTarget, sectionSounds[urlTarget] ?? null), 800)
	}

	/* Précharge les images secondaires en arrière-plan */
	setTimeout(() => { preloadRemainingImages() }, 1200)

	window.__WARMUP_RUNNING__ = false
	document.body.style.overflow = ''

	/* ── Reset audio ──
	   Remet l'audio dans son état initial (muté, non débloqué)
	   après le warmup qui peut avoir lancé des sons. */
	AUDIO_UNLOCKED = false
	AUDIO_MUTED    = true

	if (currentAudio)
	{
		currentAudio.pause()
		currentAudio.currentTime = 0
	}

	const audioBtn = document.getElementById('audio-toggle')
	if (audioBtn) audioBtn.innerHTML = '🔇'

	/* Réaffiche l'overlay pour capter le prochain clic utilisateur */
	const overlay = document.getElementById('audio-unlock-overlay')
	if (overlay && AUDIO_ENABLED) overlay.style.display = 'flex'
}


/* ════════════════════════════════════════════
   PRÉCHARGEMENT PROGRESSIF EN ARRIÈRE-PLAN
   ════════════════════════════════════════════ */

/**
 * Après l'affichage du site, charge discrètement toutes
 * les images secondaires (items des zones) avec un délai
 * de 250ms entre chaque pour ne pas saturer le réseau.
 */
function preloadRemainingImages()
{
	const images = []

	Object.values(dataStore).forEach(section =>
	{
		Object.values(section).forEach(zone =>
		{
			zone.forEach(item =>
			{
				if (item.image) images.push(item.image)
			})
		})
	})

	let index = 0

	function loadNext()
	{
		if (index >= images.length) return
		const img = new Image()
		img.src = images[index]
		index++
		setTimeout(loadNext, 250)
	}

	loadNext()
}