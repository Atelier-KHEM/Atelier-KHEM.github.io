gsap.registerPlugin(ScrollTrigger)

const dataStore = {}
const state = {}
const currentType = {}

fetch('data/atelier-khem.xml')
  .then(res => res.text())
  .then(str => new DOMParser().parseFromString(str, "text/xml"))
  .then(xml => {

    // HERO
    const accueil = xml.querySelector('accueil')

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

    // ACTIVITES
    const container = document.getElementById('activities-container')

    const activites = xml.querySelectorAll('activite')

    activites.forEach((act) => {

      const actId =
        act.getAttribute('id')

      const nom =
        act.querySelector('nom').textContent

      const subtitle =
        act.querySelector('subtitle').textContent

      const description =
        act.querySelector('description').textContent

      const whatsapp =
        act.querySelector('whatsapp').textContent

      const whatsappText =
        act.querySelector('whatsappText').textContent

      const next =
        act.querySelector('next').textContent

      const nextText =
        act.querySelector('nextText').textContent

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

      const firstZone =
        zones[0].getAttribute('id')

      const firstItem =
        dataStore[actId][firstZone][0]

      const html = `

        <section
          id="${actId}"
          class="grid lg:grid-cols-2 gap-16 items-start section-fade border-b border-white/10 pb-24"
        >

          <div class="space-y-8">

            <div>

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

              <a
                href="${whatsapp}"
                target="_blank"
                class="inline-block px-8 py-4 rounded-2xl bg-[#C68346] text-black font-semibold hover:scale-105 transition duration-300"
              >
                ${whatsappText}
              </a>

              <a
                href="#${next}"
                class="inline-block px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition duration-300"
              >
                ${nextText}
              </a>

            </div>

          </div>

          <div class="glass rounded-[3rem] p-8 min-h-[650px] flex flex-col justify-between">

            <div>

              <div
                id="${actId}-image"
                class="dynamic-image rounded-[2rem] h-[320px] mb-8"
                style="background-image:url('${firstItem.image}')"
              ></div>

              <div class="space-y-4">

                <h3
                  id="${actId}-title"
                  class="text-4xl font-light"
                >
                  ${firstItem.title}
                </h3>

                <p
                  id="${actId}-description"
                  class="text-[#B7B0A7] text-lg leading-relaxed"
                >
                  ${firstItem.description}
                </p>

              </div>

            </div>

            <div class="flex justify-between pt-8">

              <button
                onclick="changeContent('${actId}', currentType['${actId}'], -1)"
                class="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition"
              >
                ← Précédent
              </button>

              <button
                onclick="changeContent('${actId}', currentType['${actId}'], 1)"
                class="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition"
              >
                Suivant →
              </button>

            </div>

          </div>

        </section>

      `

      container.innerHTML += html

      currentType[actId] = firstZone

      state[actId] = {}
      state[actId][firstZone] = 0

    })

    // FOOTER
    const footer = xml.querySelector('footer')

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

    initAnimations()

  })

function changeContent(section, type, direction = 0) {

  currentType[section] = type

  if(!state[section]) {
    state[section] = {}
  }

  if(state[section][type] === undefined) {
    state[section][type] = 0
  }

  const items =
    dataStore[section][type]

  if(direction !== 0){

    state[section][type] += direction

    if(state[section][type] < 0){
      state[section][type] = items.length - 1
    }

    if(state[section][type] >= items.length){
      state[section][type] = 0
    }

  }

  const current =
    items[state[section][type]]

  document.getElementById(`${section}-title`).innerText =
    current.title

  document.getElementById(`${section}-description`).innerText =
    current.description

  document.getElementById(`${section}-image`).style.backgroundImage =
    `url('${current.image}')`

  gsap.fromTo(
    `#${section}-image`,
    {
      opacity:0,
      scale:.95
    },
    {
      opacity:1,
      scale:1,
      duration:.7
    }
  )

}

function initAnimations(){

  gsap.utils.toArray('.section-fade').forEach(section => {

    gsap.fromTo(
      section,
      {
        opacity:0,
        y:80
      },
      {
        opacity:1,
        y:0,
        duration:1.2,
        ease:'power4.out',

        scrollTrigger:{
          trigger:section,
          start:'top 85%'
        }
      }
    )

  })

}