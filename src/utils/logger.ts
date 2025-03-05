type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  userId?: string
}

class Logger {
  private static instance: Logger
  private logs: LogEntry[] = []
  private readonly maxLogs = 1000

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private formatMessage(level: LogLevel, message: string, data?: any, userId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userId
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  info(message: string, data?: any, userId?: string) {
    const entry = this.formatMessage('info', message, data, userId)
    this.addLog(entry)
    console.log(`[INFO] ${message}`, data || '')
  }

  warn(message: string, data?: any, userId?: string) {
    const entry = this.formatMessage('warn', message, data, userId)
    this.addLog(entry)
    console.warn(`[WARN] ${message}`, data || '')
  }

  error(message: string, data?: any, userId?: string) {
    const entry = this.formatMessage('error', message, data, userId)
    this.addLog(entry)
    console.error(`[ERROR] ${message}`, data || '')
  }

  debug(message: string, data?: any, userId?: string) {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.formatMessage('debug', message, data, userId)
      this.addLog(entry)
      console.debug(`[DEBUG] ${message}`, data || '')
    }
  }

  getLogs(level?: LogLevel, userId?: string): LogEntry[] {
    return this.logs.filter(log => 
      (!level || log.level === level) && 
      (!userId || log.userId === userId)
    )
  }

  clearLogs() {
    this.logs = []
  }
}

export const logger = Logger.getInstance()

 