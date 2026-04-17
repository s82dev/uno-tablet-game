const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 3000 });

let lobbies = {};

function makeCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function makeDeck() {
  const colors = ["red", "green", "blue", "yellow"];
  let deck = [];

  colors.forEach(c => {
    for (let i = 0; i <= 9; i++) {
      deck.push({ color: c, value: i });
      deck.push({ color: c, value: i });
    }
    deck.push({ color: c, value: "+2" });
    deck.push({ color: c, value: "skip" });
  });

  return deck.sort(() => Math.random() - 0.5);
}

function addBots(lobby) {
  while (lobby.players.length < 2) {
    lobby.players.push({
      bot: true,
      hand: []
    });
  }
}

server.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

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
