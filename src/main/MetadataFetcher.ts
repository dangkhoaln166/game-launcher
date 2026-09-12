import * as https from 'https'

export interface GameMetadata {
  title: string
  developer?: string
  heroBackground?: string
  coverArt?: string
}

export class MetadataFetcher {
  /**
   * Helper to fetch JSON, bypassing ISP DNS poisoning using DNS-over-HTTPS
   * and connecting directly via IP address.
   */
  static async safeFetchJson(urlStr: string): Promise<any> {
    try {
      const parsedUrl = new URL(urlStr)
      const host = parsedUrl.hostname

      // 1. Resolve real IP via Google DoH
      const dohUrl = `https://dns.google/resolve?name=${host}`
      const ip = await new Promise<string>((resolve, reject) => {
        https.get(dohUrl, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              const answers = json.Answer || []
              const aRecord = answers.find((a: any) => a.type === 1) // A record
              if (aRecord && aRecord.data) {
                resolve(aRecord.data)
              } else {
                reject(new Error('No A record found via DoH'))
              }
            } catch (e) {
              reject(e)
            }
          })
        }).on('error', reject)
      })

      // 2. Fetch using direct IP
      return await new Promise<any>((resolve, reject) => {
        const options = {
          hostname: ip,
          port: 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: { Host: host },
          servername: host // Enable SNI for strict TLS validation
        }
        https.get(options, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(e)
            }
          })
        }).on('error', reject)
      })
    } catch (e) {
      console.error(`Bypass fetch failed for ${urlStr}:`, e)
      throw e
    }
  }

  /**
   * Fetches metadata for a game by its title using the public Steam Store API.
   */
  static async fetchMetadata(title: string): Promise<GameMetadata | null> {
    try {
      // 1. Search for the game to get the AppID
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`
      
      const searchData = await this.safeFetchJson(searchUrl)

      if (!searchData.items || searchData.items.length === 0) {
        return null
      }

      // Take the first match (most relevant)
      const appId = searchData.items[0].id

      // 2. Fetch game details using the AppID
      const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`
      const detailsData = await this.safeFetchJson(detailsUrl)

      const appData = detailsData[appId]?.data

      if (!appData) {
        return null
      }

      // 3. Extract the metadata
      // Steam provides nice assets
      const heroBackground = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`
      const coverArt = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
      const developer = appData.developers ? appData.developers[0] : undefined

      return {
        title: appData.name || title,
        developer,
        heroBackground,
        coverArt
      }
    } catch (error) {
      console.error(`Failed to fetch metadata for ${title}:`, error)
      return null
    }
  }
}
