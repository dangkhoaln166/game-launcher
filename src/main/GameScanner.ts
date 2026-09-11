import { exec, execFile } from 'child_process'
import { join } from 'path'
import * as fs from 'fs-extra'
import * as vdf from 'vdf-parser'
import { Game } from '../shared/types'

// Helper to run shell commands with a 5-second timeout
function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, { timeout: 5000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
    // Ensure process is killed on timeout
    child.on('error', reject)
  })
}

export class GameScanner {
  /**
   * Scans for installed Steam games by querying registry and reading ACF files.
   */
  static async scanSteamGames(): Promise<Game[]> {
    const games: Game[] = []
    try {
      // Find Steam path from registry
      const regOut = await runCommand('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath')
      const match = regOut.match(/SteamPath\s+REG_SZ\s+(.*)/)
      if (!match) return games
      
      const steamPath = match[1].trim()
      const libraryFoldersPath = join(steamPath, 'steamapps', 'libraryfolders.vdf')
      
      if (!(await fs.pathExists(libraryFoldersPath))) return games

      const libraryVdf = await fs.readFile(libraryFoldersPath, 'utf-8')
      const parsed: any = vdf.parse(libraryVdf)
      
      const libraryFolders = parsed.libraryfolders || {}
      
      // Iterate through all library folders
      for (const key of Object.keys(libraryFolders)) {
        const folder = libraryFolders[key]
        const folderPath = folder.path
        if (!folderPath) continue

        const appsDir = join(folderPath, 'steamapps')
        if (!(await fs.pathExists(appsDir))) continue

        const files = await fs.readdir(appsDir)
        const acfFiles = files.filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'))

        for (const file of acfFiles) {
          try {
            const acfContent = await fs.readFile(join(appsDir, file), 'utf-8')
            const acfParsed: any = vdf.parse(acfContent)
            const appState = acfParsed.AppState

            if (appState && appState.appid && appState.name) {
              // Ignore Steamworks Common Redistributables etc.
              if (appState.name.includes("Steamworks")) continue

              games.push({
                id: `steam-${appState.appid}`,
                title: appState.name,
                platform: 'steam',
                exePath: `steam://run/${appState.appid}`,
                heroBackground: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appState.appid}/library_hero.jpg`,
                coverArt: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appState.appid}/library_600x900.jpg`,
                logoUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appState.appid}/logo.png`, // Approximation, often needs steamgriddb
                developer: 'Steam Game'
              })
            }
          } catch (e) {
            console.error(`Error parsing ${file}`, e)
          }
        }
      }
    } catch (e) {
      console.error('Failed to scan steam games', e)
    }
    return games
  }

  /**
   * Scans Epic Games Launcher manifests.
   */
  static async scanEpicGames(): Promise<Game[]> {
    const games: Game[] = []
    try {
      const manifestsPath = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests'
      if (!(await fs.pathExists(manifestsPath))) return games

      const files = await fs.readdir(manifestsPath)
      const itemFiles = files.filter(f => f.endsWith('.item'))

      for (const file of itemFiles) {
        try {
          const content = await fs.readFile(join(manifestsPath, file), 'utf-8')
          const manifest = JSON.parse(content)

          if (manifest.bIsApplication && manifest.AppName && manifest.DisplayName) {
            games.push({
              id: `epic-${manifest.AppName}`,
              title: manifest.DisplayName,
              platform: 'epic',
              exePath: `com.epicgames.launcher://apps/${manifest.AppName}?action=launch&silent=true`,
              heroBackground: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070', // Placeholder for epic since they don't have static predictable URLs
              coverArt: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=900',
              developer: manifest.CatalogNamespace || 'Epic Games'
            })
          }
        } catch (e) {
          console.error(`Error parsing Epic manifest ${file}`, e)
        }
      }
    } catch (e) {
      console.error('Failed to scan epic games', e)
    }
    return games
  }

  static launchGame(game: Game) {
    if (game.platform === 'steam' || game.platform === 'epic') {
      // Launch URL protocol (Windows)
      exec(`start "" "${game.exePath}"`)
    } else {
      // Launch standard executable
      execFile(game.exePath, (error) => {
        if (error) {
          console.error('Failed to launch crack/custom game', error)
        }
      })
    }
  }
}
