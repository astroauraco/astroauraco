import express from 'express'
import cors from 'cors'
import swisseph from 'swisseph'

const app = express()
app.use(cors())
app.use(express.json())

// Load ephemeris data from Swiss Ephemeris (Render needs full path)
swisseph.swe_set_ephe_path('.')

// API endpoint
app.post('/natal-chart', (req, res) => {
  const { datetime, coordinates } = req.body

  if (!datetime || !coordinates) {
    return res.status(400).json({ error: 'Missing datetime or coordinates' })
  }

  const [lat, lon] = coordinates.split(',')
  const dateObj = new Date(datetime)
  const julDayUTC = swisseph.swe_julday(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth() + 1,
    dateObj.getUTCDate(),
    dateObj.getUTCHours() + dateObj.getUTCMinutes() / 60,
    swisseph.SE_GREG_CAL
  )

  const planets = [
    swisseph.SE_SUN,
    swisseph.SE_MOON,
    swisseph.SE_MERCURY,
    swisseph.SE_VENUS,
    swisseph.SE_MARS,
    swisseph.SE_JUPITER,
    swisseph.SE_SATURN,
    swisseph.SE_URANUS,
    swisseph.SE_NEPTUNE,
    swisseph.SE_PLUTO,
    swisseph.SE_MEAN_NODE, // Rahu
    swisseph.SE_TRUE_NODE, // Ketu = 180° opposite
  ]

  const results = []
  let pending = planets.length

  planets.forEach((planet, index) => {
    swisseph.swe_calc_ut(julDayUTC, planet, swisseph.SEFLG_SWIEPH, (result) => {
      if (result.error) {
        results.push({ name: planet, error: result.error })
      } else {
        results.push({
          name: planet,
          degree: result.longitude.toFixed(2),
          retrograde: result.retrograde
        })
      }

      pending--
      if (pending === 0) {
        res.json({ datetime, coordinates: [lat, lon], planets: results })
      }
    })
  })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`✨ AstroAura SWE running on port ${PORT}`))
