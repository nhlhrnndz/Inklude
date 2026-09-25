// server/utils/ioRegistry.js
//
// Small shared holder for the Socket.IO instance, so controllers
// outside of sockets/ (like sessionController) can emit events
// without needing extra plumbing through req/res.

let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  return io;
}

module.exports = { setIO, getIO };
