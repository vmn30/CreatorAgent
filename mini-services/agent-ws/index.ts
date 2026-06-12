import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  socket.on('join-session', (data: { sessionId: string }) => {
    socket.join(`session:${data.sessionId}`)
    console.log(`Client ${socket.id} joined session: ${data.sessionId}`)
  })

  socket.on('leave-session', (data: { sessionId: string }) => {
    socket.leave(`session:${data.sessionId}`)
    console.log(`Client ${socket.id} left session: ${data.sessionId}`)
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })

  // Handle emit requests from the server side via socket
  socket.on('server-emit', (data: { sessionId: string; event: string; payload: unknown }) => {
    io.to(`session:${data.sessionId}`).emit(data.event, data.payload)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Agent WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
