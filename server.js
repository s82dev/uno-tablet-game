const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let rooms = {};

function makeCode(){
  return Math.random().toString(36).substring(2,6).toUpperCase();
}

wss.on("connection", (ws) => {

  ws.on("message", (msg) => {
    let data = JSON.parse(msg);

    if(data.type === "create"){
      let code = makeCode();
      rooms[code] = [ws];
      ws.code = code;

      ws.send(JSON.stringify({type:"created", code}));
    }

    if(data.type === "join"){
      let room = rooms[data.code];
      if(!room){
        ws.send(JSON.stringify({type:"error"}));
        return;
      }

      room.push(ws);
      ws.code = data.code;

      room.forEach(c => {
        c.send(JSON.stringify({type:"start"}));
      });
    }
  });

  ws.on("close", () => {
    if(ws.code && rooms[ws.code]){
      rooms[ws.code] = rooms[ws.code].filter(c => c !== ws);
    }
  });

});

app.use(express.static("./"));

server.listen(3000, () => console.log("Server läuft"));    const data = JSON.parse(msg);

    if (data.type === "create") {
      const code = makeCode();
      lobbies[code] = {
        players: [],
        deck: [],
        pile: [],
        turn: 0
      };
      ws.send(JSON.stringify({ type: "created", code }));
    }

    if (data.type === "join") {
      const lobby = lobbies[data.code];
      if (!lobby || lobby.players.length >= 16) return;

      ws.lobby = data.code;
      lobby.players.push({ ws, hand: [] });

      ws.send(JSON.stringify({ type: "joined", code: data.code }));

      if (lobby.players.length >= 2) startGame(lobby);
    }

    if (data.type === "play") {
      const lobby = lobbies[ws.lobby];
      const player = lobby.players[lobby.turn];

      if (player.ws !== ws) return;

      const card = data.card;
      const top = lobby.pile[lobby.pile.length - 1];

      if (card.color !== top.color && card.value !== top.value) return;

      lobby.pile.push(card);
      player.hand = player.hand.filter(
        c => !(c.color === card.color && c.value === card.value)
      );

      // Effects
      if (card.value === "skip") {
        lobby.turn += 2;
      } else {
        lobby.turn += 1;
      }

      lobby.turn %= lobby.players.length;

      update(lobby);
      botTurn(lobby);
    }
  });
});

function startGame(lobby) {
  addBots(lobby);
  lobby.deck = makeDeck();

  lobby.players.forEach(p => {
    for (let i = 0; i < 7; i++) {
      p.hand.push(lobby.deck.pop());
    }
  });

  lobby.pile = [lobby.deck.pop()];
  update(lobby);
  botTurn(lobby);
}

function botTurn(lobby) {
  const player = lobby.players[lobby.turn];
  if (!player.bot) return;

  const top = lobby.pile[lobby.pile.length - 1];
  let playable = player.hand.find(
    c => c.color === top.color || c.value === top.value
  );

  setTimeout(() => {
    if (playable) {
      lobby.pile.push(playable);
      player.hand = player.hand.filter(c => c !== playable);
    } else {
      player.hand.push(lobby.deck.pop());
    }

    lobby.turn = (lobby.turn + 1) % lobby.players.length;
    update(lobby);
    botTurn(lobby);
  }, 800);
}

function update(lobby) {
  lobby.players.forEach((p, i) => {
    if (!p.ws) return;

    p.ws.send(JSON.stringify({
      type: "update",
      hand: p.hand,
      pile: lobby.pile[lobby.pile.length - 1],
      turn: lobby.turn,
      you: i,
      count: lobby.players.map(pl => pl.hand.length)
    }));
  });
}

console.log("ULTRA Server läuft auf ws://localhost:3000");
