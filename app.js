gsap.registerPlugin(ScrollTrigger)

const dataStore = {}
const state = {}
const currentType = {}
const sectionSounds = {}

/* =========================
   AUDIO SYSTEM
========================= */

let currentAudio = null
let currentSound = null
let audioUnlocked = false
let initialLoad = true

function playSectionSound(src) {

  if (!src) return

  // évite de relancer le même son
  if (currentSound === src) return

  currentSound = src

  // stop ancien son
  if (currentAudio) {

    currentAudio.pause()
    currentAudio.currentTime = 0

  }

  currentAudio = new Audio(src)

  currentAudio.loop = true
  currentAudio.volume = 0.6

  // lecture seulement après interaction utilisateur
  if (audioUnlocked) {

    currentAudio.play().catch(err => {
      console.log('Autoplay bloqué :', err)
    })

  }

}

// Débloque l'audio au premier geste utilisateur
function unlockAudio() {

  if (audioUnlocked) return

  audioUnlocked = true

  if (currentAudio) {

    currentAudio.play().catch(() => {})

  }

  window.removeEventListener('click', unlockAudio)
  window.removeEventListener('scroll', unlockAudio)
  window.removeEventListener('touchstart', unlockAudio)

}

window.addEventListener('click', unlockAudio)
window.addEventListener('scroll', unlockAudio)
window.addEventListener('touchstart', unlockAudio)

/* =========================
   XML
========================= */

fetch('data/atelier-khem.xml')
  .then(res => res.text())
  .then(str => new DOMParser().parseFromString(str, "text/xml"))
  .then(xml => {

    // HERO
    const accueil = xml.querySelector('accueil')

    const accueilSound =
      accueil.querySelector('sound')?.textContent.trim()
	  
	  sectionSounds['hero'] = accueilSound

    document.getElementById('hero-badge').innerHTML =
      accueil.querySelector('badge').textContent

    document.getElementById('hero-title').innerHTML =
      accueil.querySelector('titre').textContent

    document.getElementById('hero-description').innerHTML =
      accueil.querySelector('intro').textContent

    document.getElementById('hero-button').innerHTML =
      accueil.querySelector('ctaTexte').textContent

    document.getElementById('hero-button').href =
      accueil.querySelector('ctaLien').textContent

    document.getElementById('hero-button2').innerHTML =
      accueil.querySelector('ctaTexte2').textContent

    document.getElementById('hero-button2').href =
      accueil.querySelector('ctaLien2').textContent

    // son accueil
    playSectionSound(accueilSound)
	
	setTimeout(() => {
  initialLoad = false
}, 1500)

    // ACTIVITES
    const container = document.getElementById('activities-container')

    const activites = xml.querySelectorAll('activite')
	
	const footer = xml.querySelector('footer')

const footerSound =
  footer.querySelector('sound')?.textContent.trim()
  sectionSounds['footer-cta'] = footerSound

    const actIds = Array.from(activites).map(a => a.getAttribute('id'))

    activites.forEach((act) => {

      const actId =
        act.getAttribute('id')

      const actIndex = actIds.indexOf(actId)

      const nom =
        act.querySelector('nom').textContent

      const defaultVisual =
        act.querySelector('defaultVisual').textContent

      const subtitle =
        act.querySelector('subtitle').textContent

      const description =
        act.querySelector('description').textContent

      const telephone =
        act.querySelector('telephone').textContent

      const whatsapp =
        act.querySelector('whatsapp').textContent

      const whatsappText =
        act.querySelector('whatsappText').textContent

      const next =
        act.querySelector('next').textContent

      const nextText =
        act.querySelector('nextText').textContent

      const previousText =
        act.querySelector('previousText').textContent

      const activitySound =
        act.querySelector('sound')?.textContent.trim()
		
		sectionSounds[actId] = activitySound

      const prevId =
        actIds[(actIndex - 1 + actIds.length) % actIds.length]

      const prevActivity =
  activites[(actIndex - 1 + actIds.length) % actIds.length]

const prevSound =
  prevActivity.querySelector('sound')?.textContent.trim()

const nextActivity =
  activites[(actIndex + 1) % actIds.length]

const nextSound =
  nextActivity.querySelector('sound')?.textContent.trim()

const prevButton = actIndex === 0

  ? `
    <button
      onclick="goToSection('hero', '${accueilSound}')"
      class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
    >
      ${previousText}
    </button>
  `

  : `
    <button
      onclick="goToSection('${prevId}', '${prevSound}')"
      class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
    >
      ${previousText}
    </button>
  `

const nextButton = actIndex === actIds.length - 1

  ? `
    <button
      onclick="goToSection('footer-cta', '${footerSound}')"
      class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
    >
      ${nextText}
    </button>
  `

  : `
    <button
      onclick="goToSection('${next}', '${nextSound}')"
      class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
    >
      ${nextText}
    </button>
  `

      dataStore[actId] = {}

      const zones = act.querySelectorAll('zone')

      let buttons = ''

      zones.forEach((zone) => {

        const zid =
          zone.getAttribute('id')

        const zname =
          zone.querySelector('nom').textContent

        buttons += `
          <button
            onclick="changeContent('${actId}','${zid}')"
            class="glass rounded-2xl p-5 card-hover text-left"
          >
            ${zname}
          </button>
        `

        dataStore[actId][zid] = []

        zone.querySelectorAll('item').forEach(item => {

          dataStore[actId][zid].push({

            title:
              item.querySelector('titre').textContent,

            description:
               item.querySelector('texte').textContent,

            image:
              item.querySelector('image').textContent

          })

        })

      })

      const html = `

        <section
          id="${actId}"
          class="grid lg:grid-cols-2 gap-16 items-start section-fade border-b border-white/10 pb-24 scroll-mt-24"
        >

          <div class="space-y-8">

            <div class="w-full">

              <div class="text-sm tracking-[0.35em] uppercase text-[#1FAF8C]">
                ${subtitle}
              </div>

              <h2 class="text-5xl font-light mt-2">
                ${nom}
              </h2>

            </div>

            <p class="text-[#B7B0A7] text-lg leading-relaxed">
              ${description}
            </p>

            <div class="grid sm:grid-cols-2 gap-4">
              ${buttons}
            </div>

            <div class="flex flex-wrap gap-4 pt-4">

              ${prevButton}

              <a
                href="${whatsapp}"
                target="_blank"
                class="inline-block px-8 py-4 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300"
              >
                ${whatsappText}
              </a>

              ${nextButton}

            </div>

          </div>

          <div style="background:rgba(255,255,255,.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:3rem;padding:2rem;height:650px;display:flex;flex-direction:column;justify-content:space-between;">

            <div
              id="${actId}-content"
              style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;"
            >
              <img
                src="${defaultVisual}"
                alt="${nom}"
                style="max-width:100%;max-height:100%;object-fit:contain;padding:2rem;"
              >
            </div>

<div
  id="${actId}-nav"
  class="hidden flex-wrap gap-4 justify-between pt-8"
>

  <button
    id="${actId}-prev"
    onclick="changeContent('${actId}', currentType['${actId}'], -1)"
    class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
  >
    ← Précédent
  </button>

  <button
    onclick="window.open('https://wa.me/${telephone}?text=%5BEn%20provenance%20du%20site%20%2AAtelier%20KHEM%2A%20%28Rhums%20arrangés%20remK%29%5D%0A%0ABonjour%2C%0A%0AJe%20souhaite%20commander%20un%20Rhum%20arrangés%20remK%20' + encodeURIComponent(document.getElementById('${actId}-title').innerText) + '%0A%0A');"
    class="inline-block px-8 py-4 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300"
  >
    Je commande
  </button>

  <button
    id="${actId}-next"
    onclick="changeContent('${actId}', currentType['${actId}'], 1)"
    class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
  >
    Suivant →
  </button>

</div>

          </div>

        </section>

      `

      container.innerHTML += html

      currentType[actId] = null
      state[actId] = {}

    })

    // FOOTER
    document.getElementById('footer-cta').innerHTML = `

      <div class="max-w-5xl mx-auto text-center space-y-10">

        <div class="tracking-[0.35em] uppercase text-sm text-[#C68346]">
          Atelier KHEM
        </div>

        <h2 class="text-6xl md:text-8xl font-light leading-none">
          ${footer.querySelector('titre').textContent}
        </h2>

        <p class="text-xl text-[#B7B0A7] leading-relaxed max-w-3xl mx-auto">
          ${footer.querySelector('texte').textContent}
        </p>

        <div class="flex flex-wrap justify-center gap-5 pt-6">
			<button
  onclick="goToSection('${actIds[actIds.length - 1]}')"
  class="px-8 py-5 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
>
  ← Retour
</button>

          <a
            href="${footer.querySelector('whatsapp').textContent}"
            target="_blank"
            class="px-8 py-5 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300"
          >
            ${footer.querySelector('whatsappText').textContent}
          </a>

          <a
            href="mailto:${footer.querySelector('email').textContent}"
            class="px-8 py-5 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
          >
            ${footer.querySelector('email').textContent}
          </a>

        </div>

      </div>

    `

    // AUDIO FOOTER
    ScrollTrigger.create({

      trigger: '#footer-cta',
      start: 'top center',
      end: 'bottom center',

      onEnter: () => {
        playSectionSound(footerSound)
      },

      onEnterBack: () => {
        playSectionSound(footerSound)
      }

    })

    initAnimations()
	initSectionAudioObserver()

  })

function goToSection(sectionId, soundSrc = null) {

  if (soundSrc) {
    playSectionSound(soundSrc)
  }

  gsap.to(window, {
    duration: 1.2,
    scrollTo: `#${sectionId}`,
    ease: 'power2.inOut'
  })

}
function initSectionAudioObserver() {

  const sections = [

    document.getElementById('hero'),

    ...document.querySelectorAll('section[id]'),

    document.getElementById('footer-cta')

  ]

  let currentVisible = null

  function checkVisibleSection() {

    let bestSection = null
    let bestRatio = 0

    sections.forEach(section => {

      if (!section) return

      const rect = section.getBoundingClientRect()

      const windowHeight = window.innerHeight

      const visibleHeight = Math.min(rect.bottom, windowHeight)
        - Math.max(rect.top, 0)

      const ratio = visibleHeight / rect.height

      if (ratio > bestRatio) {

        bestRatio = ratio
        bestSection = section

      }

    })

    if (
      bestSection &&
      bestSection.id !== currentVisible
    ) {

      currentVisible = bestSection.id

      playSectionSound(
        sectionSounds[currentVisible]
      )

    }

  }

  window.addEventListener('scroll', checkVisibleSection)

  checkVisibleSection()

}


function changeContent(section, type, direction = 0) {

  if (!type || !dataStore[section][type]) {
    return
  }

  currentType[section] = type

  document
    .getElementById(`${section}-nav`)
    .classList
    .remove('hidden')

  document
    .getElementById(`${section}-nav`)
    .classList
    .add('flex')

  gsap.killTweensOf(`#${section}-nav`)

gsap.fromTo(
  `#${section}-nav`,
  {
    opacity: 0,
    y: 20
  },
  {
    opacity: 1,
    y: 0,
    duration: 0.4,
    overwrite: 'auto'
  }
)

  if (!state[section]) {
    state[section] = {}
  }

  if (state[section][type] === undefined) {
    state[section][type] = 0
  }

  const items =
    dataStore[section][type]

  if (direction !== 0) {

    state[section][type] += direction

    if (state[section][type] < 0) {
      state[section][type] = items.length - 1
    }

    if (state[section][type] >= items.length) {
      state[section][type] = 0
    }

  }

  const current =
    items[state[section][type]]
	
	const currentIndex = state[section][type]

const prevBtn =
  document.getElementById(`${section}-prev`)

const nextBtn =
  document.getElementById(`${section}-next`)

if(currentIndex === 0){
  prevBtn.style.visibility = 'hidden'
}else{
  prevBtn.style.visibility = 'visible'
}

if(currentIndex === items.length - 1){
  nextBtn.style.visibility = 'hidden'
}else{
  nextBtn.style.visibility = 'visible'
}

  document.getElementById(`${section}-content`).innerHTML = `

    <div class="w-full">

      <div
        id="${section}-image"
        class="dynamic-image rounded-[2rem] h-[320px] mb-8"
        style="background-image:url('${current.image}')"
      ></div>

      <div class="space-y-4">

        <h3
          id="${section}-title"
          class="text-4xl font-light"
        >
          ${current.title}
        </h3>

        <div
  id="${section}-description"
  class="text-[#B7B0A7] text-lg leading-relaxed"
>
  ${current.description}
</div>

    </div>

  `

  gsap.fromTo(
    `#${section}-image`,
    {
      opacity: 0,
      scale: .95
    },
    {
      opacity: 1,
      scale: 1,
      duration: 1
    }
  )

}

function initAnimations() {

  gsap.utils.toArray('.section-fade').forEach(section => {

    gsap.fromTo(
      section,
      {
        opacity: 0,
        y: 80
      },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power4.out',

        scrollTrigger: {
          trigger: section,
          start: 'top 85%'
        }
      }
    )

  })

}