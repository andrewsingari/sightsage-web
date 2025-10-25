import React from 'react'

type YouTubeItem = { id: string; title: string; channelUrl: string }

const YouTubeThumbnail = ({ id, title, channelUrl }: YouTubeItem) => (
  <a
    href={channelUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="block group"
  >
    <div className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition transform group-hover:scale-105">
      <img
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt={title}
        loading="lazy"
        className="w-full aspect-video object-cover"
      />
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 md:w-14 md:h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
    <div className="mt-1 md:mt-2 text-xs md:text-sm font-medium text-gray-800 truncate text-center">
      {title}
    </div>
  </a>
)

export default function Education() {
  const wellsChannel = 'https://www.youtube.com/@WellspringClinic/videos'
  const kathyChannel = 'https://www.youtube.com/@kathyhealthtips1575/videos'

  const wellsVideos: YouTubeItem[] = [
    { id: 'CgC8eV-2LYs', title: '6 years of good vision after wellspring treatment', channelUrl: wellsChannel },
    { id: '0PTAAQwB6Q4', title: 'How to maintain the treatment? Central vision has improved', channelUrl: wellsChannel },
    { id: 'BRTYJq8UAaw', title: 'Treating Retinitis Pigmentosa with Traditional Chinese medicine', channelUrl: wellsChannel },
    { id: 'fXl_tjWqma8', title: '5 Essential Preparations for Eye Health | Can Eye Problems Be Treated?', channelUrl: wellsChannel },
    { id: 'g9DgFzpzIdI', title: 'How Her Life Changed in 16 Days | Overcoming Blindness', channelUrl: wellsChannel },
    { id: '-AUa3C9iynM', title: 'Visual Field Doubled; Visual Acuity Improved 2 Lines', channelUrl: wellsChannel },
    { id: '-Z4uP9DevPM', title: 'They Said I’d Go Blind — One-Year Program', channelUrl: wellsChannel },
    { id: '0rrFT2965GY', title: 'Normal Vision After 2 Years of Treatment', channelUrl: wellsChannel },
    { id: 'G5mfWsboi8c', title: 'Beating RP: Jeff’s Journey to Restore Vision', channelUrl: wellsChannel },
    { id: 'hIhNLeEuGiQ', title: 'Patient From France to Treat RP', channelUrl: wellsChannel },
    { id: 'HTZjvaSnWak', title: 'One-Day Treatment at Wellspring? (Shorts)', channelUrl: wellsChannel },
  ]

  const kathyVideos: YouTubeItem[] = [
    { id: 'mshQ2TCT-LI', title: 'Do my viral weightloss exercise with me in real time!', channelUrl: kathyChannel },
    { id: 'rXQu9o5t32A', title: 'Tips for Wrinkles', channelUrl: kathyChannel },
    { id: 'UmQ1m9Xj1bM', title: 'Tips for Throat Issues', channelUrl: kathyChannel },
    { id: 'cNTGXAdmAKM', title: 'Tips for stomach problems', channelUrl: kathyChannel },
    { id: 'YLovtODXiqo', title: 'Tips for Eye Problems', channelUrl: kathyChannel },
    { id: 'HlMFdLbsEPI', title: 'Weight Loss Tips Compilation', channelUrl: kathyChannel },
    { id: 'QbzmwXWofC8', title: 'DIY Weight Loss Tea (2 Ingredients)', channelUrl: kathyChannel },
    { id: 'A1-Zev46rpI', title: 'Health Tips Compilation', channelUrl: kathyChannel },
    { id: 'zWF6BCmyv_I', title: 'Top 5 Health Tips of the Year', channelUrl: kathyChannel },
    { id: 'WAgRbS_VceE', title: 'Feeling Anxious? Try This Simple Tip', channelUrl: kathyChannel },
    { id: 'tRYTV3yGrew', title: 'Meditate With Me for 1 Minute (Shorts)', channelUrl: kathyChannel },
    { id: 'qUR39g1JZV8', title: 'Recipe to Get Rid of Dampness (Shorts)', channelUrl: kathyChannel },
    { id: 'NH2FoX9QzeA', title: 'Too Much Morning Saliva? Try This (Shorts)', channelUrl: kathyChannel },
    { id: 'x1WoJN2yK58', title: 'Morning Routine for Glowing Skin (Shorts)', channelUrl: kathyChannel },
    { id: 'XjYxjcOD7QA', title: 'Lower Your Cortisol — Quick Tip (Shorts)', channelUrl: kathyChannel },
    { id: 'NqwRjUtwp8I', title: 'Tip for Period Cramps (Shorts)', channelUrl: kathyChannel },
    { id: 'dxZ8csNr9N4', title: 'Healthy, Glowing Skin — Talk #1', channelUrl: kathyChannel },
    { id: 'dc9uyZNZ0Mw', title: 'Weight Loss for Belly', channelUrl: kathyChannel },
  ]

  const allVideos = [...wellsVideos, ...kathyVideos]

  return (
    <div className="max-w-6xl mx-auto px-3 pt-2 pb-8 md:px-4 md:pt-4 md:pb-10">
      <section>
        <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-3 md:mb-6">YouTube Videos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-6">
          {allVideos.map((vid, idx) => (
            <YouTubeThumbnail key={`${vid.id}-${idx}`} {...vid} />
          ))}
        </div>
      </section>
    </div>
  )
}