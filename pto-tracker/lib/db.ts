export interface PTODay {
  id?: number
  date: Date
  hours: number
  notes: string
  type: "PTO" | "Sick"
}

export interface ManualBalance {
  id?: number
  date: Date
  ptoBalance: number
  sickBalance: number
}

class DatabaseService {
  private dbName = "PTOTrackerDB"
  private version = 1
  private db: IDBDatabase | null = null

  async init() {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create PTO days store
        if (!db.objectStoreNames.contains("ptoDays")) {
          const ptoDaysStore = db.createObjectStore("ptoDays", { keyPath: "id", autoIncrement: true })
          ptoDaysStore.createIndex("date", "date")
        }

        // Create manual balances store
        if (!db.objectStoreNames.contains("manualBalances")) {
          const manualBalancesStore = db.createObjectStore("manualBalances", { keyPath: "id", autoIncrement: true })
          manualBalancesStore.createIndex("date", "date")
        }
      }
    })
  }

  async addPtoDay(ptoDay: Omit<PTODay, "id">): Promise<PTODay> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("ptoDays", "readwrite")
      const store = transaction.objectStore("ptoDays")
      const request = store.add({ ...ptoDay, date: ptoDay.date.toISOString() })

      request.onsuccess = () => {
        resolve({ ...ptoDay, id: request.result as number })
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getPtoDays(): Promise<PTODay[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("ptoDays", "readonly")
      const store = transaction.objectStore("ptoDays")
      const request = store.getAll()

      request.onsuccess = () => {
        const ptoDays = request.result.map((day) => ({
          ...day,
          date: new Date(day.date),
        }))
        resolve(ptoDays)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async removePtoDay(id: number): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("ptoDays", "readwrite")
      const store = transaction.objectStore("ptoDays")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async setManualBalance(manualBalance: Omit<ManualBalance, "id">): Promise<ManualBalance> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("manualBalances", "readwrite")
      const store = transaction.objectStore("manualBalances")
      const request = store.add({ ...manualBalance, date: manualBalance.date.toISOString() })

      request.onsuccess = () => {
        resolve({ ...manualBalance, id: request.result as number })
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getManualBalances(): Promise<ManualBalance[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("manualBalances", "readonly")
      const store = transaction.objectStore("manualBalances")
      const request = store.getAll()

      request.onsuccess = () => {
        const balances = request.result.map((balance) => ({
          ...balance,
          date: new Date(balance.date),
        }))
        resolve(balances)
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const db = new DatabaseService()

